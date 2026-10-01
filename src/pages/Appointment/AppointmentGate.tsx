import {lazy,Suspense} from "react";
import BookingClosed from "@/components/BookingClosed";
import Seo from "@/components/SEO";
import {useClinicInfo} from "@/contexts/ClinicInfoContext";

const PatientPortal=lazy(()=>import("./AppointmentPortalV2"));

export default function AppointmentGate(){
    const {clinicInfo,initialized}=useClinicInfo();
    const closed=<><Seo title={`نوبت‌دهی مطب ${clinicInfo.doctorName}`} description={clinicInfo.bookingDisabledMessage} canonical={`${clinicInfo.siteUrl}/appointment/`} noIndex/><BookingClosed message={clinicInfo.bookingDisabledMessage}/></>;
    // Even the login/patient module is fetched only after a fresh successful policy check.
    if(!initialized||!clinicInfo.bookingEnabled)return closed;
    return <Suspense fallback={closed}><PatientPortal/></Suspense>;
}
