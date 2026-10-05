import { lazy, Suspense } from "react";
import Loading from "./pages/Loading";
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

function App() {
    return (
        <ClinicInfoProvider>
            <Suspense
                fallback={<Loading loading={true} className="w-full h-screen" />}
            >
                <Page />
            </Suspense>
        </ClinicInfoProvider>
    );
}

export default App;
