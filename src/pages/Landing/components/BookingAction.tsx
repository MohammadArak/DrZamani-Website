import { useState } from "react";
import { FaRegCalendarAlt } from "react-icons/fa";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import ReserveDialog from "./ReserveDialog";

export default function BookingAction({ className = "" }: { className?: string }) {
    const { clinicInfo } = useClinicInfo();
    const [open, setOpen] = useState(false);
    return <><a href="/appointment/" className={`landing-button landing-button-gold ${className}`} onClick={event => {
        if (!clinicInfo.bookingEnabled) { event.preventDefault(); setOpen(true); }
    }}><FaRegCalendarAlt aria-hidden="true" />رزرو نوبت</a><ReserveDialog dialogIsOpen={open} onClose={() => setOpen(false)} /></>;
}
