/* eslint-disable react-hooks/set-state-in-effect */
import JalaliDatePicker from "@/components/JalaliDatePicker";
import Toast from "@/components/Toast";
import {
    appointmentApi,
    formatPersianDate,
    toPersianDigits,
    type ClinicSettings,
    type ScheduleException
} from "@/services/appointmentApi";
import {
    useEffect,
    useState,
    type FormEvent
} from "react";
import {
    IoCloseCircleOutline
} from "react-icons/io5";
import { useStaffAccess } from "./staffAccess";

import { errorMessage,inputClass } from "./staffUi";
const SchedulePanel = ({
    token,
    settings,
    exceptions,
    onReload,
}: {
    token: string;
    settings: ClinicSettings;
    exceptions: ScheduleException[];
    onReload: () => Promise<void>;
}) => {
    const [settingsDraft, setSettingsDraft] = useState(settings);
    const [exceptionDate, setExceptionDate] = useState("");
    const [exceptionNote, setExceptionNote] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [messageKind, setMessageKind] = useState<"success" | "error">(
        "success",
    );
    const can = useStaffAccess();
    const canEdit = can("settings.edit");

    useEffect(() => setSettingsDraft(settings), [settings]);

    const saveSettings = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        try {
            await appointmentApi.updateStaffSettings(token, settingsDraft);
            setMessageKind("success");
            setMessage("تنظیمات نوبت‌دهی ذخیره شد.");
            await onReload();
        } catch (saveError) {
            setMessageKind("error");
            setMessage(errorMessage(saveError));
        } finally {
            setBusy(false);
        }
    };
    const addException = async (event: FormEvent) => {
        event.preventDefault();
        setMessage("");
        if (!exceptionDate) {
            setMessageKind("error");
            setMessage("لطفاً تاریخ تعطیلی را انتخاب کنید.");
            return;
        }
        setBusy(true);
        try {
            await appointmentApi.createStaffException(token, {
                exception_date: exceptionDate,
                is_closed: true,
                start_time: null,
                end_time: null,
                note: exceptionNote || null,
            });
            setExceptionDate("");
            setExceptionNote("");
            setMessageKind("success");
            setMessage("روز تعطیل ثبت شد.");
            await onReload();
        } catch (saveError) {
            setMessageKind("error");
            setMessage(errorMessage(saveError));
        } finally {
            setBusy(false);
        }
    };

    const runOperations = async () => {
        setBusy(true);
        setMessage("");
        try {
            const result = await appointmentApi.runStaffOperations(token);
            setMessageKind("success");
            setMessage(
                `${toPersianDigits(result.queued_reminders)} یادآوری وارد صف شد و ${toPersianDigits(result.sms_sent)} پیامک ارسال شد.`,
            );
            await onReload();
        } catch (operationError) {
            setMessageKind("error");
            setMessage(errorMessage(operationError));
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="app-panel-enter">
            <Toast
                message={message}
                kind={messageKind}
                onClose={() => setMessage("")}
            />
            <div>
                <span className="text-sm text-secondary-deep">
                    ظرفیت و زمان‌بندی مطب
                </span>
                <h2 className="mt-1 font-dana text-3xl text-primary">
                    برنامه نوبت‌دهی
                </h2>
            </div>
            {!canEdit && (
                <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    این حساب دسترسی ویرایش تنظیمات نوبت‌دهی را ندارد.
                </div>
            )}
            <form
                onSubmit={saveSettings}
                className="mt-6 rounded-2xl border border-slate-200 bg-white p-5"
            >
                <h3 className="font-dana text-xl text-primary">تنظیمات اصلی</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <label>
                        <span className="mb-2 block text-sm">
                            مدت پیش‌فرض نوبت (دقیقه)
                        </span>
                        <input
                            type="number"
                            min="5"
                            max="180"
                            disabled={!canEdit}
                            value={settingsDraft.slot_duration_minutes}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    slot_duration_minutes: Number(
                                        e.target.value,
                                    ),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm">
                            بازه رزرو آینده (روز)
                        </span>
                        <input
                            type="number"
                            min="1"
                            max="180"
                            disabled={!canEdit}
                            value={settingsDraft.booking_horizon_days}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    booking_horizon_days: Number(
                                        e.target.value,
                                    ),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm">
                            حداقل فاصله رزرو (ساعت)
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="168"
                            disabled={!canEdit}
                            value={settingsDraft.minimum_lead_hours}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    minimum_lead_hours: Number(e.target.value),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm">
                            مهلت لغو آنلاین (ساعت)
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="168"
                            disabled={!canEdit}
                            value={settingsDraft.cancellation_cutoff_hours}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    cancellation_cutoff_hours: Number(
                                        e.target.value,
                                    ),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm">
                            مهلت جابه‌جایی بیمار (ساعت)
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="168"
                            disabled={!canEdit}
                            value={settingsDraft.reschedule_cutoff_hours}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    reschedule_cutoff_hours: Number(e.target.value),
                                }))
                            }
                            className={inputClass}
                        />
                    </label>
                    <label>
                        <span className="mb-2 block text-sm">
                            سقف جابه‌جایی توسط بیمار
                        </span>
                        <input
                            type="number"
                            min="0"
                            max="10"
                            disabled={!canEdit}
                            value={settingsDraft.max_patient_reschedules}
                            onChange={(e) =>
                                setSettingsDraft((s) => ({
                                    ...s,
                                    max_patient_reschedules: Number(e.target.value),
                                }))
                            }
                            className={inputClass}
                        />
                        <span className="mt-1 block text-[10px] text-slate-400">عدد صفر یعنی غیرفعال</span>
                    </label>
                </div>
                <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h4 className="font-bold text-primary">یادآوری پیامکی نوبت</h4>
                            <p className="mt-1 text-xs leading-6 text-slate-500">
                                دو پیامک یادآوری پیش از زمان نوبت برای بیمار ارسال می‌شود.
                            </p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm font-bold text-primary shadow-sm">
                            <input
                                type="checkbox"
                                disabled={!canEdit}
                                checked={settingsDraft.reminder_enabled}
                                onChange={(event) =>
                                    setSettingsDraft((current) => ({
                                        ...current,
                                        reminder_enabled: event.target.checked,
                                    }))
                                }
                                className="h-5 w-5 accent-emerald-600"
                            />
                            یادآوری فعال
                        </label>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label>
                            <span className="mb-2 block text-sm">یادآوری اول (ساعت قبل)</span>
                            <input
                                type="number"
                                min="1"
                                max="336"
                                disabled={!canEdit || !settingsDraft.reminder_enabled}
                                value={settingsDraft.first_reminder_hours}
                                onChange={(event) =>
                                    setSettingsDraft((current) => ({
                                        ...current,
                                        first_reminder_hours: Number(event.target.value),
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">یادآوری نهایی (ساعت قبل)</span>
                            <input
                                type="number"
                                min="1"
                                max="168"
                                disabled={!canEdit || !settingsDraft.reminder_enabled}
                                value={settingsDraft.final_reminder_hours}
                                onChange={(event) =>
                                    setSettingsDraft((current) => ({
                                        ...current,
                                        final_reminder_hours: Number(event.target.value),
                                    }))
                                }
                                className={inputClass}
                            />
                        </label>
                    </div>
                    <p className="mt-3 text-xs leading-6 text-sky-700">
                        زمان یادآوری اول باید از یادآوری نهایی زودتر باشد. متن پیامک از بخش «مرکز پیامکی» قابل ویرایش است.
                    </p>
                </div>
                {canEdit && (
                    <div className="mt-5 flex flex-wrap gap-3">
                        <button disabled={busy} className="h-11 rounded-xl bg-primary px-5 text-white disabled:opacity-50">ذخیره تنظیمات</button>
                        <button
                            type="button"
                            disabled={busy || !settingsDraft.reminder_enabled || !can("operations.run")}
                            onClick={() => void runOperations()}
                            className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-primary transition hover:border-secondary disabled:opacity-50"
                        >
                            اجرای یادآوری‌ها همین حالا
                        </button>
                    </div>
                )}
            </form>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-dana text-xl text-primary">
                    تعطیلی عمومی مطب
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                    تعطیلی ثبت‌شده روی همه خدمت‌ها اعمال می‌شود. روزها و ساعت‌های
                    عادی هر خدمت از بخش «خدمات» تنظیم می‌شوند.
                </p>
                {can("schedule.create") && (
                    <form
                        onSubmit={addException}
                        noValidate
                        className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_auto]"
                    >
                        <JalaliDatePicker
                            value={exceptionDate}
                            onChange={setExceptionDate}
                            placeholder="تاریخ تعطیلی"
                        />
                        <input
                            value={exceptionNote}
                            onChange={(e) => setExceptionNote(e.target.value)}
                            className={inputClass}
                            placeholder="توضیح اختیاری؛ مثلاً تعطیلی رسمی"
                        />
                        <button
                            disabled={busy}
                            className="h-11 rounded-xl bg-primary px-5 text-white"
                        >
                            ثبت تعطیلی
                        </button>
                    </form>
                )}
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {exceptions.length ? (
                        exceptions.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl bg-rose-50 p-4"
                            >
                                <div>
                                    <b className="text-rose-800">
                                        {formatPersianDate(item.exception_date)}
                                    </b>
                                    <p className="mt-1 text-xs text-rose-600">
                                        {item.note || "مطب تعطیل است"}
                                    </p>
                                </div>
                                {can("schedule.delete") && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                await appointmentApi.deleteStaffException(
                                                    token,
                                                    item.id,
                                                );
                                                setMessageKind("success");
                                                setMessage("تعطیلی حذف شد");
                                                await onReload();
                                            } catch (deleteError) {
                                                setMessageKind("error");
                                                setMessage(
                                                    errorMessage(deleteError),
                                                );
                                            }
                                        }}
                                        className="text-rose-600"
                                    >
                                        <IoCloseCircleOutline size={23} />
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-slate-500">
                            استثنایی ثبت نشده است.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
};


export default SchedulePanel;
