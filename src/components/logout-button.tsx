"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-md border px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-60"
    >
      {loading ? "..." : "Logout"}
    </button>
  );
}
