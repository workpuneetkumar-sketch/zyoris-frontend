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
 *
 * Body:   { email: string; otp: string }
 * 200 OK: { success: true, message: "Email successfully verified." }
 *
 * Errors: OTP_INVALID, OTP_EXPIRED, TOO_MANY_ATTEMPTS, ALREADY_VERIFIED
 *
 * NOTE (BD3): The backend handler validates and deletes the OTP record but the
 * email-verification status update on the User model was not confirmed at time
 * of writing. Confirm with backend that isEmailVerified is set to true.
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
// STUB — Email Verification Resend
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND REQUEST (BD-RESEND-1):
//   A dedicated resend endpoint for email-verification OTPs has NOT been
//   confirmed in the backend contract.  This stub currently falls back to
//   POST /auth/forgot-password which issues a password-reset OTP instead —
//   semantically incorrect for email verification.
//
//   Once the backend exposes an endpoint (suggested: POST /auth/resend-verification
//   Body: { email: string }
//   200: { success: true, message: "Verification code resent." }),
//   replace the body below with a call to that endpoint and remove this comment.
// ─────────────────────────────────────────────────────────────────────────────
export const resendVerificationOtpApi = async (
    email: string
): Promise<SimpleSuccessResponse> => {
    // TODO(BD-RESEND-1): Replace with POST /auth/resend-verification when available.
    const res = await api.post<SimpleSuccessResponse>("/auth/forgot-password", {
        email,
    });
    return res.data;
};
