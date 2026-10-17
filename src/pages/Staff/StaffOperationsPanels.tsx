/* eslint-disable react-hooks/set-state-in-effect */
import StaffEditorDialog from "./StaffEditorDialog";
import { useContentConfirm } from "./useContentConfirm";
import AppSelect from "@/components/AppSelect";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import Toast from "@/components/Toast";
import {
    appointmentApi,
    formatLocalPhone,
    formatPersianDate,
    formatTime,
    formatToman,
    toPersianDigits,
    type Appointment,
    type FinanceSummary,
    type PaymentItem,
    type Service,
    type WaitlistEntry,
} from "@/services/appointmentApi";
import { useCallback,useEffect,useMemo,useRef,useState,type FormEvent } from "react";
import {
    IoArrowBackOutline,
    IoArrowForwardOutline,
    IoCardOutline,
    IoCheckmarkCircleOutline,
    IoRefreshOutline,
    IoTimeOutline,
} from "react-icons/io5";

import { useStaffAccess } from "./staffAccess";

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10";

const isoDate = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(value);

const startOfIranWeek = (value = new Date()) => {
    const next = new Date(value);
    next.setHours(12, 0, 0, 0);
    next.setDate(next.getDate() - ((next.getDay() + 1) % 7));
    return next;
};

export const StaffCalendarPanel = ({
    token,
    onChanged,
}: {
    token: string;
    services: Service[];
    onChanged: () => Promise<void>;
}) => {
    const can = useStaffAccess();
    const {ask,confirmation}=useContentConfirm();
    const [dayIndex,setDayIndex]=useState(()=>(new Date().getDay()+1)%7);
    const [weekStart, setWeekStart] = useState(() => startOfIranWeek());
    const [items, setItems] = useState<Appointment[]>([]);
    const [selected, setSelected] = useState<Appointment | null>(null);
    const [moveDate, setMoveDate] = useState("");
    const [moveTime, setMoveTime] = useState("");
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState<{ message: string; kind: "success" | "error" }>({
        message: "",
        kind: "success",
    });
    const days = useMemo(
        () =>
            Array.from({ length: 7 }, (_, index) => {
                const value = new Date(weekStart);
                value.setDate(value.getDate() + index);
                return value;
            }),
        [weekStart],
    );

    const loadSequence=useRef(0);
    const load = useCallback(async () => {
        const sequence=++loadSequence.current;
        setBusy(true);
        try {
            const pages = await Promise.all(
                days.map((day) =>
                    appointmentApi.staffAppointments(token, {
                        appointment_date: isoDate(day),
                        page_size: 100,
                    }),
                ),
            );
            if(sequence!==loadSequence.current)return;
            setItems(pages.flatMap((page) => page.items));
        } catch (error) {
            if(sequence!==loadSequence.current)return;
            setToast({
                message: error instanceof Error ? error.message : "دریافت تقویم ناموفق بود",
                kind: "error",
            });
        } finally {
            if(sequence===loadSequence.current)setBusy(false);
        }
    }, [days, token]);

    useEffect(() => {
        setItems([]);
        void load();
        const sequenceRef=loadSequence;
        return()=>{sequenceRef.current++;};
    }, [load]);

    const move = async (appointment: Appointment, date: string, startTime: string) => {
        if(!await ask(`نوبت ${appointment.patient_name || "مراجع"} به ${formatPersianDate(date)} ساعت ${toPersianDigits(startTime)} منتقل شود؟`,{title:"تغییر زمان نوبت",confirmLabel:"بله",cancelLabel:"خیر"}))return;
        setBusy(true);
        try {
            const updated = await appointmentApi.rescheduleStaffAppointment(
                token,
                appointment.id,
                { appointment_date: date, start_time: startTime },
            );
            setSelected(updated);
            setMoveDate(updated.appointment_date);
            setMoveTime(formatTime(updated.start_time));
            setToast({ message: "زمان نوبت تغییر کرد و پیامک رویداد وارد صف شد", kind: "success" });
            await Promise.all([load(), onChanged()]);
        } catch (error) {
            setToast({
                message: error instanceof Error ? error.message : "جابه‌جایی نوبت ناموفق بود",
                kind: "error",
            });
        } finally {
            setBusy(false);
        }
    };

    const shiftWeek = (amount: number) => {
        const next = new Date(weekStart);
        next.setDate(next.getDate() + amount * 7);
        setWeekStart(next);
        setSelected(null);
    };

    return (
        <section className="app-panel-enter">
            {confirmation}
            <Toast {...toast} onClose={() => setToast((value) => ({ ...value, message: "" }))} />
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="text-sm text-secondary-deep">نمای هفتگی و جابه‌جایی سریع</span>
                    <h2 className="mt-1 font-dana text-3xl text-primary">تقویم نوبت‌ها</h2>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                    <button type="button" onClick={() => shiftWeek(-1)} className="rounded-xl p-2 text-primary hover:bg-slate-50" aria-label="هفته قبل">
                        <IoArrowForwardOutline />
                    </button>
                    <button type="button" onClick={() => setWeekStart(startOfIranWeek())} className="rounded-xl px-3 py-2 text-sm font-bold text-primary hover:bg-slate-50">
                        هفته جاری
                    </button>
                    <button type="button" onClick={() => shiftWeek(1)} className="rounded-xl p-2 text-primary hover:bg-slate-50" aria-label="هفته بعد">
                        <IoArrowBackOutline />
                    </button>
                    <button type="button" onClick={() => void load()} className="rounded-xl p-2 text-secondary-deep hover:bg-secondary/10" aria-label="تازه‌سازی">
                        <IoRefreshOutline />
                    </button>
                </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600">برای دیدن جزئیات یا تغییر زمان، نوبت را انتخاب کنید. در رایانه می‌توانید کارت نوبت را روی روز دیگری بکشید.</p>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:hidden" aria-label="روزهای هفته">{days.map((day,index)=><button type="button" key={isoDate(day)} aria-pressed={index===dayIndex} onClick={()=>setDayIndex(index)} className={`min-h-12 shrink-0 rounded-xl border px-3 text-sm ${index===dayIndex?"border-primary bg-primary text-white":"border-slate-200 bg-white text-primary"}`}>{new Intl.DateTimeFormat("fa-IR",{weekday:"short",day:"numeric"}).format(day)}</button>)}</div>
            <div className="mt-4">
                <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(24,48,79,0.06)]">
                    <div className="grid grid-cols-1 lg:grid-cols-7">
                        {days.map((day,index) => {
                            const key = isoDate(day);
                            const dayItems = items
                                .filter((item) => item.appointment_date === key)
                                .sort((a, b) => a.start_time.localeCompare(b.start_time));
                            const today = key === isoDate(new Date());
                            return (
                                <div
                                    key={key}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        const id = Number(event.dataTransfer.getData("appointment-id"));
                                        const appointment = items.find((item) => item.id === id);
                                        if (appointment && can("appointments.reschedule")) void move(appointment, key, appointment.start_time);
                                    }}
                                    className={`min-w-0 border-l border-slate-100 last:border-l-0 lg:min-h-[420px] ${index===dayIndex?"block":"hidden lg:block"}`}
                                >
                                    <header className={`sticky top-0 z-10 border-b border-slate-100 px-3 py-4 text-center ${today ? "bg-secondary/15" : "bg-white"}`}>
                                        <b className="block text-sm text-primary">
                                            {new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long" }).format(day)}
                                        </b>
                                        <span className="mt-1 block text-sm text-slate-600">
                                            {new Intl.DateTimeFormat("fa-IR-u-ca-persian", { day: "numeric", month: "short" }).format(day)}
                                        </span>
                                    </header>
                                    <div className="space-y-2 p-2">
                                        {dayItems.map((appointment) => (
                                            <button
                                                key={appointment.id}
                                                type="button"
                                                draggable={can("appointments.reschedule") && (appointment.status === "pending" || appointment.status === "confirmed")}
                                                onDragStart={(event) => event.dataTransfer.setData("appointment-id", String(appointment.id))}
                                                onClick={() => {
                                                    setSelected(appointment);
                                                    setMoveDate(appointment.appointment_date);
                                                    setMoveTime(formatTime(appointment.start_time));
                                                }}
                                                className={`w-full cursor-grab rounded-2xl border p-3 text-right transition hover:-translate-y-0.5 hover:shadow-md ${selected?.id === appointment.id ? "border-secondary bg-secondary/10" : "border-slate-100 bg-slate-50"}`}
                                            >
                                                <span className="text-sm font-bold text-secondary-deep">
                                                    {toPersianDigits(formatTime(appointment.start_time))}
                                                </span>
                                                <b className="mt-1 block truncate text-sm text-primary">
                                                    {appointment.patient_name || "مراجع"}
                                                </b>
                                                <span className="mt-1 block truncate text-sm text-slate-500">
                                                    {appointment.service_title}
                                                </span>
                                            </button>
                                        ))}
                                        {!dayItems.length && (
                                            <p className="py-10 text-center text-sm text-slate-500">{busy?"در حال دریافت نوبت‌ها…":"بدون نوبت"}</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {selected&&<StaffEditorDialog compact maxWidth={520} title="تغییر زمان نوبت" busy={busy} onClose={async()=>{if(busy)return;if((moveDate!==selected.appointment_date||moveTime!==formatTime(selected.start_time))&&!await ask("زمان جدید هنوز ثبت نشده است. تغییرات را کنار بگذاریم؟",{confirmLabel:"بله",cancelLabel:"خیر"}))return;setSelected(null);}}>

                            <span className="text-sm text-slate-600">جابه‌جایی نوبت</span>
                            <h3 className="mt-1 font-bold text-primary">{selected.patient_name}</h3>
                            <p className="mt-1 text-sm text-slate-500">{selected.service_title}</p>
                            <div className="mt-5 space-y-3">
                                <JalaliDatePicker value={moveDate} onChange={setMoveDate} placeholder="تاریخ جدید" />
                                <input aria-label="ساعت جدید" type="time" value={moveTime} onChange={(event) => setMoveTime(event.target.value)} className={inputClass} />
                                <button
                                    type="button"
                                    disabled={busy || !moveDate || !moveTime || !can("appointments.reschedule")}
                                    onClick={() => void move(selected, moveDate, moveTime)}
                                    className="h-11 w-full rounded-xl bg-primary font-bold text-white disabled:opacity-40"
                                >
                                    ثبت زمان جدید
                                </button>
                            </div>
                            <p className="mt-4 text-sm leading-5 text-slate-600">
                                ظرفیت، ساعت خدمت و فاصله قبل و بعد دوباره کنترل می‌شود.
                            </p>
                </StaffEditorDialog>}

            </div>
        </section>
    );
};

const waitlistLabels: Record<WaitlistEntry["status"], string> = {
    waiting: "در انتظار",
    notified: "زمان پیشنهاد شده",
    booked: "رزرو شد",
    cancelled: "لغو شد",
    expired: "منقضی شد",
};

export const StaffWaitlistPanel = ({
    token,
    entries,
    onReload,
}: {
    token: string;
    entries: WaitlistEntry[];
    onReload: () => Promise<void>;
}) => {
    const can = useStaffAccess();
    const [busy, setBusy] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; kind: "success" | "error" }>({ message: "", kind: "success" });
    return (
        <section className="app-panel-enter">
            <Toast {...toast} onClose={() => setToast((value) => ({ ...value, message: "" }))} />
            <span className="text-sm text-secondary-deep">صف هوشمند ظرفیت‌های پر</span>
            <h2 className="mt-1 font-dana text-3xl text-primary">لیست انتظار</h2>
            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(24,48,79,0.06)]">
                {entries.length ? entries.map((entry) => (
                    <article key={entry.id} className="grid gap-4 border-b border-slate-100 p-5 last:border-0 md:grid-cols-[1fr_1fr_auto] md:items-center">
                        <div>
                            <b className="text-primary">{entry.patient_name}</b>
                            <span dir="ltr" className="mt-1 block w-fit text-xs text-slate-400">{formatLocalPhone(entry.patient_phone)}</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700">{entry.service_title}</p>
                            <p className="mt-1 text-xs text-slate-400">
                                {entry.offered_date
                                    ? `پیشنهاد: ${formatPersianDate(entry.offered_date)} ساعت ${toPersianDigits(formatTime(entry.offered_start_time ?? ""))}`
                                    : entry.desired_date
                                      ? `تاریخ دلخواه: ${formatPersianDate(entry.desired_date)}`
                                      : "اولین ظرفیت آزاد"}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1.5 text-xs ${entry.status === "notified" ? "bg-amber-50 text-amber-700" : entry.status === "waiting" ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-500"}`}>
                                {waitlistLabels[entry.status]}
                            </span>
                            {entry.status === "notified" && (
                                <button
                                    type="button"
                                    disabled={busy === entry.id || !can("waitlist.edit")}
                                    onClick={async () => {
                                        setBusy(entry.id);
                                        try {
                                            await appointmentApi.updateStaffWaitlist(token, entry.id, "booked");
                                            await onReload();
                                            setToast({ message: "وضعیت لیست انتظار ذخیره شد", kind: "success" });
                                        } catch (error) {
                                            setToast({ message: error instanceof Error ? error.message : "ذخیره ناموفق بود", kind: "error" });
                                        } finally {
                                            setBusy(null);
                                        }
                                    }}
                                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                                >
                                    رزرو بیمار انجام شد
                                </button>
                            )}
                            {["waiting", "notified"].includes(entry.status) && (
                                <button
                                    type="button"
                                    disabled={busy === entry.id || !can("waitlist.edit")}
                                    onClick={async () => {
                                        setBusy(entry.id);
                                        try {
                                            await appointmentApi.updateStaffWaitlist(token, entry.id, "cancelled");
                                            await onReload();
                                            setToast({ message: "درخواست انتظار بسته شد", kind: "success" });
                                        } catch (error) {
                                            setToast({ message: error instanceof Error ? error.message : "ذخیره ناموفق بود", kind: "error" });
                                        } finally {
                                            setBusy(null);
                                        }
                                    }}
                                    className="rounded-xl px-2 py-2 text-xs text-rose-600"
                                >
                                    بستن
                                </button>
                            )}
                        </div>
                    </article>
                )) : (
                    <div className="p-14 text-center text-sm text-slate-400">لیست انتظار خالی است.</div>
                )}
            </div>
        </section>
    );
};

const refundOptions = [
    { value: "none", label: "بدون بازپرداخت" },
    { value: "requested", label: "درخواست‌شده" },
    { value: "processing", label: "در حال انجام" },
    { value: "refunded", label: "بازپرداخت‌شده" },
    { value: "rejected", label: "ردشده" },
];

export const StaffFinancePanel = ({
    token,
    summary,
    payments,
    onReload,
}: {
    token: string;
    summary: FinanceSummary;
    payments: PaymentItem[];
    onReload: () => Promise<void>;
}) => {
    const can = useStaffAccess();
    const [busy, setBusy] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; kind: "success" | "error" }>({ message: "", kind: "success" });
    const save = async (event: FormEvent<HTMLFormElement>, payment: PaymentItem) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(payment.id);
        try {
            await appointmentApi.updateStaffRefund(token, payment.id, {
                status: String(data.get("refund_status")) as PaymentItem["refund_status"],
                amount_toman: Number(data.get("refund_amount_toman") ?? 0),
                reference: String(data.get("refund_reference") ?? "").trim() || null,
                note: String(data.get("refund_note") ?? "").trim() || null,
            });
            await onReload();
            setToast({ message: "وضعیت بازپرداخت ذخیره شد", kind: "success" });
        } catch (error) {
            setToast({ message: error instanceof Error ? error.message : "ذخیره بازپرداخت ناموفق بود", kind: "error" });
        } finally {
            setBusy(null);
        }
    };
    const cards = [
        ["دریافتی تأییدشده", formatToman(summary.collected_toman), <IoCardOutline />],
        ["در انتظار بازپرداخت", formatToman(summary.refund_pending_toman), <IoTimeOutline />],
        ["بازپرداخت‌شده", formatToman(summary.refunded_toman), <IoCheckmarkCircleOutline />],
        ["پرداخت ناموفق", toPersianDigits(summary.failed_count), <IoRefreshOutline />],
    ] as const;
    return (
        <section className="app-panel-enter">
            <Toast {...toast} onClose={() => setToast((value) => ({ ...value, message: "" }))} />
            <span className="text-sm text-secondary-deep">تطبیق پرداخت و پیگیری بازگشت وجه</span>
            <h2 className="mt-1 font-dana text-3xl text-primary">مالی و تسویه</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map(([label, value, icon]) => (
                    <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_45px_rgba(24,48,79,0.05)]">
                        <span className="text-xl text-secondary-deep">{icon}</span>
                        <p className="mt-5 text-xs text-slate-400">{label}</p>
                        <b className="mt-2 block text-lg text-primary">{value}</b>
                    </div>
                ))}
            </div>
            <div className="mt-6 space-y-3">
                {payments.map((payment) => (
                    <details key={payment.id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <summary className="grid cursor-pointer list-none gap-3 p-4 marker:hidden md:grid-cols-[1fr_1fr_150px_140px] md:items-center">
                            <div><b className="text-primary">{payment.patient_name}</b><span className="mt-1 block text-xs text-slate-400">{payment.tracking_code || `پرداخت ${payment.id}`}</span></div>
                            <span className="text-sm text-slate-600">{payment.service_title}</span>
                            <b className="text-sm text-primary">{formatToman(payment.amount_toman)}</b>
                            <span className="rounded-full bg-slate-50 px-3 py-1.5 text-center text-xs text-slate-600">{refundOptions.find((item) => item.value === payment.refund_status)?.label}</span>
                        </summary>
                        <form onSubmit={(event) => void save(event, payment)} className="grid gap-3 border-t border-slate-100 bg-slate-50/60 p-4 md:grid-cols-2 xl:grid-cols-5">
                            <fieldset disabled={!can("finance.refund")} className="contents"><AppSelect name="refund_status" defaultValue={payment.refund_status} options={refundOptions} ariaLabel="وضعیت بازپرداخت" />
                            <input name="refund_amount_toman" type="number" min="0" max={payment.amount_toman} step="1000" defaultValue={payment.refund_amount_toman} className={inputClass} placeholder="مبلغ بازپرداخت" />
                            <input name="refund_reference" defaultValue={payment.refund_reference ?? ""} className={inputClass} placeholder="شماره پیگیری" />
                            <input name="refund_note" defaultValue={payment.refund_note ?? ""} className={inputClass} placeholder="یادداشت" />
                            <button disabled={busy === payment.id || !can("finance.refund")} className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-40">ثبت وضعیت</button></fieldset>
                        </form>
                    </details>
                ))}
                {!payments.length && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-14 text-center text-sm text-slate-400">هنوز پرداختی ثبت نشده است.</div>}
            </div>
        </section>
    );
};
