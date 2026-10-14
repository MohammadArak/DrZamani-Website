import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import "./content.css";
import "../api/app/brand_credit.css";
import "./components/BookingClosed.css";

import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error("Root element was not found.");
}

if (rootElement.dataset.shell === "island") {
    // Server-rendered page: keep its HTML, only mount the shared header and footer.
    void import("./islands").then((module) => module.mountChrome()).catch(() => {
        // Keep the server-rendered navigation usable if the shared chunk cannot load.
        document.querySelectorAll(".chrome-fallback").forEach(element => element.classList.remove("chrome-fallback"));
        document.querySelectorAll(".rv-wait").forEach(element => element.classList.remove("rv-wait"));
    });
} else {
    if (rootElement.hasChildNodes()) {
        rootElement.replaceChildren();
    }

    createRoot(rootElement).render(
        <StrictMode>
            <HelmetProvider>
                <ErrorBoundary><App /></ErrorBoundary>
            </HelmetProvider>
        </StrictMode>,
    );
}

// Enables the public connection page on later offline navigations, without polling.
if("serviceWorker" in navigator)window.addEventListener("load",()=>{void navigator.serviceWorker.register("/connection-worker.js").catch(()=>{});},{once:true});
