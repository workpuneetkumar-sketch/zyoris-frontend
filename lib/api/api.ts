import axios, {
    type AxiosError,
    type InternalAxiosRequestConfig,
} from "axios";

const getBackendUrl = (): string => {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (raw && typeof raw === "string" && raw.trim().startsWith("http")) {
        return raw.trim().replace(/\/+$/, "");
    }
    return "https://zyoris.onrender.com";
};

const BASE_URL = getBackendUrl();

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30000, // 30 seconds
});

/* ---------------------------------------------------
   AUTH TOKEN UTILITIES & IN-MEMORY STORE
--------------------------------------------------- */

let inMemoryToken: string | null = null;

/** Set active in-memory auth token (sanitized) */
export function setAuthToken(token: string | null) {
    inMemoryToken = sanitizeBearerToken(token);
    isRedirecting = false;
}

/** Get active in-memory auth token */
export function getAuthToken(): string | null {
    return inMemoryToken;
}

/** Cookie helper for client-side environments */
export function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    try {
        const matches = document.cookie.match(
            new RegExp("(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, "\\$1") + "=([^;]*)")
        );
        return matches ? decodeURIComponent(matches[1]) : null;
    } catch {
        return null;
    }
}

/** Clean and sanitize token, stripping quotes, whitespace, and duplicate Bearer prefixes */
export function sanitizeBearerToken(rawToken: any): string | null {
    if (!rawToken || typeof rawToken !== "string") return null;
    let t = rawToken.trim();
    if (!t) return null;

    // Strip wrapping quotes if string was JSON-stringified directly
    if (
        (t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
        (t.startsWith("'") && t.endsWith("'") && t.length >= 2)
    ) {
        t = t.slice(1, -1).trim();
    }

    // Strip redundant "Bearer " or "bearer " prefixes
    while (t.toLowerCase().startsWith("bearer ")) {
        t = t.slice(7).trim();
    }

    return t.length > 0 ? t : null;
}

/**
 * Multi-tier token extractor:
 * 1. In-memory token cache
 * 2. localStorage 'zyoris-auth' (token, accessToken, data.token, raw string)
 * 3. sessionStorage 'zyoris-auth'
 * 4. localStorage fallback keys ('zyoris-token', 'token', 'accessToken')
 * 5. sessionStorage fallback keys
 * 6. document.cookie ('zyoris-token', 'token', 'accessToken')
 */
export function getEffectiveAuthToken(): string | null {
    if (inMemoryToken) {
        const cleaned = sanitizeBearerToken(inMemoryToken);
        if (cleaned) return cleaned;
    }

    if (typeof window === "undefined") return null;

    // 1. localStorage 'zyoris-auth'
    try {
        const raw = localStorage.getItem("zyoris-auth");
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (typeof parsed === "string") {
                    const cleaned = sanitizeBearerToken(parsed);
                    if (cleaned) return cleaned;
                } else if (parsed && typeof parsed === "object") {
                    const candidate =
                        parsed.token ||
                        parsed.accessToken ||
                        parsed.data?.token ||
                        parsed.data?.accessToken ||
                        parsed.user?.token;
                    const cleaned = sanitizeBearerToken(candidate);
                    if (cleaned) return cleaned;
                }
            } catch {
                const cleaned = sanitizeBearerToken(raw);
                if (cleaned) return cleaned;
            }
        }
    } catch {}

    // 2. sessionStorage 'zyoris-auth'
    try {
        const sessionRaw = sessionStorage.getItem("zyoris-auth");
        if (sessionRaw) {
            try {
                const parsed = JSON.parse(sessionRaw);
                if (typeof parsed === "string") {
                    const cleaned = sanitizeBearerToken(parsed);
                    if (cleaned) return cleaned;
                } else if (parsed && typeof parsed === "object") {
                    const candidate =
                        parsed.token ||
                        parsed.accessToken ||
                        parsed.data?.token ||
                        parsed.data?.accessToken;
                    const cleaned = sanitizeBearerToken(candidate);
                    if (cleaned) return cleaned;
                }
            } catch {
                const cleaned = sanitizeBearerToken(sessionRaw);
                if (cleaned) return cleaned;
            }
        }
    } catch {}

    // 3. Fallback storage keys
    const fallbackKeys = ["zyoris-token", "token", "accessToken"];
    for (const key of fallbackKeys) {
        try {
            const val = localStorage.getItem(key);
            const cleaned = sanitizeBearerToken(val);
            if (cleaned) return cleaned;
        } catch {}
        try {
            const val = sessionStorage.getItem(key);
            const cleaned = sanitizeBearerToken(val);
            if (cleaned) return cleaned;
        } catch {}
    }

    // 4. Fallback to document.cookie (matches middleware 'zyoris-token')
    for (const key of fallbackKeys) {
        const cVal = getCookie(key);
        const cleaned = sanitizeBearerToken(cVal);
        if (cleaned) return cleaned;
    }

    return null;
}

