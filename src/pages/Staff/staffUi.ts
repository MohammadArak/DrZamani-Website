import {
    type Appointment,
    type StaffIdentity
} from "@/services/appointmentApi";

export const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10";
export const errorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "در انجام درخواست خطایی رخ داد";

export type StaffProfile = StaffIdentity;
export type StaffTab =
    | "dashboard"
    | "account-security"
    | "clinic-info"
    | "appointments"
    | "patients"
    | "calendar"
    | "consultations"
    | "waitlist"
    | "schedule"
    | "services"
    | "sms"
    | "finance"
    | "audit"
    | "comments"
    | "articles"
    | "site-services"
    | "site-content"
    | "media"
    | "access";

export const statusLabels: Record<Appointment["status"], string> = {
    pending: "در انتظار",
    confirmed: "تأیید شده",
    completed: "انجام شده",
    cancelled: "لغو شده",
};
export const appointmentStatusOptions = Object.entries(statusLabels).map(
    ([value, label]) => ({ value, label }),
);
export const appointmentFilterOptions = [
    { value: "", label: "همه وضعیت‌ها" },
    ...appointmentStatusOptions,
];
export const serviceIconOptions = [
    { value: "medical", label: "پزشکی" },
    { value: "nose", label: "بینی" },
    { value: "ear", label: "گوش" },
    { value: "throat", label: "حلق" },
    { value: "surgery", label: "جراحی" },
    { value: "followup", label: "پیگیری" },
    { value: "consultation", label: "مشاوره" },
];
export const paymentOptions = [
    { value: "deposit", label: "بیعانه" },
    { value: "full", label: "کل مبلغ" },
    { value: "none", label: "رایگان" },
];
export const intakeQuestionTypeOptions = [
    { value: "short_text", label: "پاسخ کوتاه" },
    { value: "long_text", label: "پاسخ توضیحی" },
    { value: "yes_no", label: "بله یا خیر" },
    { value: "single_choice", label: "انتخاب یک گزینه" },
];
export const genderFilterOptions = [
    { value: "", label: "همه" },
    { value: "female", label: "خانم" },
    { value: "male", label: "آقا" },
];

export const weekdayNames = [
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنج‌شنبه",
    "جمعه",
    "شنبه",
    "یکشنبه",
];
export const iranWeekOrder = [5, 6, 0, 1, 2, 3, 4];
