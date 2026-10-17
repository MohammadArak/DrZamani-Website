import { lazy, Suspense } from "react";
import Loading from "./pages/Loading";
import PortalFooter from "@/components/PortalFooter";
import ConnectionStatus from "@/components/ConnectionStatus";
import { ClinicInfoProvider } from "@/contexts/ClinicInfoContext";

import "keen-slider/keen-slider.min.css";

const Landing = lazy(() => import("@/pages/Landing"));
const Appointment = lazy(() => import("@/pages/Appointment"));
const Staff = lazy(() => import("@/pages/Staff"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * The site has four fixed pages and every link is a normal anchor (the other pages are server-rendered),
 * so a pathname switch replaces the 90 KB client router.
 */
function currentPage() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/") return Landing;
    if (path === "/appointment") return Appointment;
    if (path === "/staff") return Staff;
    return NotFound;
}

// Chosen once when the script loads: the page never changes without a full page load.
const Page = currentPage();
// Staff and patient cards use the light base typography; public navy/gold pages retain their theme.
if (Page === Staff || Page === Appointment) document.documentElement.classList.remove("dark");

function App() {
    return (
        <ClinicInfoProvider>
            <Suspense
                fallback={<Loading loading={true} className="w-full h-screen" />}
            >
                {Page === Appointment || Page === Staff ? <div className="portal-layout" style={{minHeight:"100dvh",height:Page===Staff?"100dvh":undefined,display:"flex",flexDirection:"column",background:Page===Appointment?"radial-gradient(circle at top right,rgba(213,171,100,.2),transparent 35%),linear-gradient(145deg,#0e192c,#293241)":undefined}}>
                    <Page />
                    <PortalFooter />
                </div> : <Page />}
            </Suspense>
            <ConnectionStatus />
        </ClinicInfoProvider>
    );
}

export default App;
