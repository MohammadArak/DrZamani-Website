import ServiceIcon from "@/components/ServiceIcon";
import {
    formatPersianDate,
    formatTime,
    formatToman,
    toPersianDigits,
    type Appointment
} from "@/services/appointmentApi";
import {
    IoCalendarClearOutline,
    IoCalendarOutline,
    IoChatbubblesOutline,
    IoMedicalOutline,
    IoSwapHorizontalOutline,
    IoTimeOutline
} from "react-icons/io5";

import { statusLabels } from "./patientUi";
const AppointmentCard = ({
    item,
    onCancel,
    onOpenChat,
    onReschedule,
    onAddCalendar,
    onOpenIntake,
}: {
    item: Appointment;
    onCancel?: (id: number) => void;
    onOpenChat?: (item: Appointment) => void;
    onReschedule?: (item: Appointment) => void;
    onAddCalendar?: (item: Appointment) => void;
    onOpenIntake?: (item: Appointment) => void;
}) => {
    const status = statusLabels[item.status];
    const canCancel = ["pending", "confirmed"].includes(item.status);
    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-2xl text-secondary-deep">
                        <ServiceIcon icon={item.service_icon_key} />
                    </span>
                    <div>
                        <span className="text-xs text-slate-400">
                            کد پیگیری {item.tracking_code}
                        </span>
                        <h3 className="mt-2 font-bold text-primary">
                            {item.service_title}
                        </h3>
                        <span className="mt-1 block text-xs text-slate-500">
                            زمان ویزیت :{" "}
                            {toPersianDigits(item.service_duration_minutes)}{" "}
                            دقیقه
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                            {item.is_urgent && (
                                <span className="rounded-full bg-rose-50 px-2 py-1 text-rose-700">نوبت فوری</span>
                            )}
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                                {item.amount_paid_toman > 0
                                    ? `${formatToman(item.amount_paid_toman)} پرداخت شده`
                                    : "بدون پرداخت آنلاین"}
                            </span>
                            {item.patient_reschedule_count > 0 && (
                                <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">
                                    {toPersianDigits(item.patient_reschedule_count)} بار جابه‌جا شده
                                </span>
                            )}
                            {item.intake_required && (
                                <span className={`rounded-full px-2 py-1 ${item.intake_completed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                    {item.intake_completed ? "فرم تکمیل شده" : "تکمیل فرم لازم است"}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <span
                    className={`rounded-full px-3 py-1 text-xs ${status.className}`}
                >
                    {status.label}
                </span>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <span className="flex items-center gap-2">
                    <IoCalendarOutline className="text-secondary-deep" />
                    {formatPersianDate(item.appointment_date)}
                </span>
                <span className="flex items-center gap-2">
                    <IoTimeOutline className="text-secondary-deep" />
                    ساعت {toPersianDigits(formatTime(item.start_time))}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                {item.staff_note && (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                        یادداشت مطب: {item.staff_note}
                    </p>
                )}
                {item.consultation_enabled && onOpenChat && (
                    <button
                        type="button"
                        onClick={() => onOpenChat(item)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2 text-sm font-bold text-secondary-deep transition hover:bg-secondary/20"
                    >
                        <IoChatbubblesOutline /> ارسال عکس و گفت‌وگو با مطب
                    </button>
                )}
                {canCancel && item.intake_required && onOpenIntake && (
                    <button
                        type="button"
                        onClick={() => onOpenIntake(item)}
                        className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${item.intake_completed ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-50 text-amber-800 hover:bg-amber-100"}`}
                    >
                        <IoMedicalOutline /> {item.intake_completed ? "مشاهده و ویرایش فرم" : "تکمیل فرم قبل از مراجعه"}
                    </button>
                )}
                {canCancel && onReschedule && (
                    <button
                        type="button"
                        onClick={() => onReschedule(item)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
                    >
                        <IoSwapHorizontalOutline /> تغییر زمان نوبت
                    </button>
                )}
                {canCancel && onAddCalendar && (
                    <button
                        type="button"
                        onClick={() => onAddCalendar(item)}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                    >
                        <IoCalendarClearOutline /> افزودن به تقویم
                    </button>
                )}
                {canCancel && onCancel && (
                    <button
                        onClick={() => onCancel(item.id)}
                        className="mt-5 text-sm text-rose-600 hover:text-rose-700"
                    >
                        لغو این نوبت
                    </button>
                )}
            </div>
            {canCancel && item.patient_reschedule_reason && (
                <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-700">
                    {item.patient_reschedule_reason}
                </p>
            )}
        </article>
    );
};


export default AppointmentCard;
