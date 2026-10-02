/* eslint-disable react-hooks/set-state-in-effect */
import Toast from "@/components/Toast";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import {
    appointmentApi,
    type ClinicSettings
} from "@/services/appointmentApi";
import {
    useEffect,
    useState,
    type FormEvent
} from "react";
import { useStaffAccess } from "./staffAccess";

import { errorMessage,inputClass } from "./staffUi";
const ClinicInfoPanel = ({
    token,
    settings,
    onReload,
}: {
    token: string;
    settings: ClinicSettings;
    onReload: () => Promise<void>;
}) => {
    const [draft, setDraft] = useState(settings);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [messageKind, setMessageKind] = useState<"success" | "error">(
        "success",
    );
    const { applyClinicSettings } = useClinicInfo();
    const can = useStaffAccess();
    const canEdit = can("settings.edit");

    useEffect(() => setDraft(settings), [settings]);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!canEdit) return;
        setBusy(true);
        setMessage("");
        try {
            const updated = await appointmentApi.updateStaffSettings(token, draft);
            applyClinicSettings(updated);
            setMessageKind("success");
            setMessage("اطلاعات ثابت مطب ذخیره شد و در همه بخش‌های سامانه به‌روزرسانی می‌شود.");
            await onReload();
        } catch (saveError) {
            setMessageKind("error");
            setMessage(errorMessage(saveError));
        } finally {
            setBusy(false);
        }
    };

    const update = <Key extends keyof ClinicSettings,>(
        field: Key,
        value: ClinicSettings[Key],
    ) => setDraft((current) => ({ ...current, [field]: value }));

    return (
        <section className="app-panel-enter">
            <Toast
                message={message}
                kind={messageKind}
                onClose={() => setMessage("")}
            />
            <div>
                <span className="text-sm text-secondary-deep">
                    منبع یکپارچه اطلاعات عمومی
                </span>
                <h2 className="mt-1 font-dana text-3xl text-primary">
                    اطلاعات ثابت مطب
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                    شماره‌ها، نشانی، ساعات کاری، نقشه و شبکه‌های اجتماعی را فقط
                    از همین بخش تغییر دهید؛ اطلاعات جدید در صفحه اصلی، پنل بیمار،
                    تماس‌ها و داده‌های سئوی سایت استفاده می‌شود.
                </p>
            </div>

            {!canEdit && (
                <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                    این حساب دسترسی ویرایش اطلاعات مطب را ندارد.
                </div>
            )}

            <form onSubmit={save} className="mt-6 space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h3 className="font-dana text-xl text-primary">
                                مشخصات پزشک
                            </h3>
                            <p className="mt-1 text-xs leading-6 text-slate-500">
                                این موارد در عنوان‌ها و اطلاعات ساختاریافته موتورهای جست‌وجو استفاده می‌شوند.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <label>
                            <span className="mb-2 block text-sm">نام پزشک</span>
                            <input
                                required
                                disabled={!canEdit}
                                value={draft.doctor_name}
                                onChange={(event) => update("doctor_name", event.target.value)}
                                className={inputClass}
                                placeholder="مثلاً دکتر فرزاد زمانی"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">تخصص</span>
                            <input
                                required
                                disabled={!canEdit}
                                value={draft.specialty}
                                onChange={(event) => update("specialty", event.target.value)}
                                className={inputClass}
                                placeholder="مثلاً متخصص گوش، حلق و بینی"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">شماره نظام پزشکی</span>
                            <input
                                disabled={!canEdit}
                                value={draft.medical_council_number}
                                onChange={(event) => update("medical_council_number", event.target.value)}
                                className={inputClass}
                                inputMode="numeric"
                                placeholder="اختیاری"
                            />
                        </label>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h3 className="font-dana text-xl text-primary">
                        تماس و ساعات پاسخ‌گویی
                    </h3>
                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <label>
                            <span className="mb-2 block text-sm">شماره مطب</span>
                            <input
                                required
                                dir="ltr"
                                disabled={!canEdit}
                                value={draft.office_phone}
                                onChange={(event) => update("office_phone", event.target.value)}
                                className={`${inputClass} text-left`}
                                inputMode="tel"
                                placeholder="08633146179"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">شماره مشاوره</span>
                            <input
                                required
                                dir="ltr"
                                disabled={!canEdit}
                                value={draft.consultation_phone}
                                onChange={(event) => update("consultation_phone", event.target.value)}
                                className={`${inputClass} text-left`}
                                inputMode="tel"
                                placeholder="09217357728"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">ایمیل عمومی</span>
                            <input
                                required
                                dir="ltr"
                                type="email"
                                disabled={!canEdit}
                                value={draft.email}
                                onChange={(event) => update("email", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="info@example.com"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">ساعات کاری</span>
                            <input
                                required
                                disabled={!canEdit}
                                value={draft.working_hours}
                                onChange={(event) => update("working_hours", event.target.value)}
                                className={inputClass}
                                placeholder="مثلاً شنبه تا چهارشنبه، ۱۶ تا ۲۰"
                            />
                        </label>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h3 className="font-dana text-xl text-primary">نشانی مطب</h3>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label>
                            <span className="mb-2 block text-sm">استان</span>
                            <input
                                required
                                disabled={!canEdit}
                                value={draft.address_region}
                                onChange={(event) => update("address_region", event.target.value)}
                                className={inputClass}
                                placeholder="استان مرکزی"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">شهر</span>
                            <input
                                required
                                disabled={!canEdit}
                                value={draft.address_city}
                                onChange={(event) => update("address_city", event.target.value)}
                                className={inputClass}
                                placeholder="اراک"
                            />
                        </label>
                        <label className="md:col-span-2">
                            <span className="mb-2 block text-sm">نشانی کامل</span>
                            <textarea
                                required
                                disabled={!canEdit}
                                rows={3}
                                value={draft.address}
                                onChange={(event) => update("address", event.target.value)}
                                className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10 disabled:bg-slate-50"
                                placeholder="شهر، خیابان، ساختمان، طبقه و واحد"
                            />
                        </label>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                    <h3 className="font-dana text-xl text-primary">
                        سایت، نقشه و شبکه‌های اجتماعی
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                        آدرس‌های اینترنتی باید با https:// شروع شوند. لینک‌های شبکه اجتماعی اختیاری‌اند.
                    </p>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <label>
                            <span className="mb-2 block text-sm">نشانی اصلی سایت</span>
                            <input
                                required
                                dir="ltr"
                                type="url"
                                disabled={!canEdit}
                                value={draft.site_url}
                                onChange={(event) => update("site_url", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="https://example.com"
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">لینک صفحه نقشه</span>
                            <input
                                dir="ltr"
                                type="url"
                                disabled={!canEdit}
                                value={draft.map_page_url}
                                onChange={(event) => update("map_page_url", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="https://neshan.org/maps/..."
                            />
                        </label>
                        <label className="md:col-span-2">
                            <span className="mb-2 block text-sm">لینک iframe نقشه</span>
                            <input
                                dir="ltr"
                                type="url"
                                disabled={!canEdit}
                                value={draft.map_embed_url}
                                onChange={(event) => update("map_embed_url", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="https://neshan.org/maps/iframe/..."
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">عرض جغرافیایی</span>
                            <input
                                dir="ltr"
                                type="number"
                                step="any"
                                min="-90"
                                max="90"
                                disabled={!canEdit}
                                value={draft.map_latitude}
                                onChange={(event) => update("map_latitude", Number(event.target.value))}
                                className={`${inputClass} text-left`}
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">طول جغرافیایی</span>
                            <input
                                dir="ltr"
                                type="number"
                                step="any"
                                min="-180"
                                max="180"
                                disabled={!canEdit}
                                value={draft.map_longitude}
                                onChange={(event) => update("map_longitude", Number(event.target.value))}
                                className={`${inputClass} text-left`}
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">اینستاگرام</span>
                            <input
                                dir="ltr"
                                type="url"
                                disabled={!canEdit}
                                value={draft.instagram_url}
                                onChange={(event) => update("instagram_url", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="https://instagram.com/..."
                            />
                        </label>
                        <label>
                            <span className="mb-2 block text-sm">ایتا</span>
                            <input
                                dir="ltr"
                                type="url"
                                disabled={!canEdit}
                                value={draft.eitaa_url}
                                onChange={(event) => update("eitaa_url", event.target.value)}
                                className={`${inputClass} text-left`}
                                placeholder="https://eitaa.com/..."
                            />
                        </label>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <h3 className="font-dana text-xl text-primary">سئوی صفحه اصلی</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-500">فیلد خالی از مشخصات پزشک ساخته می‌شود. پس از ذخیره، HTML اولیه، متادیتا و داده‌های ساختاریافته تازه خوانده می‌شوند.</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label><span className="text-sm">عنوان سئو (حداکثر ۱۶۰ حرف)</span><input disabled={!canEdit} maxLength={160} value={draft.seo_title ?? ""} onChange={event => update("seo_title", event.target.value)} className={inputClass} /></label>
                        <label><span className="text-sm">تصویر اشتراک‌گذاری (HTTPS)</span><input disabled={!canEdit} type="url" dir="ltr" maxLength={500} value={draft.seo_image_url ?? ""} onChange={event => update("seo_image_url", event.target.value)} className={inputClass} /></label>
                        <label className="md:col-span-2"><span className="text-sm">توضیح سئو (حداکثر ۳۲۰ حرف)</span><textarea disabled={!canEdit} maxLength={320} value={draft.seo_description ?? ""} onChange={event => update("seo_description", event.target.value)} className={`${inputClass} h-24 py-3`} /></label>
                    </div>
                </div>
                {canEdit && (
                    <div className="sticky bottom-3 z-10 flex justify-end rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
                        <button
                            disabled={busy}
                            className="h-12 rounded-xl bg-primary px-7 font-bold text-white transition hover:bg-primary-mild disabled:opacity-50"
                        >
                            {busy ? "در حال ذخیره…" : "ذخیره اطلاعات مطب"}
                        </button>
                    </div>
                )}
            </form>
        </section>
    );
};


export default ClinicInfoPanel;
