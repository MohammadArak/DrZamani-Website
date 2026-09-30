import Toast from "@/components/Toast";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import {
    appointmentApi,
    formatPersianDate,
    formatTime,
    toPersianDigits,
    type Appointment,
    type AvailableDate,
    type AvailableSlot,
    type ClinicSettings,
} from "@/services/appointmentApi";
import { useCallback, useEffect, useState } from "react";
import {
    IoArrowForwardOutline,
    IoCalendarOutline,
    IoCheckmarkCircleOutline,
    IoTimeOutline,
} from "react-icons/io5";

const PatientRescheduleDialog = ({
    token,
    appointment,
    clinic,
    onClose,
    onRescheduled,
}: {
    token: string;
    appointment: Appointment;
    clinic: ClinicSettings;
    onClose: () => void;
    onRescheduled: (appointment: Appointment) => void;
}) => {
    const [dates, setDates] = useState<AvailableDate[]>([]);
    const [slots, setSlots] = useState<AvailableSlot[]>([]);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; kind: "success" | "error" }>({
        message: "",
        kind: "success",
    });
    const remaining = Math.max(
        0,
        clinic.max_patient_reschedules - appointment.patient_reschedule_count,
    );

    const chooseDate = useCallback(
        async (day: string) => {
            setSelectedDate(day);
            setSelectedTime("");
            setLoadingSlots(true);
            try {
                setSlots(
                    await appointmentApi.getPatientRescheduleSlots(
                        token,
                        appointment.id,
                        day,
                    ),
                );
            } catch (error) {
                setSlots([]);
                setToast({
                    message:
                        error instanceof Error
                            ? error.message
                            : "دریافت ساعت‌های آزاد ناموفق بود",
                    kind: "error",
                });
            } finally {
                setLoadingSlots(false);
            }
        },
        [appointment.id, token],
    );

    useEffect(() => {
        let cancelled = false;
        appointmentApi
            .getPatientRescheduleDates(token, appointment.id)
            .then((result) => {
                if (cancelled) return;
                setDates(result);
                if (result[0]) void chooseDate(result[0].date);
            })
            .catch((error) => {
                if (!cancelled)
                    setToast({
                        message:
                            error instanceof Error
                                ? error.message
                                : "دریافت زمان‌های آزاد ناموفق بود",
                        kind: "error",
                    });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [appointment.id, chooseDate, token]);

    const submit = async () => {
        if (!selectedDate || !selectedTime) return;
        setSaving(true);
        try {
            const updated = await appointmentApi.reschedulePatientAppointment(
                token,
                appointment.id,
                {
                    appointment_date: selectedDate,
                    start_time: selectedTime,
                },
            );
            onRescheduled(updated);
        } catch (error) {
            setToast({
                message:
                    error instanceof Error
                        ? error.message
                        : "جابه‌جایی نوبت ناموفق بود",
                kind: "error",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-140 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" dir="rtl">
            <Toast {...toast} onClose={() => setToast((value) => ({ ...value, message: "" }))} />
            <section className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-4xl bg-[#f5f7fa] shadow-2xl sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-4xl">
                <header className="flex shrink-0 items-center justify-between bg-primary px-4 py-4 text-white sm:px-6">
                    <div className="min-w-0">
                        <span className="text-xs text-secondary-mild">تغییر زمان نوبت</span>
                        <h2 className="mt-1 truncate font-dana text-lg">{appointment.service_title}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/10" aria-label="بازگشت">
                        <IoArrowForwardOutline size={23} />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2">
                        <span className="flex items-center gap-2 text-slate-600"><IoCalendarOutline className="text-secondary-deep" /> زمان فعلی: {formatPersianDate(appointment.appointment_date)}</span>
                        <span className="flex items-center gap-2 text-slate-600"><IoTimeOutline className="text-secondary-deep" /> ساعت {toPersianDigits(formatTime(appointment.start_time))}</span>
                    </div>
                    <div className="mt-3 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">
                        تا {toPersianDigits(clinic.reschedule_cutoff_hours)} ساعت قبل از نوبت می‌توانید زمان را تغییر دهید. از {toPersianDigits(remaining)} مرتبه باقی‌مانده استفاده خواهید کرد و زمان جدید دوباره در انتظار تأیید مطب قرار می‌گیرد.
                    </div>

                    <div className="mt-6">
                        <h3 className="font-dana text-lg text-primary">۱. روز جدید را انتخاب کنید</h3>
                        {loading ? (
                            <p className="py-8 text-center text-sm text-slate-400">در حال دریافت روزهای آزاد…</p>
                        ) : dates.length ? (
                            <AvailabilityCalendar
                                dates={dates}
                                value={selectedDate}
                                onChange={(day) => void chooseDate(day)}
                                className="mt-3"
                            />
                        ) : (
                            <p className="mt-3 rounded-2xl bg-slate-100 p-5 text-center text-sm text-slate-500">فعلاً زمان جایگزینی در بازه رزرو وجود ندارد.</p>
                        )}
                    </div>

                    {selectedDate && (
                        <div className="mt-6">
                            <h3 className="font-dana text-lg text-primary">۲. ساعت جدید را انتخاب کنید</h3>
                            {loadingSlots ? (
                                <p className="py-8 text-center text-sm text-slate-400">در حال دریافت ساعت‌ها…</p>
                            ) : slots.length ? (
                                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                                    {slots.map((slot) => {
                                        const value = formatTime(slot.start_time);
                                        return (
                                            <button key={slot.start_time} type="button" onClick={() => setSelectedTime(value)} className={`h-11 rounded-xl border text-sm font-bold transition ${selectedTime === value ? "border-primary bg-primary text-white shadow-md" : "border-slate-200 bg-white text-primary hover:border-secondary"}`}>
                                                {toPersianDigits(value)}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="mt-3 rounded-2xl bg-slate-100 p-5 text-center text-sm text-slate-500">برای این روز ساعت آزادی باقی نمانده است.</p>
                            )}
                        </div>
                    )}

                    {selectedDate && selectedTime && (
                        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                            <IoCheckmarkCircleOutline className="shrink-0 text-2xl" />
                            زمان جدید: {formatPersianDate(selectedDate)}، ساعت {toPersianDigits(selectedTime)}
                        </div>
                    )}
                </div>

                <footer className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
                    <button type="button" onClick={() => void submit()} disabled={!selectedDate || !selectedTime || saving} className="h-12 w-full rounded-2xl bg-secondary font-bold text-primary shadow-lg shadow-secondary/20 disabled:opacity-40">
                        {saving ? "در حال ثبت زمان جدید…" : "ثبت و ارسال برای تأیید مطب"}
                    </button>
                </footer>
            </section>
        </div>
    );
};

export default PatientRescheduleDialog;
