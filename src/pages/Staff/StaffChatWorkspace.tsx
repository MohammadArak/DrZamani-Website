/* eslint-disable react-hooks/set-state-in-effect */
import Toast from "@/components/Toast";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import useConsultationRealtime from "@/hooks/useConsultationRealtime";
import {
    appointmentApi,
    formatLocalPhone,
    formatPersianDate,
    formatTime,
    toPersianDigits,
    type ConsultationMessage,
    type ConsultationThread,
} from "@/services/appointmentApi";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
    IoArrowForwardOutline,
    IoChatbubbleEllipsesOutline,
    IoCheckmarkDoneOutline,
    IoImageOutline,
    IoInformationCircleOutline,
    IoSearchOutline,
    IoSendOutline,
} from "react-icons/io5";

const statusLabel: Record<ConsultationThread["appointment_status"], string> = {
    pending: "در انتظار",
    confirmed: "تأیید شده",
    completed: "انجام شده",
    cancelled: "لغو شده",
};

const StaffChatWorkspace = ({
    token,
    threads,
    initialAppointmentId,
    onRefresh,
}: {
    token: string;
    threads: ConsultationThread[];
    initialAppointmentId?: number | null;
    onRefresh: () => Promise<void>;
}) => {
    const [selectedId, setSelectedId] = useState<number | null>(initialAppointmentId ?? threads[0]?.appointment_id ?? null);
    const [messages, setMessages] = useState<ConsultationMessage[]>([]);
    const [body, setBody] = useState("");
    const [search, setSearch] = useState("");
    const [view, setView] = useState<"all" | "unread" | "unanswered">("all");
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
    const imageUrlsRef = useRef<Record<number, string>>({});
    const initializedRef = useRef(false);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const realtimeRefreshTimer = useRef(0);
    const [toast, setToast] = useState<{ message: string; kind: "success" | "error" }>({
        message: "",
        kind: "success",
    });
    const activeThread = threads.find((thread) => thread.appointment_id === selectedId) ?? null;
    const filtered = useMemo(() => {
        const needle = search.trim().toLocaleLowerCase("fa");
        return threads.filter((thread) => {
            if (view === "unread" && thread.unread_count === 0) return false;
            if (view === "unanswered" && thread.last_sender_type !== "patient") return false;
            if (!needle) return true;
            return [thread.patient_name, thread.patient_phone, thread.service_title]
                .some((value) => value.toLocaleLowerCase("fa").includes(needle));
        });
    }, [search, threads, view]);

    const loadMessages = useCallback(async (quiet = false) => {
        if (selectedId === null) return;
        if (!quiet) setLoading(true);
        try {
            setMessages(await appointmentApi.staffConsultation(token, selectedId));
            await onRefresh();
        } catch (error) {
            if (!quiet) {
                setToast({
                    message: error instanceof Error ? error.message : "دریافت گفتگو ناموفق بود",
                    kind: "error",
                });
            }
        } finally {
            if (!quiet) setLoading(false);
        }
    }, [onRefresh, selectedId, token]);

    const realtimeStatus = useConsultationRealtime(token, (event) => {
        if (event.appointment_id !== selectedId) return;
        window.clearTimeout(realtimeRefreshTimer.current);
        realtimeRefreshTimer.current = window.setTimeout(
            () => void loadMessages(true),
            120,
        );
    });

    useEffect(() => {
        if (!initializedRef.current && threads.length) {
            initializedRef.current = true;
            setSelectedId(initialAppointmentId ?? threads[0].appointment_id);
        }
    }, [initialAppointmentId, threads]);

    useEffect(() => {
        if (initialAppointmentId) setSelectedId(initialAppointmentId);
    }, [initialAppointmentId]);

    useEffect(() => {
        void loadMessages();
        const timer = window.setInterval(() => void loadMessages(true), 30_000);
        return () => window.clearInterval(timer);
    }, [loadMessages]);

    useEffect(() => {
        const missing = messages.filter(
            (message) => message.has_image && !imageUrlsRef.current[message.id],
        );
        if (!missing.length || selectedId === null) return;
        let cancelled = false;
        void Promise.all(
            missing.map(async (message) => {
                const blob = await appointmentApi.staffConsultationImage(
                    token,
                    selectedId,
                    message.id,
                );
                return [message.id, URL.createObjectURL(blob)] as const;
            }),
        ).then((entries) => {
            if (cancelled) {
                entries.forEach(([, url]) => URL.revokeObjectURL(url));
                return;
            }
            const next = { ...imageUrlsRef.current };
            entries.forEach(([id, url]) => { next[id] = url; });
            imageUrlsRef.current = next;
            setImageUrls(next);
        }).catch(() => setToast({ message: "نمایش تصویر ناموفق بود", kind: "error" }));
        return () => { cancelled = true; };
    }, [messages, selectedId, token]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, imageUrls]);

    useEffect(
        () => () => {
            window.clearTimeout(realtimeRefreshTimer.current);
            Object.values(imageUrlsRef.current).forEach(URL.revokeObjectURL);
        },
        [],
    );

    const send = async (event: FormEvent) => {
        event.preventDefault();
        if (!body.trim() || selectedId === null) return;
        setSending(true);
        try {
            await appointmentApi.sendStaffConsultationMessage(token, selectedId, body.trim());
            setBody("");
            await loadMessages(true);
        } catch (error) {
            setToast({
                message: error instanceof Error ? error.message : "ارسال پیام ناموفق بود",
                kind: "error",
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <section className="chat-workspace grid h-[calc(100vh-4rem)] min-h-[620px] overflow-hidden bg-[#f4f6f9] lg:grid-cols-[330px_minmax(0,1fr)_270px]">
            <Toast {...toast} onClose={() => setToast((value) => ({ ...value, message: "" }))} />
            <aside className={`${selectedId !== null ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-l border-slate-200 bg-white`}>
                <header className="border-b border-slate-100 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs text-secondary-deep">مرکز گفتگو</span>
                            <h2 className="mt-1 font-dana text-2xl text-primary">پیام‌ها</h2>
                            <span className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                <span className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === "live" ? "bg-emerald-500" : "bg-amber-400"}`} />
                                {realtimeStatus === "live" ? "دریافت زنده فعال" : "در حال اتصال"}
                            </span>
                        </div>
                        <span className="rounded-full bg-primary px-2.5 py-1 text-xs text-white">
                            {toPersianDigits(threads.reduce((sum, item) => sum + item.unread_count, 0))}
                        </span>
                    </div>
                    <label className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-slate-500 focus-within:ring-2 focus-within:ring-secondary/30">
                        <IoSearchOutline />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="نام، شماره یا خدمت" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    </label>
                    <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
                        {([['all', 'همه'], ['unread', 'خوانده‌نشده'], ['unanswered', 'بی‌پاسخ']] as const).map(([key, label]) => (
                            <button key={key} type="button" onClick={() => setView(key)} className={`flex-1 rounded-lg px-2 py-2 text-[11px] transition ${view === key ? "bg-white font-bold text-primary shadow-sm" : "text-slate-500"}`}>{label}</button>
                        ))}
                    </div>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                    {filtered.map((thread) => (
                        <button
                            key={thread.appointment_id}
                            type="button"
                            onClick={() => setSelectedId(thread.appointment_id)}
                            className={`mb-1.5 flex w-full gap-3 rounded-2xl p-3 text-right transition ${selectedId === thread.appointment_id ? "bg-primary text-white shadow-lg shadow-primary/10" : "hover:bg-slate-50"}`}
                        >
                            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${selectedId === thread.appointment_id ? "bg-white/10 text-secondary" : "bg-secondary/15 text-secondary-deep"}`}>
                                {thread.patient_name.slice(0, 1)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="flex items-center justify-between gap-2">
                                    <b className="truncate text-sm">{thread.patient_name}</b>
                                    {thread.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-primary">{toPersianDigits(thread.unread_count)}</span>}
                                </span>
                                <span className={`mt-1 block truncate text-xs ${selectedId === thread.appointment_id ? "text-slate-300" : "text-slate-400"}`}>{thread.last_message || "گفتگو هنوز شروع نشده"}</span>
                                <span className={`mt-2 block truncate text-[10px] ${selectedId === thread.appointment_id ? "text-slate-400" : "text-slate-400"}`}>{thread.service_title}</span>
                            </span>
                        </button>
                    ))}
                    {!filtered.length && <p className="p-10 text-center text-xs text-slate-400">گفتگویی مطابق فیلتر پیدا نشد.</p>}
                </div>
            </aside>

            <main className={`${selectedId === null ? "hidden lg:flex" : "flex"} min-h-0 flex-col bg-[#f5f7fa]`}>
                {activeThread ? (
                    <>
                        <header className="flex h-18 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <button type="button" onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-primary lg:hidden" aria-label="بازگشت به گفتگوها"><IoArrowForwardOutline /></button>
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 font-bold text-secondary-deep">{activeThread.patient_name.slice(0, 1)}</span>
                                <div className="min-w-0">
                                    <h3 className="truncate font-bold text-primary">{activeThread.patient_name}</h3>
                                    <p className="mt-0.5 truncate text-xs text-slate-400">{activeThread.service_title}</p>
                                </div>
                            </div>
                            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 sm:block">{statusLabel[activeThread.appointment_status]}</span>
                        </header>
                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
                            <div className="mx-auto max-w-3xl space-y-3">
                                {loading ? <p className="py-16 text-center text-sm text-slate-400">در حال دریافت پیام‌ها…</p> : messages.length ? messages.map((message) => {
                                    const mine = message.sender_type === "staff";
                                    return (
                                        <article key={message.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                                            <div className={`max-w-[86%] rounded-3xl px-4 py-3 shadow-sm md:max-w-[72%] ${mine ? "rounded-tr-md bg-primary text-white" : "rounded-tl-md border border-slate-200 bg-white text-slate-700"}`}>
                                                {message.has_image && imageUrls[message.id] && (
                                                    <a href={imageUrls[message.id]} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-2xl">
                                                        <img src={imageUrls[message.id]} alt={message.image_requirement_title ?? "تصویر مشاوره"} className="max-h-80 w-full object-cover" />
                                                    </a>
                                                )}
                                                {message.image_requirement_title && <p className="mb-1 text-xs opacity-65">{message.image_requirement_title}</p>}
                                                {message.body && <p className="whitespace-pre-wrap text-sm leading-7">{message.body}</p>}
                                                <span className="mt-2 flex items-center justify-end gap-1 text-[10px] opacity-55">
                                                    {new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}
                                                    {mine && message.read_at && <IoCheckmarkDoneOutline />}
                                                </span>
                                            </div>
                                        </article>
                                    );
                                }) : (
                                    <div className="py-24 text-center"><IoChatbubbleEllipsesOutline className="mx-auto text-5xl text-secondary" /><h3 className="mt-4 font-dana text-xl text-primary">شروع گفتگو</h3><p className="mt-2 text-sm text-slate-400">اولین پاسخ مطب را برای بیمار ارسال کنید.</p></div>
                                )}
                                <div ref={bottomRef} />
                            </div>
                        </div>
                        <form onSubmit={send} className="shrink-0 border-t border-slate-200 bg-white p-3 md:p-4">
                            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-secondary focus-within:ring-4 focus-within:ring-secondary/10">
                                <button disabled={!body.trim() || sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-lg text-white disabled:opacity-40" aria-label="ارسال پیام">
                                    {sending ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    ) : (
                                        <IoSendOutline className="rotate-180" />
                                    )}
                                </button>
                                <AutoGrowTextarea value={body} onChange={(event) => setBody(event.target.value)} maxHeight={144} maxLength={2000} placeholder="پاسخ به بیمار…" className="min-h-10 min-w-0 flex-1 bg-transparent px-2 py-2 text-sm leading-6 outline-none" />
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-1 items-center justify-center text-center"><div><IoChatbubbleEllipsesOutline className="mx-auto text-6xl text-secondary" /><h3 className="mt-4 font-dana text-2xl text-primary">یک گفتگو را انتخاب کنید</h3></div></div>
                )}
            </main>

            <aside className="hidden min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-5 lg:block">
                {activeThread ? (
                    <>
                        <div className="text-center">
                            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary/15 text-2xl font-bold text-secondary-deep">{activeThread.patient_name.slice(0, 1)}</span>
                            <h3 className="mt-3 font-bold text-primary">{activeThread.patient_name}</h3>
                            <a href={`tel:${activeThread.patient_phone}`} dir="ltr" className="mt-1 block text-sm text-secondary-deep">{formatLocalPhone(activeThread.patient_phone)}</a>
                        </div>
                        <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                            <div className="rounded-2xl bg-slate-50 p-4"><span className="text-[11px] text-slate-400">خدمت</span><b className="mt-1 block text-sm text-primary">{activeThread.service_title}</b></div>
                            <div className="rounded-2xl bg-slate-50 p-4"><span className="text-[11px] text-slate-400">زمان نوبت</span><b className="mt-1 block text-sm text-primary">{formatPersianDate(activeThread.appointment_date)}</b><span className="mt-1 block text-xs text-slate-500">ساعت {toPersianDigits(formatTime(activeThread.appointment_time))}</span></div>
                            {activeThread.patient_note && <div className="rounded-2xl bg-amber-50 p-4"><span className="flex items-center gap-1 text-[11px] text-amber-700"><IoInformationCircleOutline /> توضیح بیمار</span><p className="mt-2 text-xs leading-6 text-amber-900">{activeThread.patient_note}</p></div>}
                            <div className="rounded-2xl bg-slate-50 p-4"><span className="flex items-center gap-1 text-[11px] text-slate-400"><IoImageOutline /> تصاویر پزشکی</span><p className="mt-2 text-xs leading-6 text-slate-500">تصاویر داخل گفتگو خصوصی هستند و با کلیک در اندازه کامل باز می‌شوند.</p></div>
                        </div>
                    </>
                ) : null}
            </aside>
        </section>
    );
};

export default StaffChatWorkspace;
