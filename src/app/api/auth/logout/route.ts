import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/logout — clears the session cookie and revokes refresh tokens
export async function POST(req: NextRequest) {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  if (session) {
    try {
      const decoded = await adminAuth().verifySessionCookie(session);
      await adminAuth().revokeRefreshTokens(decoded.uid);
    } catch {
      // cookie already invalid — nothing to revoke
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
