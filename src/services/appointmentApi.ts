const API_BASE = (import.meta.env.VITE_APPOINTMENT_API_URL ?? "/api/v1").replace(/\/$/, "");

export const PATIENT_TOKEN_KEY = "drz_patient_token";
export const STAFF_TOKEN_KEY = "drz_staff_token";
export const STAFF_PROFILE_KEY = "drz_staff_profile";

export type StaffIdentity = {
    id: number; username: string; full_name: string; role: string;
    role_ids: number[]; role_titles: string[]; permissions: string[]; is_superadmin: boolean; is_active: boolean;
};
export type AccessRole = { id: number; slug: string; name: string; description: string; is_active: boolean; is_system: boolean; is_superadmin: boolean; permissions: string[]; member_count: number };
export type AccessRoleWrite = Pick<AccessRole, "name" | "description" | "is_active" | "permissions">;
export type AccessPermission = { code: string; title: string; group: string; requires: string[]; future: boolean; owner_only: boolean };
export type AccessStaffWrite = { full_name: string; role_ids: number[]; is_active: boolean; password?: string; username?: string };

export type PatientProfile = {
    id: number;
    phone: string;
    first_name: string | null;
    last_name: string | null;
    birth_date_jalali: string | null;
    email: string | null;
    gender: "female" | "male" | null;
    national_id: string | null;
    is_foreign_national: boolean;
    foreign_identifier: string | null;
    profile_completed: boolean;
};

export type PatientProfilePayload = {
    first_name: string;
    last_name: string;
    birth_date_jalali: string;
    email: string | null;
    gender: "female" | "male";
    national_id: string | null;
    is_foreign_national: boolean;
    foreign_identifier: string | null;
};

export type ClinicSettings = {
    booking_enabled?: boolean;
    booking_disabled_message?: string;
    revision: number;
    seo_title: string;
    seo_description: string;
    seo_image_url: string;
    doctor_name: string;
    specialty: string;
    medical_council_number: string;
    office_phone: string;
    consultation_phone: string;
    email: string;
    address_region: string;
    address_city: string;
    address: string;
    working_hours: string;
    site_url: string;
    map_embed_url: string;
    map_page_url: string;
    map_latitude: number;
    map_longitude: number;
    instagram_url: string;
    eitaa_url: string;
    slot_duration_minutes: number;
    booking_horizon_days: number;
    minimum_lead_hours: number;
    cancellation_cutoff_hours: number;
    reschedule_cutoff_hours: number;
    max_patient_reschedules: number;
    reminder_enabled: boolean;
    first_reminder_hours: number;
    final_reminder_hours: number;
    timezone_name: string;
};

export type SystemSettingField = {
    key: string; label: string; group: string; kind: "string" | "integer" | "boolean" | "select";
    minimum: number | null; maximum: number | null; choices: string[]; help: string;
    secret: boolean; owner_only: boolean; value: string | number | boolean | null;
    default: string | number | boolean | null; configured: boolean; source: string;
};
export type SettingsHistory = { revision: number; changed_keys: string[]; actor_staff_id: number | null; created_at: string };
export type SystemSettings = {
    revision: number; fields: SystemSettingField[];
    status: { environment: string; encryption_ready: boolean; captcha_verified: {google: boolean; turnstile: boolean}; webhook_allowed_hosts: string[]; frontend_origins: string[]; public_html_ready: boolean };
    infrastructure: { key: string; help: string }[]; future: Record<string, string>;
};

export type Service = {
    id: number;
    title: string;
    description: string;
    duration_minutes: number;
    icon_key: "medical" | "nose" | "ear" | "throat" | "surgery" | "followup" | "consultation";
    allows_media_chat: boolean;
    price_toman: number;
    payment_mode: "none" | "deposit" | "full";
    deposit_toman: number;
    urgent_enabled: boolean;
    urgent_extra_toman: number;
    buffer_before_minutes: number;
    buffer_after_minutes: number;
    concurrent_capacity: number;
    pre_visit_instructions: string;
    post_visit_instructions: string;
    image_requirements: Array<{
        id: number;
        title: string;
        is_required: boolean;
        sort_order: number;
    }>;
    weekly_schedules: Array<{
        weekday: number;
        enabled: boolean;
        start_time: string;
        end_time: string;
    }>;
    urgent_schedules: Array<{
        weekday: number;
        enabled: boolean;
        start_time: string;
        end_time: string;
    }>;
    intake_questions: ServiceIntakeQuestion[];
    consents: ServiceConsent[];
    is_active: boolean;
    sort_order: number;
};

export type ServiceIntakeQuestion = {
    id: number;
    label: string;
    field_type: "short_text" | "long_text" | "yes_no" | "single_choice";
    options: string[];
    is_required: boolean;
    sort_order: number;
};

export type ServiceConsent = {
    id: number;
    title: string;
    body: string;
    is_required: boolean;
    sort_order: number;
};

