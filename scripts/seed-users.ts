/**
 * Seeds the three starter accounts: admin, doctor, receptionist.
 *
 * Usage: npx tsx scripts/seed-users.ts
 *        npx tsx scripts/seed-users.ts <adminPass> <doctorPass> <receptionPass>
 * If passwords are omitted, random ones are generated and printed once.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { adminAuth, adminDb } from "../src/lib/firebase/admin";
import { usernameToEmail } from "../src/lib/auth-shared";

function randomPassword(): string {
  return randomBytes(8).toString("base64url").slice(0, 12);
}

const [adminPass, doctorPass, receptionPass] = process.argv.slice(2);

const SEED_USERS = [
  { username: "admin", fullName: "Administrator", role: "ADMIN", specialization: null, password: adminPass },
  { username: "selameyu", fullName: "Selameyu", role: "DOCTOR", specialization: "General Dentistry", password: doctorPass },
  { username: "nurse", fullName: "Nurse", role: "RECEPTIONIST", specialization: null, password: receptionPass },
] as const;

async function main() {
  const auth = adminAuth();
  const db = adminDb();
  const results: { username: string; role: string; password: string; existed: boolean }[] = [];

  for (const u of SEED_USERS) {
    const password = u.password && u.password.length >= 8 ? u.password : randomPassword();
    const email = usernameToEmail(u.username);

    let uid: string;
    let existed = false;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
      existed = true;
      await auth.updateUser(uid, { password, displayName: u.fullName, disabled: false });
    } catch {
      const created = await auth.createUser({ email, password, displayName: u.fullName });
      uid = created.uid;
    }

    await auth.setCustomUserClaims(uid, { role: u.role });
    const now = new Date().toISOString();
    await db.doc(`users/${uid}`).set(
      {
        uid,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        specialization: u.specialization,
        isActive: true,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );

    results.push({ username: u.username, role: u.role, password, existed });
  }

  console.log("\nSeed complete. Login credentials (save these now — passwords are not stored in plain text):\n");
  console.log("  USERNAME    ROLE          PASSWORD");
  console.log("  --------    ----          --------");
  for (const r of results) {
    console.log(`  ${r.username.padEnd(10)}  ${r.role.padEnd(12)}  ${r.password}${r.existed ? "  (existing user — password reset)" : ""}`);
  }
  console.log("\n  Log in at /login. Change passwords via admin OTP reset if needed.");
}

main().catch((err) => {
  console.error("ERROR: Seed failed:", err.message ?? err);
  process.exit(1);
});
