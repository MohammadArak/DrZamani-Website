/* eslint-disable react-hooks/set-state-in-effect */
import {useContentConfirm} from "./useContentConfirm";
import SettingsSaveBar from "./SettingsSaveBar";
import SeoPreview from "./SeoPreview";
import Toast from "@/components/Toast";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import {
    appointmentApi,
    type BusinessHours,
    type ClinicSettings
} from "@/services/appointmentApi";
import {
    useEffect,
    useState,
    type FormEvent
} from "react";
import { useStaffAccess } from "./staffAccess";

import { errorMessage,inputClass } from "./staffUi";
const businessDays: [BusinessHours["day_of_week"], string][] = [["Saturday","شنبه"],["Sunday","یکشنبه"],["Monday","دوشنبه"],["Tuesday","سه‌شنبه"],["Wednesday","چهارشنبه"],["Thursday","پنجشنبه"],["Friday","جمعه"]];
const ClinicInfoPanel = ({
    token,
    settings,
    onReload, onDirtyChange, onBusyChange,
}: {
    token: string;
    settings: ClinicSettings;
    onReload: () => Promise<void>;
    onDirtyChange?: (value:boolean) => void;
    onBusyChange?: (value:boolean) => void;
}) => {
    const {ask,confirmation}=useContentConfirm();
    const [draft, setDraft] = useState(settings);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [messageKind, setMessageKind] = useState<"success" | "error">(
        "success",
    );
    const { applyClinicSettings } = useClinicInfo();
    const can = useStaffAccess();
    const canEdit = can("settings.edit");
    const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

    useEffect(() => setDraft(settings), [settings]);
    useEffect(() => { onDirtyChange?.(dirty); }, [dirty,onDirtyChange]);
    useEffect(() => { onBusyChange?.(busy); }, [busy,onBusyChange]);
    useEffect(() => () => { onDirtyChange?.(false);onBusyChange?.(false); }, [onDirtyChange,onBusyChange]);

    const save = async (event: FormEvent) => {
        event.preventDefault();
        if (!canEdit || busy || !dirty) return;
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
            {confirmation}
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

            <form onSubmit={save} className="mt-6"><fieldset disabled={busy} className="space-y-5">
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
                    <label className="mt-4 block">
                        <span className="mb-2 block text-sm">کدپستی مطب</span>
                        <input dir="ltr" inputMode="numeric" disabled={!canEdit} value={draft.postal_code ?? ""} onChange={event => update("postal_code", event.target.value)} className={inputClass} placeholder="اختیاری، ده رقم" />
                    </label>
                    <fieldset className="mt-5">
                        <legend className="font-dana text-lg text-primary">ساعت کاری برای نمایش عمومی و گوگل</legend>
                        <p className="my-2 text-sm text-slate-600">روزهای حضور را انتخاب کنید و ساعت واقعی را بنویسید. تا زمانی که مشخص نیست، خالی بگذارید.</p>
                        {businessDays.map(([day, label]) => {
                            const slots = draft.business_hours ?? [];
                            const slot = slots.find(item => item.day_of_week === day);
                            const setTime = (key: "opens" | "closes", value: string) => update("business_hours", slots.map(item => item.day_of_week === day ? { ...item, [key]: value } : item));
                            return <div key={day} className="my-2 flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2"><input type="checkbox" disabled={!canEdit} checked={!!slot} onChange={event => update("business_hours", event.target.checked ? [...slots, {day_of_week:day, opens:"", closes:""}] : slots.filter(item => item.day_of_week !== day))} />{label}</label>
                                {slot && <><label className="flex items-center gap-2">شروع<input type="time" required disabled={!canEdit} value={slot.opens} onChange={event => setTime("opens",event.target.value)} className={inputClass} /></label><label className="flex items-center gap-2">پایان<input type="time" required disabled={!canEdit} value={slot.closes} onChange={event => setTime("closes",event.target.value)} className={inputClass} /></label></>}
                            </div>;
                        })}
                    </fieldset>
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
                        <label><span className="text-sm">نام سایت در پسوند صفحات</span><input disabled={!canEdit} maxLength={160} value={draft.seo_site_name ?? ""} placeholder={`وبسایت ${draft.doctor_name}`} onChange={event => update("seo_site_name", event.target.value)} className={inputClass} /></label>
                        <label><span className="text-sm">عنوان صفحه مقالات</span><input disabled={!canEdit} maxLength={160} value={draft.seo_articles_title ?? ""} placeholder="مقالات" onChange={event => update("seo_articles_title", event.target.value)} className={inputClass} /></label>
                        <label className="md:col-span-2"><span className="text-sm">توضیح صفحه مقالات</span><textarea disabled={!canEdit} maxLength={320} value={draft.seo_articles_description ?? ""} onChange={event => update("seo_articles_description", event.target.value)} className={inputClass} /></label>
                        <label><span className="text-sm">عنوان سئو (حداکثر ۱۶۰ حرف)</span><input disabled={!canEdit} maxLength={160} value={draft.seo_title ?? ""} onChange={event => update("seo_title", event.target.value)} className={inputClass} /></label>
                        <label><span className="text-sm">تصویر اشتراک‌گذاری (HTTPS)</span><input disabled={!canEdit} type="url" dir="ltr" maxLength={500} value={draft.seo_image_url ?? ""} onChange={event => update("seo_image_url", event.target.value)} className={inputClass} /></label>
                        <label className="md:col-span-2"><span className="text-sm">توضیح سئو (حداکثر ۳۲۰ حرف)</span><textarea disabled={!canEdit} maxLength={320} value={draft.seo_description ?? ""} onChange={event => update("seo_description", event.target.value)} className={`${inputClass} h-24 py-3`} /></label>
                    </div>
                </div>
                <SeoPreview home siteUrl={draft.site_url} siteName={draft.seo_site_name || `وبسایت ${draft.doctor_name}`} title={draft.seo_title || `وبسایت رسمی ${draft.doctor_name}`} description={draft.seo_description || `وب‌سایت رسمی ${draft.doctor_name}، ${draft.specialty} در ${draft.address_city}؛ معرفی خدمات و راه‌های ارتباطی.`} path="/" />
                <SeoPreview title={draft.seo_articles_title || "مقالات"} description={draft.seo_articles_description || "مقالات درباره سلامت گوش، بینی، سینوس، گلو و رینوپلاستی"} path="/articles/" siteUrl={draft.site_url} siteName={draft.seo_site_name || `وبسایت ${draft.doctor_name}`} />
                {canEdit && <SettingsSaveBar busy={busy} dirty={dirty} label="ذخیره اطلاعات مطب"><button type="button" disabled={busy || !dirty} className="text-sm text-primary" onClick={() => { void ask("تغییرات اطلاعات مطب کنار گذاشته شوند؟").then(confirmed=>{if(confirmed)setDraft(settings);}); }}>لغو تغییرات</button></SettingsSaveBar>}
            </fieldset></form>
        </section>
    );
};


export default ClinicInfoPanel;