export type IntakeQuestionSnapshot = Omit<ServiceIntakeQuestion, "id"> & {
    key: string;
};

export type ConsentSnapshot = Omit<ServiceConsent, "id"> & {
    key: string;
};

export type AppointmentIntakeSubmission = {
    answers: Record<string, string | boolean>;
    accepted_consents: string[];
};

export type AvailableDate = {
    date: string;
    available_slots: number;
};

export type AvailableSlot = {
    start_time: string;
    end_time: string;
    is_urgent: boolean;
};

export type Appointment = {
    id: number;
    tracking_code: string;
    service_id: number;
    service_title: string;
    service_duration_minutes: number;
    service_icon_key: Service["icon_key"];
    consultation_enabled: boolean;
    image_requirements: Service["image_requirements"];
    appointment_date: string;
    start_time: string;
    end_time: string;
    has_previous_visit: boolean;
    is_urgent: boolean;
    price_toman: number;
    amount_paid_toman: number;
    payment_status: "not_required" | "paid" | "refunded" | "pending";
    status: "pending" | "confirmed" | "completed" | "cancelled";
    patient_note: string | null;
    staff_note: string | null;
    patient_name?: string | null;
    patient_phone?: string | null;
    created_at: string;
    rescheduled_at: string | null;
    patient_reschedule_count: number;
    can_patient_reschedule: boolean;
    patient_reschedule_reason: string | null;
    intake_required: boolean;
    intake_completed: boolean;
    intake_form: {
        questions: IntakeQuestionSnapshot[];
        consents: ConsentSnapshot[];
    };
    intake_submission: AppointmentIntakeSubmission | null;
    intake_submitted_at: string | null;
    pre_visit_instructions: string;
    post_visit_instructions: string;
    reminder_count: number;
};

export type PatientListItem = {
    id: number;
    full_name: string;
    phone: string;
    gender: "female" | "male" | null;
    birth_date_jalali: string | null;
    tags: string[];
    needs_follow_up: boolean;
    profile_completed: boolean;
    appointment_count: number;
    completed_count: number;
    last_appointment_date: string | null;
    next_appointment_date: string | null;
    created_at: string;
};

