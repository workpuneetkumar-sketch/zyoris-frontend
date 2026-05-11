import api from "./api";
import type { User } from "@/context/AuthContext";

export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: User;
}

export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
    role?: string;
    designation?: string;
}

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

// register api of the user 
export const registerApi = async (
    data: RegisterPayload
): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/register", data);
    return res.data;
};

export const getMeApi = async () => {
    const res = await api.get("/auth/me");
    return res.data;
};