/* eslint-disable react-hooks/set-state-in-effect */
import AppSelect from "@/components/AppSelect";
import ServiceIcon from "@/components/ServiceIcon";
import Toast from "@/components/Toast";
import {
    appointmentApi,
    formatLocalPhone,
    formatPersianDate,
    formatTime,
    formatToman,
    toPersianDigits,
    type Appointment,
    type PatientPage,
    type PatientRecord,
} from "@/services/appointmentApi";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
    IoArrowForwardOutline,
    IoCalendarOutline,
    IoCallOutline,
    IoCardOutline,
    IoChatbubblesOutline,
    IoDocumentTextOutline,
    IoPeopleOutline,
    IoSearchOutline,
    IoTimeOutline,
} from "react-icons/io5";

const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10";

type RecordTab = "overview" | "appointments" | "forms" | "conversations" | "payments";

const statusLabel: Record<Appointment["status"], string> = {
    pending: "در انتظار",
    confirmed: "تأیید شده",
    completed: "انجام شده",
    cancelled: "لغو شده",
};

const dateTime = (value: string) =>
    new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Tehran",
    }).format(new Date(value));

const answerLabel = (value: string | boolean | undefined) =>
    value === true ? "بله" : value === false ? "خیر" : value || "بدون پاسخ";

import { useStaffAccess } from "./staffAccess";

