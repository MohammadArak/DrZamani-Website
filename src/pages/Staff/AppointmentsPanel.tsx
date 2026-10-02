import AppSelect from "@/components/AppSelect";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import ServiceIcon from "@/components/ServiceIcon";
import Toast from "@/components/Toast";
import {
    appointmentApi,
    formatLocalPhone,
    formatPersianDate,
    formatTime,
    toPersianDigits,
    type Appointment,
    type AppointmentPage
} from "@/services/appointmentApi";
import {
    useState,
    type FormEvent
} from "react";
import {
    IoChatbubblesOutline,
    IoDownloadOutline,
    IoSearchOutline,
    IoTimeOutline
} from "react-icons/io5";
import { useStaffAccess } from "./staffAccess";

import { appointmentFilterOptions,appointmentStatusOptions,errorMessage,inputClass } from "./staffUi";
export type AppointmentFilters = {
    appointment_date?: string;
    status?: string;
    search?: string;
    this_month?: boolean;
    page?: number;
    page_size?: number;
};

const AppointmentsPanel = ({
    token,
    pageData,
    onReload,
    onOpenConsultation,
}: {
    token: string;
    pageData: AppointmentPage;
    onReload: (filters?: AppointmentFilters) => Promise<void>;
    onOpenConsultation: (item: Appointment) => void;
}) => {
    const can = useStaffAccess();
    const [date, setDate] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [thisMonth, setThisMonth] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [exporting, setExporting] = useState(false);
    const [toast, setToast] = useState<{
        message: string;
        kind: "success" | "error";
    }>({
        message: "",
        kind: "success",
    });

    const filtersFor = (page = 1): AppointmentFilters => ({
        appointment_date: date || undefined,
        status: status || undefined,
        search: search || undefined,
        this_month: thisMonth || undefined,
        page,
        page_size: pageData.page_size || 20,
    });

    const filter = (event: FormEvent) => {
        event.preventDefault();
        void onReload(filtersFor(1));
    };

    const updateStatus = async (
        item: Appointment,
        nextStatus: Appointment["status"],
    ) => {
        setBusyId(item.id);
        try {
            await appointmentApi.updateStaffAppointment(token, item.id, {
                status: nextStatus,
            });
            setToast({ message: "وضعیت نوبت ذخیره شد", kind: "success" });
            await onReload(filtersFor(pageData.page));
        } catch (updateError) {
            setToast({ message: errorMessage(updateError), kind: "error" });
        } finally {
            setBusyId(null);
        }
    };

    const exportExcel = async () => {
        setExporting(true);
        try {
            await appointmentApi.exportStaffAppointments(token, filtersFor());
            setToast({
                message: "فایل اکسل نوبت‌ها آماده شد",
                kind: "success",
            });
        } catch (exportError) {
            setToast({ message: errorMessage(exportError), kind: "error" });
        } finally {
            setExporting(false);
        }
    };

    return (
        <section className="app-panel-enter">
            <Toast
                message={toast.message}
                kind={toast.kind}
                onClose={() => setToast((value) => ({ ...value, message: "" }))}
            />
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <span className="text-sm text-secondary-deep">
                        مدیریت مراجعه‌ها
                    </span>
                    <h2 className="mt-1 font-dana text-3xl text-primary">
                        نوبت‌ها
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                        {toPersianDigits(pageData.total)} نتیجه
                    </span>
                    <button
                        type="button"
                        disabled={exporting || !can("appointments.export")}
                        onClick={() => void exportExcel()}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50"
                    >
                        <IoDownloadOutline />
                        {exporting ? "در حال ساخت…" : "خروجی اکسل"}
                    </button>
                </div>
            </div>
            <form
                onSubmit={filter}
                className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(220px,1fr)_190px_170px_auto]"
            >
                <label className="relative">
                    <span className="sr-only">جست‌وجو</span>
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className={`${inputClass} pl-10`}
                        placeholder="نام، موبایل یا کد پیگیری"
                    />
                    <IoSearchOutline className="absolute left-3 top-3 text-xl text-slate-400" />
                </label>
                <JalaliDatePicker
                    value={date}
                    onChange={setDate}
                    placeholder="تاریخ نوبت"
                />
                <AppSelect
                    value={status}
                    onChange={setStatus}
                    options={appointmentFilterOptions}
                    ariaLabel="وضعیت"
                />
                <button className="h-11 rounded-xl bg-primary px-5 text-white transition hover:bg-primary-mild">
                    اعمال فیلتر
                </button>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 lg:col-span-4">
                    <input
                        type="checkbox"
                        checked={thisMonth}
                        onChange={(event) => setThisMonth(event.target.checked)}
                        className="h-4 w-4 accent-secondary"
                    />
                    فقط نوبت‌های ماه جاری شمسی
                </label>
            </form>

            <div className="mt-5 space-y-3">
                {pageData.items.length ? (
                    pageData.items.map((item) => (
                        <article
                            key={item.id}
                            className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-md lg:grid-cols-[1.15fr_1fr_1fr_auto] lg:items-center"
                        >
                            <div>
                                <span className="text-xs text-slate-400">
                                    {item.tracking_code}
                                </span>
                                <h3 className="mt-1 font-bold text-primary">
                                    {item.patient_name}
                                </h3>
                                <p
                                    dir="ltr"
                                    className="mt-1 text-right text-sm text-slate-500"
                                >
                                    {item.patient_phone
                                        ? formatLocalPhone(item.patient_phone)
                                        : "—"}
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <ServiceIcon
                                    icon={item.service_icon_key}
                                    className="mt-0.5 shrink-0 text-2xl text-secondary-deep"
                                />
                                <div>
                                    <b className="text-sm text-slate-700">
                                        {item.service_title}
                                    </b>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {toPersianDigits(
                                            item.service_duration_minutes,
                                        )}{" "}
                                        دقیقه ·{" "}
                                        {item.has_previous_visit
                                            ? "مراجعه قبلی دارد"
                                            : "اولین مراجعه"}
                                    </p>
                                    {item.consultation_enabled && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onOpenConsultation(item)
                                            }
                                            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-secondary-deep"
                                        >
                                            <IoChatbubblesOutline /> گفت‌وگو
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="text-sm text-slate-600">
                                <p>
                                    {formatPersianDate(item.appointment_date)}
                                </p>
                                <p className="mt-1 flex items-center gap-1">
                                    <IoTimeOutline />{" "}
                                    {toPersianDigits(
                                        formatTime(item.start_time),
                                    )}
                                </p>
                            </div>
                            <AppSelect
                                disabled={busyId === item.id || !can("appointments.edit")}
                                value={item.status}
                                onChange={(value) =>
                                    void updateStatus(
                                        item,
                                        value as Appointment["status"],
                                    )
                                }
                                options={appointmentStatusOptions.filter(o => o.value !== "cancelled" || can("appointments.cancel"))}
                                ariaLabel="وضعیت نوبت"
                                buttonClassName="h-10 bg-slate-50 text-sm"
                            />
                        </article>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
                        نوبتی با این فیلتر پیدا نشد.
                    </div>
                )}
            </div>

            {pageData.total_pages > 1 && (
                <nav
                    className="mt-6 flex flex-wrap items-center justify-center gap-2"
                    aria-label="صفحه‌بندی نوبت‌ها"
                >
                    <button
                        disabled={pageData.page <= 1}
                        onClick={() =>
                            void onReload(filtersFor(pageData.page - 1))
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm disabled:opacity-40"
                    >
                        صفحه قبل
                    </button>
                    <span className="px-3 text-sm text-slate-500">
                        صفحه {toPersianDigits(pageData.page)} از{" "}
                        {toPersianDigits(pageData.total_pages)}
                    </span>
                    <button
                        disabled={pageData.page >= pageData.total_pages}
                        onClick={() =>
                            void onReload(filtersFor(pageData.page + 1))
                        }
                        className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm disabled:opacity-40"
                    >
                        صفحه بعد
                    </button>
                </nav>
            )}
        </section>
    );
};


export default AppointmentsPanel;
