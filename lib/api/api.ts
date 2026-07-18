import axios, {
    AxiosError,
    InternalAxiosRequestConfig,
} from "axios";

const BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://zyoris.onrender.com";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30000, // 30 seconds instead of 10
});

/* ---------------------------------------------------
   REQUEST INTERCEPTOR
   Automatically attach access token
--------------------------------------------------- */

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (typeof window !== "undefined") {
            const raw = localStorage.getItem("zyoris-auth");

            if (raw) {
                try {
                    const parsed = JSON.parse(raw);

                    if (parsed?.token) {
                        config.headers.Authorization =
                            `Bearer ${parsed.token}`;
                    }
                } catch (e) {
                    console.error("Failed to parse zyoris-auth from localStorage", e);
                }
            }
        }

        // ✅ FIX: Remove Content-Type for FormData
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
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

api.interceptors.response.use(
    (response) => {
        // --- Auto Notification Generation for Mutations ---
        if (typeof window !== "undefined" && response.config && response.status >= 200 && response.status < 300) {
            const method = response.config.method?.toUpperCase() || "";
            const url = response.config.url || "";
            
            // Only act on state-changing methods, exclude notifications API and auth endpoints
            if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !url.includes("/api/notifications") && !url.includes("/auth")) {
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
                                let action = "Updated";
                                if (method === "POST") action = "Created";
                                if (method === "DELETE") action = "Deleted";
                                
                                let entityName = "Item";
                                let path = url.replace(/^https?:\/\/[^\/]+/, '');
                                if (path.startsWith('/api/')) path = path.substring(4);
                                if (path.startsWith('/')) path = path.substring(1);
                                const segment = path.split('/')[0];
                                if (segment) {
                                    let str = segment;
                                    if (str.endsWith("ies")) {
                                        str = str.slice(0, -3) + "y";
                                    } else if (str.endsWith("s")) {
                                        str = str.slice(0, -1);
                                    }
                                    entityName = str.charAt(0).toUpperCase() + str.slice(1);
                                }
                                
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
                                }).catch(() => {});
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
        
        // Retry logic for network errors
        if (isNetworkError && !originalRequest?._retryCount) {
            originalRequest._retryCount = 1;
        }
        
        if (isNetworkError && originalRequest._retryCount && originalRequest._retryCount < 3) {
            originalRequest._retryCount += 1;
            // Exponential backoff: 1s, 2s, 4s
            const backoffTime = Math.pow(2, originalRequest._retryCount - 1) * 1000;
            console.log(`Network error, retrying in ${backoffTime/1000}s... (attempt ${originalRequest._retryCount}/3)`);
            await delay(backoffTime);
            return api(originalRequest);
        }

        // Prevent infinite retry loop for 401
        if (
            error.response?.status === 401 &&
            !originalRequest?._retry
        ) {
            originalRequest._retry = true;

            try {
                if (typeof window === "undefined") {
                    return Promise.reject(error);
                }

                const raw = localStorage.getItem("zyoris-auth");

                if (!raw) {
                    // No auth data, redirect immediately
                    if (!isRedirecting) {
                        isRedirecting = true;
                        window.location.href = "/login";
                    }
                    return Promise.reject(error);
                }

                const parsed = JSON.parse(raw);

                const refreshToken = parsed?.refreshToken;

                if (!refreshToken) {
                    // No refresh token, redirect immediately
                    if (!isRedirecting) {
                        isRedirecting = true;
                        localStorage.removeItem("zyoris-auth");
                        const TOKEN_COOKIE = "zyoris-token";
                        document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
                        window.location.href = "/login";
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

                /*
                  Expected backend response:
                  {
                    token: "...",
                    refreshToken?: "..."
                  }
                */

                const newAccessToken =
                    refreshResponse.data.token;

                const newRefreshToken =
                    refreshResponse.data.refreshToken ||
                    refreshToken;

                /* -----------------------------------
                   UPDATE LOCAL STORAGE
                ----------------------------------- */

                const updatedAuth = {
                    ...parsed,
                    token: newAccessToken,
                    refreshToken: newRefreshToken,
                };

                localStorage.setItem(
                    "zyoris-auth",
                    JSON.stringify(updatedAuth)
                );

                /* -----------------------------------
                   UPDATE COOKIE
                ----------------------------------- */
                const TOKEN_COOKIE = "zyoris-token";
                document.cookie = `${TOKEN_COOKIE}=${newAccessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Strict`;

                /* -----------------------------------
                   RETRY ORIGINAL REQUEST
                ----------------------------------- */

                originalRequest.headers.Authorization =
                    `Bearer ${newAccessToken}`;

                return api(originalRequest);
            } catch (refreshError) {
                /* -----------------------------------
                   REFRESH FAILED
                   LOGOUT USER
                ----------------------------------- */

                if (!isRedirecting) {
                    isRedirecting = true;
                    localStorage.removeItem("zyoris-auth");
                    // Clear cookie too
                    const TOKEN_COOKIE = "zyoris-token";
                    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Strict`;
                    window.location.href = "/login";
                }

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;