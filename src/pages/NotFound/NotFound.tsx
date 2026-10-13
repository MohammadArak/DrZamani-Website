import Seo from "@/components/SEO";
import StatusPage from "@/components/StatusPage";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
const NotFound=()=>{const {clinicInfo}=useClinicInfo();return <><Seo title="صفحه پیدا نشد" description="صفحهٔ موردنظر پیدا نشد." canonical={`${clinicInfo.siteUrl}/404.html`} noIndex /><StatusPage kind="missing" /></>;};
export default NotFound;
