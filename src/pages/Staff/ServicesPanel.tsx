/* eslint-disable react-hooks/set-state-in-effect */
import AppSelect from "@/components/AppSelect";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import ServiceIcon from "@/components/ServiceIcon";
import Toast from "@/components/Toast";
import {
    appointmentApi,
    formatPersianDate,
    formatTime,
    toPersianDigits,
    type Service,
    type ServiceScheduleException
} from "@/services/appointmentApi";
import {
    useCallback,
    useEffect,
    useState,
    type FormEvent
} from "react";
import { useStaffAccess } from "./staffAccess";

import DetailsChevron from "./DetailsChevron";
import { errorMessage,inputClass,intakeQuestionTypeOptions,iranWeekOrder,paymentOptions,serviceIconOptions,weekdayNames } from "./staffUi";
const ServiceExceptionsEditor = ({
    token,
    service,
}: {
    token: string;
    service: Service;
}) => {
    const can = useStaffAccess();
    const [items, setItems] = useState<ServiceScheduleException[]>([]);
    const [exceptionDate, setExceptionDate] = useState("");
    const [closed, setClosed] = useState(true);
    const [startTime, setStartTime] = useState("16:00");
    const [endTime, setEndTime] = useState("20:00");
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        try {
            setItems(await appointmentApi.staffServiceExceptions(token, service.id));
        } catch (loadError) {
            setError(errorMessage(loadError));
        }
    }, [service.id, token]);

    useEffect(() => {
        void load();
    }, [load]);

    const add = async () => {
        if (!exceptionDate) return;
        setBusy(true);
        setError("");
        try {
            await appointmentApi.createStaffServiceException(token, service.id, {
                exception_date: exceptionDate,
                is_closed: closed,
                start_time: closed ? null : startTime,
                end_time: closed ? null : endTime,
                note: note.trim() || null,
            });
            setExceptionDate("");
            setNote("");
            await load();
        } catch (addError) {
            setError(errorMessage(addError));
        } finally {
            setBusy(false);
        }
    };

    return (
        <details className="group rounded-2xl border border-slate-200 bg-white sm:col-span-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-bold text-primary marker:hidden">
                <span>
                    تاریخ‌ها و ساعت‌های استثنایی
                    <span className="mt-1 block text-xs font-normal text-slate-500">
                        تعطیلی یا ساعت متفاوت فقط برای {service.title}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                        {toPersianDigits(items.length)} مورد
                    </span>
                    <DetailsChevron />
                </span>
            </summary>
            <div className="app-details-content border-t border-slate-100 p-4">
                {can("schedule.create") && (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <JalaliDatePicker
                            value={exceptionDate}
                            onChange={setExceptionDate}
                            placeholder="تاریخ استثنا"
                        />
                        <label className="flex h-13 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={closed}
                                onChange={(event) => setClosed(event.target.checked)}
                                className="accent-secondary"
                            />
                            خدمت در این روز تعطیل است
                        </label>
                        {!closed && (
                            <div className="app-panel-enter grid grid-cols-2 gap-2">
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(event) => setStartTime(event.target.value)}
                                    className={inputClass}
                                    aria-label="شروع ساعت استثنایی"
                                />
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(event) => setEndTime(event.target.value)}
                                    className={inputClass}
                                    aria-label="پایان ساعت استثنایی"
                                />
                            </div>
                        )}
                        <input
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            placeholder="یادداشت اختیاری"
                            className={inputClass}
                        />
                        <button
                            type="button"
                            disabled={!exceptionDate || busy}
                            onClick={() => void add()}
                            className="h-11 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-40"
                        >
                            افزودن استثنا
                        </button>
                    </div>
                )}
                {error && <p className="mt-3 text-xs text-rose-600">{error}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                    {items.map((item) => (
                        <span
                            key={item.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"
                        >
                            <b>{formatPersianDate(item.exception_date)}</b>
                            <span>
                                {item.is_closed
                                    ? "تعطیل"
                                    : `${formatTime(item.start_time ?? "")} تا ${formatTime(item.end_time ?? "")}`}
                            </span>
                            {can("schedule.delete") && (
                                <button
                                    type="button"
                                    className="text-rose-500"
                                    onClick={async () => {
                                        await appointmentApi.deleteStaffServiceException(
                                            token,
                                            service.id,
                                            item.id,
                                        );
                                        await load();
                                    }}
                                >
                                    حذف
                                </button>
                            )}
                        </span>
                    ))}
                    {!items.length && (
                        <span className="text-xs text-slate-400">هنوز استثنایی ثبت نشده است.</span>
                    )}
                </div>
            </div>
        </details>
    );
};

