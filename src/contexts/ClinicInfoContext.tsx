import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import {
    buildClinicInfo,
    fallbackClinicInfo,
    type ClinicInfo,
} from "@/config/clinicInfo";
import {
    appointmentApi,
    type ClinicSettings,
} from "@/services/appointmentApi";

type ClinicInfoContextValue = {
    clinicInfo: ClinicInfo;
    loading: boolean;
    initialized: boolean;
    refreshClinicInfo: () => Promise<void>;
    applyClinicSettings: (settings: ClinicSettings) => void;
};

const ClinicInfoContext = createContext<ClinicInfoContextValue | null>(null);

export const ClinicInfoProvider = ({ children }: { children: ReactNode }) => {
    const [clinicInfo, setClinicInfo] = useState<ClinicInfo>(() => {
        try {
            const data = document.getElementById("clinic-bootstrap")?.textContent;
            return data ? buildClinicInfo(JSON.parse(data) as ClinicSettings) : fallbackClinicInfo;
        } catch {
            return fallbackClinicInfo;
        }
    });
    const [loading, setLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);

    const applyClinicSettings = useCallback((settings: ClinicSettings) => {
        setClinicInfo(buildClinicInfo(settings));
    }, []);

    const refreshClinicInfo = useCallback(async () => {
        setLoading(true);
        try {
            applyClinicSettings(await appointmentApi.getClinic());
        } catch {
            setClinicInfo(current => ({ ...current, bookingEnabled: false }));
            // Keep contact information, but close booking on failed refresh.
        } finally {
            setLoading(false);
        }
    }, [applyClinicSettings]);

    useEffect(() => {
        let cancelled = false;
        void appointmentApi.getClinic().then((settings) => {
            if (!cancelled) applyClinicSettings(settings);
        }).catch(() => {
            if (!cancelled) setClinicInfo(current => ({ ...current, bookingEnabled: false }));
        }).finally(() => {
            if (!cancelled) { setLoading(false); setInitialized(true); }
        });
        return () => { cancelled = true; };
    }, [applyClinicSettings]);

    const value = useMemo<ClinicInfoContextValue>(
        () => ({
            clinicInfo,
            loading,
            initialized,
            refreshClinicInfo,
            applyClinicSettings,
        }),
        [applyClinicSettings, clinicInfo, loading, initialized, refreshClinicInfo],
    );

    useEffect(() => {
        const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("drz-clinic-settings");
        if (channel) channel.onmessage = () => { void refreshClinicInfo(); };
        const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refreshClinicInfo(); }, 30000);
        const refreshOnFocus = () => { if (document.visibilityState === "visible") void refreshClinicInfo(); };
        window.addEventListener("focus", refreshOnFocus);
        document.addEventListener("visibilitychange", refreshOnFocus);
        return () => {
            window.clearInterval(timer);
            channel?.close();
            window.removeEventListener("focus", refreshOnFocus);
            document.removeEventListener("visibilitychange", refreshOnFocus);
        };
    }, [refreshClinicInfo]);

    return (
        <ClinicInfoContext.Provider value={value}>
            {children}
        </ClinicInfoContext.Provider>
    );
};

// The public hook and provider deliberately share this context module.
// eslint-disable-next-line react-refresh/only-export-components
export const useClinicInfo = () => {
    const value = useContext(ClinicInfoContext);
    if (!value) {
        throw new Error("useClinicInfo must be used inside ClinicInfoProvider");
    }
    return value;
};
