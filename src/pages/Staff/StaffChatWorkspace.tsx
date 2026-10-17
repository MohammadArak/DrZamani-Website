/* eslint-disable react-hooks/set-state-in-effect */
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import Toast from "@/components/Toast";
import useConversation from "@/hooks/useConversation";
import useConversationImages from "@/hooks/useConversationImages";
import useConversationScroll from "@/hooks/useConversationScroll";
import {
    appointmentApi,
    formatLocalPhone,
    formatPersianDate,
    formatTime,
    toPersianDigits,
    type ConsultationThread,
} from "@/services/appointmentApi";
import { useEffect,useMemo,useState,type FormEvent } from "react";
import {
    IoArrowForwardOutline,
    IoChatbubbleEllipsesOutline,
    IoCheckmarkDoneOutline,
    IoImageOutline,
    IoInformationCircleOutline,
    IoSearchOutline,
    IoSendOutline,
} from "react-icons/io5";
import { useStaffAccess } from "./staffAccess";

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
    const can = useStaffAccess();
    const [selectedId, setSelectedId] = useState<number | null>(initialAppointmentId ?? null);
    const [search, setSearch] = useState("");
    const [view, setView] = useState<"all" | "unread" | "unanswered">("all");
    const [sending, setSending] = useState(false);
    const [results,setResults]=useState<{query:string;items:ConsultationThread[];error:string}|null>(null);
    const [toast, setToast] = useState<{ message: string; kind: "success" | "error" }>({
        message: "",
        kind: "success",
    });
    const {messages,loading,draft:body,setDraft:setBody,sendText,hasOlder,olderLoading,loadOlder,realtimeStatus}=useConversation(token,selectedId,"staff",error=>setToast({message:error instanceof Error?error.message:"دریافت گفتگو ناموفق بود",kind:"error"}),()=>void onRefresh().catch(()=>{}));
    const imageUrls=useConversationImages(token,selectedId,"staff",messages);
    const {container:messageListRef,bottom:bottomRef,onScroll:scrollChanged,older:showOlder}=useConversationScroll(selectedId,messages[messages.length-1]?.id,imageUrls,loadOlder);
    const query=search.trim();
    useEffect(()=>{
        if(!query)return;
        const controller=new AbortController();
        const timer=setTimeout(()=>{void appointmentApi.staffConsultations(token,query,controller.signal).then(items=>{if(!controller.signal.aborted)setResults({query,items,error:""});}).catch(error=>{if(!controller.signal.aborted)setResults({query,items:[],error:error instanceof Error?error.message:"جست‌وجو انجام نشد؛ دوباره تلاش کنید."});});},300);
        return()=>{clearTimeout(timer);controller.abort();};
    },[query,token,threads]);
    const searching=Boolean(query&&results?.query!==query);
    const activeThread = threads.find((thread) => thread.appointment_id === selectedId) ?? results?.items.find(thread=>thread.appointment_id===selectedId) ?? null;
    const filtered = useMemo(() => (query ? results?.query===query ? results.items : [] : threads).filter(thread=>!(view==="unread"&&thread.unread_count===0)&&!(view==="unanswered"&&thread.last_sender_type!=="patient")),[query,results,threads,view]);

    useEffect(() => {
        if (initialAppointmentId) setSelectedId(initialAppointmentId);
    }, [initialAppointmentId]);

    const send = async (event: FormEvent) => {
        event.preventDefault();
        if (!body.trim() || selectedId === null || sending) return;
        setSending(true);
        try {
            await sendText();
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
        <section className="chat-workspace grid grid-cols-1 h-full min-h-0 overflow-hidden bg-[#f4f6f9] lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_260px]">
            <Toast {...toast} onClose={() => setToast((value) => ({ ...value, message: "" }))} />
            <aside className={`${selectedId !== null ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-l border-slate-200 bg-white`}>
                <header className="border-b border-slate-100 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs text-secondary-deep">مرکز گفتگو</span>
                            <h2 className="mt-1 font-dana text-2xl text-primary">پیام‌ها</h2>
                            {realtimeStatus === "expired" && <p role="status" className="text-sm text-amber-800">برای ادامه دوباره وارد شوید.</p>}
                        </div>
                        <span className="rounded-full bg-primary px-2.5 py-1 text-xs text-white">
                            {toPersianDigits(threads.reduce((sum, item) => sum + item.unread_count, 0))}
                        </span>
                    </div>
                    <label className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-slate-500 focus-within:ring-2 focus-within:ring-secondary/30">
                        <IoSearchOutline />
                        <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="جست‌وجوی گفتگوها" maxLength={120} placeholder={can("patients.records.view")?"نام، شماره، کد ملی، خدمت یا پیام":"نام، شماره، خدمت یا پیام"} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    </label>
                    <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1">
                        {([['all', 'همه'], ['unread', 'خوانده‌نشده'], ['unanswered', 'بی‌پاسخ']] as const).map(([key, label]) => (
                            <button key={key} type="button" onClick={() => setView(key)} className={`flex-1 rounded-lg px-2 py-2 text-sm transition ${view === key ? "bg-white font-bold text-primary shadow-sm" : "text-slate-500"}`}>{label}</button>
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
                                    {thread.last_message_at&&<time dateTime={thread.last_message_at} className="shrink-0 text-xs">{new Intl.DateTimeFormat("fa-IR",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Asia/Tehran"}).format(new Date(thread.last_message_at))}</time>}
                                    {thread.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-primary">{toPersianDigits(thread.unread_count)}</span>}
                                </span>
                                <span className={`mt-1 block truncate text-xs ${selectedId === thread.appointment_id ? "text-slate-100" : "text-slate-600"}`}>{thread.last_sender_type ? `${thread.last_sender_type === "staff" ? "مطب" : "مراجع"}: ` : ""}{thread.last_message || "گفتگو هنوز شروع نشده"}</span>
                                <span className={`mt-2 block truncate text-sm ${selectedId === thread.appointment_id ? "text-white" : "text-slate-600"}`}>{thread.service_title}</span>
                            </span>
                        </button>
                    ))}
                    {searching&&<p role="status" className="p-4 text-sm text-slate-600">در حال جست‌وجو…</p>}
                    {query&&results?.query===query&&results.error&&<p role="alert" className="p-4 text-sm text-red-700">{results.error}</p>}
                    {!searching&&!(query&&results?.query===query&&results.error)&&!filtered.length && <p className="p-10 text-center text-xs text-slate-600">گفتگویی مطابق فیلتر پیدا نشد.</p>}
                </div>
            </aside>

            <main className={`${selectedId === null ? "hidden lg:flex" : "flex"} min-w-0 min-h-0 flex-col bg-[#f5f7fa]`}>
                {activeThread ? (
                    <>
                        <header className="flex h-18 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <button type="button" onClick={() => setSelectedId(null)} className="rounded-xl p-2 text-primary lg:hidden" aria-label="بازگشت به گفتگوها"><IoArrowForwardOutline /></button>
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 font-bold text-secondary-deep">{activeThread.patient_name.slice(0, 1)}</span>
                                <div className="min-w-0">
                                    <h3 className="truncate font-bold text-primary" style={{fontSize:"1rem",lineHeight:1.5}}>{activeThread.patient_name}</h3>
                                    <p className="mt-0.5 truncate text-xs text-slate-600">{activeThread.service_title}</p>
                                </div>
                            </div>
                            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 sm:block">{statusLabel[activeThread.appointment_status]}</span>
                        </header>
                        <div ref={messageListRef} onScroll={scrollChanged} className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
                            {hasOlder && <button type="button" onClick={()=>void showOlder()} disabled={olderLoading} className="mx-auto mb-4 block rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-primary">{olderLoading?"در حال دریافت…":"پیام‌های قدیمی‌تر"}</button>}
                            <div className="mx-auto max-w-3xl space-y-3">
                                {loading ? <p className="py-16 text-center text-sm text-slate-600">در حال دریافت پیام‌ها…</p> : messages.length ? messages.map((message) => {
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
                                                <span className="mt-2 flex items-center justify-end gap-1 text-xs opacity-90">
                                                    {new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(message.created_at))}
                                                    {mine && message.read_at && <IoCheckmarkDoneOutline />}
                                                </span>
                                            </div>
                                        </article>
                                    );
                                }) : (
                                    <div className="py-24 text-center"><IoChatbubbleEllipsesOutline className="mx-auto text-5xl text-secondary" /><h3 className="mt-4 font-dana text-xl text-primary">شروع گفتگو</h3><p className="mt-2 text-sm text-slate-600">اولین پاسخ مطب را برای مراجع ارسال کنید.</p></div>
                                )}
                                <div ref={bottomRef} />
                            </div>
                        </div>
                        {can("consultations.send") && <form onSubmit={send} className="shrink-0 border-t border-slate-200 bg-white p-3 md:p-4">
                            <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl bg-slate-50 p-2 focus-within:ring-2 focus-within:ring-secondary/10">
                                <button disabled={!body.trim() || sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-lg text-white disabled:opacity-40" aria-label="ارسال پیام">
                                    {sending ? (
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    ) : (
                                        <IoSendOutline />
                                    )}
                                </button>
                                <AutoGrowTextarea value={body} onChange={(event) => setBody(event.target.value)} maxHeight={144} maxLength={2000} placeholder="پاسخ به مراجع…" className="min-h-10 min-w-0 flex-1 bg-transparent px-2 py-2 text-base leading-7 outline-none" aria-label="متن پیام" />
                            </div>
                        </form>}
                    </>
                ) : (
                    <div className="flex flex-1 items-center justify-center text-center"><div><IoChatbubbleEllipsesOutline className="mx-auto text-6xl text-secondary" /><h3 className="mt-4 font-dana text-2xl text-primary">یک گفتگو را انتخاب کنید</h3></div></div>
                )}
            </main>

            <aside className="hidden min-h-0 overflow-y-auto border-r border-slate-200 bg-white p-5 xl:block">
                {activeThread ? (
                    <>
                        <div className="text-center">
                            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-secondary/15 text-2xl font-bold text-secondary-deep">{activeThread.patient_name.slice(0, 1)}</span>
                            <h3 className="mt-3 font-bold text-primary">{activeThread.patient_name}</h3>
                            <a href={`tel:${activeThread.patient_phone}`} dir="ltr" className="mt-1 block text-sm text-secondary-deep">{formatLocalPhone(activeThread.patient_phone)}</a>
                        </div>
                        <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                            <div className="rounded-2xl bg-slate-50 p-4"><span className="text-[11px] text-slate-600">خدمت</span><b className="mt-1 block text-sm text-primary">{activeThread.service_title}</b></div>
                            <div className="rounded-2xl bg-slate-50 p-4"><span className="text-[11px] text-slate-600">زمان نوبت</span><b className="mt-1 block text-sm text-primary">{formatPersianDate(activeThread.appointment_date)}</b><span className="mt-1 block text-xs text-slate-500">ساعت {toPersianDigits(formatTime(activeThread.appointment_time))}</span></div>
                            {activeThread.patient_note && <div className="rounded-2xl bg-amber-50 p-4"><span className="flex items-center gap-1 text-[11px] text-amber-700"><IoInformationCircleOutline /> توضیح مراجع</span><p className="mt-2 text-xs leading-6 text-amber-900">{activeThread.patient_note}</p></div>}
                            <div className="rounded-2xl bg-slate-50 p-4"><span className="flex items-center gap-1 text-[11px] text-slate-600"><IoImageOutline /> تصاویر پزشکی</span><p className="mt-2 text-xs leading-6 text-slate-500">تصاویر داخل گفتگو خصوصی هستند و با کلیک در اندازه کامل باز می‌شوند.</p></div>
                        </div>
                    </>
                ) : null}
            </aside>
        </section>
    );
};

export default StaffChatWorkspace;
