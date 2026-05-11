"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoginForm from "../../components/auth/loginForm";

export default function LoginPage() {
    const { login, isLoading, error } = useAuth();
    const router = useRouter();

    const handleLogin = async (email: string, password: string) => {
        try {
            await login(email, password);
            setTimeout(() => {
                router.replace("/dashboard");
            }, 0);
        } catch {
            // error already handled in context
        }
    };

    return (
        <LoginForm
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={error}
        />
    );
}