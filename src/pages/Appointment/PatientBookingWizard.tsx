import {useConfirmDialog} from "@/hooks/useConfirmDialog";
import useModalScope from "@/hooks/useModalScope";
/* eslint-disable react-hooks/set-state-in-effect */
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import ServiceIcon from "@/components/ServiceIcon";
import {
    appointmentApi,
    formatPersianDate,
    formatTime,
    formatToman,
    toPersianDigits,
    type Appointment,
    type AvailableDate,
    type AvailableSlot,
    type Service
} from "@/services/appointmentApi";
import {
    useEffect,
    useRef,
    useState
} from "react";
import {
    IoCheckmarkCircle,
    IoCloseOutline
} from "react-icons/io5";

import { errorMessage } from "./patientUi";
const bookingSteps = [
    {label:"سابقه", title:"سابقهٔ مراجعه", help:"بگویید قبلاً در این مطب معاینه شده‌اید یا این اولین مراجعهٔ شماست."},
    {label:"خدمت", title:"انتخاب خدمت", help:"خدمت موردنظر را انتخاب کنید. هزینه و شرایط پرداخت هر خدمت پیش از ادامه نمایش داده می‌شود."},
    {label:"تاریخ", title:"انتخاب تاریخ", help:"روزهای دارای ظرفیت را ببینید و یک روز مناسب انتخاب کنید. می‌توانید برای تغییر خدمت به مرحلهٔ قبل برگردید."},
    {label:"ساعت", title:"انتخاب ساعت", help:"یکی از ساعت‌های آزاد روز انتخاب‌شده را بردارید. اگر ظرفیتی نیست، تاریخ دیگری را بررسی کنید."},
    {label:"تأیید", title:"بررسی و ثبت", help:"خدمت، تاریخ، ساعت و مبلغ را بررسی کنید؛ نوبت فقط بعد از ثبت نهایی و در صورت لزوم تکمیل پرداخت تأیید می‌شود."},
];
type BookingDraft = {
    hasPreviousVisit: boolean | null;
    serviceId: number | null;
    date: string;
    startTime: string;
    note: string;
    isUrgent: boolean;
};