export default function StaffPatientsPanel({
    token,
    onOpenConversation,
}: {
    token: string;
    onOpenConversation: (appointmentId: number) => void;
}) {
    const can = useStaffAccess();
    const [pageData, setPageData] = useState<PatientPage>({
        items: [],
        available_tags: [],
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 1,
    });
    const [search, setSearch] = useState("");
    const [tag, setTag] = useState("");
    const [followUpOnly, setFollowUpOnly] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [record, setRecord] = useState<PatientRecord | null>(null);
    const [recordTab, setRecordTab] = useState<RecordTab>("overview");
    const [note, setNote] = useState("");
    const [tagsText, setTagsText] = useState("");
    const [needsFollowUp, setNeedsFollowUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string; kind: "success" | "error" }>({
        message: "",
        kind: "success",
    });

    const loadPatients = useCallback(
        async (page = 1) => {
            setLoading(true);
            try {
                setPageData(
                    await appointmentApi.staffPatients(token, {
                        search: search.trim() || undefined,
                        tag: tag || undefined,
                        needs_follow_up: followUpOnly || undefined,
                        page,
                        page_size: 20,
                    }),
                );
            } catch (error) {
                setToast({ message: error instanceof Error ? error.message : "دریافت بیماران ناموفق بود", kind: "error" });
            } finally {
                setLoading(false);
            }
        },
        [followUpOnly, search, tag, token],
    );

    const loadRecord = useCallback(
        async (id: number) => {
            setLoading(true);
            try {
                const value = await appointmentApi.staffPatientRecord(token, id);
                setRecord(value);
                setSelectedId(id);
                setNote(value.internal_note ?? "");
                setTagsText(value.tags.join("، "));
                setNeedsFollowUp(value.needs_follow_up);
            } catch (error) {
                setToast({ message: error instanceof Error ? error.message : "دریافت پرونده ناموفق بود", kind: "error" });
            } finally {
                setLoading(false);
            }
        },
        [token],
    );

    useEffect(() => {
        void loadPatients();
    }, [loadPatients]);

    const saveRecord = async (event: FormEvent) => {
        event.preventDefault();
        if (!record) return;
        setSaving(true);
        try {
            const tags = tagsText
                .split(/[,،\n]/)
                .map((item) => item.trim())
                .filter((item, index, items) => item && items.indexOf(item) === index);
            const updated = await appointmentApi.updateStaffPatientRecord(token, record.id, {
                internal_note: note.trim() || null,
                tags,
                needs_follow_up: needsFollowUp,
            });
            setRecord(updated);
            setTagsText(updated.tags.join("، "));
            setToast({ message: "اطلاعات داخلی پرونده ذخیره شد", kind: "success" });
            await loadPatients(pageData.page);
        } catch (error) {
            setToast({ message: error instanceof Error ? error.message : "ذخیره پرونده ناموفق بود", kind: "error" });
        } finally {
            setSaving(false);
        }
    };

    const activeAppointments = record?.appointments.filter((item) =>
        ["pending", "confirmed"].includes(item.status),
    );
    const latestConversation = record?.conversations[0];
    const recordTabs = useMemo(
        () => [
            { id: "overview" as const, label: "نمای کلی" },
            ...(can("appointments.view") ? [{ id: "appointments" as const, label: `نوبت‌ها (${record?.appointments.length ?? 0})` }] : []),
            ...(can("intake.view") ? [{ id: "forms" as const, label: "فرم‌ها" }] : []),
            ...(can("consultations.view") ? [{ id: "conversations" as const, label: `گفتگوها (${record?.conversations.length ?? 0})` }] : []),
            ...(can("finance.view") ? [{ id: "payments" as const, label: "پرداخت‌ها" }] : []),
        ],
        [can, record],
    );

    return (
        <section className="app-panel-enter min-w-0">
            <Toast {...toast} onClose={() => setToast((value) => ({ ...value, message: "" }))} />
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <span className="text-sm text-secondary-deep">پرونده، پیگیری و سابقه ارتباط</span>
                    <h2 className="mt-1 font-dana text-3xl text-primary">بیماران</h2>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
                    {toPersianDigits(pageData.total)} بیمار
                </span>
            </div>

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void loadPatients(1);
                }}
                className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_210px_auto]"
            >
                <label className="relative">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} pl-10`} placeholder="نام، موبایل، کد ملی یا شناسه اتباع" />
                    <IoSearchOutline className="absolute left-3 top-3 text-xl text-slate-400" />
                </label>
                <AppSelect
                    value={tag}
                    onChange={setTag}
                    options={[{ value: "", label: "همه برچسب‌ها" }, ...pageData.available_tags.map((value) => ({ value, label: value }))]}
                    disabled={!can("patients.records.view")}
                    ariaLabel="فیلتر برچسب بیمار"
                />
                <button className="h-11 rounded-xl bg-primary px-5 text-sm font-bold text-white">جست‌وجو</button>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 md:col-span-3">
                    <input type="checkbox" disabled={!can("patients.records.view")} checked={followUpOnly} onChange={(event) => setFollowUpOnly(event.target.checked)} className="h-4 w-4 accent-amber-600" />
                    فقط بیماران نیازمند پیگیری
                </label>
            </form>

            <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <aside className={`${record ? "hidden xl:block" : "block"} h-fit overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm`}>
                    <div className="max-h-[72vh] divide-y divide-slate-100 overflow-y-auto">
                        {pageData.items.map((patient) => (
                            <button
                                key={patient.id}
                                type="button"
                                disabled={!can("patients.records.view")}
                                onClick={() => void loadRecord(patient.id)}
                                className={`w-full p-4 text-right transition hover:bg-slate-50 ${selectedId === patient.id ? "bg-secondary/10" : ""}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <b className="block truncate text-sm text-primary">{patient.full_name}</b>
                                        <span dir="ltr" className="mt-1 block w-fit text-xs text-slate-400">{formatLocalPhone(patient.phone)}</span>
                                    </div>
                                    {patient.needs_follow_up && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">پیگیری</span>}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {patient.tags.slice(0, 3).map((value) => <span key={value} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] text-slate-600">{value}</span>)}
                                </div>
                                <p className="mt-3 text-[11px] text-slate-400">
                                    {toPersianDigits(patient.appointment_count)} نوبت
                                    {patient.next_appointment_date ? ` · نوبت بعدی ${formatPersianDate(patient.next_appointment_date)}` : ""}
                                </p>
                            </button>
                        ))}
                        {!pageData.items.length && <p className="p-10 text-center text-sm text-slate-400">بیماری پیدا نشد.</p>}
                    </div>
                    {pageData.total_pages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs">
                            <button disabled={pageData.page <= 1} onClick={() => void loadPatients(pageData.page - 1)} className="rounded-lg px-2 py-1 text-primary disabled:opacity-30">قبلی</button>
                            <span className="text-slate-400">{toPersianDigits(pageData.page)} از {toPersianDigits(pageData.total_pages)}</span>
                            <button disabled={pageData.page >= pageData.total_pages} onClick={() => void loadPatients(pageData.page + 1)} className="rounded-lg px-2 py-1 text-primary disabled:opacity-30">بعدی</button>
                        </div>
                    )}
                </aside>

                <div className={`${record ? "block" : "hidden xl:block"} min-w-0`}>
                    {!record ? (
                        <div className="flex min-h-96 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                            <IoPeopleOutline className="text-5xl text-secondary" />
                            <h3 className="mt-4 font-dana text-xl text-primary">یک بیمار را انتخاب کنید</h3>
                            <p className="mt-2 text-sm leading-7 text-slate-500">مشخصات، نوبت‌ها، فرم‌ها، گفتگوها و پرداخت‌ها در یک پرونده نمایش داده می‌شوند.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                <div className="bg-[linear-gradient(135deg,#173c5b,#2f6387)] p-5 text-white sm:p-6">
                                    <button type="button" onClick={() => { setRecord(null); setSelectedId(null); }} className="mb-4 inline-flex items-center gap-1 text-xs text-slate-200 xl:hidden"><IoArrowForwardOutline /> بازگشت به بیماران</button>
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <span className="text-xs text-secondary">پرونده شماره {toPersianDigits(record.id)}</span>
                                            <h3 className="mt-1 font-dana text-2xl">{record.first_name} {record.last_name}</h3>
                                            <p dir="ltr" className="mt-2 w-fit text-sm text-slate-200">{formatLocalPhone(record.phone)}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <a href={`tel:${record.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-bold text-white transition hover:bg-white/20"><IoCallOutline /> تماس</a>
                                            <a href={`sms:${record.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-xs font-bold text-white transition hover:bg-white/20"><IoChatbubblesOutline /> پیامک</a>
                                            {latestConversation && <button type="button" onClick={() => onOpenConversation(latestConversation.appointment_id)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-secondary px-3 text-xs font-bold text-primary"><IoChatbubblesOutline /> گفتگو</button>}
                                        </div>
                                    </div>
                                    <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
                                        {[
                                            ["کل نوبت", record.appointment_count],
                                            ["انجام‌شده", record.completed_count],
                                            ["نوبت فعال", activeAppointments?.length ?? 0],
                                        ].map(([label, value]) => (
                                            <div key={String(label)} className="rounded-2xl bg-white/8 p-3">
                                                <b className="block text-xl">{toPersianDigits(value)}</b>
                                                <span className="mt-1 block text-[10px] text-slate-300 sm:text-xs">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 p-3"><span className="text-xs text-slate-400">جنسیت</span><b className="mt-1 block text-slate-700">{record.gender === "female" ? "خانم" : record.gender === "male" ? "آقا" : "ثبت نشده"}</b></div>
                                        <div className="rounded-2xl bg-slate-50 p-3"><span className="text-xs text-slate-400">تاریخ تولد</span><b className="mt-1 block text-slate-700">{record.birth_date_jalali ? toPersianDigits(record.birth_date_jalali) : "ثبت نشده"}</b></div>
                                        <div className="rounded-2xl bg-slate-50 p-3"><span className="text-xs text-slate-400">شناسه هویتی</span><b className="mt-1 block text-slate-700">{toPersianDigits(record.national_id || record.foreign_identifier || "ثبت نشده")}</b></div>
                                        <div className="min-w-0 rounded-2xl bg-slate-50 p-3"><span className="text-xs text-slate-400">ایمیل</span><b dir="ltr" className="mt-1 block truncate text-right text-slate-700">{record.email || "ثبت نشده"}</b></div>
                                    </div>
                                    <form onSubmit={saveRecord} className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                                        <fieldset disabled={!can("patients.records.edit")}><label className="flex items-center justify-between gap-3 text-sm font-bold text-amber-900">
                                            نیازمند پیگیری
                                            <input type="checkbox" checked={needsFollowUp} onChange={(event) => setNeedsFollowUp(event.target.checked)} className="h-5 w-5 accent-amber-600" />
                                        </label>
                                        <label className="mt-4 block text-xs text-slate-500">برچسب‌ها
                                            <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} className={`${inputClass} mt-1`} placeholder="بعد از عمل، تماس مجدد" />
                                        </label>
                                        <label className="mt-3 block text-xs text-slate-500">یادداشت داخلی
                                            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={5000} className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10" placeholder="فقط کارکنان مطب این متن را می‌بینند" />
                                        </label>
                                        <button disabled={saving || !can("patients.records.edit")} className="mt-3 h-10 w-full rounded-xl bg-primary text-xs font-bold text-white disabled:opacity-50">{saving ? "در حال ذخیره…" : "ذخیره پرونده"}</button></fieldset>
                                    </form>
                                </div>
                            </article>

                            {record.duplicate_candidates.length > 0 && (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                    <b>پرونده مشابه احتمالی پیدا شد</b>
                                    <p className="mt-1 text-xs leading-6">پیش از ثبت اطلاعات جدید، نام، تاریخ تولد و شناسه هویتی را بررسی کنید.</p>
                                </div>
                            )}

                            <nav className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5">
                                {recordTabs.map((item) => (
                                    <button key={item.id} type="button" onClick={() => setRecordTab(item.id)} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${recordTab === item.id ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"}`}>{item.label}</button>
                                ))}
                            </nav>

                            {recordTab === "overview" && (
                                <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                    <h4 className="font-dana text-xl text-primary">خط زمانی پرونده</h4>
                                    <div className="mt-5 space-y-1">
                                        {record.timeline.slice(0, 30).map((item, index) => (
                                            <div key={`${item.kind}-${item.occurred_at}-${index}`} className="relative flex gap-3 pb-5 before:absolute before:right-4 before:top-8 before:h-full before:w-px before:bg-slate-100 last:before:hidden">
                                                <span className={`relative z-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.kind === "payment" ? "bg-emerald-50 text-emerald-700" : item.kind === "conversation" ? "bg-sky-50 text-sky-700" : "bg-secondary/15 text-secondary-deep"}`}>
                                                    {item.kind === "payment" ? <IoCardOutline /> : item.kind === "conversation" ? <IoChatbubblesOutline /> : <IoCalendarOutline />}
                                                </span>
                                                <div className="min-w-0 pt-1"><b className="block text-sm text-slate-700">{item.title}</b><span className="mt-1 block text-xs text-slate-400">{item.description} · {dateTime(item.occurred_at)}</span></div>
                                            </div>
                                        ))}
                                        {!record.timeline.length && <p className="py-8 text-center text-sm text-slate-400">هنوز رویدادی ثبت نشده است.</p>}
                                    </div>
                                </section>
                            )}

                            {recordTab === "appointments" && (
                                <section className="space-y-3">
                                    {record.appointments.map((item) => (
                                        <article key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-center">
                                            <div className="flex items-start gap-3"><ServiceIcon icon={item.service_icon_key} className="mt-1 shrink-0 text-2xl text-secondary-deep" /><div><b className="text-primary">{item.service_title}</b><span className="mt-1 block text-xs text-slate-400">{item.tracking_code}</span></div></div>
                                            <div className="text-sm text-slate-600"><span>{formatPersianDate(item.appointment_date)}</span><span className="mt-1 flex items-center gap-1"><IoTimeOutline /> {toPersianDigits(formatTime(item.start_time))}</span></div>
                                            <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600">{statusLabel[item.status]}</span>
                                        </article>
                                    ))}
                                </section>
                            )}

                            {recordTab === "forms" && (
                                <section className="space-y-3">
                                    {record.appointments.filter((item) => item.intake_required).map((item) => (
                                        <details key={item.id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden"><span><b className="text-sm text-primary">{item.service_title}</b><span className="mt-1 block text-xs text-slate-400">{formatPersianDate(item.appointment_date)}</span></span><span className={`rounded-full px-3 py-1 text-xs ${item.intake_completed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{item.intake_completed ? "تکمیل شده" : "تکمیل نشده"}</span></summary>
                                            {item.intake_completed && item.intake_submission && (
                                                <div className="grid gap-3 border-t border-slate-100 bg-slate-50/60 p-4 md:grid-cols-2">
                                                    {item.intake_form.questions.map((question) => <div key={question.key} className="rounded-xl bg-white p-3"><span className="text-xs leading-5 text-slate-400">{question.label}</span><b className="mt-1 block whitespace-pre-line text-sm leading-6 text-slate-700">{answerLabel(item.intake_submission?.answers[question.key])}</b></div>)}
                                                    {item.intake_form.consents.map((consent) => <div key={consent.key} className="rounded-xl bg-white p-3"><span className="text-xs text-slate-400">رضایت‌نامه</span><b className="mt-1 block text-sm text-slate-700">{consent.title}</b><span className="mt-1 block text-xs text-emerald-700">{item.intake_submission?.accepted_consents.includes(consent.key) ? "پذیرفته شده" : "پذیرفته نشده"}</span></div>)}
                                                </div>
                                            )}
                                        </details>
                                    ))}
                                    {!record.appointments.some((item) => item.intake_required) && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400"><IoDocumentTextOutline className="mx-auto mb-3 text-4xl text-secondary" />فرمی برای این بیمار ثبت نشده است.</div>}
                                </section>
                            )}

                            {recordTab === "conversations" && (
                                <section className="space-y-3">
                                    {record.conversations.map((item) => (
                                        <button key={item.appointment_id} type="button" onClick={() => onOpenConversation(item.appointment_id)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-right shadow-sm transition hover:border-secondary/40">
                                            <span className="min-w-0"><b className="block text-sm text-primary">{item.service_title}</b><span className="mt-1 block truncate text-xs text-slate-400">{item.last_message || "تصویر پزشکی"}</span></span>
                                            <span className="shrink-0 text-xs text-slate-500">{toPersianDigits(item.message_count)} پیام · {toPersianDigits(item.image_count)} تصویر{item.unread_count ? ` · ${toPersianDigits(item.unread_count)} جدید` : ""}</span>
                                        </button>
                                    ))}
                                    {!record.conversations.length && <p className="rounded-2xl bg-white p-10 text-center text-sm text-slate-400">گفتگویی ثبت نشده است.</p>}
                                </section>
                            )}

                            {recordTab === "payments" && can("finance.view") && (
                                <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 p-5"><h4 className="font-dana text-xl text-primary">پرداخت‌های بیمار</h4><b className="text-sm text-emerald-700">جمع تأییدشده: {formatToman(record.total_paid_toman)}</b></div>
                                    <div className="divide-y divide-slate-100">
                                        {record.payments.map((item) => <div key={item.id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_160px_120px] md:items-center"><span><b className="text-slate-700">{item.service_title}</b><span className="mt-1 block text-xs text-slate-400">{dateTime(item.created_at)}</span></span><b className="text-primary">{formatToman(item.amount_toman)}</b><span className="rounded-full bg-slate-50 px-3 py-1.5 text-center text-xs text-slate-600">{item.refund_status === "refunded" ? "بازپرداخت‌شده" : item.status}</span></div>)}
                                        {!record.payments.length && <p className="p-10 text-center text-sm text-slate-400">پرداختی ثبت نشده است.</p>}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {loading && <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 mx-auto w-fit rounded-full bg-primary px-4 py-2 text-xs text-white shadow-lg">در حال دریافت اطلاعات…</div>}
        </section>
    );
}