/* ---------------------------------------------------
   REQUEST INTERCEPTOR
   Automatically attach sanitized access token
--------------------------------------------------- */

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Always attach the token for every request — including /auth/me, /workspace/pages etc.
        // Only skip for login/register/refresh endpoints that don't need a Bearer token.
        const url = config.url || "";
        const isUnauthenticatedEndpoint =
            url.includes("/auth/login") ||
            url.includes("/auth/register") ||
            url.includes("/auth/refresh");

        if (!isUnauthenticatedEndpoint) {
            const token = getEffectiveAuthToken();

            if (token) {
                const bearerVal = `Bearer ${token}`;
                if (typeof config.headers.set === 'function') {
                    config.headers.set('Authorization', bearerVal);
                }
                config.headers.Authorization = bearerVal;
                config.headers['Authorization'] = bearerVal;
            }
        }

        // ✅ FIX: Remove Content-Type for FormData so browser sets it with boundary
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
            // Mark FormData requests so the retry interceptor can skip them.
            // FormData bodies are consumed/streamed on the first send — retrying
            // them results in an empty body and a 400 from the server.
            (config as any)._isFormData = true;
        }

        return config;
    },

    (error) => Promise.reject(error)
);

/* ---------------------------------------------------
   RESPONSE INTERCEPTOR
   Auto refresh expired token + retry network errors
--------------------------------------------------- */

let isRedirecting = false;
// Helper function to delay retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const SUB_ACTION_KEYWORDS = new Set([
    "execute-assignment-rule",
    "execute-rule",
    "execute",
    "assignment-rule",
    "assign-lead",
    "assign-role",
    "assign",
    "qualify",
    "score",
    "enrich",
    "enrichment",
    "route",
    "convert",
    "convert-to-deal",
    "signals",
    "feedback",
    "follow-up",
    "bulk",
    "bulk-update",
    "bulk-assign",
    "bulk-archive",
    "reorder",
    "sync",
    "test",
    "retry",
    "export",
    "import",
    "upload",
    "verify",
    "comments",
    "subtasks",
    "dependencies",
    "milestones",
    "members",
    "stages",
    "permissions",
    "ai-summary",
    "ai-sentiment",
    "ai-suggestions",
    "broadcast",
    "webhook",
    "send",
    "send-template",
    "media",
    "sla",
    "check",
    "share",
]);

export function shouldTriggerAutoNotification(
    method: string,
    url: string,
    headers?: Record<string, any>
): { shouldTrigger: boolean; entityName: string; action: string } {
    const defaultRes = { shouldTrigger: false, entityName: "Item", action: "Updated" };

    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        return defaultRes;
    }

    if (url.includes("/api/notifications") || url.includes("/auth")) {
        return defaultRes;
    }

    // Check explicit skip header
    if (headers) {
        const skip =
            (typeof headers.get === "function" && headers.get("x-skip-auto-notification")) ||
            headers["x-skip-auto-notification"] ||
            headers["X-Skip-Auto-Notification"];
        if (skip === "true" || skip === true) {
            return defaultRes;
        }
    }

    let path = url.replace(/^https?:\/\/[^\/]+/, "");
    if (path.startsWith("/api/")) path = path.substring(4);
    if (path.startsWith("/")) path = path.substring(1);
    path = path.split("?")[0];

    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return defaultRes;

    const firstSegment = segments[0].toLowerCase();

    // Check if any segment is a known sub-action keyword
    const hasSubAction = segments.some((s) => SUB_ACTION_KEYWORDS.has(s.toLowerCase()));
    if (hasSubAction) {
        return defaultRes;
    }

    // For POST (creations), only primary resource creations should trigger.
    // Examples: /leads, /leads/create, /leads/create-leads, /deals/create-deal.
    // Sub-resources like /leads/:id/execute-... or /projects/:id/tasks have length > 2 or non-create subpaths.
    if (method === "POST") {
        if (segments.length > 2) {
            return defaultRes;
        }
        if (segments.length === 2) {
            const second = segments[1].toLowerCase();
            const isValidCreateSubpath =
                second === "create" ||
                second === "new" ||
                second === `create-${firstSegment}` ||
                second === `create-${firstSegment.replace(/s$/, "")}` ||
                second.startsWith("create-");
            if (!isValidCreateSubpath) {
                return defaultRes;
            }
        }
    }

    let str = firstSegment;
    if (str.endsWith("ies")) {
        str = str.slice(0, -3) + "y";
    } else if (str.endsWith("s")) {
        str = str.slice(0, -1);
    }
    const entityName = str.charAt(0).toUpperCase() + str.slice(1);

    let action = "Updated";
    if (method === "POST") action = "Created";
    if (method === "DELETE") action = "Deleted";

    return { shouldTrigger: true, entityName, action };
}

