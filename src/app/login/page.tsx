"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { toast } from "sonner";
import { getClientAuth } from "@/lib/firebase/client";
import { usernameToEmail } from "@/lib/auth-shared";
import PasswordInput from "@/components/password-input";
import { ToothIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const clientAuth = getClientAuth();
      const cred = await signInWithEmailAndPassword(
        clientAuth,
        usernameToEmail(username),
        password
      );
      const idToken = await cred.user.getIdToken();
      // Session now lives in an httpOnly cookie; drop the client-side session
      await signOut(clientAuth);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Login failed");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
        toast.error("Invalid username or password");
      } else {
        toast.error(err instanceof Error ? err.message : "Login failed");
      }
      setLoading(false);
    }
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4"
      style={{ backgroundImage: "url(/bg.jpg)" }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-sm rounded-xl border border-white/40 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
        <h1 className="flex items-center justify-center gap-2 text-center text-2xl font-bold text-amber-600">
          <ToothIcon className="h-6 w-6 shrink-0" /> Sunshine Dental Clinic
        </h1>
        <p className="mt-1 text-center text-sm text-gray-500">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <div className="mt-1">
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Forgot password?{" "}
          <a href="/reset-password" className="text-amber-600 hover:underline">
            Reset with OTP
          </a>{" "}
          (ask your administrator for a code)
        </p>
      </div>
    </main>
  );
}
