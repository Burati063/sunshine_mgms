import { getCurrentUser } from "@/lib/auth";
import { gregorianToEthiopian, formatEthiopianDate } from "@/lib/ethiopian-calendar";
import AppointmentsClient from "@/components/appointments/appointments-client";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const user = await getCurrentUser();
  const todayEthiopian = formatEthiopianDate(gregorianToEthiopian(new Date()));
  return (
    <AppointmentsClient
      role={user!.role}
      currentUid={user!.uid}
      todayEthiopian={todayEthiopian}
    />
  );
}
