import RavielCredit from "./RavielCredit";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
export default function PortalFooter(){
    const {clinicInfo}=useClinicInfo();
    return <footer className="portal-footer raviel-credit-footer" dir="rtl" style={{background:"transparent"}}><span>تمامی حقوق برای {clinicInfo.doctorName} محفوظ است.</span><RavielCredit/></footer>;
}
