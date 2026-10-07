/**
 * Bulk-imports existing patients from data/patients.xlsx into Firestore.
 *
 * Expected columns (header names are matched case/space-insensitively):
 *   card number | date | fname | lname | age | gender | phonenumber
 *
 * - Doc ID = card number, so re-running the script is safe (overwrites, no duplicates).
 * - After import, the card-number counter is raised to the highest imported
 *   card number, so new registrations continue right after it.
 *
 * Usage:  npm run import:patients               (imports data/patients.xlsx)
 *         npm run import:patients -- --dry      (validate only, no writes)
 *         npm run import:patients -- --only-new (skip cards already in Firestore)
 *         npm run import:patients -- path/to/file.xlsx
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import path from "node:path";
import fs from "node:fs";
import * as XLSX from "xlsx";
import { adminDb } from "../src/lib/firebase/admin";
import {
  buildPatientDoc,
  normalizeGender,
  normalizePhone,
  raiseCounterTo,
  PATIENTS_COLLECTION,
} from "../src/lib/patients";
import {
  ethiopianToGregorian,
  gregorianToEthiopian,
  formatEthiopianDate,
  parseEthiopianDateString,
} from "../src/lib/ethiopian-calendar";

const BATCH_SIZE = 500; // Firestore batched-write limit

interface RowError {
  row: number;
  message: string;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-.]/g, "");
}

const HEADER_MAP: Record<string, string> = {
  cardnumber: "cardNumber",
  cardno: "cardNumber",
  cn: "cardNumber",
  card: "cardNumber",
  date: "date",
  regdate: "date",
  registrationdate: "date",
  fname: "firstName",
  firstname: "firstName",
  lname: "lastName",
  lastname: "lastName",
  age: "age",
  gender: "gender",
  sex: "gender",
  phonenumber: "phone",
  phone: "phone",
  phoneno: "phone",
  mobile: "phone",
};

function excelSerialToEthiopianString(serial: number): string | null {
  // If the date cell is a real Excel date, it is Gregorian — convert it to Ethiopian
  const parsed = XLSX.SSF.parse_date_code(serial);
  if (!parsed) return null;
  const greg = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  return formatEthiopianDate(gregorianToEthiopian(greg));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry");
  const onlyNew = args.includes("--only-new");
  const fileArg = args.find((a) => !a.startsWith("--"));
  const filePath = path.resolve(fileArg ?? "data/patients.xlsx");

  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File not found: ${filePath}`);
    console.error("   Place your Excel file at data/patients.xlsx or pass a path argument.");
    process.exit(1);
  }

  console.log(`Reading ${filePath} ...`);
  const workbook = XLSX.read(fs.readFileSync(filePath));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rawRows.length === 0) {
    console.error("ERROR: The sheet is empty.");
    process.exit(1);
  }

  // Remap arbitrary headers to canonical field names
  const rows = rawRows.map((raw) => {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
      const canonical = HEADER_MAP[normalizeHeader(key)];
      if (canonical) mapped[canonical] = value;
    }
    return mapped;
  });

  const firstRowFields = Object.keys(rows[0]);
  const required = ["cardNumber", "firstName", "lastName", "phone"];
  const missing = required.filter((f) => !firstRowFields.includes(f));
  if (missing.length) {
    console.error(`ERROR: Missing required columns: ${missing.join(", ")}`);
    console.error(`   Detected headers: ${Object.keys(rawRows[0]).join(", ")}`);
    process.exit(1);
  }

  const errors: RowError[] = [];
  const seenCards = new Set<number>();
  const docs: ReturnType<typeof buildPatientDoc>[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // 1-based + header row

    const cardNumber = Number(String(row.cardNumber).trim());
    if (!Number.isInteger(cardNumber) || cardNumber < 1) {
      errors.push({ row: rowNum, message: `Invalid card number "${row.cardNumber}"` });
      return;
    }
    if (seenCards.has(cardNumber)) {
      errors.push({ row: rowNum, message: `Duplicate card number ${cardNumber}` });
      return;
    }
    seenCards.add(cardNumber);

    const firstName = String(row.firstName ?? "").trim() || "Unknown";
    const lastName = String(row.lastName ?? "").trim();
    if (firstName === "Unknown") {
      errors.push({ row: rowNum, message: "Missing first name — imported as \"Unknown\"" });
    }

    const ageNum = Number(String(row.age ?? "").trim());
    const age = Number.isInteger(ageNum) && ageNum > 0 && ageNum < 150 ? ageNum : null;

    const gender = normalizeGender(row.gender);
    const phone = normalizePhone(row.phone);

    // Date column: Ethiopian registration date, either text "dd/mm/yyyy" or an Excel date cell
    let registrationDateEthiopian: string | null = null;
    let registrationDateGregorian: string | null = null;
    const rawDate = row.date;
    if (typeof rawDate === "number" && rawDate > 0) {
      registrationDateEthiopian = excelSerialToEthiopianString(rawDate);
    } else if (typeof rawDate === "string" && rawDate.trim()) {
      const ed = parseEthiopianDateString(rawDate);
      if (ed) {
        registrationDateEthiopian = formatEthiopianDate(ed);
        registrationDateGregorian = ethiopianToGregorian(ed).toISOString();
      } else {
        errors.push({ row: rowNum, message: `Unparseable Ethiopian date "${rawDate}" (expected dd/mm/yyyy) — imported without date` });
      }
    }
    if (registrationDateEthiopian && !registrationDateGregorian) {
      const ed = parseEthiopianDateString(registrationDateEthiopian);
      if (ed) registrationDateGregorian = ethiopianToGregorian(ed).toISOString();
    }

    docs.push(
      buildPatientDoc({
        cardNumber,
        firstName,
        lastName,
        age,
        gender,
        phone,
        registrationDateEthiopian,
        registrationDateGregorian,
        importedFromExcel: true,
      })
    );
  });

  const maxCard = docs.reduce((m, d) => Math.max(m, d.cardNumber), 0);

  console.log(`\nParsed ${rawRows.length} rows -> ${docs.length} valid patients`);
  console.log(`   Highest card number: ${maxCard}`);
  if (errors.length) {
    console.log(`\nWARNING: ${errors.length} row issue(s):`);
    errors.slice(0, 30).forEach((e) => console.log(`   Row ${e.row}: ${e.message}`));
    if (errors.length > 30) console.log(`   ...and ${errors.length - 30} more`);
    // Full report for manual review
    const report = "Row,Issue\r\n" + errors.map((e) => `${e.row},"${e.message.replace(/"/g, '""')}"`).join("\r\n");
    const reportPath = path.resolve("data/import-issues.csv");
    fs.writeFileSync(reportPath, "\uFEFF" + report, "utf8");
    console.log(`   Full issue report saved to ${reportPath}`);
  }

  if (dryRun) {
    console.log("\nDry run — no data written.");
    return;
  }
  if (docs.length === 0) {
    console.error("ERROR: Nothing valid to import.");
    process.exit(1);
  }

  const db = adminDb();

  let toImport = docs;
  if (onlyNew) {
    const existingRefs = await db.collection(PATIENTS_COLLECTION).listDocuments();
    const existingIds = new Set(existingRefs.map((r) => r.id));
    toImport = docs.filter((d) => !existingIds.has(String(d.cardNumber)));
    console.log(`\n--only-new: ${docs.length - toImport.length} already in Firestore, ${toImport.length} new to import.`);
  }

  console.log(`\nImporting ${toImport.length} patients in batches of ${BATCH_SIZE} ...`);

  for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
    const chunk = toImport.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.set(db.collection(PATIENTS_COLLECTION).doc(String(doc.cardNumber)), doc);
    }
    await batch.commit();
    console.log(`   ${Math.min(i + BATCH_SIZE, toImport.length)}/${toImport.length}`);
  }

  await raiseCounterTo(db, maxCard);
  console.log(`\nCard-number counter raised to at least ${maxCard}.`);
  console.log(`   Next registered patient will get card number ${maxCard + 1} (unless counter was already higher).`);
  console.log("\nImport complete.");
}

main().catch((err) => {
  console.error("ERROR: Import failed:", err);
  process.exit(1);
});
