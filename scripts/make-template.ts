/** Creates data/patients-template.xlsx showing the expected import format. */
import path from "node:path";
import fs from "node:fs";
import * as XLSX from "xlsx";

const rows = [
  { "card number": 1, date: "05/01/2010", fname: "Abebe", lname: "Kebede", age: 34, gender: "M", phonenumber: "0911223344" },
  { "card number": 2, date: "12/03/2011", fname: "Sara", lname: "Tesfaye", age: 27, gender: "F", phonenumber: "0922334455" },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Patients");

const outDir = path.resolve("data");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "patients-template.xlsx");
XLSX.writeFile(wb, outPath);
console.log(`Template written to ${outPath}`);
console.log("   Columns: card number | date (Ethiopian dd/mm/yyyy) | fname | lname | age | gender | phonenumber");
