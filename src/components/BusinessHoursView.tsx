import { useClinicInfo } from "@/contexts/ClinicInfoContext";
const days = {Saturday:"شنبه",Sunday:"یکشنبه",Monday:"دوشنبه",Tuesday:"سه‌شنبه",Wednesday:"چهارشنبه",Thursday:"پنجشنبه",Friday:"جمعه"};
const fa = (value:string) => value.replace(/\d/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
const BusinessHoursView = () => {
    const {clinicInfo} = useClinicInfo();
    return <>{clinicInfo.businessHours.length > 0 && <ul aria-label="ساعت کاری مطب" className="text-sm">{clinicInfo.businessHours.map(slot=><li key={slot.day_of_week}>{days[slot.day_of_week]}: {fa(slot.opens)} تا {fa(slot.closes)}</li>)}</ul>}{clinicInfo.postalCode && <p className="text-sm">کدپستی: {fa(clinicInfo.postalCode)}</p>}</>;
};
export default BusinessHoursView;
