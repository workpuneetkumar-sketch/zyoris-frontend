"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerApi } from "../../lib/auth.service";
import RegisterForm from "../../components/auth/registerForm";

export default function RegisterPage() {
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleRegister(data: {
        name: string;
        email: string;
        password: string;
        role: string;
        organizationId: string;
        designation: string;
        companyName: string;
        companyAbout: string;
        businessType: string;
    }) {
        setIsLoading(true);
        setError(null);

        try {
            await registerApi(data);

            setSuccess(true);
            setTimeout(() => router.replace("/login"), 1800);
        } catch (err: any) {
            setError(
                err?.response?.data?.error ?? err?.response?.data?.message ?? "Registration failed. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <RegisterForm
            onSubmit={handleRegister}
            isLoading={isLoading}
            error={error}
            success={success}
        />
    );
}