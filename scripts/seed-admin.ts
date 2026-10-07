/**
 * Seeds (or updates) an admin user.
 *
 * Usage: npx tsx scripts/seed-admin.ts <username> <password> [full name]
 * Example: npx tsx scripts/seed-admin.ts admin StrongPass123 "Clinic Administrator"
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { adminAuth, adminDb } from "../src/lib/firebase/admin";
import { usernameToEmail } from "../src/lib/auth-shared";

async function main() {
  const [username, password, fullName = "Administrator"] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Usage: npx tsx scripts/seed-admin.ts <username> <password> [full name]");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ERROR: Password must be at least 8 characters.");
    process.exit(1);
  }

  const auth = adminAuth();
  const db = adminDb();
  const email = usernameToEmail(username);

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password, displayName: fullName, disabled: false });
    console.log(`ℹ️  User "${username}" already existed — password and profile updated.`);
  } catch {
    const created = await auth.createUser({ email, password, displayName: fullName });
    uid = created.uid;
    console.log(`Auth user "${username}" created.`);
  }

  await auth.setCustomUserClaims(uid, { role: "ADMIN" });

  const now = new Date().toISOString();
  await db.doc(`users/${uid}`).set(
    {
      uid,
      username: username.toLowerCase(),
      fullName,
      role: "ADMIN",
      specialization: null,
      isActive: true,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );

  console.log(`Admin ready. Log in with username "${username.toLowerCase()}" at /login.`);
}

main().catch((err) => {
  console.error("ERROR: Seed failed:", err);
  process.exit(1);
});
