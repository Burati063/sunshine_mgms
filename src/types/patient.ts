export type Gender = "MALE" | "FEMALE";

export interface Patient {
  cardNumber: number;
  firstName: string;
  lastName: string;
  fullName: string;
  age: number | null;
  gender: Gender | null;
  phone: string;
  subcity: string | null;
  address: string | null;
  woreda: string | null;
  emergencyPhone: string | null;
  /** Registration date in Ethiopian calendar, "dd/mm/yyyy" */
  registrationDateEthiopian: string | null;
  /** Same date converted to Gregorian (ISO string) for sorting/queries */
  registrationDateGregorian: string | null;
  assignedDoctorId: string | null;
  /** Lowercased tokens for Firestore array-contains search */
  searchKeywords: string[];
  importedFromExcel: boolean;
  createdAt: string;
  updatedAt: string;
}
