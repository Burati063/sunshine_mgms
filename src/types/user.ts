export type Role = "ADMIN" | "DOCTOR" | "RECEPTIONIST";

export interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  role: Role;
  specialization: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
