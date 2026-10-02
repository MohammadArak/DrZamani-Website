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
    type FormEvent
} from "react";

import { AuthShell } from "./PatientShells";
import { errorMessage,genderOptions,inputClass,normalizeDigits } from "./patientUi";
const ProfileForm = ({
    profile,
    onSaved,
    embedded = false,
}: {
    profile: PatientProfile;
    onSaved: (profile: PatientProfile) => void;
    embedded?: boolean;
}) => {
    const [form, setForm] = useState<PatientProfilePayload>({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        birth_date_jalali: profile.birth_date_jalali ?? "",
        email: profile.email,
        gender: profile.gender === "male" ? "male" : "female",
        national_id: profile.national_id,
        is_foreign_national: profile.is_foreign_national,
        foreign_identifier: profile.foreign_identifier,
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const token = PATIENT_COOKIE_SESSION;
    const setField = <K extends keyof PatientProfilePayload>(
        field: K,
        value: PatientProfilePayload[K],
    ) => setForm((current) => ({ ...current, [field]: value }));

    const submit = async (event: FormEvent) => {
        event.preventDefault();
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
            onSaved(saved);
        } catch (saveError) {
            setError(errorMessage(saveError));
        } finally {
            setBusy(false);
        }
    };

    const content = (
        <div className="mx-auto w-full max-w-xl py-4">
            <span className="text-sm text-secondary-deep">
                {embedded ? "ویرایش حساب" : "مرحله پایانی ثبت‌نام"}
            </span>
            <h2 className="mt-2 font-dana text-3xl text-primary">
                {embedded ? "اطلاعات کاربری" : "تکمیل اطلاعات کاربری"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
                اطلاعات زیر برای تشکیل و به‌روزرسانی پرونده نوبت‌دهی استفاده
                می‌شود.
            </p>
            {error && (
                <div
                    role="alert"
                    className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                    {error}
                </div>
            )}
            <form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">
                <label>
                    <span className="mb-2 block text-sm">نام</span>
                    <input
                        className={inputClass}
                        value={form.first_name}
                        onChange={(e) => setField("first_name", e.target.value)}
                        required
                    />
                </label>
                <label>
                    <span className="mb-2 block text-sm">نام خانوادگی</span>
                    <input
                        className={inputClass}
                        value={form.last_name}
                        onChange={(e) => setField("last_name", e.target.value)}
                        required
                    />
                </label>
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
                <button
                    disabled={busy}
                    className="mt-2 h-13 rounded-2xl bg-secondary font-bold text-white transition hover:bg-secondary-mild disabled:opacity-60 sm:col-span-2"
                >
                    {busy ? "در حال ثبت…" : "ثبت اطلاعات"}
                </button>
            </form>
        </div>
    );

    return embedded ? content : <AuthShell>{content}</AuthShell>;
};


export default ProfileForm;
