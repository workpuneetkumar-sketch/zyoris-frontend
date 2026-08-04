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

export interface UpdateProfilePayload {
    name?: string;
    email?: string;
    avatarUrl?: string;
    designation?: string;
}

export const updateProfileApi = async (data: UpdateProfilePayload) => {
    const res = await api.patch("/auth/me", data);
    return res.data;
};

export interface UpdatePasswordPayload {
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
}

export const updatePasswordApi = async (data: UpdatePasswordPayload) => {
    const res = await api.patch("/auth/me/password", data);
    return res.data;
};

export interface DeleteAccountPayload {
    currentPassword?: string;
    confirmation: "DELETE";
}

export const deleteAccountApi = async (data: DeleteAccountPayload) => {
    const res = await api.delete("/auth/me", { data });
    return res.data;
};

export const logoutApi = async (refreshToken: string): Promise<void> => {
    await api.post("/auth/logout", { refreshToken });
};