const BookingWizard = ({
    token,
    services,
    onClose,
    onBooked,
}: {
    token: string;
    services: Service[];
    onClose: () => void;
    onBooked: (item: Appointment) => void;
}) => {
    const [step, setStep] = useState(1);
    const stepHeading = useRef<HTMLHeadingElement>(null);
    useEffect(() => { stepHeading.current?.focus(); }, [step]);
    const [draft, setDraft] = useState<BookingDraft>({
        hasPreviousVisit: null,
        serviceId: null,
        date: "",
        startTime: "",
        note: "",
        isUrgent: false,
    });
    const [dates, setDates] = useState<AvailableDate[]>([]);
    const [slots, setSlots] = useState<AvailableSlot[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [waitlistJoined, setWaitlistJoined] = useState(false);

    useEffect(() => {
        if(step!==3||!draft.serviceId)return;
        let active=true;setDates([]);setBusy(true);setError("");
        void appointmentApi.getAvailableDates(draft.serviceId,draft.isUrgent)
            .then(result=>{if(active)setDates(result);})
            .catch(reason=>{if(active)setError(errorMessage(reason));})
            .finally(()=>{if(active)setBusy(false);});
        return()=>{active=false;};
    },[draft.isUrgent,draft.serviceId,step]);

    useEffect(() => {
        if(step!==4||!draft.date||!draft.serviceId)return;
        let active=true;setSlots([]);setBusy(true);setError("");
        void appointmentApi.getAvailableSlots(draft.date,draft.serviceId,draft.isUrgent)
            .then(result=>{if(active)setSlots(result);})
            .catch(reason=>{if(active)setError(errorMessage(reason));})
            .finally(()=>{if(active)setBusy(false);});
        return()=>{active=false;};
    },[draft.date,draft.isUrgent,draft.serviceId,step]);

    useEffect(() => {
        setWaitlistJoined(false);
    }, [draft.isUrgent, draft.serviceId]);

    const selectedService = services.find(
        (item) => item.id === draft.serviceId,
    );
    const urgentExtra =
        draft.isUrgent && selectedService ? selectedService.urgent_extra_toman : 0;
    const payableNow = selectedService
        ? selectedService.payment_mode === "full"
            ? selectedService.price_toman + urgentExtra
            : selectedService.payment_mode === "deposit"
              ? Math.min(
                    selectedService.price_toman + urgentExtra,
                    selectedService.deposit_toman + urgentExtra,
                )
              : urgentExtra
        : 0;
    const canContinue =
        (step === 1 && draft.hasPreviousVisit !== null) ||
        (step === 2 && Boolean(draft.serviceId)) ||
        (step === 3 && Boolean(draft.date)) ||
        (step === 4 && Boolean(draft.startTime));

    const submit = async () => {
        if (
            !draft.serviceId ||
            !draft.date ||
            !draft.startTime ||
            draft.hasPreviousVisit === null
        )
            return;
        setBusy(true);
        setError("");
        try {
            const result = await appointmentApi.createAppointment(token, {
                service_id: draft.serviceId,
                appointment_date: draft.date,
                start_time: draft.startTime,
                has_previous_visit: draft.hasPreviousVisit,
                is_urgent: draft.isUrgent,
                patient_note: draft.note || undefined,
            });
            if (result.requires_payment && result.payment_url) {
                window.location.assign(result.payment_url);
                return;
            }
            if (result.appointment) onBooked(result.appointment);
            else throw new Error("پاسخ ثبت نوبت کامل نیست");
        } catch (submitError) {
            setError(errorMessage(submitError));
        } finally {
            setBusy(false);
        }
    };

    const {ask,confirmation}=useConfirmDialog();
    const requestClose=async()=>{if(busy)return;if((draft.hasPreviousVisit!==null||draft.serviceId!==null||draft.note.trim())&&!await ask("انتخاب‌ها و توضیحات نوبت هنوز ثبت نشده‌اند؛ از رزرو خارج شوید؟",{cancelLabel:"ادامهٔ رزرو"}))return;onClose();};
    const modal = useModalScope<HTMLDivElement>(true,()=>void requestClose(),busy);
    return (
        <>{confirmation}<div ref={modal} tabIndex={-1} role="dialog" aria-modal="true" aria-label="دریافت نوبت حضوری"
            className="fixed inset-0 z-100 overflow-hidden text-slate-800 motion-safe:animate-[fade-in_.2s_ease-out]" style={{display:"flex",justifyContent:"center",background:"#0b182870"}}
            dir="rtl"
        >
            <div style={{width:"min(1280px,100%)",height:"100dvh",overflowY:"auto",background:"#f5f7fd"}}>
            <header className="sticky top-0 z-10 bg-primary px-4 py-4 text-white shadow-lg">
                <div className="mx-auto flex max-w-4xl items-center justify-between">
                    <button disabled={busy} onClick={()=>void requestClose()} aria-label="بستن" style={{minWidth:44,minHeight:44}}>
                        <IoCloseOutline size={28} />
                    </button>
                    <h2 className="font-dana text-xl text-white">دریافت نوبت حضوری</h2>
                    <span className="w-7" />
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-7 pb-32">
                <ol className="mb-5 flex items-start gap-1" aria-label="مراحل رزرو">
                    {bookingSteps.map((item,index) => <li key={item.label} aria-current={step === index+1 ? "step" : undefined} className="min-w-0 flex-1 text-center">
                        <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold ${index+1 <= step ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-500"}`}>
                            {index+1 < step ? <IoCheckmarkCircle aria-label="انجام‌شده" /> : toPersianDigits(index+1)}
                        </span>
                        <span className="mt-2 block text-xs text-primary">{item.label}</span>
                    </li>)}
                </ol>
                <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-secondary-deep" aria-live="polite">مرحلهٔ {toPersianDigits(step)} از {toPersianDigits(bookingSteps.length)}</p>
                    <h3 ref={stepHeading} tabIndex={-1} style={{scrollMarginTop:96}} className="mt-2 font-dana text-xl text-primary">{bookingSteps[step-1].title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{bookingSteps[step-1].help}</p>
                    <p className="mt-2 text-xs leading-6 text-slate-500">با «مرحله قبل» انتخاب‌هایتان را ویرایش کنید؛ تا ثبت نهایی نوبتی رزرو نمی‌شود.</p>
                </div>
                {error && (
                    <div
                        role="alert"
                        className="mb-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700"
                    >
                        {error}
                    </div>
                )}
                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <section
                    key={step}
                    className="app-step-enter rounded-4xl bg-white p-5 shadow-sm md:p-8"
                >
                    {step === 1 && (
                        <>
                            <h3 className="font-dana text-2xl text-primary">
                                آیا قبلاً توسط دکتر زمانی معاینه شده‌اید؟
                            </h3>
                            <div className="mt-7 grid gap-4 sm:grid-cols-2">
                                {[
                                    [true, "بله، قبلاً معاینه شده‌ام"],
                                    [false, "خیر، اولین مراجعه من است"],
                                ].map(([value, label]) => (
                                    <button
                                        key={String(value)}
                                        onClick={() =>
                                            setDraft((d) => ({
                                                ...d,
                                                hasPreviousVisit:
                                                    value as boolean,
                                            }))
                                        }
                                        className={`rounded-2xl border p-5 text-right transition ${draft.hasPreviousVisit === value ? "border-secondary bg-secondary/10 ring-2 ring-secondary/20" : "border-slate-200 hover:border-secondary/50"}`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span
                                                className={`h-5 w-5 rounded-full border-2 ${draft.hasPreviousVisit === value ? "border-secondary bg-secondary ring-4 ring-secondary/15" : "border-slate-300"}`}
                                            />
                                            {label as string}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <h3 className="font-dana text-2xl text-primary">
                                برای کدام خدمت نوبت می‌خواهید؟
                            </h3>
                            <div className="mt-7 grid gap-4 sm:grid-cols-2">
                                {services.map((service) => (
                                    <button
                                        key={service.id}
                                        onClick={() => {
                                            setDates([]);
                                            setSlots([]);
                                            setDraft((d) => ({
                                                ...d,
                                                serviceId: service.id,
                                                date: "",
                                                startTime: "",
                                                isUrgent: false,
                                            }));
                                        }}
                                        className={`rounded-2xl border p-5 text-right transition ${draft.serviceId === service.id ? "border-secondary bg-secondary/10 ring-2 ring-secondary/20" : "border-slate-200 hover:border-secondary/50"}`}
                                    >
                                        <ServiceIcon
                                            icon={service.icon_key}
                                            className="mb-4 text-3xl text-secondary-deep"
                                        />
                                        <b className="block text-primary">
                                            {service.title}
                                        </b>
                                        <span className="mt-2 block text-sm leading-6 text-slate-500">
                                            {service.description}
                                        </span>
                                        <span className="mt-3 block text-xs font-bold text-secondary-deep">
                                            {toPersianDigits(
                                                service.duration_minutes,
                                            )}{" "}
                                            دقیقه
                                            {service.allows_media_chat
                                                ? " · دارای ارسال عکس و گفت‌وگو"
                                                : ""}
                                        </span>
                                        <span className="mt-3 block text-sm font-bold text-primary">
                                            بهای خدمت{" "}
                                            {service.payment_mode === "none"
                                                ? "رایگان"
                                                : formatToman(
                                                      service.price_toman,
                                                  )}
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-500">
                                            {service.payment_mode === "deposit"
                                                ? "قابل پرداخت به‌عنوان بیعانه"
                                                : service.payment_mode === "full"
                                                  ? "قابل پرداخت به‌عنوان کل ویزیت"
                                                  : "بدون نیاز به پرداخت آنلاین"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            {selectedService?.urgent_enabled && (
                                <div className="mb-6 grid gap-3 sm:grid-cols-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDates([]);
                                            setSlots([]);
                                            setDraft((value) => ({
                                                ...value,
                                                isUrgent: false,
                                                date: "",
                                                startTime: "",
                                            }));
                                        }}
                                        className={`rounded-2xl border p-4 text-right ${!draft.isUrgent ? "border-secondary bg-secondary/10" : "border-slate-200"}`}
                                    >
                                        <b className="text-primary">نوبت عادی</b>
                                        <span className="mt-1 block text-xs text-slate-500">ساعت‌های معمول مطب</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDates([]);
                                            setSlots([]);
                                            setDraft((value) => ({
                                                ...value,
                                                isUrgent: true,
                                                date: "",
                                                startTime: "",
                                            }));
                                        }}
                                        className={`rounded-2xl border p-4 text-right ${draft.isUrgent ? "border-rose-400 bg-rose-50" : "border-slate-200"}`}
                                    >
                                        <b className="text-rose-700">نوبت فوری</b>
                                        <span className="mt-1 block text-xs text-rose-600">
                                            مبلغ اضافه {formatToman(selectedService.urgent_extra_toman)}
                                        </span>
                                    </button>
                                </div>
                            )}
                            <h3 className="font-dana text-2xl text-primary">
                                تاریخ حضور را انتخاب کنید
                            </h3>
                            {busy ? (
                                <p className="mt-8 text-slate-500">
                                    در حال دریافت روزهای قابل رزرو…
                                </p>
                            ) : dates.length ? (
                                <AvailabilityCalendar
                                    dates={dates}
                                    value={draft.date}
                                    onChange={(date) =>
                                        setDraft((current) => ({
                                            ...current,
                                            date,
                                            startTime: "",
                                        }))
                                    }
                                    className="mt-7"
                                />
                            ) : (
                                <div className="mt-7 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-900">
                                    <b className="block">فعلاً زمان خالی وجود ندارد</b>
                                    <p className="mt-2 text-sm leading-7 text-amber-800">
                                        با عضویت در لیست انتظار، بعد از لغو یک نوبت اولین ظرفیت مناسب به شما پیامک می‌شود.
                                    </p>
                                    <button
                                        type="button"
                                        disabled={busy || waitlistJoined || !draft.serviceId}
                                        onClick={async () => {
                                            if (!draft.serviceId) return;
                                            setBusy(true);
                                            setError("");
                                            try {
                                                await appointmentApi.joinWaitlist(token, {
                                                    service_id: draft.serviceId,
                                                    desired_date: null,
                                                    is_urgent: draft.isUrgent,
                                                });
                                                setWaitlistJoined(true);
                                            } catch (reason) {
                                                setError(errorMessage(reason));
                                            } finally {
                                                setBusy(false);
                                            }
                                        }}
                                        className="mt-4 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                                    >
                                        {waitlistJoined ? "در لیست انتظار ثبت شدید" : "عضویت در لیست انتظار"}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                    {step === 4 && (
                        <>
                            <h3 className="font-dana text-2xl text-primary">
                                ساعت حضور را انتخاب کنید
                            </h3>
                            {busy ? (
                                <p className="mt-8 text-slate-500">
                                    در حال دریافت ساعت‌های خالی…
                                </p>
                            ) : (
                                <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {slots.map((slot) => (
                                        <button
                                            key={slot.start_time}
                                            onClick={() =>
                                                setDraft((d) => ({
                                                    ...d,
                                                    startTime: slot.start_time,
                                                }))
                                            }
                                            className={`rounded-2xl border px-3 py-4 font-bold transition ${draft.startTime === slot.start_time ? "border-secondary bg-secondary text-primary ring-2 ring-secondary/20" : "border-slate-200 text-slate-700"}`}
                                        >
                                            {toPersianDigits(
                                                formatTime(slot.start_time),
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    {step === 5 && (
                        <>
                            <h3 className="font-dana text-2xl text-primary">
                                بررسی و تأیید نهایی
                            </h3>
                            <dl className="mt-7 grid gap-4 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
                                <div>
                                    <dt className="text-xs text-slate-400">
                                        خدمت
                                    </dt>
                                    <dd className="mt-1 font-bold text-primary">
                                        {selectedService?.title}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">نوع نوبت</dt>
                                    <dd className="mt-1 font-bold">
                                        {draft.isUrgent ? "فوری" : "عادی"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">بهای خدمت</dt>
                                    <dd className="mt-1 font-bold text-primary">
                                        {formatToman(
                                            (selectedService?.price_toman ?? 0) +
                                                (draft.isUrgent
                                                    ? selectedService?.urgent_extra_toman ?? 0
                                                    : 0),
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">قابل پرداخت الآن</dt>
                                    <dd className="mt-1 font-bold text-emerald-700">
                                        {payableNow > 0 ? formatToman(payableNow) : "بدون پرداخت"}
                                        {payableNow > 0 && selectedService && (
                                            <span className="mt-1 block text-[11px] font-normal text-slate-500">
                                                {draft.isUrgent &&
                                                selectedService.payment_mode ===
                                                    "none"
                                                    ? "به‌عنوان هزینه نوبت فوری"
                                                    : selectedService.payment_mode ===
                                                        "deposit"
                                                      ? "به‌عنوان بیعانه"
                                                      : "به‌عنوان کل ویزیت"}
                                            </span>
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">
                                        سابقه مراجعه
                                    </dt>
                                    <dd className="mt-1">
                                        {draft.hasPreviousVisit
                                            ? "دارم"
                                            : "ندارم"}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">
                                        تاریخ
                                    </dt>
                                    <dd className="mt-1">
                                        {formatPersianDate(draft.date)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-slate-400">
                                        ساعت
                                    </dt>
                                    <dd className="mt-1">
                                        {toPersianDigits(
                                            formatTime(draft.startTime),
                                        )}
                                    </dd>
                                </div>
                            </dl>
                            <label className="mt-5 block">
                                <span className="mb-2 block text-sm text-slate-600">
                                    توضیح برای مطب (اختیاری)
                                </span>
                                <textarea
                                    value={draft.note}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            note: e.target.value,
                                        }))
                                    }
                                    maxLength={500}
                                    rows={3}
                                    className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-secondary"
                                />
                            </label>
                        </>
                    )}
                </section>
                <aside className="sticky top-28 hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:block">
                    <span className="text-xs text-secondary-deep">خلاصه نوبت</span>
                    <h3 className="mt-2 font-dana text-xl text-primary">
                        {selectedService?.title ?? "هنوز خدمتی انتخاب نشده"}
                    </h3>
                    <dl className="mt-5 space-y-4 text-sm">
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-400">نوع</dt>
                            <dd>{draft.isUrgent ? "فوری" : "عادی"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-400">تاریخ</dt>
                            <dd className="text-left">{draft.date ? formatPersianDate(draft.date) : "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                            <dt className="text-slate-400">ساعت</dt>
                            <dd>{draft.startTime ? toPersianDigits(formatTime(draft.startTime)) : "—"}</dd>
                        </div>
                        <div className="flex justify-between gap-3 border-t border-slate-100 pt-4">
                            <dt className="font-bold text-primary">پرداخت الآن</dt>
                            <dd className="font-bold text-emerald-700">
                                {payableNow ? formatToman(payableNow) : "بدون پرداخت"}
                            </dd>
                        </div>
                    </dl>
                    <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">
                        در نوبت‌های پرداخت‌دار، زمان تا پایان پرداخت موقتاً برای شما نگه داشته می‌شود.
                    </p>
                </aside>
                </div>
            </main>
            <footer className="sticky inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
                <div className="mx-auto flex max-w-6xl gap-3 lg:pl-[344px]">
                    {step > 1 && (
                        <button
                            disabled={busy}
                            onClick={() => setStep((value) => value - 1)}
                            className="h-12 rounded-2xl border border-slate-200 px-6 text-slate-600"
                        >
                            مرحله قبل
                        </button>
                    )}
                    <button
                        disabled={(step < 5 && !canContinue) || busy}
                        onClick={() =>
                            step === 5
                                ? submit()
                                : setStep((value) => value + 1)
                        }
                        className="h-12 flex-1 rounded-2xl bg-secondary font-bold text-primary shadow-lg shadow-secondary/20 disabled:opacity-40"
                    >
                        {busy
                            ? (step===5?"در حال ثبت…":"در حال دریافت…")
                            : step === 5
                              ? payableNow > 0
                                  ? "پرداخت و ثبت نوبت"
                                  : "تأیید و ثبت نوبت"
                              : "مرحله بعد"}
                    </button>
                </div>
            </footer>
            </div>
        </div></>
    );
};


export default BookingWizard;
