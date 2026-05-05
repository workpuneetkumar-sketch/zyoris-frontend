import api from "./api";
import type { User } from "@/context/AuthContext";

// ✅ Shared response
export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: User;
}

// ✅ Register payload
export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
    role?: string;
    organizationId?: string;
    designation?: string;
    companyName?: string;
    companyAbout?: string;
    businessType?: string;
}

// ✅ Login API
export const loginApi = async (
    email: string,
    password: string
): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
    });
    return res.data;
};

// ✅ Register API
export const registerApi = async (
    data: RegisterPayload
): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/register", data);
    return res.data;
};

// 👤 Get current user
export const getMeApi = async () => {
    const res = await api.get("/auth/me");
    return res.data;
};