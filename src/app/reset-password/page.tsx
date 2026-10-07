"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import PasswordInput from "@/components/password-input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: String(form.get("username") ?? ""),
        otp: String(form.get("otp") ?? ""),
        newPassword: String(form.get("newPassword") ?? ""),
      }),
    });
    const data = await res.json().catch(() => null);
    setLoading(false);
    if (!res.ok) {
      toast.error(data?.error ?? "Reset failed");
      return;
    }
    toast.success("Password updated — you can now sign in");
    router.replace("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-center text-xl font-bold text-amber-600">Reset Password</h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          Enter the 6-digit OTP code given to you by the administrator.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium">Username</label>
            <input name="username" required className="mt-1 w-full rounded-md border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium">OTP code</label>
            <input
              name="otp"
              required
              maxLength={6}
              pattern="\d{6}"
              inputMode="numeric"
              placeholder="123456"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm tracking-widest"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">New password</label>
            <div className="mt-1">
              <PasswordInput name="newPassword" required minLength={8} />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-amber-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
