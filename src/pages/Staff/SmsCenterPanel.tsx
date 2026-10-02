import AppSelect from "@/components/AppSelect";
import Toast from "@/components/Toast";
import {
    appointmentApi,
    formatLocalPhone,
    toPersianDigits,
    type Service,
    type SmsAutomationRule,
    type SmsCampaign,
    type SmsCampaignFilters,
    type SmsOutboxItem
} from "@/services/appointmentApi";
import {
    useState
} from "react";
import { useStaffAccess } from "./staffAccess";

import { errorMessage,genderFilterOptions,inputClass } from "./staffUi";
const SmsCenterPanel = ({
    token,
    services,
    rules,
    campaigns,
    outbox,
    onReload,
}: {
    token: string;
    services: Service[];
    rules: SmsAutomationRule[];
    campaigns: SmsCampaign[];
    outbox: SmsOutboxItem[];
    onReload: () => Promise<void>;
}) => {
    const [message, setMessage] = useState("");
    const [messageKind, setMessageKind] = useState<"success" | "error">("success");
    const [busy, setBusy] = useState("");
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [campaignDraft, setCampaignDraft] = useState({
        title: "",
        message_text: "{patient_name} عزیز، ",
        provider_pattern_code: "",
        service_ids: [] as number[],
        gender: "" as "" | "female" | "male",
        min_age: "",
        max_age: "",
    });
    const can = useStaffAccess();
    const canEdit = can("sms.rules.edit");

    const campaignFilters = (): SmsCampaignFilters => ({
        service_ids: campaignDraft.service_ids,
        gender: campaignDraft.gender || null,
        min_age: campaignDraft.min_age === "" ? null : Number(campaignDraft.min_age),
        max_age: campaignDraft.max_age === "" ? null : Number(campaignDraft.max_age),
    });

    const updateCampaignDraft = <K extends keyof typeof campaignDraft,>(
        key: K,
        value: (typeof campaignDraft)[K],
    ) => {
        setCampaignDraft((current) => ({ ...current, [key]: value }));
        setPreviewCount(null);
    };

    const previewCampaign = async () => {
        setBusy("campaign-preview");
        try {
            const result = await appointmentApi.previewStaffSmsCampaign(token, campaignFilters());
            setPreviewCount(result.recipient_count);
            setMessageKind("success");
            setMessage(`${toPersianDigits(result.recipient_count)} مخاطب مطابق فیلترها پیدا شد.`);
        } catch (error) {
            setMessageKind("error");
            setMessage(errorMessage(error));
        } finally {
            setBusy("");
        }
    };

    const queueCampaign = async () => {
        if (previewCount === null || previewCount < 1) return;
        setBusy("campaign-create");
        try {
            await appointmentApi.createStaffSmsCampaign(token, {
                title: campaignDraft.title,
                message_text: campaignDraft.message_text,
                provider_pattern_code: campaignDraft.provider_pattern_code,
                filters: campaignFilters(),
                expected_recipient_count: previewCount,
            });
            setMessageKind("success");
            setMessage(`کمپین برای ${toPersianDigits(previewCount)} مخاطب وارد صف شد.`);
            setPreviewCount(null);
            setCampaignDraft({
                title: "",
                message_text: "{patient_name} عزیز، ",
                provider_pattern_code: "",
                service_ids: [],
                gender: "",
                min_age: "",
                max_age: "",
            });
            await onReload();
        } catch (error) {
            setMessageKind("error");
            setMessage(errorMessage(error));
        } finally {
            setBusy("");
        }
    };

    const save = async (rule: SmsAutomationRule, form: HTMLFormElement) => {
        const data = new FormData(form);
        setBusy(rule.event_key);
        try {
            await appointmentApi.updateStaffSmsRule(token, rule.event_key, {
                enabled: data.get("enabled") === "on",
                template_text: String(data.get("template_text") ?? ""),
                provider_pattern_code: String(data.get("provider_pattern_code") ?? ""),
            });
            setMessageKind("success");
            setMessage(`قانون «${rule.title}» ذخیره شد.`);
            await onReload();
        } catch (error) {
            setMessageKind("error");
            setMessage(errorMessage(error));
        } finally {
            setBusy("");
        }
    };

    const dispatch = async () => {
        setBusy("dispatch");
        try {
            const result = await appointmentApi.dispatchStaffSms(token);
            setMessageKind("success");
            setMessage(result.message);
            await onReload();
        } catch (error) {
            setMessageKind("error");
            setMessage(errorMessage(error));
        } finally {
            setBusy("");
        }
    };

    return (
        <section className="app-panel-enter">
            <Toast message={message} kind={messageKind} onClose={() => setMessage("")} />
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <span className="text-sm text-secondary-deep">پیامک‌های خودکار</span>
                    <h2 className="mt-1 font-dana text-3xl text-primary">مرکز پیامکی</h2>
                </div>
                {can("sms.dispatch") && (
                    <button
                        type="button"
                        disabled={busy === "dispatch"}
                        onClick={() => void dispatch()}
                        className="h-11 rounded-xl bg-primary px-5 text-sm text-white disabled:opacity-50"
                    >
                        ارسال موارد در صف
                    </button>
                )}
            </div>
            {can("sms.campaigns.create") && (
                <div className="mt-6 rounded-2xl border border-secondary/30 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h3 className="font-dana text-xl text-primary">ارسال هدفمند</h3>
                            <p className="mt-1 text-xs text-slate-500">
                                ابتدا مخاطبان را پیش‌نمایش کنید؛ پیامک‌ها بعد از تأیید وارد صف می‌شوند.
                            </p>
                        </div>
                        {previewCount !== null && (
                            <span className="rounded-full bg-secondary/20 px-4 py-2 text-sm font-bold text-primary">
                                {toPersianDigits(previewCount)} مخاطب
                            </span>
                        )}
                    </div>
                    <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <div className="space-y-4">
                            <label className="block text-xs text-slate-500">
                                عنوان داخلی کمپین
                                <input
                                    value={campaignDraft.title}
                                    onChange={(event) => updateCampaignDraft("title", event.target.value)}
                                    className={`${inputClass} mt-1`}
                                    placeholder="مثلاً یادآوری مراقبت بعد از عمل"
                                />
                            </label>
                            <label className="block text-xs text-slate-500">
                                متن پیامک
                                <textarea
                                    value={campaignDraft.message_text}
                                    onChange={(event) => updateCampaignDraft("message_text", event.target.value)}
                                    rows={5}
                                    className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-secondary"
                                />
                            </label>
                            <label className="block text-xs text-slate-500">
                                کد پترن فراز
                                <input
                                    value={campaignDraft.provider_pattern_code}
                                    onChange={(event) => updateCampaignDraft("provider_pattern_code", event.target.value)}
                                    className={`${inputClass} mt-1`}
                                    placeholder="در حالت Webhook اختیاری است"
                                />
                            </label>
                            <p className="text-[11px] text-slate-400">
                                متغیرها: {"{patient_name}"}، {"{first_name}"}، {"{service_title}"}
                            </p>
                        </div>
                        <div className="space-y-4 rounded-2xl bg-slate-50 p-4">
                            <div>
                                <span className="text-xs text-slate-500">خدمت‌های دریافت‌شده</span>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {services.map((service) => (
                                        <label key={service.id} className="flex items-center gap-2 rounded-xl bg-white p-3 text-sm text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={campaignDraft.service_ids.includes(service.id)}
                                                onChange={(event) => updateCampaignDraft(
                                                    "service_ids",
                                                    event.target.checked
                                                        ? [...campaignDraft.service_ids, service.id]
                                                        : campaignDraft.service_ids.filter((id) => id !== service.id),
                                                )}
                                                className="accent-secondary"
                                            />
                                            {service.title}
                                        </label>
                                    ))}
                                </div>
                                <p className="mt-2 text-[11px] text-slate-400">بدون انتخاب خدمت یعنی همه بیماران.</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <label className="text-xs text-slate-500">
                                    جنسیت
                                    <AppSelect
                                        value={campaignDraft.gender}
                                        onChange={(value) =>
                                            updateCampaignDraft(
                                                "gender",
                                                value as typeof campaignDraft.gender,
                                            )
                                        }
                                        options={genderFilterOptions}
                                        ariaLabel="جنسیت"
                                        className="mt-1"
                                    />
                                </label>
                                <label className="text-xs text-slate-500">
                                    حداقل سن
                                    <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={campaignDraft.min_age}
                                        onChange={(event) => updateCampaignDraft("min_age", event.target.value)}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                                <label className="text-xs text-slate-500">
                                    حداکثر سن
                                    <input
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={campaignDraft.max_age}
                                        onChange={(event) => updateCampaignDraft("max_age", event.target.value)}
                                        className={`${inputClass} mt-1`}
                                    />
                                </label>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    disabled={busy === "campaign-preview"}
                                    onClick={() => void previewCampaign()}
                                    className="h-11 rounded-xl border border-primary text-sm font-bold text-primary disabled:opacity-50"
                                >
                                    پیش‌نمایش مخاطبان
                                </button>
                                <button
                                    type="button"
                                    disabled={previewCount === null || previewCount < 1 || busy === "campaign-create" || !campaignDraft.title.trim() || !campaignDraft.message_text.trim()}
                                    onClick={() => void queueCampaign()}
                                    className="h-11 rounded-xl bg-primary text-sm font-bold text-white disabled:opacity-40"
                                >
                                    تأیید و افزودن به صف
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {!!campaigns.length && (
                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 p-5">
                        <h3 className="font-dana text-xl text-primary">کمپین‌های اخیر</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="p-3 text-right">عنوان</th>
                                    <th className="p-3 text-right">مخاطب</th>
                                    <th className="p-3 text-right">موفق</th>
                                    <th className="p-3 text-right">ناموفق نهایی</th>
                                    <th className="p-3 text-right">وضعیت</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.map((campaign) => (
                                    <tr key={campaign.id} className="border-t border-slate-100">
                                        <td className="p-3 font-medium text-primary">{campaign.title}</td>
                                        <td className="p-3">{toPersianDigits(campaign.recipient_count)}</td>
                                        <td className="p-3 text-emerald-700">{toPersianDigits(campaign.sent_count)}</td>
                                        <td className="p-3 text-rose-700">{toPersianDigits(campaign.failed_count)}</td>
                                        <td className="p-3 text-slate-500">
                                            {campaign.status === "completed" ? "پایان‌یافته" : campaign.status === "sending" ? "در حال ارسال" : "در صف"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {rules.map((rule) => (
                    <form
                        key={rule.event_key}
                        onSubmit={(event) => {
                            event.preventDefault();
                            void save(rule, event.currentTarget);
                        }}
                        className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-primary">{rule.title}</h3>
                                <code dir="ltr" className="mt-1 block text-left text-[11px] text-slate-400">
                                    {rule.event_key}
                                </code>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                                <input
                                    name="enabled"
                                    type="checkbox"
                                    defaultChecked={rule.enabled}
                                    disabled={!canEdit}
                                    className="h-4 w-4 accent-secondary"
                                />
                                فعال
                            </label>
                        </div>
                        <label className="mt-4 block text-xs text-slate-500">
                            متن پیامک
                            <textarea
                                name="template_text"
                                defaultValue={rule.template_text}
                                disabled={!canEdit}
                                rows={4}
                                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-secondary"
                            />
                        </label>
                        <label className="mt-3 block text-xs text-slate-500">
                            کد پترن فراز
                            <input
                                name="provider_pattern_code"
                                defaultValue={rule.provider_pattern_code}
                                disabled={!canEdit}
                                className={`${inputClass} mt-1`}
                                placeholder="در حالت Webhook اختیاری است"
                            />
                        </label>
                        <p className="mt-3 text-[11px] leading-5 text-slate-400">
                            متغیرها: {"{patient_name}"}، {"{service_title}"}، {"{appointment_date}"}، {"{appointment_time}"}، {"{tracking_code}"}، {"{amount_toman}"}
                        </p>
                        {canEdit && (
                            <button
                                disabled={busy === rule.event_key}
                                className="mt-4 h-10 w-full rounded-xl bg-secondary font-bold text-primary disabled:opacity-50"
                            >
                                ذخیره قانون
                            </button>
                        )}
                    </form>
                ))}
            </div>
            <div className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                    <h3 className="font-dana text-xl text-primary">آخرین ارسال‌ها</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-3 text-right">رویداد</th>
                                <th className="p-3 text-right">شماره</th>
                                <th className="p-3 text-right">متن</th>
                                <th className="p-3 text-right">وضعیت</th>
                            </tr>
                        </thead>
                        <tbody>
                            {outbox.map((item) => (
                                <tr key={item.id} className="border-t border-slate-100">
                                    <td className="whitespace-nowrap p-3">{item.event_key}</td>
                                    <td dir="ltr" className="whitespace-nowrap p-3 text-right">{formatLocalPhone(item.phone)}</td>
                                    <td className="max-w-md p-3 text-slate-600">{item.rendered_body}</td>
                                    <td className="p-3">
                                        <span className={`rounded-full px-2 py-1 text-xs ${item.status === "sent" ? "bg-emerald-50 text-emerald-700" : item.status === "failed" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>
                                            {item.status === "sent" ? "ارسال شد" : item.status === "failed" ? "ناموفق" : item.status === "cancelled" ? "لغو شد" : item.status === "sending" ? "در حال ارسال" : "در صف"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!outbox.length && <p className="p-8 text-center text-slate-500">هنوز پیامکی در صف ثبت نشده است.</p>}
                </div>
            </div>
        </section>
    );
};


export default SmsCenterPanel;
