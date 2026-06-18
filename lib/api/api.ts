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
    timeout: 10000,
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

        return config;
    },

    (error) => Promise.reject(error)
);

/* ---------------------------------------------------
   RESPONSE INTERCEPTOR
   Auto refresh expired token
--------------------------------------------------- */

let isRedirecting = false;

api.interceptors.response.use(
    (response) => response,

    async (error: AxiosError<any>) => {
        const originalRequest: any = error.config;

        // Prevent infinite retry loop
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
                        timeout: 5000,
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
