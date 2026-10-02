import {lazy,Suspense} from "react";
/* eslint-disable react-hooks/set-state-in-effect */
import Seo from "@/components/SEO";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import {
    AppointmentApiError,
    PATIENT_COOKIE_SESSION,
    PATIENT_TOKEN_KEY,
    appointmentApi,
    browserCsrf,
    type Appointment,
    type ClinicSettings,
    type PatientProfile,
    type Service,
    type WaitlistEntry
} from "@/services/appointmentApi";
import {
    useEffect,
    useState
} from "react";

const Login = lazy(() => import("./PatientLogin"));
const Portal = lazy(() => import("./PatientPortal"));
const ProfileForm = lazy(() => import("./PatientProfileForm"));
import { LoadingScreen } from "./PatientShells";
import { errorMessage } from "./patientUi";
const EnabledAppointmentPortal = () => {
    const { clinicInfo: publicClinicInfo } = useClinicInfo();
    const [token, setToken] = useState(
        () => browserCsrf("patient") ? PATIENT_COOKIE_SESSION : "",
    );
    const [loading, setLoading] = useState(Boolean(token));
    const [profile, setProfile] = useState<PatientProfile | null>(null);
    const [clinic, setClinic] = useState<ClinicSettings | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [sessionError, setSessionError] = useState("");

    const load = async (activeToken = token) => {
        if (!activeToken) return;
        setLoading(true);
        setSessionError("");
        try {
            const [
                currentProfile,
                currentClinic,
                currentServices,
                currentAppointments,
                currentWaitlist,
            ] = await Promise.all([
                appointmentApi.getMe(activeToken),
                appointmentApi.getClinic(),
                appointmentApi.getServices(),
                appointmentApi.getAppointments(activeToken),
                appointmentApi.getWaitlist(activeToken),
            ]);
            setProfile(currentProfile);
            setClinic(currentClinic);
            setServices(currentServices);
            setAppointments(currentAppointments);
            setWaitlist(currentWaitlist);
        } catch (loadError) {
            if (
                loadError instanceof AppointmentApiError &&
                loadError.status === 401
            ) {
                localStorage.removeItem(PATIENT_TOKEN_KEY);
                setToken("");
            } else {
                setSessionError(errorMessage(loadError));
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        localStorage.removeItem(PATIENT_TOKEN_KEY);
        if (token) void load(token);
        // Token changes define a new session; load intentionally runs once per session.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const logout = async () => {
        try {
            await appointmentApi.logout(token);
        } catch (error) {
            setSessionError(`خروج انجام نشد: ${errorMessage(error)}`);
            return;
        }
        localStorage.removeItem(PATIENT_TOKEN_KEY);
        setToken("");
        setProfile(null);
    };

    return (
        <>
            <Seo
                title={`${publicClinicInfo.bookingEnabled ? "سامانه نوبت‌دهی" : "پنل بیمار"} مطب ${publicClinicInfo.doctorName}`}
                description={publicClinicInfo.bookingEnabled ? `رزرو اینترنتی نوبت حضوری مطب ${publicClinicInfo.doctorName}؛ ورود امن با شماره موبایل و انتخاب خدمت، تاریخ و ساعت حضور.` : `پنل بیمار مطب ${publicClinicInfo.doctorName}؛ مشاهده پرونده و پیگیری نوبت‌های قبلی. ${publicClinicInfo.bookingDisabledMessage}`}
                canonical={`${publicClinicInfo.siteUrl}/appointment/`}
                noIndex
            />
            {sessionError && <div role="alert" className="p-4 text-center text-red-700">
                {sessionError} <button onClick={() => void load(token)} className="underline">تلاش مجدد</button>
            </div>}
            {!token ? (
                <Suspense fallback={<p role="status">در حال آماده‌سازی سامانه…</p>}><Login onAuthenticated={setToken} /></Suspense>
            ) : loading || !profile || !clinic ? (
                <LoadingScreen />
            ) : !profile.profile_completed ? (
                <Suspense fallback={<p role="status">در حال آماده‌سازی سامانه…</p>}><ProfileForm profile={profile} onSaved={setProfile} /></Suspense>
            ) : (
                <Suspense fallback={<p role="status">در حال آماده‌سازی سامانه…</p>}><Portal
                    token={token}
                    profile={profile}
                    clinic={clinic}
                    services={services}
                    appointments={appointments}
                    waitlist={waitlist}
                    onProfileSaved={setProfile}
                    onRefresh={() => load(token)}
                    onLogout={logout}
                /></Suspense>
            )}
        </>
    );
};

export default EnabledAppointmentPortal;
