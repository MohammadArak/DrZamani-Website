import { IoArrowForward } from "react-icons/io5";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import AppSelect from "@/components/AppSelect";
import JalaliDatePicker from "@/components/JalaliDatePicker";
import {
    PATIENT_COOKIE_SESSION,
    appointmentApi,
    type PatientProfile,
    type PatientProfilePayload
} from "@/services/appointmentApi";
import {
    useState,
    useEffect,
    useRef,
    type FormEvent
} from "react";

import { AuthShell } from "./PatientShells";
import { errorMessage,genderOptions,inputClass,normalizeDigits } from "./patientUi";
const ProfileForm = ({
    profile,
    onSaved,
    embedded = false,
    onCancel,
}: {
    profile: PatientProfile;
    onSaved: (profile: PatientProfile) => void;
    embedded?: boolean;
    onCancel?: () => Promise<void>;
}) => {
    const [form, setForm] = useState<PatientProfilePayload>({
        referral_source: profile.referral_source ?? "",
        referral_detail: profile.referral_detail ?? "",
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        birth_date_jalali: profile.birth_date_jalali ?? "",
        email: profile.email,
        gender: profile.gender === "male" ? "male" : "female",
        national_id: profile.national_id,
        is_foreign_national: profile.is_foreign_national,
        foreign_identifier: profile.foreign_identifier,
    });
    const { ask, confirmation } = useConfirmDialog();
    const [savedProfile, setSavedProfile] = useState<PatientProfile | null>(null);
    const referrals = [{ value: "google", label: "جست‌وجوی گوگل" }, { value: "instagram", label: "اینستاگرام" }, { value: "eitaa", label: "ایتا" }, { value: "friends", label: "معرفی دوستان و خانواده" }, { value: "doctor", label: "معرفی پزشک" }, { value: "previous_visit", label: "مراجعه قبلی به مطب" }, { value: "other", label: "سایر" }];
    const [step, setStep] = useState(0);
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => { if (!embedded) heading.current?.focus(); }, [step, embedded]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const token = PATIENT_COOKIE_SESSION;
    const setField = <K extends keyof PatientProfilePayload>(
        field: K,
        value: PatientProfilePayload[K],
    ) => setForm((current) => ({ ...current, [field]: value }));

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (busy) return;
        if (!embedded && step === 4 && !form.referral_source) { setError("لطفاً یکی از گزینه‌های نحوه آشنایی را انتخاب کنید."); return; }
        if (!embedded && step < 5) { setError(""); setStep(step + 1); return; }
        if (!await ask(embedded ? "تغییرات اطلاعات شما ذخیره شود؟" : "اطلاعاتی که در این صفحه می‌بینید درست است و ثبت‌نام را تکمیل کنیم؟", { title: "تأیید اطلاعات", confirmLabel: "بله، ثبت شود", cancelLabel: "خیر، بررسی می‌کنم" })) return;
        setBusy(true);
        setError("");
        try {
            const saved = await appointmentApi.updateMe(token, {
                ...form,
                birth_date_jalali: normalizeDigits(form.birth_date_jalali),
                national_id: form.national_id
                    ? normalizeDigits(form.national_id)
                    : null,
                email: form.email || null,
            });
            if (embedded) onSaved(saved); else setSavedProfile(saved);
        } catch (saveError) {
            setError(errorMessage(saveError));
        } finally {
            setBusy(false);
        }
    };

    if (savedProfile) return <AuthShell><div className="py-5 text-center" role="status"><span aria-hidden="true" className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-700">✓</span><h2 className="text-2xl font-bold text-primary">ثبت‌نام شما با موفقیت انجام شد</h2><p className="mt-4 leading-7 text-slate-600">حالا می‌توانید نوبت بگیرید و زمان مراجعه‌تان را پیگیری کنید.</p><button className="mt-6 min-h-12 w-full rounded-xl bg-secondary px-4 font-bold text-primary-deep" onClick={() => onSaved(savedProfile)}>ورود به حساب من</button></div></AuthShell>;

    const content = (
        <div className="patient-profile mx-auto w-full max-w-xl">
            {confirmation}
            {!embedded && <div className="mb-3 flex items-center justify-between"><button type="button" aria-label="مرحله قبل" disabled={step === 0 || busy} className="flex h-11 w-11 items-center justify-center rounded-xl text-primary hover:bg-slate-100 disabled:invisible" onClick={() => { setError(""); setStep(step - 1); }}><IoArrowForward size={24} /></button><button type="button" disabled={busy} className="min-h-11 px-2 text-sm text-slate-600" onClick={async () => { if (await ask("ثبت‌نام را رها می‌کنید؟ اطلاعات این فرم ذخیره نشده و می‌توانید بعداً دوباره ثبت‌نام کنید.", { title: "لغو ثبت‌نام", confirmLabel: "بله", cancelLabel: "خیر" })) await onCancel?.(); }}>لغو ثبت‌نام</button></div>}
            <span className="text-sm text-secondary-deep">
                {embedded ? "ویرایش حساب" : `ثبت‌نام · مرحله ${["۱", "۲", "۳", "۴", "۵", "۶"][step]} از ۶`}
            </span>
            <h2 ref={heading} tabIndex={-1} className="mt-2 font-dana text-2xl text-primary outline-none">
                {embedded ? "اطلاعات کاربری" : ["نام شما", "مشخصات فردی", "راه ارتباطی", "اطلاعات شناسایی", "چطور با ما آشنا شدید؟", "بررسی اطلاعات"][step]}
            </h2>
            {embedded && <p className="mt-3 text-sm leading-7 text-slate-500">
                اطلاعات زیر برای تشکیل و به‌روزرسانی پرونده نوبت‌دهی استفاده
                می‌شود.
            </p>}
            {error && (
                <div
                    role="alert"
                    className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                    {error}
                </div>
            )}
            <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
                {(embedded || step === 0) && <>
                <label>
                    <span className="mb-2 block text-sm">نام</span>
                    <input
                        className={inputClass}
                        value={form.first_name}
                        onChange={(e) => setField("first_name", e.target.value)}
                        minLength={2}
                        required
                    />
                </label>
                <label>
                    <span className="mb-2 block text-sm">نام خانوادگی</span>
                    <input
                        className={inputClass}
                        value={form.last_name}
                        onChange={(e) => setField("last_name", e.target.value)}
                        minLength={2}
                        required
                    />
                </label>
                </>}
                {(embedded || step === 1) && <>
                <label>
                    <span className="mb-2 block text-sm">تاریخ تولد شمسی</span>
                    <JalaliDatePicker
                        value={form.birth_date_jalali}
                        onChange={(value) =>
                            setField("birth_date_jalali", value)
                        }
                        output="jalali"
                        placeholder="انتخاب تاریخ تولد"
                        required
                    />
                </label>
                <label>
                    <span className="mb-2 block text-sm">جنسیت</span>
                    <AppSelect
                        value={form.gender}
                        onChange={(value) =>
                            setField(
                                "gender",
                                value as PatientProfilePayload["gender"],
                            )
                        }
                        options={genderOptions}
                        ariaLabel="جنسیت"
                        buttonClassName="h-13 rounded-2xl px-4"
                    />
                </label>
                </>}
                {(embedded || step === 2) && <>
                <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm">ایمیل (اختیاری)</span>
                    <input
                        type="email"
                        dir="ltr"
                        className={`${inputClass} text-left`}
                        value={form.email ?? ""}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="name@example.com"
                    />
                </label>
                </>}
                {(embedded || step === 3) && <>
                <label className="sm:col-span-2 flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                    <span>
                        <b className="block text-sm text-slate-700">
                            اتباع خارجی هستم
                        </b>
                        <span className="mt-1 block text-xs text-slate-500">
                            در این حالت به جای کد ملی، شناسه اتباع ثبت می‌شود.
                        </span>
                    </span>
                    <input
                        type="checkbox"
                        className="h-5 w-5 accent-secondary"
                        checked={form.is_foreign_national}
                        onChange={(e) =>
                            setField("is_foreign_national", e.target.checked)
                        }
                    />
                </label>
                <label className="sm:col-span-2">
                    <span className="mb-2 block text-sm">
                        {form.is_foreign_national ? "شناسه اتباع" : "کد ملی"}
                    </span>
                    <input
                        dir="ltr"
                        inputMode="numeric"
                        className={`${inputClass} text-left`}
                        value={
                            form.is_foreign_national
                                ? (form.foreign_identifier ?? "")
                                : (form.national_id ?? "")
                        }
                        onChange={(e) =>
                            setField(
                                form.is_foreign_national
                                    ? "foreign_identifier"
                                    : "national_id",
                                e.target.value,
                            )
                        }
                        required
                    />
                </label>
                </>}
                {(embedded || step === 4) && <div className="space-y-3 sm:col-span-2"><AppSelect value={form.referral_source || ""} onChange={value => setField("referral_source", value)} options={[{value:"",label:"انتخاب کنید"},...referrals]} ariaLabel="نحوه آشنایی با مطب" buttonClassName="h-12 rounded-xl px-4" />{form.referral_source === "other" && <label className="block text-sm">توضیح بیشتر (اختیاری)<textarea maxLength={500} rows={2} className={`${inputClass} mt-2 !h-auto`} value={form.referral_detail || ""} onChange={e => setField("referral_detail", e.target.value)} /></label>}</div>}
                {!embedded && step === 5 && <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm leading-6 sm:col-span-2">{[["نام و نام خانوادگی",`${form.first_name} ${form.last_name}`],["تاریخ تولد",form.birth_date_jalali],["جنسیت",form.gender === "male" ? "مرد" : "زن"],["کد شناسایی",form.is_foreign_national ? form.foreign_identifier : form.national_id],["ایمیل",form.email || "ثبت نشده"],["نحوه آشنایی",referrals.find(item => item.value === form.referral_source)?.label],...(form.referral_source === "other" && form.referral_detail ? [["توضیح",form.referral_detail]] : [])].map(([label,value]) => <div key={label} className="min-w-0 rounded-lg bg-slate-50 px-2 py-1"><dt className="text-slate-500">{label}</dt><dd className="break-words font-medium text-slate-800">{value}</dd></div>)}</dl>}
                <button
                    disabled={busy}
                    className="mt-2 h-13 rounded-2xl bg-secondary font-bold text-primary-deep transition hover:bg-secondary-mild disabled:opacity-60 sm:col-span-2"
                >
                    {busy ? "در حال ثبت…" : !embedded && step < 5 ? "ادامه" : "ثبت اطلاعات"}
                </button>
            </form>
        </div>
    );

    return embedded ? content : <AuthShell>{content}</AuthShell>;
};


export default ProfileForm;
