import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import Spinner from "@/components/Spinner";
import Toast from "@/components/Toast";
import useConsultationRealtime from "@/hooks/useConsultationRealtime";
import {
    appointmentApi,
    toPersianDigits,
    type ConsultationMessage,
    type Service,
    type UploadProgress,
} from "@/services/appointmentApi";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from "react";
import {
    IoArrowForwardOutline,
    IoAttachOutline,
    IoCheckmarkCircleOutline,
    IoCheckmarkDoneOutline,
    IoCloseOutline,
    IoImageOutline,
    IoSendOutline,
} from "react-icons/io5";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toLocaleString("fa-IR", {
            maximumFractionDigits: 1,
        })} مگابایت`;
    }
    if (bytes >= 1024) {
        return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("fa-IR")} کیلوبایت`;
    }
    return `${Math.max(0, bytes).toLocaleString("fa-IR")} بایت`;
};

const ConsultationDialog = ({
    token,
    appointmentId,
    title,
    role,
    imageRequirements = [],
    onClose,
}: {
    token: string;
    appointmentId: number;
    title: string;
    role: "patient" | "staff";
    imageRequirements?: Service["image_requirements"];
    onClose: () => void;
}) => {
    const [messages, setMessages] = useState<ConsultationMessage[]>([]);
    const [body, setBody] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [imageRequirementId, setImageRequirementId] = useState<number | null>(
        imageRequirements[0]?.id ?? null,
    );
    const [attachmentOpen, setAttachmentOpen] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
        loaded: 0,
        total: 0,
        percent: 0,
    });
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; kind: "success" | "error" }>({
        message: "",
        kind: "success",
    });
    const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
    const imageUrlsRef = useRef<Record<number, string>>({});
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const uploadedRequirementIds = useMemo(
        () =>
            new Set(
                messages
                    .map((message) => message.image_requirement_id)
                    .filter((value): value is number => value !== null),
            ),
        [messages],
    );
    const remainingRequirements = useMemo(
        () =>
            imageRequirements.filter(
                (item) => !uploadedRequirementIds.has(item.id),
            ),
        [imageRequirements, uploadedRequirementIds],
    );
    const activeRequirementId =
        imageRequirementId !== null &&
        remainingRequirements.some((item) => item.id === imageRequirementId)
            ? imageRequirementId
            : remainingRequirements[0]?.id ?? null;
    const activeRequirement = remainingRequirements.find(
        (item) => item.id === activeRequirementId,
    );

    const load = useCallback(async () => {
        try {
            const result =
                role === "patient"
                    ? await appointmentApi.getConsultation(token, appointmentId)
                    : await appointmentApi.staffConsultation(token, appointmentId);
            setMessages(result);
        } catch (error) {
            setToast({
                message: error instanceof Error ? error.message : "دریافت گفت‌وگو ناموفق بود",
                kind: "error",
            });
        } finally {
            setLoading(false);
        }
    }, [appointmentId, role, token]);

    const realtimeStatus = useConsultationRealtime(
        token,
        (event) => {
            if (event.appointment_id === appointmentId) void load();
        },
        role === "patient",
    );

    useEffect(() => {
        const task = window.setTimeout(() => void load(), 0);
        const fallback = window.setInterval(() => void load(), 30_000);
        return () => {
            window.clearTimeout(task);
            window.clearInterval(fallback);
        };
    }, [load]);

    useEffect(() => {
        const missing = messages.filter(
            (message) => message.has_image && !imageUrlsRef.current[message.id],
        );
        if (!missing.length) return;
        let cancelled = false;
        void Promise.all(
            missing.map(async (message) => {
                const blob =
                    role === "patient"
                        ? await appointmentApi.consultationImage(
                              token,
                              appointmentId,
                              message.id,
                          )
                        : await appointmentApi.staffConsultationImage(
                              token,
                              appointmentId,
                              message.id,
                          );
                return [message.id, URL.createObjectURL(blob)] as const;
            }),
        )
            .then((entries) => {
                if (cancelled) {
                    entries.forEach(([, url]) => URL.revokeObjectURL(url));
                    return;
                }
                const next = { ...imageUrlsRef.current };
                entries.forEach(([id, url]) => {
                    next[id] = url;
                });
                imageUrlsRef.current = next;
                setImageUrls(next);
            })
            .catch(() =>
                setToast({ message: "نمایش یکی از تصاویر ناموفق بود", kind: "error" }),
            );
        return () => {
            cancelled = true;
        };
    }, [appointmentId, messages, role, token]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, imageUrls]);

    useEffect(() => {
        if (!file) {
            setPreviewUrl("");
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(
        () => () => {
            Object.values(imageUrlsRef.current).forEach(URL.revokeObjectURL);
        },
        [],
    );

    const resetAttachment = () => {
        setFile(null);
        setUploadProgress({ loaded: 0, total: 0, percent: 0 });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const closeAttachment = () => {
        if (uploading) return;
        setAttachmentOpen(false);
        resetAttachment();
    };

    const openAttachment = () => {
        if (!remainingRequirements.length) {
            setToast({
                message: "همه عکس‌های خواسته‌شده ارسال شده‌اند",
                kind: "success",
            });
            return;
        }
        setImageRequirementId(activeRequirementId);
        setAttachmentOpen(true);
    };

    const chooseFile = (next: File | null) => {
        if (!next) {
            setFile(null);
            return;
        }
        if (!ACCEPTED_IMAGE_TYPES.has(next.type) || next.size > MAX_IMAGE_SIZE) {
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setToast({
                message: "فقط عکس JPG، PNG یا WebP تا حجم ۱۰ مگابایت مجاز است",
                kind: "error",
            });
            return;
        }
        setFile(next);
        setUploadProgress({ loaded: 0, total: next.size, percent: 0 });
    };

    const send = async (event: FormEvent) => {
        event.preventDefault();
        const text = body.trim();
        if (!text || sendingMessage) return;
        setSendingMessage(true);
        try {
            if (role === "patient") {
                await appointmentApi.sendConsultationMessage(token, appointmentId, text);
            } else {
                await appointmentApi.sendStaffConsultationMessage(token, appointmentId, text);
            }
            setBody("");
            await load();
        } catch (error) {
            setToast({
                message: error instanceof Error ? error.message : "ارسال پیام ناموفق بود",
                kind: "error",
            });
        } finally {
            setSendingMessage(false);
        }
    };

    const upload = async () => {
        if (!file || role !== "patient" || activeRequirementId === null || uploading) {
            return;
        }
        setUploading(true);
        setUploadProgress({ loaded: 0, total: file.size, percent: 0 });
        try {
            await appointmentApi.uploadConsultationImage(
                token,
                appointmentId,
                file,
                activeRequirementId,
                setUploadProgress,
            );
            setToast({ message: "تصویر با موفقیت ارسال شد", kind: "success" });
            await load();
            setAttachmentOpen(false);
            resetAttachment();
        } catch (error) {
            setToast({
                message: error instanceof Error ? error.message : "بارگذاری تصویر ناموفق بود",
                kind: "error",
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-150 overflow-hidden bg-[#f4f7fa] motion-safe:animate-[fade-in_.2s_ease-out]"
            dir="rtl"
        >
            <Toast
                message={toast.message}
                kind={toast.kind}
                onClose={() => setToast((value) => ({ ...value, message: "" }))}
            />
            <section className="chat-workspace flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-[#f5f7fd] motion-safe:animate-[panel-in_.25s_ease-out]">
                <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-white/10 bg-primary px-4 py-3 text-white shadow-lg sm:px-6">
                    <div className="min-w-0">
                        <h2 className="truncate font-dana text-base sm:text-lg">{title}</h2>
                        <span className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-300">
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                    realtimeStatus === "live"
                                        ? "bg-emerald-400"
                                        : "bg-amber-300"
                                }`}
                            />
                            {realtimeStatus === "live"
                                ? "متصل و آماده دریافت پیام"
                                : "در حال برقراری ارتباط"}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={uploading}
                        aria-label="بازگشت به پنل"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition hover:bg-white/10 disabled:opacity-40"
                    >
                        <IoArrowForwardOutline size={24} />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
                    {loading ? (
                        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
                            <Spinner size={22} />
                            در حال دریافت پیام‌ها…
                        </div>
                    ) : messages.length ? (
                        <div className="mx-auto max-w-4xl space-y-3">
                            {messages.map((message) => {
                                const mine = message.sender_type === role;
                                return (
                                    <article
                                        key={message.id}
                                        className={`flex ${mine ? "justify-start" : "justify-end"}`}
                                    >
                                        <div
                                            className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[76%] ${
                                                mine
                                                    ? "rounded-tr-md bg-primary text-white"
                                                    : "rounded-tl-md border border-slate-200 bg-white text-slate-700"
                                            }`}
                                        >
                                            <p
                                                className={`mb-1 text-[11px] ${
                                                    mine
                                                        ? "text-secondary-mild"
                                                        : "text-slate-400"
                                                }`}
                                            >
                                                {mine ? "شما" : message.sender_name}
                                            </p>
                                            {message.has_image && imageUrls[message.id] && (
                                                <a
                                                    href={imageUrls[message.id]}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mb-2 block overflow-hidden rounded-xl"
                                                >
                                                    <img
                                                        src={imageUrls[message.id]}
                                                        alt={
                                                            message.image_requirement_title ??
                                                            "تصویر مشاوره"
                                                        }
                                                        className="max-h-72 w-full object-cover"
                                                    />
                                                </a>
                                            )}
                                            {message.image_requirement_title && (
                                                <p className="mb-1 text-xs opacity-75">
                                                    {message.image_requirement_title}
                                                </p>
                                            )}
                                            {message.body && (
                                                <p className="whitespace-pre-wrap text-sm leading-7">
                                                    {message.body}
                                                </p>
                                            )}
                                            <time className="mt-2 flex items-center justify-end gap-1 text-[10px] opacity-60">
                                                {new Intl.DateTimeFormat("fa-IR", {
                                                    dateStyle: "short",
                                                    timeStyle: "short",
                                                }).format(new Date(message.created_at))}
                                                {mine && message.read_at && (
                                                    <IoCheckmarkDoneOutline />
                                                )}
                                            </time>
                                        </div>
                                    </article>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>
                    ) : (
                        <div className="mx-auto flex min-h-64 max-w-md flex-col items-center justify-center text-center">
                            <IoImageOutline className="text-5xl text-secondary" />
                            <h3 className="mt-4 font-dana text-xl text-primary">
                                گفت‌وگو را شروع کنید
                            </h3>
                            <p className="mt-2 text-sm leading-7 text-slate-500">
                                {role === "patient"
                                    ? "پیام خود را بنویسید یا از دکمه سنجاق، عکس‌های خواسته‌شده را بفرستید."
                                    : "هنوز پیامی برای این گفت‌وگو ثبت نشده است."}
                            </p>
                        </div>
                    )}
                </div>

                <form
                    onSubmit={send}
                    className="shrink-0 border-t border-slate-200 bg-white px-3 py-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-3"
                >
                    <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition focus-within:border-secondary focus-within:ring-4 focus-within:ring-secondary/10">
                        <button
                            type="submit"
                            disabled={!body.trim() || sendingMessage || uploading}
                            aria-label="ارسال پیام"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-lg text-white transition hover:bg-primary-mild disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {sendingMessage ? (
                                <Spinner size={20} customColorClass="text-white" />
                            ) : (
                                <IoSendOutline className="rotate-180" />
                            )}
                        </button>
                        <AutoGrowTextarea
                            value={body}
                            onChange={(event) => setBody(event.target.value)}
                            placeholder={
                                role === "patient"
                                    ? "پیام شما برای مطب…"
                                    : "پاسخ به بیمار…"
                            }
                            maxLength={2000}
                            maxHeight={128}
                            className="min-h-10 min-w-0 flex-1 bg-transparent px-2 py-2 text-sm leading-6 outline-none"
                        />
                        {role === "patient" && imageRequirements.length > 0 && (
                            <button
                                type="button"
                                onClick={openAttachment}
                                disabled={uploading}
                                aria-label="انتخاب نما و ارسال عکس"
                                title={
                                    remainingRequirements.length
                                        ? "انتخاب نما و ارسال عکس"
                                        : "همه عکس‌ها ارسال شده‌اند"
                                }
                                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xl transition disabled:opacity-50 ${
                                    remainingRequirements.length
                                        ? "border-slate-200 bg-white text-primary hover:border-secondary hover:text-secondary-deep"
                                        : "border-emerald-100 bg-emerald-50 text-emerald-600"
                                }`}
                            >
                                {remainingRequirements.length ? (
                                    <IoAttachOutline />
                                ) : (
                                    <IoCheckmarkCircleOutline />
                                )}
                                {remainingRequirements.length > 0 && (
                                    <span className="absolute -left-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-bold text-primary shadow-sm">
                                        {toPersianDigits(remainingRequirements.length)}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </section>

            {attachmentOpen && role === "patient" && (
                <div
                    className="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="attachment-dialog-title"
                >
                    <button
                        type="button"
                        className="absolute inset-0 cursor-default"
                        onClick={closeAttachment}
                        aria-label="بستن پنجره ارسال عکس"
                    />
                    <section className="app-panel-enter relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
                        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
                            <div>
                                <h3
                                    id="attachment-dialog-title"
                                    className="font-dana text-xl text-primary"
                                >
                                    انتخاب نما و عکس
                                </h3>
                                <p className="mt-1 text-xs leading-6 text-slate-500">
                                    ابتدا عنوان نمای خواسته‌شده را انتخاب کنید، سپس عکس همان نما را بفرستید.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeAttachment}
                                disabled={uploading}
                                aria-label="بستن"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl text-slate-600 transition hover:bg-slate-200 disabled:opacity-40"
                            >
                                <IoCloseOutline />
                            </button>
                        </header>

                        <div className="space-y-5 p-4 sm:p-6">
                            <div>
                                <span className="mb-2 block text-sm font-bold text-primary">
                                    ۱. نمای عکس را انتخاب کنید
                                </span>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {remainingRequirements.map((item) => {
                                        const selected = item.id === activeRequirementId;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                disabled={uploading}
                                                onClick={() => setImageRequirementId(item.id)}
                                                className={`flex min-w-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-right transition ${
                                                    selected
                                                        ? "border-secondary bg-secondary/10 ring-2 ring-secondary/15"
                                                        : "border-slate-200 bg-white hover:border-secondary/70"
                                                }`}
                                            >
                                                <span className="min-w-0 flex-1">
                                                    <b className="block truncate text-sm text-primary">
                                                        {item.title}
                                                    </b>
                                                    <span className="mt-1 block text-[10px] text-slate-400">
                                                        {item.is_required ? "الزامی" : "اختیاری"}
                                                    </span>
                                                </span>
                                                <span
                                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                                                        selected
                                                            ? "border-secondary bg-secondary"
                                                            : "border-slate-300 bg-white"
                                                    }`}
                                                >
                                                    {selected && (
                                                        <span className="h-2 w-2 rounded-full bg-primary" />
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <span className="mb-2 block text-sm font-bold text-primary">
                                    ۲. عکس را انتخاب کنید
                                </span>
                                <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-secondary/70 bg-secondary/5 px-4 py-4 text-center transition hover:bg-secondary/10">
                                    <IoImageOutline className="text-3xl text-secondary-deep" />
                                    <b className="mt-2 max-w-full truncate text-sm text-primary">
                                        {file?.name ?? "انتخاب عکس JPG، PNG یا WebP"}
                                    </b>
                                    <span className="mt-1 text-[11px] text-slate-500">
                                        حداکثر حجم ۱۰ مگابایت
                                    </span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={uploading}
                                        className="sr-only"
                                        onChange={(event) =>
                                            chooseFile(event.target.files?.[0] ?? null)
                                        }
                                    />
                                </label>
                            </div>

                            {file && previewUrl && (
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                    <img
                                        src={previewUrl}
                                        alt={`پیش‌نمایش ${activeRequirement?.title ?? "عکس"}`}
                                        className="max-h-64 w-full object-contain"
                                    />
                                    <div className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2 text-xs">
                                        <span className="min-w-0 flex-1 truncate text-slate-600">
                                            {file.name}
                                        </span>
                                        <span className="shrink-0 text-slate-400">
                                            {formatBytes(file.size)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {uploading && (
                                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="flex items-center gap-2 font-bold text-sky-900">
                                            <Spinner size={20} customColorClass="text-sky-600" />
                                            {uploadProgress.percent >= 100
                                                ? "در حال ثبت تصویر…"
                                                : "در حال بارگذاری تصویر"}
                                        </span>
                                        <strong className="text-sky-700">
                                            {toPersianDigits(uploadProgress.percent)}٪
                                        </strong>
                                    </div>
                                    <div
                                        className="mt-3 h-2 overflow-hidden rounded-full bg-sky-100"
                                        role="progressbar"
                                        aria-label="میزان بارگذاری تصویر"
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        aria-valuenow={uploadProgress.percent}
                                    >
                                        <span
                                            className="block h-full rounded-full bg-sky-600 transition-[width] duration-200"
                                            style={{ width: `${uploadProgress.percent}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-[11px] text-sky-700">
                                        {formatBytes(uploadProgress.loaded)} از {formatBytes(
                                            uploadProgress.total || file?.size || 0,
                                        )}
                                    </p>
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={
                                    !file || activeRequirementId === null || uploading
                                }
                                onClick={() => void upload()}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 font-bold text-white transition hover:bg-primary-mild disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {uploading ? (
                                    <>
                                        <Spinner size={20} customColorClass="text-white" />
                                        {uploadProgress.percent >= 100
                                            ? "در حال ثبت تصویر"
                                            : `بارگذاری ${toPersianDigits(uploadProgress.percent)}٪`}
                                    </>
                                ) : (
                                    <>
                                        <IoSendOutline className="rotate-180 text-lg" />
                                        ارسال عکس {activeRequirement?.title ? `«${activeRequirement.title}»` : ""}
                                    </>
                                )}
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default ConsultationDialog;
