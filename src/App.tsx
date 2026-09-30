import { RouterProvider } from "react-router";
import { router } from "@/routes";
import { Suspense } from "react";
import Loading from "./pages/Loading";
import { ClinicInfoProvider } from "@/contexts/ClinicInfoContext";

import "keen-slider/keen-slider.min.css";

function App() {
    return (
        <ClinicInfoProvider>
            <Suspense
                fallback={<Loading loading={true} className="w-full h-screen" />}
            >
                <RouterProvider router={router} />
            </Suspense>
        </ClinicInfoProvider>
    );
}

export default App;
