import {
    type Appointment
} from "@/services/appointmentApi";

export const inputClass =
    "h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-secondary focus:ring-4 focus:ring-secondary/10";
export const genderOptions = [
    { value: "female", label: "خانم" },
    { value: "male", label: "آقا" },
];

export const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "در انجام درخواست خطایی رخ داد";

export const normalizeDigits = (value: string) =>
    value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

export const statusLabels: Record<
    Appointment["status"],
    { label: string; className: string }
> = {
    pending: {
        label: "در انتظار تأیید",
        className: "bg-amber-50 text-amber-700",
    },
    confirmed: {
        label: "تأیید شده",
        className: "bg-emerald-50 text-emerald-700",
    },
    completed: { label: "انجام شده", className: "bg-blue-50 text-blue-700" },
    cancelled: { label: "لغو شده", className: "bg-rose-50 text-rose-700" },
};

