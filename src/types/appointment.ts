export type AppointmentStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";

export const APPOINTMENT_PURPOSES = [
  "CHECKUP",
  "CLEANING",
  "FILLING",
  "EXTRACTION",
  "ROOT_CANAL",
  "ORTHODONTICS",
  "OTHER",
] as const;

export type AppointmentPurpose = (typeof APPOINTMENT_PURPOSES)[number];

export interface Appointment {
  id: string;
  patientCardNumber: number;
  patientName: string;
  doctorId: string;
  doctorName: string;
  /** "dd/mm/yyyy" Ethiopian calendar */
  dateEthiopian: string;
  /** ISO string for sorting/queries */
  dateGregorian: string;
  /** "HH:mm" 24h, optional */
  time: string | null;
  purpose: AppointmentPurpose;
  customPurpose: string | null;
  status: AppointmentStatus;
  cancellationReason: string | null;
  /** Optional comment captured when the appointment is completed */
  completionNote: string | null;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}
