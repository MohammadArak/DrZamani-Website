import { useClinicInfo } from "@/contexts/ClinicInfoContext";

export default function BookingNotice() {
    const { clinicInfo } = useClinicInfo();
    if (clinicInfo.bookingEnabled) return null;
    return <aside role="status" dir="rtl" className="mx-auto my-4 max-w-6xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
        <p className="whitespace-pre-wrap break-words">{clinicInfo.bookingDisabledMessage}</p>
        <a className="mt-2 inline-block font-bold underline" href={`tel:${clinicInfo.phones.office.value}`}>تماس با مطب · {clinicInfo.phones.office.display}</a>
    </aside>;
}
