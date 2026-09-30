/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter } from "react-router";
import { lazy } from "react";

const Landing = lazy(() => import("@/pages/Landing"));
const Appointment = lazy(() => import("@/pages/Appointment"));
const Staff = lazy(() => import("@/pages/Staff"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Landing />,
    },
    {
        path: "/appointment",
        element: <Appointment />,
    },
    {
        path: "/staff",
        element: <Staff />,
    },
    {
        path: "*",
        element: <NotFound />,
    },
]);
