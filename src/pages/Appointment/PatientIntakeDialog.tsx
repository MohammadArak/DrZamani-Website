import AppSelect from "@/components/AppSelect";
import {
    appointmentApi,
    type Appointment
} from "@/services/appointmentApi";
import {
    useState,
    type FormEvent
} from "react";
import {
    IoCloseOutline
} from "react-icons/io5";

import { errorMessage,inputClass } from "./patientUi";
const IntakeFormDialog = ({
    token,
    appointment,
    onClose,
    onSaved,
}: {
    token: string;
    appointment: Appointment;
    onClose: () => void;
    onSaved: (appointment: Appointment) => void;
}) => {
    const [answers, setAnswers] = useState<Record<string, string | boolean>>(
        () => ({ ...(appointment.intake_submission?.answers ?? {}) }),
    );
    const [acceptedConsents, setAcceptedConsents] = useState<string[]>(
        () => [...(appointment.intake_submission?.accepted_consents ?? [])],
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        try {
            onSaved(
                await appointmentApi.submitAppointmentIntake(token, appointment.id, {
                    answers,
                    accepted_consents: acceptedConsents,
                }),
            );
        } catch (submitError) {
            setError(errorMessage(submitError));
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="fixed inset-0 z-110 overflow-y-auto bg-slate-950/55 p-0 backdrop-blur-sm sm:p-5" dir="rtl">
            <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
                <form onSubmit={submit} className="min-h-screen w-full overflow-hidden bg-[#f7f9fb] shadow-2xl sm:min-h-0 sm:rounded-4xl">
                    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-[linear-gradient(135deg,#173c5b,#2f6387)] px-4 py-4 text-white sm:px-6">
                        <div className="min-w-0">
                            <span className="text-xs text-secondary">فرم قبل از مراجعه</span>
                            <h2 className="mt-1 truncate font-dana text-xl">{appointment.service_title}</h2>
                        </div>
                        <button type="button" onClick={onClose} aria-label="بستن" className="rounded-xl p-2 transition hover:bg-white/10">
                            <IoCloseOutline size={26} />
                        </button>
                    </header>
                    <div className="space-y-6 p-4 sm:p-6">
                        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-xs leading-6 text-sky-800">
                            اطلاعات را دقیق وارد کنید. این پاسخ‌ها محرمانه‌اند و فقط برای آماده‌سازی مراجعه در اختیار مطب قرار می‌گیرند.
                        </div>
                        {error && <div role="alert" className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
                        {appointment.intake_form.questions.length > 0 && (
                            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <h3 className="font-dana text-lg text-primary">شرح‌حال قبل از مراجعه</h3>
                                <div className="mt-5 space-y-5">
                                    {appointment.intake_form.questions.map((question) => (
                                        <label key={question.key} className="block text-sm font-medium leading-7 text-slate-700">
                                            <span>{question.label}{question.is_required && <span className="mr-1 text-rose-500">*</span>}</span>
                                            {question.field_type === "long_text" ? (
                                                <textarea
                                                    value={String(answers[question.key] ?? "")}
                                                    onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))}
                                                    rows={4}
                                                    maxLength={4000}
                                                    className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white p-3 text-sm font-normal leading-7 outline-none transition focus:border-secondary focus:ring-4 focus:ring-secondary/10"
                                                    placeholder="پاسخ خود را بنویسید"
                                                />
                                            ) : question.field_type === "yes_no" ? (
                                                <AppSelect
                                                    value={answers[question.key] === true ? "true" : answers[question.key] === false ? "false" : ""}
                                                    onChange={(value) =>
                                                        setAnswers((current) => {
                                                            const next = { ...current };
                                                            if (value === "") delete next[question.key];
                                                            else next[question.key] = value === "true";
                                                            return next;
                                                        })
                                                    }
                                                    options={[
                                                        { value: "", label: "انتخاب کنید" },
                                                        { value: "true", label: "بله" },
                                                        { value: "false", label: "خیر" },
                                                    ]}
                                                    ariaLabel={question.label}
                                                    className="mt-2 font-normal"
                                                />
                                            ) : question.field_type === "single_choice" ? (
                                                <AppSelect
                                                    value={String(answers[question.key] ?? "")}
                                                    onChange={(value) => setAnswers((current) => ({ ...current, [question.key]: value }))}
                                                    options={[
                                                        { value: "", label: "انتخاب کنید" },
                                                        ...question.options.map((option) => ({ value: option, label: option })),
                                                    ]}
                                                    ariaLabel={question.label}
                                                    className="mt-2 font-normal"
                                                />
                                            ) : (
                                                <input
                                                    value={String(answers[question.key] ?? "")}
                                                    onChange={(event) => setAnswers((current) => ({ ...current, [question.key]: event.target.value }))}
                                                    maxLength={300}
                                                    className={`${inputClass} mt-2 font-normal`}
                                                    placeholder="پاسخ کوتاه"
                                                />
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </section>
                        )}
                        {appointment.intake_form.consents.length > 0 && (
                            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <h3 className="font-dana text-lg text-primary">رضایت‌نامه‌ها</h3>
                                <div className="mt-4 space-y-3">
                                    {appointment.intake_form.consents.map((consent) => {
                                        const checked = acceptedConsents.includes(consent.key);
                                        return (
                                            <label key={consent.key} className={`block cursor-pointer rounded-2xl border p-4 transition ${checked ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
                                                <span className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(event) =>
                                                            setAcceptedConsents((current) =>
                                                                event.target.checked
                                                                    ? [...current, consent.key]
                                                                    : current.filter((key) => key !== consent.key),
                                                            )
                                                        }
                                                        className="mt-1 h-5 w-5 shrink-0 accent-emerald-600"
                                                    />
                                                    <span>
                                                        <b className="text-sm text-primary">{consent.title}{consent.is_required && <span className="mr-1 text-rose-500">*</span>}</b>
                                                        <span className="mt-2 block whitespace-pre-line text-xs font-normal leading-7 text-slate-600">{consent.body}</span>
                                                    </span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                    <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur sm:px-6">
                        <button type="button" onClick={onClose} className="h-11 rounded-xl px-4 text-sm text-slate-500">انصراف</button>
                        <button disabled={busy} className="h-11 rounded-xl bg-primary px-6 text-sm font-bold text-white disabled:opacity-50">
                            {busy ? "در حال ثبت…" : appointment.intake_completed ? "ذخیره تغییرات" : "ثبت فرم"}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};


export default IntakeFormDialog;
