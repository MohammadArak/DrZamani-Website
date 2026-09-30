import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
    IoCheckmarkCircle,
    IoCloseOutline,
    IoWarningOutline,
} from "react-icons/io5";

const Toast = ({
    message,
    kind = "success",
    onClose,
    duration = 3600,
}: {
    message: string;
    kind?: "success" | "error";
    onClose: () => void;
    duration?: number;
}) => {
    useEffect(() => {
        if (!message) return;
        const timeout = window.setTimeout(onClose, duration);
        return () => window.clearTimeout(timeout);
    }, [duration, message, onClose]);

    if (!message || typeof document === "undefined") return null;
    const success = kind === "success";
    return createPortal(
        <div
            role={success ? "status" : "alert"}
            aria-live={success ? "polite" : "assertive"}
            className={`fixed bottom-24 left-4 z-200 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-sm shadow-2xl motion-safe:animate-[toast-in_.25s_ease-out] sm:min-w-80 md:bottom-6 ${
                success
                    ? "border-emerald-200 text-emerald-800"
                    : "border-rose-200 text-rose-700"
            }`}
            dir="rtl"
        >
            {success ? (
                <IoCheckmarkCircle className="shrink-0 text-xl text-emerald-600" />
            ) : (
                <IoWarningOutline className="shrink-0 text-xl text-rose-600" />
            )}
            <span className="flex-1 leading-6">{message}</span>
            <button
                type="button"
                onClick={onClose}
                aria-label="بستن پیام"
                className="rounded-lg p-1 opacity-60 hover:bg-slate-100 hover:opacity-100"
            >
                <IoCloseOutline />
            </button>
        </div>,
        document.body,
    );
};

export default Toast;
