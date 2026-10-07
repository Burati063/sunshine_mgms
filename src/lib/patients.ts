import type { Firestore, Transaction } from "firebase-admin/firestore";
import type { Gender, Patient } from "@/types/patient";

export const COUNTER_DOC_PATH = "counters/patients";
export const PATIENTS_COLLECTION = "patients";

/** Allocates the next sequential card number inside a transaction. */
export async function allocateCardNumber(db: Firestore, tx: Transaction): Promise<number> {
  const counterRef = db.doc(COUNTER_DOC_PATH);
  const snap = await tx.get(counterRef);
  const last = (snap.data()?.lastCardNumber as number | undefined) ?? 0;
  const next = last + 1;
  tx.set(counterRef, { lastCardNumber: next }, { merge: true });
  return next;
}

/** Raises the counter to at least `value` (used after bulk import). */
export async function raiseCounterTo(db: Firestore, value: number): Promise<void> {
  const counterRef = db.doc(COUNTER_DOC_PATH);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const last = (snap.data()?.lastCardNumber as number | undefined) ?? 0;
    tx.set(counterRef, { lastCardNumber: Math.max(last, value) }, { merge: true });
  });
}

export function normalizeGender(value: unknown): Gender | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (["m", "male", "ወንድ"].includes(v)) return "MALE";
  if (["f", "female", "ሴት"].includes(v)) return "FEMALE";
  return null;
}

export function normalizePhone(value: unknown): string {
  // Excel often strips the leading 0 from numbers like 0911223344
  let phone = String(value ?? "").replace(/[\s\-()]/g, "");
  if (/^9\d{8}$/.test(phone)) phone = "0" + phone;
  if (/^2519\d{8}$/.test(phone)) phone = "0" + phone.slice(3);
  if (/^\+2519\d{8}$/.test(phone)) phone = "0" + phone.slice(4);
  return phone;
}

export function buildSearchKeywords(p: {
  firstName: string;
  lastName: string;
  phone: string;
  cardNumber: number;
}): string[] {
  const keywords = new Set<string>();
  const add = (s: string) => {
    const t = s.trim().toLowerCase();
    if (t) keywords.add(t);
  };
  add(p.firstName);
  add(p.lastName);
  add(`${p.firstName} ${p.lastName}`);
  add(p.phone);
  add(String(p.cardNumber));
  // Name prefixes enable search-as-you-type via array-contains
  for (const name of [p.firstName, p.lastName]) {
    const lower = name.trim().toLowerCase();
    for (let i = 2; i < lower.length; i++) keywords.add(lower.slice(0, i));
  }
  return [...keywords];
}

export function buildPatientDoc(input: {
  cardNumber: number;
  firstName: string;
  lastName: string;
  age: number | null;
  gender: Gender | null;
  phone: string;
  subcity?: string | null;
  address?: string | null;
  woreda?: string | null;
  emergencyPhone?: string | null;
  registrationDateEthiopian: string | null;
  registrationDateGregorian: string | null;
  importedFromExcel: boolean;
  assignedDoctorId?: string | null;
}): Patient {
  const now = new Date().toISOString();
  return {
    ...input,
    subcity: input.subcity ?? null,
    address: input.address ?? null,
    woreda: input.woreda ?? null,
    emergencyPhone: input.emergencyPhone ?? null,
    fullName: `${input.firstName} ${input.lastName}`.trim(),
    assignedDoctorId: input.assignedDoctorId ?? null,
    searchKeywords: buildSearchKeywords(input),
    createdAt: now,
    updatedAt: now,
  };
}
