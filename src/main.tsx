import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";

import App from "./App.tsx";

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error("Root element was not found.");
}

if (rootElement.hasChildNodes()) {
    rootElement.replaceChildren();
}

createRoot(rootElement).render(
    <StrictMode>
        <HelmetProvider>
            <App />
        </HelmetProvider>
    </StrictMode>,
);