export type PatientPage = {
    items: PatientListItem[];
    available_tags: string[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
};

export type PatientRecord = {
    id: number;
    phone: string;
    first_name: string | null;
    last_name: string | null;
    birth_date_jalali: string | null;
    email: string | null;
    gender: "female" | "male" | null;
    national_id: string | null;
    is_foreign_national: boolean;
    foreign_identifier: string | null;
    profile_completed: boolean;
    is_active: boolean;
    internal_note: string | null;
    tags: string[];
    needs_follow_up: boolean;
    created_at: string;
    updated_at: string;
    appointment_count: number;
    completed_count: number;
    total_paid_toman: number;
    appointments: Appointment[];
    payments: Array<{
        id: number;
        appointment_id: number | null;
        service_title: string;
        amount_toman: number;
        status: string;
        refund_status: string;
        created_at: string;
    }>;
    conversations: Array<{
        appointment_id: number;
        service_title: string;
        message_count: number;
        image_count: number;
        unread_count: number;
        last_message: string | null;
        last_message_at: string | null;
    }>;
    timeline: Array<{
        kind: "appointment" | "payment" | "conversation";
        title: string;
        description: string | null;
        occurred_at: string;
        appointment_id: number | null;
    }>;
    duplicate_candidates: PatientListItem[];
};

export type WeeklySchedule = {
    weekday: number;
    enabled: boolean;
    start_time: string;
    end_time: string;
};

export type ScheduleException = {
    id: number;
    exception_date: string;
    is_closed: boolean;
    start_time: string | null;
    end_time: string | null;
    note: string | null;
};

export type ServiceScheduleException = ScheduleException & {
    service_id: number;
};

export type DashboardStats = {
    today_total: number;
    pending_total: number;
    confirmed_total: number;
    patients_total: number;
    unread_conversations: number;
    waitlist_total: number;
    refund_attention_total: number;
    daily_appointments: Array<{ date: string; total: number }>;
};

export type AppointmentPage = {
    items: Appointment[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
};

export type UploadProgress = {
    loaded: number;
    total: number;
    percent: number;
};

export type ConsultationMessage = {
    id: number;
    appointment_id: number;
    sender_type: "patient" | "staff";
    sender_name: string;
    body: string | null;
    view_label: string | null;
    image_requirement_id: number | null;
    image_requirement_title: string | null;
    has_image: boolean;
    original_file_name: string | null;
    created_at: string;
    read_at: string | null;
};

export type BookingStartResponse = {
    requires_payment: boolean;
    appointment: Appointment | null;
    payment_url: string | null;
    hold_id: string | null;
    amount_toman: number;
    expires_at: string | null;
};

export type SmsAutomationRule = {
    event_key: string;
    title: string;
    enabled: boolean;
    template_text: string;
    provider_pattern_code: string;
    updated_at: string;
};

export type SmsOutboxItem = {
    id: number;
    event_key: string;
    campaign_id: number | null;
    phone: string;
    rendered_body: string;
    status: "pending" | "sending" | "sent" | "failed" | "cancelled";
    attempts: number;
    last_error: string | null;
    created_at: string;
    sent_at: string | null;
};

export type SmsCampaignFilters = {
    service_ids: number[];
    gender: "female" | "male" | null;
    min_age: number | null;
    max_age: number | null;
};

export type SmsCampaign = {
    id: number;
    title: string;
    message_text: string;
    provider_pattern_code: string;
    filters: SmsCampaignFilters;
    status: "queued" | "sending" | "completed";
    recipient_count: number;
    sent_count: number;
    failed_count: number;
    created_at: string;
};

export type ConsultationThread = {
    appointment_id: number;
    patient_name: string;
    patient_phone: string;
    service_title: string;
    appointment_date: string;
    appointment_time: string;
    appointment_status: Appointment["status"];
    patient_note: string | null;
    last_message: string | null;
    last_message_at: string | null;
    last_sender_type: "patient" | "staff" | null;
    unread_count: number;
};

export type WaitlistEntry = {
    id: number;
    patient_id: number;
    patient_name: string;
    patient_phone: string;
    service_id: number;
    service_title: string;
    desired_date: string | null;
    is_urgent: boolean;
    status: "waiting" | "notified" | "booked" | "cancelled" | "expired";
    offered_date: string | null;
    offered_start_time: string | null;
    offered_end_time: string | null;
    expires_at: string | null;
    created_at: string;
};

export type FinanceSummary = {
    verified_count: number;
    collected_toman: number;
    refund_pending_count: number;
    refund_pending_toman: number;
    refunded_count: number;
    refunded_toman: number;
    failed_count: number;
};

export type PaymentItem = {
    id: number;
    appointment_id: number | null;
    tracking_code: string | null;
    patient_name: string;
    service_title: string;
    amount_toman: number;
    status: string;
    ref_id: string | null;
    refund_status: "none" | "requested" | "processing" | "refunded" | "rejected";
    refund_amount_toman: number;
    refund_reference: string | null;
    refund_note: string | null;
    created_at: string;
    verified_at: string | null;
    refunded_at: string | null;
};

export type AuditLogItem = {
    id: number;
    actor_name: string;
    actor_role: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    summary: string;
    details: Record<string, unknown>;
    created_at: string;
};

export type CaptchaChallenge = {
    captcha_id: string;
    image_data: string;
    expires_in_seconds: number;
    debug_answer?: string | null;
};

export type BotOperation = "staff_login" | "otp_request" | "otp_verify";
export type BotProof = { challenge_id: string; token: string };
export type BotChallenge = { challenge_id: string; provider: "local" | "none" | "google" | "turnstile"; operation: BotOperation | "captcha_setup"; site_key: string; expires_in_seconds: number; fallback_used: boolean };
export type MfaLoginRequired = { mfa_required: true; challenge_id: string; expires_in_seconds: number; methods: string[] };
export type MfaStatus = { enabled: boolean; required: boolean; recovery_remaining: number; encryption_ready: boolean };
export type MfaEnrollment = { enrollment_id: string; secret: string; otpauth_uri: string; expires_in_seconds: number };
export type MfaPassword = { password: string; code?: string; method?: "totp" | "recovery" };

type ApiErrorPayload = {
    detail?: string | { message?: string; retry_after_seconds?: number; bot_challenge?: BotChallenge } | Array<{ msg?: string }>;
    message?: string;
};

export class AppointmentApiError extends Error {
    status: number;
    retryAfter?: number;
    botChallenge?: BotChallenge;

    constructor(message: string, status: number, retryAfter?: number, botChallenge?: BotChallenge) {
        super(message);
        this.name = "AppointmentApiError";
        this.status = status;
        this.retryAfter = retryAfter;
        this.botChallenge = botChallenge;
    }
}

// These values select a cookie audience; they contain no authentication secret.
export const PATIENT_COOKIE_SESSION = "patient-cookie";
export const STAFF_COOKIE_SESSION = "staff-cookie";
export const browserCsrf = (audience: "patient" | "staff") => {
    const names = [`__Host-drz_${audience}_csrf`, `drz_${audience}_csrf`];
    for (const item of document.cookie.split(";")) {
        const separator = item.indexOf("=");
        if (names.includes(item.slice(0, separator).trim())) return item.slice(separator + 1);
    }
    return "";
};

const sessionHeaders = (token?: string | null) => {
    const headers = new Headers();
    if (token === PATIENT_COOKIE_SESSION || token === STAFF_COOKIE_SESSION) {
        const audience = token === STAFF_COOKIE_SESSION ? "staff" : "patient";
        headers.set("X-CSRF-Token", browserCsrf(audience));
    } else if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
};

const translateServerMessage = (message: string) => {
    const normalized = message.trim();
    const rules: Array<[RegExp, string]> = [
        [/field required/i, "تکمیل این فیلد الزامی است"],
        [/input should be a valid/i, "مقدار واردشده معتبر نیست"],
        [/string should have at least/i, "تعداد نویسه‌های واردشده کافی نیست"],
        [/string should have at most/i, "تعداد نویسه‌های واردشده بیش از حد مجاز است"],
        [/value is not a valid/i, "مقدار واردشده معتبر نیست"],
        [/internal server error/i, "خطای داخلی سامانه؛ لطفاً دوباره تلاش کنید"],
        [/not found/i, "اطلاعات موردنظر پیدا نشد"],
        [/unauthorized|not authenticated/i, "برای ادامه باید وارد سامانه شوید"],
        [/forbidden/i, "اجازه انجام این عملیات را ندارید"],
    ];
    return rules.find(([pattern]) => pattern.test(normalized))?.[1] ?? normalized;
};

const getMessage = (payload: ApiErrorPayload, fallback: string) => {
    if (typeof payload.detail === "string") return translateServerMessage(payload.detail);
    if (Array.isArray(payload.detail)) {
        return (
            payload.detail
                .map((item) => item.msg && translateServerMessage(item.msg))
                .filter(Boolean)
                .join("، ") || fallback
        );
    }
    if (payload.detail && typeof payload.detail === "object") {
        return payload.detail.message
            ? translateServerMessage(payload.detail.message)
            : fallback;
    }
    return payload.message ? translateServerMessage(payload.message) : fallback;
};

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
    token?: string | null,
): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body && !(options.body instanceof FormData))
        headers.set("Content-Type", "application/json");
    sessionHeaders(token).forEach((value, key) => headers.set(key, value));

    let response: Response;
    try {
        response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: "include" });
    } catch {
        throw new AppointmentApiError("ارتباط با سامانه نوبت‌دهی برقرار نشد", 0);
    }

    if (!response.ok) {
        if (response.status === 401 && token === STAFF_COOKIE_SESSION) window.dispatchEvent(new Event("drz:staff-expired"));
        const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
        const retryAfter =
            payload.detail && !Array.isArray(payload.detail) && typeof payload.detail === "object"
                ? payload.detail.retry_after_seconds
                : undefined;
        throw new AppointmentApiError(
            getMessage(payload, "در انجام درخواست خطایی رخ داد"),
            response.status,
            retryAfter,
            payload.detail && !Array.isArray(payload.detail) && typeof payload.detail === "object" ? payload.detail.bot_challenge : undefined,
        );
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
}

