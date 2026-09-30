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
    refreshClinicInfo: () => Promise<void>;
    applyClinicSettings: (settings: ClinicSettings) => void;
};

const ClinicInfoContext = createContext<ClinicInfoContextValue | null>(null);

export const ClinicInfoProvider = ({ children }: { children: ReactNode }) => {
    const [clinicInfo, setClinicInfo] = useState<ClinicInfo>(fallbackClinicInfo);
    const [loading, setLoading] = useState(true);

    const applyClinicSettings = useCallback((settings: ClinicSettings) => {
        setClinicInfo(buildClinicInfo(settings));
    }, []);

    const refreshClinicInfo = useCallback(async () => {
        setLoading(true);
        try {
            applyClinicSettings(await appointmentApi.getClinic());
        } catch {
            // The public site keeps a safe build-time fallback if the API is temporarily unavailable.
        } finally {
            setLoading(false);
        }
    }, [applyClinicSettings]);

    useEffect(() => {
        void refreshClinicInfo();
    }, [refreshClinicInfo]);

    const value = useMemo<ClinicInfoContextValue>(
        () => ({
            clinicInfo,
            loading,
            refreshClinicInfo,
            applyClinicSettings,
        }),
        [applyClinicSettings, clinicInfo, loading, refreshClinicInfo],
    );

    return (
        <ClinicInfoContext.Provider value={value}>
            {children}
        </ClinicInfoContext.Provider>
    );
};

export const useClinicInfo = () => {
    const value = useContext(ClinicInfoContext);
    if (!value) {
        throw new Error("useClinicInfo must be used inside ClinicInfoProvider");
    }
    return value;
};