type IntakeDraft = {
    questions: Service["intake_questions"];
    consents: Service["consents"];
};

const ServiceIntakeEditor = ({
    draft,
    canEdit,
    onChange,
}: {
    draft: IntakeDraft;
    canEdit: boolean;
    onChange: (draft: IntakeDraft) => void;
}) => {
    const updateQuestion = (
        id: number,
        values: Partial<Service["intake_questions"][number]>,
    ) =>
        onChange({
            ...draft,
            questions: draft.questions.map((item) =>
                item.id === id ? { ...item, ...values } : item,
            ),
        });
    const updateConsent = (
        id: number,
        values: Partial<Service["consents"][number]>,
    ) =>
        onChange({
            ...draft,
            consents: draft.consents.map((item) =>
                item.id === id ? { ...item, ...values } : item,
            ),
        });

    return (
        <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white sm:col-span-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:hidden">
                <span>
                    <b className="block text-sm text-primary">فرم قبل از مراجعه و رضایت‌نامه</b>
                    <span className="mt-1 block text-xs text-slate-500">
                        {toPersianDigits(draft.questions.length)} سؤال · {toPersianDigits(draft.consents.length)} رضایت‌نامه
                    </span>
                </span>
                <DetailsChevron />
            </summary>
            <div className="app-details-content border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <b className="text-sm text-primary">سؤال‌های شرح‌حال</b>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">پاسخ‌ها فقط در پنل بیمار و مدیر نمایش داده می‌شوند.</p>
                    </div>
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    ...draft,
                                    questions: [
                                        ...draft.questions,
                                        {
                                            id: -Date.now(),
                                            label: "",
                                            field_type: "short_text",
                                            options: [],
                                            is_required: false,
                                            sort_order: draft.questions.length + 1,
                                        },
                                    ],
                                })
                            }
                            className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white"
                        >
                            افزودن سؤال
                        </button>
                    )}
                </div>
                <div className="mt-3 space-y-3">
                    {draft.questions.map((question, index) => (
                        <div key={question.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1.5fr)_190px_auto]">
                            <label className="text-[11px] text-slate-500">
                                متن سؤال
                                <input
                                    value={question.label}
                                    onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                                    disabled={!canEdit}
                                    maxLength={240}
                                    className={`${inputClass} mt-1`}
                                    placeholder="مثلاً آیا داروی خاصی مصرف می‌کنید؟"
                                />
                            </label>
                            <label className="text-[11px] text-slate-500">
                                نوع پاسخ
                                <AppSelect
                                    value={question.field_type}
                                    onChange={(value) =>
                                        updateQuestion(question.id, {
                                            field_type: value as Service["intake_questions"][number]["field_type"],
                                            options: value === "single_choice" ? question.options : [],
                                        })
                                    }
                                    disabled={!canEdit}
                                    options={intakeQuestionTypeOptions}
                                    ariaLabel="نوع پاسخ سؤال"
                                    className="mt-1"
                                />
                            </label>
                            <div className="flex items-end gap-3 pb-1">
                                <label className="flex h-10 items-center gap-2 text-xs text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={question.is_required}
                                        onChange={(event) => updateQuestion(question.id, { is_required: event.target.checked })}
                                        disabled={!canEdit}
                                        className="h-4 w-4 accent-secondary"
                                    />
                                    الزامی
                                </label>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onChange({
                                                ...draft,
                                                questions: draft.questions
                                                    .filter((item) => item.id !== question.id)
                                                    .map((item, itemIndex) => ({ ...item, sort_order: itemIndex + 1 })),
                                            })
                                        }
                                        className="h-10 text-xs text-rose-600"
                                    >
                                        حذف
                                    </button>
                                )}
                            </div>
                            {question.field_type === "single_choice" && (
                                <label className="app-panel-enter text-[11px] text-slate-500 md:col-span-3">
                                    گزینه‌ها؛ هر گزینه در یک خط
                                    <textarea
                                        value={question.options.join("\n")}
                                        onChange={(event) =>
                                            updateQuestion(question.id, {
                                                options: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean),
                                            })
                                        }
                                        disabled={!canEdit}
                                        rows={3}
                                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                        placeholder={"گزینه اول\nگزینه دوم"}
                                    />
                                </label>
                            )}
                            <span className="sr-only">سؤال {index + 1}</span>
                        </div>
                    ))}
                    {!draft.questions.length && <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">سؤالی تعریف نشده است.</p>}
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
                    <div>
                        <b className="text-sm text-primary">رضایت‌نامه‌ها</b>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">متن تأییدشده پزشک را وارد کنید؛ نسخه همان نوبت ثابت می‌ماند.</p>
                    </div>
                    {canEdit && (
                        <button
                            type="button"
                            onClick={() =>
                                onChange({
                                    ...draft,
                                    consents: [
                                        ...draft.consents,
                                        {
                                            id: -Date.now(),
                                            title: "",
                                            body: "",
                                            is_required: true,
                                            sort_order: draft.consents.length + 1,
                                        },
                                    ],
                                })
                            }
                            className="shrink-0 rounded-xl border border-primary px-3 py-2 text-xs font-bold text-primary"
                        >
                            افزودن رضایت‌نامه
                        </button>
                    )}
                </div>
                <div className="mt-3 space-y-3">
                    {draft.consents.map((consent) => (
                        <div key={consent.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                <input
                                    value={consent.title}
                                    onChange={(event) => updateConsent(consent.id, { title: event.target.value })}
                                    disabled={!canEdit}
                                    maxLength={160}
                                    className={inputClass}
                                    placeholder="عنوان رضایت‌نامه"
                                />
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-xs text-slate-600">
                                        <input
                                            type="checkbox"
                                            checked={consent.is_required}
                                            onChange={(event) => updateConsent(consent.id, { is_required: event.target.checked })}
                                            disabled={!canEdit}
                                            className="h-4 w-4 accent-secondary"
                                        />
                                        الزامی
                                    </label>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onChange({
                                                    ...draft,
                                                    consents: draft.consents
                                                        .filter((item) => item.id !== consent.id)
                                                        .map((item, itemIndex) => ({ ...item, sort_order: itemIndex + 1 })),
                                                })
                                            }
                                            className="text-xs text-rose-600"
                                        >
                                            حذف
                                        </button>
                                    )}
                                </div>
                            </div>
                            <textarea
                                value={consent.body}
                                onChange={(event) => updateConsent(consent.id, { body: event.target.value })}
                                disabled={!canEdit}
                                maxLength={4000}
                                rows={4}
                                className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-7 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                placeholder="متن کامل رضایت‌نامه مورد تأیید پزشک"
                            />
                        </div>
                    ))}
                    {!draft.consents.length && <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">رضایت‌نامه‌ای تعریف نشده است.</p>}
                </div>
            </div>
        </details>
    );
};