function apiUpload<T>(
    path: string,
    token: string,
    form: FormData,
    contentSize: number,
    onProgress?: (progress: UploadProgress) => void,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}${path}`);
        xhr.withCredentials = true;
        xhr.setRequestHeader("Accept", "application/json");
        sessionHeaders(token).forEach((value, key) => xhr.setRequestHeader(key, value));

        xhr.upload.onprogress = (event) => {
            const requestTotal = event.lengthComputable ? event.total : contentSize;
            const ratio = requestTotal > 0 ? Math.min(1, event.loaded / requestTotal) : 0;
            const total = Math.max(0, contentSize);
            const loaded = total > 0 ? Math.min(total, Math.round(total * ratio)) : event.loaded;
            const percent = Math.min(100, Math.round(ratio * 100));
            onProgress?.({ loaded, total, percent });
        };
        xhr.onerror = () =>
            reject(new AppointmentApiError("ارتباط با سامانه نوبت‌دهی برقرار نشد", 0));
        xhr.onabort = () =>
            reject(new AppointmentApiError("بارگذاری تصویر متوقف شد", 0));
        xhr.onload = () => {
            let payload: ApiErrorPayload | T = {} as T;
            if (xhr.responseText) {
                try {
                    payload = JSON.parse(xhr.responseText) as ApiErrorPayload | T;
                } catch {
                    payload = {} as T;
                }
            }
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(
                    new AppointmentApiError(
                        getMessage(payload as ApiErrorPayload, "بارگذاری تصویر ناموفق بود"),
                        xhr.status,
                    ),
                );
                return;
            }
            onProgress?.({ loaded: contentSize, total: contentSize, percent: 100 });
            resolve(payload as T);
        };
        xhr.send(form);
    });
}

async function apiBlob(path: string, token: string): Promise<Blob> {
    let response: Response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            headers: { ...Object.fromEntries(sessionHeaders(token)), Accept: "*/*" },
            credentials: "include",
        });
    } catch {
        throw new AppointmentApiError("ارتباط با سامانه برقرار نشد", 0);
    }
    if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
        throw new AppointmentApiError(
            getMessage(payload, "دریافت فایل ناموفق بود"),
            response.status,
        );
    }
    return response.blob();
}

export const appointmentApi = {
    botChallenge: (operation: BotOperation) => apiRequest<BotChallenge>(`/auth/bot/challenge?operation=${operation}`),
    captchaSetup: (token: string, provider: "google" | "turnstile") => apiRequest<BotChallenge>(`/staff/system-settings/captcha/setup?provider=${provider}`, {}, token),
    captchaConfirm: (token: string, proof: BotProof) => apiRequest<{verified: boolean; provider: string}>("/staff/system-settings/captcha/confirm", {method: "POST", body: JSON.stringify(proof)}, token),
    mfaStatus: (token: string) => apiRequest<MfaStatus>("/staff/auth/mfa/status", {}, token),
    changePassword: (token: string, payload: {password: string; new_password: string; code: string; method: "totp" | "recovery"}) => apiRequest<{changed: boolean}>("/staff/auth/password", {method: "POST", body: JSON.stringify(payload)}, token),
    mfaEnroll: (token: string, payload: MfaPassword) => apiRequest<MfaEnrollment>("/staff/auth/mfa/enroll", {method: "POST", body: JSON.stringify(payload)}, token),
    mfaConfirm: (token: string, enrollment_id: string, code: string) => apiRequest<{recovery_codes: string[]}>("/staff/auth/mfa/confirm", {method: "POST", body: JSON.stringify({enrollment_id, code})}, token),
    mfaRecovery: (token: string, payload: MfaPassword) => apiRequest<{recovery_codes: string[]}>("/staff/auth/mfa/recovery-codes", {method: "POST", body: JSON.stringify(payload)}, token),
    mfaDisable: (token: string, payload: MfaPassword) => apiRequest<{enabled: boolean}>("/staff/auth/mfa/disable", {method: "POST", body: JSON.stringify(payload)}, token),
    mfaLogin: (challenge_id: string, code: string, method: "totp" | "recovery") => apiRequest<StaffIdentity & {access_token: string; expires_at: string}>("/staff/auth/mfa/verify", {method: "POST", headers: {"X-Session-Transport":"cookie"}, body: JSON.stringify({challenge_id, code, method})}),
    requestOtp: (phone: string, bot?: BotProof) =>
        apiRequest<{ message: string; retry_after_seconds: number; code_length?: number; debug_otp?: string }>(
            "/auth/otp/request",
            { method: "POST", body: JSON.stringify({ phone, bot }) },
        ),
    verifyOtp: (phone: string, code: string, bot?: BotProof) =>
        apiRequest<{
            access_token: string;
            expires_at: string;
            profile_completed: boolean;
        }>("/auth/otp/verify", {
            method: "POST",
            headers: { "X-Session-Transport": "cookie" },
            body: JSON.stringify({ phone, code, bot }),
        }),
    logout: (token: string) =>
        apiRequest<{ message: string }>(token === STAFF_COOKIE_SESSION ? "/staff/auth/logout" : "/auth/logout", { method: "POST" }, token),
    getMe: (token: string) => apiRequest<PatientProfile>("/me", {}, token),
    updateMe: (token: string, payload: PatientProfilePayload) =>
        apiRequest<PatientProfile>("/me", { method: "PUT", body: JSON.stringify(payload) }, token),
    getClinic: () => apiRequest<ClinicSettings>("/clinic"),
    getServices: () => apiRequest<Service[]>("/services"),
    getAvailableDates: (serviceId?: number, urgent = false) =>
        apiRequest<AvailableDate[]>(
            `/availability/dates${serviceId ? `?service_id=${serviceId}&urgent=${urgent}` : ""}`,
        ),
    getAvailableSlots: (date: string, serviceId?: number, urgent = false) =>
        apiRequest<AvailableSlot[]>(
            `/availability/${date}${serviceId ? `?service_id=${serviceId}&urgent=${urgent}` : ""}`,
        ),
    getAppointments: (token: string) => apiRequest<Appointment[]>("/appointments", {}, token),
    submitAppointmentIntake: (
        token: string,
        id: number,
        payload: AppointmentIntakeSubmission,
    ) =>
        apiRequest<Appointment>(
            `/appointments/${id}/intake`,
            { method: "PUT", body: JSON.stringify(payload) },
            token,
        ),
    createAppointment: (
        token: string,
        payload: {
            service_id: number;
            appointment_date: string;
            start_time: string;
            has_previous_visit: boolean;
            is_urgent: boolean;
            patient_note?: string;
        },
    ) =>
        apiRequest<BookingStartResponse>(
            "/appointments",
            { method: "POST", body: JSON.stringify(payload) },
            token,
        ),
    cancelAppointment: (token: string, id: number) =>
        apiRequest<Appointment>(`/appointments/${id}/cancel`, { method: "POST" }, token),
    getWaitlist: (token: string) => apiRequest<WaitlistEntry[]>("/waitlist", {}, token),
    joinWaitlist: (
        token: string,
        payload: { service_id: number; desired_date: string | null; is_urgent: boolean },
    ) =>
        apiRequest<WaitlistEntry>(
            "/waitlist",
            { method: "POST", body: JSON.stringify(payload) },
            token,
        ),
    leaveWaitlist: (token: string, id: number) =>
        apiRequest<{ message: string }>(`/waitlist/${id}`, { method: "DELETE" }, token),
    getPatientRescheduleDates: (token: string, appointmentId: number) =>
        apiRequest<AvailableDate[]>(
            `/appointments/${appointmentId}/reschedule/dates`,
            {},
            token,
        ),
    getPatientRescheduleSlots: (
        token: string,
        appointmentId: number,
        day: string,
    ) =>
        apiRequest<AvailableSlot[]>(
            `/appointments/${appointmentId}/reschedule/slots?day=${encodeURIComponent(day)}`,
            {},
            token,
        ),
    reschedulePatientAppointment: (
        token: string,
        appointmentId: number,
        payload: { appointment_date: string; start_time: string },
    ) =>
        apiRequest<Appointment>(
            `/appointments/${appointmentId}/reschedule`,
            { method: "PATCH", body: JSON.stringify(payload) },
            token,
        ),
    appointmentCalendar: (token: string, appointmentId: number) =>
        apiBlob(`/appointments/${appointmentId}/calendar`, token),

    getConsultation: (token: string, appointmentId: number) =>
        apiRequest<ConsultationMessage[]>(
            `/appointments/${appointmentId}/consultation`,
            {},
            token,
        ),
    sendConsultationMessage: (token: string, appointmentId: number, body: string) =>
        apiRequest<ConsultationMessage>(
            `/appointments/${appointmentId}/consultation/messages`,
            { method: "POST", body: JSON.stringify({ body }) },
            token,
        ),
    uploadConsultationImage: (
        token: string,
        appointmentId: number,
        file: File,
        imageRequirementId: number,
        onProgress?: (progress: UploadProgress) => void,
    ) => {
        const form = new FormData();
        form.append("file", file);
        form.append("image_requirement_id", String(imageRequirementId));
        return apiUpload<ConsultationMessage>(
            `/appointments/${appointmentId}/consultation/images`,
            token,
            form,
            file.size,
            onProgress,
        );
    },
    consultationImage: (token: string, appointmentId: number, messageId: number) =>
        apiBlob(
            `/appointments/${appointmentId}/consultation/images/${messageId}`,
            token,
        ),

    staffCaptcha: () => apiRequest<CaptchaChallenge>("/staff/auth/captcha"),
    staffLogin: (
        username: string,
        password: string,
        captchaId: string,
        captchaAnswer: string,
        bot?: BotProof,
    ) =>
        apiRequest<(StaffIdentity & { access_token: string; expires_at: string }) | MfaLoginRequired>("/staff/auth/login", {
            method: "POST",
            headers: { "X-Session-Transport": "cookie" },
            body: JSON.stringify({
                username,
                password,
                captcha_id: captchaId,
                captcha_answer: captchaAnswer,
                bot,
            }),
        }),
    staffMe: () => apiRequest<StaffIdentity>("/staff/me", {}, STAFF_COOKIE_SESSION),
    accessRoles: (token: string) => apiRequest<AccessRole[]>("/staff/access/roles", {}, token),
    accessPermissions: (token: string) => apiRequest<AccessPermission[]>("/staff/access/permissions", {}, token),
    accessStaff: (token: string) => apiRequest<StaffIdentity[]>("/staff/access/staff", {}, token),
    saveAccessRole: (token: string, id: number | null, payload: AccessRoleWrite) => apiRequest<AccessRole>(`/staff/access/roles${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }, token),
    deleteAccessRole: (token: string, id: number) => apiRequest<{ message: string }>(`/staff/access/roles/${id}`, { method: "DELETE" }, token),
    saveAccessStaff: (token: string, id: number | null, payload: AccessStaffWrite) => apiRequest<StaffIdentity>(`/staff/access/staff${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }, token),
    staffStats: (token: string) => apiRequest<DashboardStats>("/staff/dashboard", {}, token),
    staffSettings: (token: string) => apiRequest<ClinicSettings>("/staff/settings", {}, token),
    systemSettings: (token: string) => apiRequest<SystemSettings>("/staff/system-settings", {}, token),
    updateSystemSettings: (token: string, revision: number, values: Record<string, unknown>, reset: string[]) => apiRequest<SystemSettings>("/staff/system-settings", { method: "PUT", body: JSON.stringify({ revision, values, reset }) }, token),
    settingsHistory: (token: string) => apiRequest<SettingsHistory[]>("/staff/system-settings/history", {}, token),
    restoreSettings: (token: string, revision: number, target_revision: number) => apiRequest<SystemSettings>("/staff/system-settings/restore", { method: "POST", body: JSON.stringify({ revision, target_revision }) }, token),
    probeWebhook: (token: string) => apiRequest<{detail: string; http_status: number}>("/staff/system-settings/probe-webhook", { method: "POST" }, token),
    updateStaffSettings: (token: string, payload: ClinicSettings) =>
        apiRequest<ClinicSettings>(
            "/staff/settings",
            { method: "PUT", body: JSON.stringify(payload) },
            token,
        ).then((settings) => {
            if (typeof BroadcastChannel !== "undefined") {
                const channel = new BroadcastChannel("drz-clinic-settings");
                channel.postMessage({ revision: settings.revision });
                channel.close();
            }
            return settings;
        }),
    runStaffOperations: (token: string) =>
        apiRequest<{
            queued_reminders: number;
            sms_sent: number;
        }>("/staff/operations/run", { method: "POST" }, token),
    staffSchedule: (token: string) => apiRequest<WeeklySchedule[]>("/staff/schedule", {}, token),
    updateStaffSchedule: (token: string, payload: WeeklySchedule[]) =>
        apiRequest<WeeklySchedule[]>(
            "/staff/schedule",
            { method: "PUT", body: JSON.stringify(payload) },
            token,
        ),
    staffExceptions: (token: string) => apiRequest<ScheduleException[]>("/staff/exceptions", {}, token),
    createStaffException: (
        token: string,
        payload: Omit<ScheduleException, "id">,
    ) =>
        apiRequest<ScheduleException>(
            "/staff/exceptions",
            { method: "POST", body: JSON.stringify(payload) },
            token,
        ),
    deleteStaffException: (token: string, id: number) =>
        apiRequest<{ message: string }>(`/staff/exceptions/${id}`, { method: "DELETE" }, token),
    staffServiceExceptions: (token: string, serviceId: number) =>
        apiRequest<ServiceScheduleException[]>(
            `/staff/services/${serviceId}/exceptions`,
            {},
            token,
        ),
    createStaffServiceException: (
        token: string,
        serviceId: number,
        payload: Omit<ServiceScheduleException, "id" | "service_id">,
    ) =>
        apiRequest<ServiceScheduleException>(
            `/staff/services/${serviceId}/exceptions`,
            { method: "POST", body: JSON.stringify(payload) },
            token,
        ),
    deleteStaffServiceException: (token: string, serviceId: number, exceptionId: number) =>
        apiRequest<{ message: string }>(
            `/staff/services/${serviceId}/exceptions/${exceptionId}`,
            { method: "DELETE" },
            token,
        ),
    staffServices: (token: string) => apiRequest<Service[]>("/staff/services", {}, token),
    staffPatients: (
        token: string,
        filters: {
            search?: string;
            tag?: string;
            needs_follow_up?: boolean;
            page?: number;
            page_size?: number;
        } = {},
    ) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== "" && value !== false)
                params.set(key, String(value));
        });
        return apiRequest<PatientPage>(
            `/staff/patients${params.size ? `?${params.toString()}` : ""}`,
            {},
            token,
        );
    },
    staffPatientRecord: (token: string, patientId: number) =>
        apiRequest<PatientRecord>(`/staff/patients/${patientId}`, {}, token),
    updateStaffPatientRecord: (
        token: string,
        patientId: number,
        payload: Pick<PatientRecord, "internal_note" | "tags" | "needs_follow_up">,
    ) =>
        apiRequest<PatientRecord>(
            `/staff/patients/${patientId}`,
            { method: "PATCH", body: JSON.stringify(payload) },
            token,
        ),
    createStaffService: (token: string, payload: Omit<Service, "id">) =>
        apiRequest<Service>(
            "/staff/services",
            { method: "POST", body: JSON.stringify(payload) },
            token,
        ),
    updateStaffService: (token: string, id: number, payload: Omit<Service, "id">) =>
        apiRequest<Service>(
            `/staff/services/${id}`,
            { method: "PUT", body: JSON.stringify(payload) },
            token,
        ),
    staffAppointments: (
        token: string,
        filters: {
            appointment_date?: string;
            status?: string;
            search?: string;
            this_month?: boolean;
            page?: number;
            page_size?: number;
        } = {},
    ) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== "" && value !== false)
                params.set(key, String(value));
        });
        const suffix = params.size ? `?${params.toString()}` : "";
        return apiRequest<AppointmentPage>(`/staff/appointments${suffix}`, {}, token);
    },
    exportStaffAppointments: async (
        token: string,
        filters: {
            appointment_date?: string;
            status?: string;
            search?: string;
            this_month?: boolean;
        } = {},
    ) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== "" && value !== false)
                params.set(key, String(value));
        });
        const blob = await apiBlob(
            `/staff/appointments/export${params.size ? `?${params.toString()}` : ""}`,
            token,
        );
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `appointments-${new Date().toISOString().slice(0, 10)}.xlsx`;
        anchor.click();
        URL.revokeObjectURL(url);
    },
    updateStaffAppointment: (
        token: string,
        id: number,
        payload: { status: Appointment["status"]; staff_note?: string | null },
    ) =>
        apiRequest<Appointment>(
            `/staff/appointments/${id}`,
            { method: "PATCH", body: JSON.stringify(payload) },
            token,
        ),
    rescheduleStaffAppointment: (
        token: string,
        id: number,
        payload: { appointment_date: string; start_time: string },
    ) =>
        apiRequest<Appointment>(
            `/staff/appointments/${id}/reschedule`,
            { method: "PATCH", body: JSON.stringify(payload) },
            token,
        ),
    staffWaitlist: (token: string, status = "") =>
        apiRequest<WaitlistEntry[]>(
            `/staff/waitlist${status ? `?status=${encodeURIComponent(status)}` : ""}`,
            {},
            token,
        ),
    updateStaffWaitlist: (token: string, id: number, status: WaitlistEntry["status"]) =>
        apiRequest<WaitlistEntry>(
            `/staff/waitlist/${id}`,
            { method: "PATCH", body: JSON.stringify({ status }) },
            token,
        ),
    staffFinanceSummary: (token: string) =>
        apiRequest<FinanceSummary>("/staff/finance/summary", {}, token),
    staffPayments: (token: string) =>
        apiRequest<PaymentItem[]>("/staff/finance/payments", {}, token),
    updateStaffRefund: (
        token: string,
        id: number,
        payload: {
            status: PaymentItem["refund_status"];
            amount_toman: number;
            reference: string | null;
            note: string | null;
        },
    ) =>
        apiRequest<PaymentItem>(
            `/staff/finance/payments/${id}/refund`,
            { method: "PATCH", body: JSON.stringify(payload) },
            token,
        ),
    staffAuditLogs: (token: string) =>
        apiRequest<AuditLogItem[]>("/staff/audit-logs", {}, token),
    staffConsultations: (token: string) =>
        apiRequest<ConsultationThread[]>("/staff/consultations", {}, token),
    staffConsultation: (token: string, appointmentId: number) =>
        apiRequest<ConsultationMessage[]>(
            `/staff/appointments/${appointmentId}/consultation`,
            {},
            token,
        ),
    sendStaffConsultationMessage: (
        token: string,
        appointmentId: number,
        body: string,
    ) =>
        apiRequest<ConsultationMessage>(
            `/staff/appointments/${appointmentId}/consultation/messages`,
            { method: "POST", body: JSON.stringify({ body }) },
            token,
        ),
    staffConsultationImage: (
        token: string,
        appointmentId: number,
        messageId: number,
    ) =>
        apiBlob(
            `/staff/appointments/${appointmentId}/consultation/images/${messageId}`,
            token,
        ),
    staffSmsRules: (token: string) =>
        apiRequest<SmsAutomationRule[]>("/staff/sms/rules", {}, token),
    updateStaffSmsRule: (
        token: string,
        eventKey: string,
        payload: Pick<SmsAutomationRule, "enabled" | "template_text" | "provider_pattern_code">,
    ) =>
        apiRequest<SmsAutomationRule>(
            `/staff/sms/rules/${eventKey}`,
            { method: "PUT", body: JSON.stringify(payload) },
            token,
        ),
    staffSmsOutbox: (token: string) =>
        apiRequest<SmsOutboxItem[]>("/staff/sms/outbox", {}, token),
    staffSmsCampaigns: (token: string) =>
        apiRequest<SmsCampaign[]>("/staff/sms/campaigns", {}, token),
    previewStaffSmsCampaign: (token: string, filters: SmsCampaignFilters) =>
        apiRequest<{ recipient_count: number }>(
            "/staff/sms/campaigns/preview",
            { method: "POST", body: JSON.stringify({ filters }) },
            token,
        ),
    createStaffSmsCampaign: (
        token: string,
        payload: {
            title: string;
            message_text: string;
            provider_pattern_code: string;
            filters: SmsCampaignFilters;
            expected_recipient_count: number;
        },
    ) =>
        apiRequest<SmsCampaign>(
            "/staff/sms/campaigns",
            { method: "POST", body: JSON.stringify(payload) },
            token,
        ),
    dispatchStaffSms: (token: string) =>
        apiRequest<{ message: string }>("/staff/sms/dispatch", { method: "POST" }, token),
};

export const formatPersianDate = (value: string) => {
    const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-latn", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).formatToParts(new Date(`${value}T12:00:00`));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? "";
    return `${get("weekday")}، ${get("day")} ${get("month")} ${get("year")}`;
};

export const formatTime = (value: string) => value.slice(0, 5);

export const toPersianDigits = (value: string | number) =>
    String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);

export const formatLocalPhone = (value: string) =>
    value.startsWith("+98") ? `0${value.slice(3)}` : value;

export const formatToman = (value: number) =>
    `${toPersianDigits(new Intl.NumberFormat("en-US").format(value))} تومان`;