api.interceptors.response.use(
    (response) => {
        // --- Auto Notification Generation for Mutations ---
        if (typeof window !== "undefined" && response.config && response.status >= 200 && response.status < 300) {
            const method = response.config.method?.toUpperCase() || "";
            const url = response.config.url || "";
            const headers = response.config.headers as Record<string, any> | undefined;

            const { shouldTrigger, entityName, action } = shouldTriggerAutoNotification(method, url, headers);

            if (shouldTrigger) {
                try {
                    const raw = localStorage.getItem("zyoris-auth");
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        const token = parsed?.token;
                        if (token) {
                            // Decode JWT to get userId
                            const payloadBase64 = token.split(".")[1];
                            const decoded = JSON.parse(atob(payloadBase64));
                            const userId = decoded?.userId || decoded?.id;

                            if (userId) {
                                // Fire and forget
                                axios.post(`${BASE_URL}/api/notifications`, {
                                    userId,
                                    title: `${entityName} ${action}`,
                                    message: `A ${entityName.toLowerCase()} was successfully ${action.toLowerCase()}.`,
                                    type: method === "DELETE" ? "WARNING" : "SUCCESS",
                                    entityType: entityName.toUpperCase()
                                }, {
                                    headers: { Authorization: `Bearer ${token}` }
                                }).then((res) => {
                                    if (typeof window !== "undefined") {
                                        window.dispatchEvent(new CustomEvent('zyoris:notification-created', { detail: res.data }));
                                    }
                                }).catch(() => { });
                            }
                        }
                    }
                } catch (e) {
                    // Ignore background parsing/notification errors
                }
            }
        }
        return response;
    },
    async (error: AxiosError<any>) => {
        const originalRequest: any = error.config;

        // Check if it's a network error or timeout
        const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';

        // Retry logic for network errors.
        // IMPORTANT: Never retry FormData (file upload) requests — the body stream
        // is already consumed after the first attempt, so a retry sends an empty
        // body and the server returns 400 "Invalid CSV / no file".
        const isFormDataRequest = !!(originalRequest as any)?._isFormData;

        if (isNetworkError && !isFormDataRequest && !originalRequest?._retryCount) {
            originalRequest._retryCount = 1;
        }

        if (isNetworkError && !isFormDataRequest && originalRequest._retryCount && originalRequest._retryCount < 3) {
            originalRequest._retryCount += 1;
            // Exponential backoff: 1s, 2s, 4s
            const backoffTime = Math.pow(2, originalRequest._retryCount - 1) * 1000;
            console.log(`Network error, retrying in ${backoffTime / 1000}s... (attempt ${originalRequest._retryCount}/3)`);
            await delay(backoffTime);
            return api(originalRequest);
        }

        // Prevent infinite retry loop for 401, skip unauthenticated endpoints
        const reqUrl = originalRequest?.url || "";
        const isUnauthenticatedEndpoint =
            reqUrl.includes("/auth/login") ||
            reqUrl.includes("/auth/register") ||
            reqUrl.includes("/auth/refresh");

        if (
            !isUnauthenticatedEndpoint &&
            error.response?.status === 401 &&
            !originalRequest?._retry
        ) {
            originalRequest._retry = true;

            try {
                if (typeof window === "undefined") {
                    return Promise.reject(error);
                }

                // Resolve refresh token flexibly from multiple potential sources
                let refreshToken: string | null = null;
                let parsedAuth: any = null;

                try {
                    const raw = localStorage.getItem("zyoris-auth");
                    if (raw) {
                        parsedAuth = JSON.parse(raw);
                        refreshToken = parsedAuth?.refreshToken || parsedAuth?.data?.refreshToken || null;
                    }
                } catch {}

                if (!refreshToken) {
                    try {
                        const sessionRaw = sessionStorage.getItem("zyoris-auth");
                        if (sessionRaw) {
                            const parsedSession = JSON.parse(sessionRaw);
                            refreshToken = parsedSession?.refreshToken || parsedSession?.data?.refreshToken || null;
                        }
                    } catch {}
                }

                if (!refreshToken) {
                    try {
                        refreshToken = localStorage.getItem("zyoris-refresh-token") || localStorage.getItem("refreshToken") || null;
                    } catch {}
                }

                if (!refreshToken) {
                    const tokenCookie = getCookie("zyoris-token");
                    if (!tokenCookie && !parsedAuth) {
                        // Definitely unauthenticated session — redirect to login only if not already on auth pages
                        localStorage.removeItem("zyoris-auth");
                        const TOKEN_COOKIE = "zyoris-token";
                        document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;

                        const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                        const isPublicAuthPage =
                            currentPath === "/login" ||
                            currentPath.startsWith("/login/") ||
                            currentPath === "/register" ||
                            currentPath.startsWith("/register/");

                        if (!isPublicAuthPage && !isRedirecting && typeof window !== "undefined") {
                            isRedirecting = true;
                            window.location.href = "/login";
                        }
                    }
                    return Promise.reject(error);
                }

                /* -----------------------------------
                   CALL REFRESH TOKEN API
                ----------------------------------- */

                const refreshResponse = await axios.post(
                    `${BASE_URL}/auth/refresh`,
                    {
                        refreshToken,
                    },
                    {
                        timeout: 10000,
                    }
                );

                const newAccessToken = sanitizeBearerToken(
                    refreshResponse.data?.token ||
                    refreshResponse.data?.accessToken ||
                    refreshResponse.data?.data?.token ||
                    refreshResponse.data?.data?.accessToken
                );

                if (!newAccessToken) {
                    return Promise.reject(error);
                }

                const newRefreshToken =
                    refreshResponse.data?.refreshToken ||
                    refreshResponse.data?.data?.refreshToken ||
                    refreshToken;

                /* -----------------------------------
                   UPDATE IN-MEMORY TOKEN
                ----------------------------------- */
                setAuthToken(newAccessToken);

                /* -----------------------------------
                   UPDATE LOCAL & SESSION STORAGE
                ----------------------------------- */
                try {
                    const raw = localStorage.getItem("zyoris-auth");
                    const parsed = raw ? JSON.parse(raw) : (parsedAuth || {});
                    const updatedAuth = {
                        ...parsed,
                        token: newAccessToken,
                        refreshToken: newRefreshToken,
                    };

                    localStorage.setItem("zyoris-auth", JSON.stringify(updatedAuth));
                } catch {}

                /* -----------------------------------
                   UPDATE COOKIE (SameSite=Lax matches AuthContext)
                ----------------------------------- */
                const TOKEN_COOKIE = "zyoris-token";
                document.cookie = `${TOKEN_COOKIE}=${newAccessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

                /* -----------------------------------
                   RETRY ORIGINAL REQUEST
                ----------------------------------- */
                const retryBearer = `Bearer ${newAccessToken}`;
                if (originalRequest.headers) {
                    if (typeof originalRequest.headers.set === 'function') {
                        originalRequest.headers.set('Authorization', retryBearer);
                    }
                    originalRequest.headers.Authorization = retryBearer;
                    originalRequest.headers['Authorization'] = retryBearer;
                }

                return api(originalRequest);
            } catch (refreshError) {
                /* -----------------------------------
                   REFRESH FAILED -> LOGOUT USER
                ----------------------------------- */
                setAuthToken(null);
                localStorage.removeItem("zyoris-auth");
                const TOKEN_COOKIE = "zyoris-token";
                document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;

                const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
                const isPublicAuthPage =
                    currentPath === "/login" ||
                    currentPath.startsWith("/login/") ||
                    currentPath === "/register" ||
                    currentPath.startsWith("/register/");

                if (!isPublicAuthPage && !isRedirecting && typeof window !== "undefined") {
                    isRedirecting = true;
                    window.location.href = "/login";
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
