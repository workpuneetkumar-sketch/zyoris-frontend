import api from "./api";
import type { User } from "@/context/AuthContext";

// ── Login / register response ──────────────────────────────────────────────

export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: User;
}

// ── Refresh response (confirmed flat, user object is partial) ──────────────
// The /auth/refresh user object has FEWER fields than /auth/me (no permissions
// or memberships).  Do NOT merge this directly over a fuller in-memory User.
export interface RefreshResponse {
    token: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        organizationId?: string | null;
        avatarUrl?: string | null;
        organizationName?: string | null;
        organizationSlug?: string | null;
    };
}

// ── Generic success response (Day 2 flows) ─────────────────────────────────

export interface SimpleSuccessResponse {
    success: boolean;
    message: string;
}

// ── Register / update payloads ─────────────────────────────────────────────

export interface RegisterPayload {
    name: string;
    email: string;
    password: string;
    role?: string;
    designation?: string;
}

// ── Day 1 APIs ─────────────────────────────────────────────────────────────

export const loginApi = async (
    email: string,
    password: string
): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/login", { email, password });
    return res.data;
};

export const registerApi = async (
    data: RegisterPayload
): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>("/auth/register", data);
    return res.data;
};

/**
 * GET /auth/me — confirmed flat response shape:
 * { id, email, name, role, organizationId, avatarUrl, organizationName,
 *   permissions: string[], memberships: [...], createdAt, updatedAt }
 */
export const getMeApi = async (): Promise<User> => {
    const res = await api.get<User>("/auth/me");
    return res.data;
};

export interface UpdateProfilePayload {
    name?: string;
    email?: string;
    avatarUrl?: string;
    designation?: string;
    avatarFile?: File | null;
}

export const updateProfileApi = async ({ avatarFile, ...data }: UpdateProfilePayload) => {
    if (avatarFile) {
        const formData = new FormData();
        formData.append("avatar", avatarFile);
        if (data.name) formData.append("name", data.name);
        if (data.email) formData.append("email", data.email);
        if (data.designation !== undefined)
            formData.append("designation", data.designation ?? "");
        const res = await api.patch("/auth/me", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    }
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

// ── Day 2 APIs ─────────────────────────────────────────────────────────────

/**
 * POST /auth/forgot-password
 *
 * Requests an OTP be sent to the given email for password recovery.
 * The backend ALWAYS returns the same success message regardless of whether
 * the email exists, preventing account enumeration.
 *
 * Body:   { email: string }
 * 200 OK: { success: true, message: "If an account exists with that email,
 *            we have sent a password reset OTP." }
 */
export const forgotPasswordApi = async (
    email: string
): Promise<SimpleSuccessResponse> => {
    const res = await api.post<SimpleSuccessResponse>("/auth/forgot-password", {
        email,
    });
    return res.data;
};

/**
 * POST /auth/reset-password
 *
 * Resets the user's password using a 6-digit OTP (5-minute expiry).
 * After a successful reset the backend revokes all active refresh tokens.
 *
 * Body:   { email: string; otp: string; newPassword: string }
 * 200 OK: { success: true, message: "Password has been successfully reset." }
 *
 * Errors: OTP_INVALID, OTP_EXPIRED, TOO_MANY_ATTEMPTS, VALIDATION_ERROR,
 *         PASSWORD_TOO_WEAK
 */
export const resetPasswordApi = async (
    email: string,
    otp: string,
    newPassword: string
): Promise<SimpleSuccessResponse> => {
    const res = await api.post<SimpleSuccessResponse>("/auth/reset-password", {
        email,
        otp,
        newPassword,
    });
    return res.data;
};

/**
 * POST /auth/verify-email
 *
 * Verifies a user's email address with a 6-digit OTP.
 * On success the backend flips isEmailVerified = true in the DB.
 *
 * Body:   { email: string; otp: string }
 * 200 OK: { success: true, message: "Email successfully verified." }
 *
 * Errors: OTP_INVALID, OTP_EXPIRED, TOO_MANY_ATTEMPTS, ALREADY_VERIFIED
 */
export const verifyEmailApi = async (
    email: string,
    otp: string
): Promise<SimpleSuccessResponse> => {
    const res = await api.post<SimpleSuccessResponse>("/auth/verify-email", {
        email,
        otp,
    });
    return res.data;
};

/**
 * POST /auth/forgot-password  (used as "resend" for the reset-password flow)
 *
 * Calling this endpoint again issues a fresh OTP for password recovery.
 * Used by the reset-password page resend button.
 */
export const resendOtpApi = async (
    email: string
): Promise<SimpleSuccessResponse> => {
    const res = await api.post<SimpleSuccessResponse>("/auth/forgot-password", {
        email,
    });
    return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Email Verification Resend
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /auth/resend-verification
 *
 * Resends the email-verification OTP for the given address.
 * Subject to a strict 60-second server-side cooldown — calling more frequently
 * will return a rate-limit error.
 *
 * Body:   { email: string }
 * 200 OK: { success: true, message: "Verification code resent." }
 *
 * Errors: RATE_LIMIT_EXCEEDED (cooldown active), TOO_MANY_ATTEMPTS
 * BD-RESEND-1: STUB / TODO notes reconciled with production endpoint
 */
export const resendVerificationOtpApi = async (
    email: string
): Promise<SimpleSuccessResponse> => {
    const res = await api.post<SimpleSuccessResponse>("/auth/resend-verification", {
        email,
    });
    return res.data;
};
