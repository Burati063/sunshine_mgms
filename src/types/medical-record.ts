export interface MedicalRecord {
  id: string;
  patientCardNumber: number;
  patientName: string;
  doctorId: string;
  doctorName: string;
  /** Sequential per patient: 1st visit, 2nd visit, ... */
  visitNumber: number;
  diagnosis: string;
  treatment: string | null;
  prescription: string | null;
  notes: string | null;
  /** "dd/mm/yyyy" Ethiopian, optional */
  nextAppointmentEthiopian: string | null;
  /** Visit date */
  dateEthiopian: string;
  dateGregorian: string;
  createdAt: string;
  updatedAt: string;
}
