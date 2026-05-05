// lib/api.ts
import axios from "axios";

const BASE_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

//  Attach token automatically
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const raw = localStorage.getItem("zyoris-auth");
        if (raw) {
            const { token } = JSON.parse(raw);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
    }
    return config;
});

export default api;