const ServicesPanel = ({
    token,
    services,
    onReload,
}: {
    token: string;
    services: Service[];
    onReload: () => Promise<void>;
}) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState(20);
    const [iconKey, setIconKey] = useState<Service["icon_key"]>("medical");
    const [allowsChat, setAllowsChat] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);
    const [paymentModes, setPaymentModes] = useState<
        Record<number, Service["payment_mode"]>
    >({});
    const [urgentStates, setUrgentStates] = useState<Record<number, boolean>>({});
    const [chatStates, setChatStates] = useState<Record<number, boolean>>({});
    const [intakeDrafts, setIntakeDrafts] = useState<Record<number, IntakeDraft>>({});
    const [savingServiceId, setSavingServiceId] = useState<number | null>(null);
    const [message, setMessage] = useState("");
    const [messageKind, setMessageKind] = useState<"success" | "error">(
        "success",
    );
    const can = useStaffAccess();
    const canEdit = can("services.edit");
    const intakeDraftFor = (item: Service): IntakeDraft =>
        intakeDrafts[item.id] ?? {
            questions: item.intake_questions.map((entry) => ({ ...entry, options: [...entry.options] })),
            consents: item.consents.map((entry) => ({ ...entry })),
        };

    const add = async (event: FormEvent) => {
        event.preventDefault();
        try {
            await appointmentApi.createStaffService(token, {
                title,
                description,
                duration_minutes: duration,
                icon_key: iconKey,
                allows_media_chat: allowsChat,
                price_toman: 0,
                payment_mode: "none",
                deposit_toman: 0,
                urgent_enabled: false,
                urgent_extra_toman: 0,
                buffer_before_minutes: 0,
                buffer_after_minutes: 0,
                concurrent_capacity: 1,
                pre_visit_instructions: "",
                post_visit_instructions: "",
                image_requirements: [],
                weekly_schedules: [],
                urgent_schedules: [],
                intake_questions: [],
                consents: [],
                is_active: true,
                sort_order: services.length + 1,
            });
            setTitle("");
            setDescription("");
            setDuration(20);
            setIconKey("medical");
            setAllowsChat(false);
            setShowAddForm(false);
            setMessageKind("success");
            setMessage("خدمت جدید اضافه شد.");
            await onReload();
        } catch (addError) {
            setMessageKind("error");
            setMessage(errorMessage(addError));
        }
    };
    const toggle = async (item: Service) => {
        try {
            await appointmentApi.updateStaffService(token, item.id, {
                title: item.title,
                description: item.description,
                duration_minutes: item.duration_minutes,
                icon_key: item.icon_key,
                allows_media_chat: item.allows_media_chat,
                price_toman: item.price_toman,
                payment_mode: item.payment_mode,
                deposit_toman: item.deposit_toman,
                urgent_enabled: item.urgent_enabled,
                urgent_extra_toman: item.urgent_extra_toman,
                buffer_before_minutes: item.buffer_before_minutes,
                buffer_after_minutes: item.buffer_after_minutes,
                concurrent_capacity: item.concurrent_capacity,
                pre_visit_instructions: item.pre_visit_instructions,
                post_visit_instructions: item.post_visit_instructions,
                image_requirements: item.image_requirements,
                weekly_schedules: item.weekly_schedules,
                urgent_schedules: item.urgent_schedules,
                intake_questions: item.intake_questions,
                consents: item.consents,
                sort_order: item.sort_order,
                is_active: !item.is_active,
            });
            setMessageKind("success");
            setMessage(item.is_active ? "خدمت غیرفعال شد" : "خدمت فعال شد");
            await onReload();
        } catch (toggleError) {
            setMessageKind("error");
            setMessage(errorMessage(toggleError));
        }
    };
    const saveServiceOptions = async (
        item: Service,
        form: HTMLFormElement,
        paymentMode: Service["payment_mode"],
        urgentEnabled: boolean,
        chatEnabled: boolean,
    ) => {
        const data = new FormData(form);
        const imageTitles = String(data.get("image_titles") ?? "")
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean);
        const weeklySchedules = Array.from(
            { length: 7 },
            (_, weekday) => ({
                weekday,
                enabled: data.get(`service_day_${weekday}`) === "on",
                start_time: String(
                    data.get(`service_start_${weekday}`) ?? "16:00",
                ),
                end_time: String(
                    data.get(`service_end_${weekday}`) ?? "20:00",
                ),
            }),
        );
        const urgentSchedules = urgentEnabled
            ? Array.from({ length: 7 }, (_, weekday) => ({
                  weekday,
                  enabled: data.get(`urgent_day_${weekday}`) === "on",
                  start_time: String(
                      data.get(`urgent_start_${weekday}`) ?? "12:00",
                  ),
                  end_time: String(
                      data.get(`urgent_end_${weekday}`) ?? "14:00",
                  ),
              }))
            : [];
        const paymentAmount = Number(data.get("payment_amount_toman") ?? 0);
        setSavingServiceId(item.id);
        try {
            await appointmentApi.updateStaffService(token, item.id, {
                title: item.title,
                description: item.description,
                duration_minutes: Number(data.get("duration")),
                icon_key: String(data.get("icon")) as Service["icon_key"],
                allows_media_chat: chatEnabled,
                price_toman: paymentMode === "none" ? 0 : paymentAmount,
                payment_mode: paymentMode,
                deposit_toman:
                    paymentMode === "deposit" ? paymentAmount : 0,
                urgent_enabled: urgentEnabled,
                urgent_extra_toman: urgentEnabled
                    ? Number(data.get("urgent_extra_toman") ?? 0)
                    : 0,
                buffer_before_minutes: Number(
                    data.get("buffer_before_minutes") ?? 0,
                ),
                buffer_after_minutes: Number(
                    data.get("buffer_after_minutes") ?? 0,
                ),
                concurrent_capacity: Number(
                    data.get("concurrent_capacity") ?? 1,
                ),
                pre_visit_instructions: String(
                    data.get("pre_visit_instructions") ?? "",
                ).trim(),
                post_visit_instructions: String(
                    data.get("post_visit_instructions") ?? "",
                ).trim(),
                image_requirements: chatEnabled
                    ? imageTitles.map((title, index) => ({
                          id: 0,
                          title,
                          is_required: true,
                          sort_order: index + 1,
                      }))
                    : [],
                weekly_schedules: weeklySchedules,
                urgent_schedules: urgentSchedules,
                intake_questions: intakeDraftFor(item).questions.map(
                    (entry, index) => ({
                        ...entry,
                        label: entry.label.trim(),
                        options: entry.options.map((value) => value.trim()).filter(Boolean),
                        sort_order: index + 1,
                    }),
                ),
                consents: intakeDraftFor(item).consents.map((entry, index) => ({
                    ...entry,
                    title: entry.title.trim(),
                    body: entry.body.trim(),
                    sort_order: index + 1,
                })),
                sort_order: item.sort_order,
                is_active: item.is_active,
            });
            setMessageKind("success");
            setMessage("تنظیمات خدمت ذخیره شد");
            await onReload();
            setIntakeDrafts((current) => {
                const next = { ...current };
                delete next[item.id];
                return next;
            });
        } catch (saveError) {
            setMessageKind("error");
            setMessage(errorMessage(saveError));
        } finally {
            setSavingServiceId(null);
        }
    };
    return (
        <section className="app-panel-enter">
            <Toast
                message={message}
                kind={messageKind}
                onClose={() => setMessage("")}
            />
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <span className="text-sm text-secondary-deep">
                        موارد قابل رزرو
                    </span>
                    <h2 className="mt-1 font-dana text-3xl text-primary">
                        خدمات مطب
                    </h2>
                </div>
                {can("services.create") && (
                    <button
                        type="button"
                        onClick={() => setShowAddForm((value) => !value)}
                        className="h-11 rounded-2xl bg-primary px-5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-mild"
                    >
                        {showAddForm ? "بستن فرم" : "افزودن خدمت"}
                    </button>
                )}
            </div>
            {can("services.create") && showAddForm && (
                <form
                    onSubmit={add}
                    className="app-panel-enter mt-6 grid gap-3 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_130px_170px_auto]"
                >
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={inputClass}
                        placeholder="عنوان خدمت"
                        required
                    />
                    <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={inputClass}
                        placeholder="توضیح کوتاه"
                    />
                    <input
                        type="number"
                        min="5"
                        max="240"
                        value={duration}
                        onChange={(event) =>
                            setDuration(Number(event.target.value))
                        }
                        className={inputClass}
                        aria-label="مدت خدمت به دقیقه"
                        placeholder="مدت (دقیقه)"
                        required
                    />
                    <AppSelect
                        value={iconKey}
                        onChange={(value) =>
                            setIconKey(
                                value as Service["icon_key"],
                            )
                        }
                        options={serviceIconOptions}
                        ariaLabel="آیکن خدمت"
                    />
                    <button className="h-11 rounded-xl bg-primary px-5 text-white">
                        افزودن خدمت
                    </button>
                    <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2 xl:col-span-5">
                        <input
                            type="checkbox"
                            checked={allowsChat}
                            onChange={(event) =>
                                setAllowsChat(event.target.checked)
                            }
                            className="h-4 w-4 accent-secondary"
                        />
                        فعال‌سازی ارسال تصویر و گفت‌وگوی آنلاین برای این خدمت
                    </label>
                </form>
            )}
            <div className="mt-5 grid max-w-5xl gap-4">
                {services.map((item, serviceIndex) => (
                    <article
                        key={item.id}
                        className="app-card-enter rounded-2xl border border-slate-200 bg-white p-5"
                        style={{
                            animationDelay: `${Math.min(serviceIndex, 6) * 55}ms`,
                        }}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-2xl text-secondary-deep">
                                    <ServiceIcon icon={item.icon_key} />
                                </span>
                                <div>
                                    <h3 className="font-bold text-primary">
                                        {item.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                                <span
                                    className={`rounded-full px-3 py-1 text-xs ${item.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                                >
                                    {item.is_active ? "فعال" : "غیرفعال"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpandedServiceId((current) =>
                                            current === item.id ? null : item.id,
                                        )
                                    }
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:border-secondary hover:bg-secondary/5"
                                >
                                    {expandedServiceId === item.id
                                        ? "بستن تنظیمات"
                                        : "ویرایش تنظیمات"}
                                </button>
                            </div>
                        </div>
                        <form
                            className={`${
                                expandedServiceId === item.id ? "grid" : "hidden"
                            } app-panel-enter mt-4 gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-2`}
                            onSubmit={(event) => {
                                event.preventDefault();
                                void saveServiceOptions(
                                    item,
                                    event.currentTarget,
                                    paymentModes[item.id] ?? item.payment_mode,
                                    urgentStates[item.id] ?? item.urgent_enabled,
                                    chatStates[item.id] ?? item.allows_media_chat,
                                );
                            }}
                        >
                            <label className="text-xs text-slate-500">
                                مدت خدمت (دقیقه)
                                <input
                                    name="duration"
                                    type="number"
                                    min="5"
                                    max="240"
                                    defaultValue={item.duration_minutes}
                                    disabled={!canEdit}
                                    className={`${inputClass} mt-1`}
                                />
                            </label>
                            <label className="text-xs text-slate-500">
                                آیکن
                                <AppSelect
                                    name="icon"
                                    defaultValue={item.icon_key}
                                    disabled={!canEdit}
                                    options={serviceIconOptions}
                                    ariaLabel="آیکن خدمت"
                                    className="mt-1"
                                />
                            </label>
                            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2 sm:grid-cols-3">
                                <label className="text-xs text-slate-500">
                                    ظرفیت هم‌زمان
                                    <input
                                        name="concurrent_capacity"
                                        type="number"
                                        min="1"
                                        max="20"
                                        defaultValue={item.concurrent_capacity}
                                        disabled={!canEdit}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                                <label className="text-xs text-slate-500">
                                    فاصله قبل (دقیقه)
                                    <input
                                        name="buffer_before_minutes"
                                        type="number"
                                        min="0"
                                        max="180"
                                        step="5"
                                        defaultValue={item.buffer_before_minutes}
                                        disabled={!canEdit}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                                <label className="text-xs text-slate-500">
                                    فاصله بعد (دقیقه)
                                    <input
                                        name="buffer_after_minutes"
                                        type="number"
                                        min="0"
                                        max="180"
                                        step="5"
                                        defaultValue={item.buffer_after_minutes}
                                        disabled={!canEdit}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                            </div>
                            <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white sm:col-span-2">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-bold text-primary marker:hidden">
                                    <span>
                                        روزها و ساعت‌های عادی این خدمت
                                        <span className="mt-1 block text-xs font-normal text-slate-500">
                                            {toPersianDigits(
                                                item.weekly_schedules.filter(
                                                    (day) => day.enabled,
                                                ).length,
                                            )}{" "}
                                            روز فعال در هفته
                                        </span>
                                    </span>
                                    <DetailsChevron />
                                </summary>
                                <div className="app-details-content space-y-2 border-t border-slate-100 bg-slate-50/70 p-3">
                                    {iranWeekOrder.map((weekday) => {
                                        const schedule =
                                            item.weekly_schedules.find(
                                                (entry) =>
                                                    entry.weekday === weekday,
                                            );
                                        return (
                                            <div
                                                key={weekday}
                                                className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[110px_1fr_1fr] sm:items-end"
                                            >
                                                <label className="col-span-2 flex h-9 items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-1 sm:h-11">
                                                    <input
                                                        name={`service_day_${weekday}`}
                                                        type="checkbox"
                                                        defaultChecked={
                                                            schedule?.enabled ??
                                                            false
                                                        }
                                                        disabled={!canEdit}
                                                        className="h-4 w-4 accent-secondary"
                                                    />
                                                    {weekdayNames[weekday]}
                                                </label>
                                                <label className="text-[11px] text-slate-400">
                                                    از ساعت
                                                    <input
                                                        name={`service_start_${weekday}`}
                                                        type="time"
                                                        defaultValue={(
                                                            schedule?.start_time ??
                                                            "16:00"
                                                        ).slice(0, 5)}
                                                        disabled={!canEdit}
                                                        className={`${inputClass} mt-1`}
                                                    />
                                                </label>
                                                <label className="text-[11px] text-slate-400">
                                                    تا ساعت
                                                    <input
                                                        name={`service_end_${weekday}`}
                                                        type="time"
                                                        defaultValue={(
                                                            schedule?.end_time ??
                                                            "20:00"
                                                        ).slice(0, 5)}
                                                        disabled={!canEdit}
                                                        className={`${inputClass} mt-1`}
                                                    />
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </details>
                            {expandedServiceId === item.id && can("schedule.view") && (
                                <ServiceExceptionsEditor
                                    token={token}
                                    service={item}
                                />
                            )}
                            <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
                                <input
                                    name="chat"
                                    type="checkbox"
                                    checked={
                                        chatStates[item.id] ??
                                        item.allows_media_chat
                                    }
                                    onChange={(event) =>
                                        setChatStates((current) => ({
                                            ...current,
                                            [item.id]: event.target.checked,
                                        }))
                                    }
                                    disabled={!canEdit}
                                    className="h-4 w-4 accent-secondary"
                                />
                                ارسال تصویر و گفت‌وگو فعال باشد
                            </label>
                            {(chatStates[item.id] ??
                                item.allows_media_chat) && (
                                <label className="app-panel-enter text-xs text-slate-500 sm:col-span-2">
                                    عنوان عکس‌های موردنیاز؛ هر عنوان در یک خط
                                    <textarea
                                        name="image_titles"
                                        defaultValue={[
                                            ...item.image_requirements,
                                        ]
                                            .sort(
                                                (a, b) =>
                                                    a.sort_order - b.sort_order,
                                            )
                                            .map((entry) => entry.title)
                                            .join("\n")}
                                        disabled={!canEdit}
                                        rows={3}
                                        placeholder={"نمای روبه‌رو\nنیم‌رخ راست\nنیم‌رخ چپ"}
                                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                    />
                                    <span className="mt-1 block">
                                        هر عنوان دقیقاً یک عکس تا ۱۰ مگابایت
                                        دریافت می‌کند.
                                    </span>
                                </label>
                            )}
                            <ServiceIntakeEditor
                                draft={intakeDraftFor(item)}
                                canEdit={canEdit}
                                onChange={(draft) =>
                                    setIntakeDrafts((current) => ({
                                        ...current,
                                        [item.id]: draft,
                                    }))
                                }
                            />
                            <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white sm:col-span-2">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 marker:hidden">
                                    <span>
                                        <b className="block text-sm text-primary">راهنمای قبل و بعد از مراجعه</b>
                                        <span className="mt-1 block text-xs font-normal text-slate-500">در بخش «راهنمای من» پنل بیمار نمایش داده می‌شود.</span>
                                    </span>
                                    <DetailsChevron />
                                </summary>
                                <div className="app-details-content grid gap-4 border-t border-slate-100 bg-slate-50/70 p-4 md:grid-cols-2">
                                    <label className="text-xs text-slate-500">
                                        راهنمای قبل از مراجعه
                                        <textarea
                                            name="pre_visit_instructions"
                                            defaultValue={item.pre_visit_instructions}
                                            disabled={!canEdit}
                                            rows={6}
                                            maxLength={5000}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-7 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                            placeholder={"مثلاً مدارک قبلی را همراه داشته باشید.\nداروهای مصرفی را یادداشت کنید."}
                                        />
                                    </label>
                                    <label className="text-xs text-slate-500">
                                        راهنمای بعد از مراجعه
                                        <textarea
                                            name="post_visit_instructions"
                                            defaultValue={item.post_visit_instructions}
                                            disabled={!canEdit}
                                            rows={6}
                                            maxLength={5000}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm leading-7 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                            placeholder="راهنمای عمومی پیگیری و مراقبت پس از مراجعه"
                                        />
                                    </label>
                                    <p className="text-[11px] leading-5 text-amber-700 md:col-span-2">اطلاعات تشخیصی یا دستور درمان اختصاصی بیمار را اینجا وارد نکنید؛ این متن برای همه بیماران همان خدمت نمایش داده می‌شود.</p>
                                </div>
                            </details>
                            <label className="text-xs text-slate-500 sm:col-span-2">
                                نوع پرداخت
                                <AppSelect
                                    name="payment_mode"
                                    value={
                                        paymentModes[item.id] ??
                                        item.payment_mode
                                    }
                                    onChange={(value) =>
                                        setPaymentModes((current) => ({
                                            ...current,
                                            [item.id]:
                                                value as Service["payment_mode"],
                                        }))
                                    }
                                    disabled={!canEdit}
                                    options={paymentOptions}
                                    ariaLabel="نوع پرداخت"
                                    className="mt-1"
                                />
                            </label>
                            {(paymentModes[item.id] ?? item.payment_mode) !==
                                "none" && (
                                <label className="app-panel-enter text-xs text-slate-500 sm:col-span-2">
                                    {(paymentModes[item.id] ??
                                        item.payment_mode) === "deposit"
                                        ? "مبلغ بیعانه (تومان)"
                                        : "مبلغ کامل خدمت (تومان)"}
                                    <input
                                        key={`${item.id}-${paymentModes[item.id] ?? item.payment_mode}`}
                                        name="payment_amount_toman"
                                        type="number"
                                        min="1000"
                                        step="1000"
                                        required
                                        defaultValue={
                                            (paymentModes[item.id] ??
                                                item.payment_mode) === "deposit"
                                                ? item.deposit_toman
                                                : item.price_toman
                                        }
                                        disabled={!canEdit}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                            )}
                            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 sm:col-span-2">
                                <span>
                                    <b className="block text-sm text-primary">
                                        نوبت فوری
                                    </b>
                                    <span className="mt-1 block text-slate-500">
                                        برنامه و مبلغ اضافه مستقل برای این خدمت
                                    </span>
                                </span>
                                <input
                                    name="urgent_enabled"
                                    type="checkbox"
                                    checked={
                                        urgentStates[item.id] ??
                                        item.urgent_enabled
                                    }
                                    onChange={(event) =>
                                        setUrgentStates((current) => ({
                                            ...current,
                                            [item.id]: event.target.checked,
                                        }))
                                    }
                                    disabled={!canEdit}
                                    className="h-5 w-5 accent-secondary"
                                />
                            </label>
                            {(urgentStates[item.id] ?? item.urgent_enabled) && (
                                <label className="app-panel-enter text-xs text-slate-500 sm:col-span-2">
                                    مبلغ اضافه نوبت فوری (تومان)
                                    <input
                                        name="urgent_extra_toman"
                                        type="number"
                                        min="0"
                                        step="1000"
                                        required
                                        defaultValue={item.urgent_extra_toman}
                                        disabled={!canEdit}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                            )}
                            {(urgentStates[item.id] ?? item.urgent_enabled) && (
                                <div className="app-panel-enter sm:col-span-2">
                                    <p className="mb-2 text-xs font-bold text-slate-600">
                                        ساعت‌های اختصاصی نوبت فوری
                                    </p>
                                    <div className="space-y-2">
                                        {iranWeekOrder.map((weekday) => {
                                            const schedule =
                                                item.urgent_schedules.find(
                                                    (entry) =>
                                                        entry.weekday === weekday,
                                                );
                                            return (
                                                <div
                                                    key={weekday}
                                                    className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:grid-cols-[110px_1fr_1fr] sm:items-end"
                                                >
                                                    <label className="col-span-2 flex items-center gap-2 text-xs font-medium text-slate-700 sm:col-span-1 sm:h-11">
                                                        <input
                                                            name={`urgent_day_${weekday}`}
                                                            type="checkbox"
                                                            defaultChecked={
                                                                schedule?.enabled ??
                                                                false
                                                            }
                                                            disabled={!canEdit}
                                                            className="h-4 w-4 accent-secondary"
                                                        />
                                                        {weekdayNames[weekday]}
                                                    </label>
                                                    <label className="text-[11px] text-slate-400">
                                                        از ساعت
                                                        <input
                                                            name={`urgent_start_${weekday}`}
                                                            type="time"
                                                            defaultValue={(
                                                                schedule?.start_time ??
                                                                "12:00"
                                                            ).slice(0, 5)}
                                                            disabled={!canEdit}
                                                            className={`${inputClass} mt-1`}
                                                        />
                                                    </label>
                                                    <label className="text-[11px] text-slate-400">
                                                        تا ساعت
                                                        <input
                                                            name={`urgent_end_${weekday}`}
                                                            type="time"
                                                            defaultValue={(
                                                                schedule?.end_time ??
                                                                "14:00"
                                                            ).slice(0, 5)}
                                                            disabled={!canEdit}
                                                            className={`${inputClass} mt-1`}
                                                        />
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            {canEdit && (
                                <button
                                    disabled={savingServiceId === item.id}
                                    className="h-11 rounded-xl bg-secondary px-4 text-sm font-bold text-primary shadow-sm transition hover:bg-secondary-mild disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
                                >
                                    {savingServiceId === item.id
                                        ? "در حال ذخیره…"
                                        : "ذخیره تنظیمات خدمت"}
                                </button>
                            )}
                        </form>
                        {canEdit && (
                            <button
                                onClick={() => void toggle(item)}
                                className={`${expandedServiceId === item.id ? "mt-4 inline-flex" : "hidden"} text-sm text-secondary-deep`}
                            >
                                {item.is_active ? "غیرفعال کردن" : "فعال کردن"}
                            </button>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
};


export default ServicesPanel;
