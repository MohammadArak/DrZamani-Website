import { createContext,useCallback,useContext } from "react";

export const StaffPermissionsContext = createContext<string[]>([]);
export const useStaffAccess = () => {
    const permissions = useContext(StaffPermissionsContext);
    return useCallback((code: string) => permissions.includes(code), [permissions]);
};

export const staffTabPermissions: Record<string, string> = {
    dashboard: "dashboard.view", calendar: "appointments.view", appointments: "appointments.view",
    patients: "patients.view", consultations: "consultations.view", waitlist: "waitlist.view",
    "clinic-info": "settings.view", schedule: "schedule.view", services: "services.view",
    articles: "articles.view", "site-services": "site_services.view", "site-content": "site_content.view", "site-gallery": "site_gallery.view", comments: "comments.view", media: "media.manage",
    sms: "sms.view", finance: "finance.view", audit: "audit.view", access: "roles.manage",
};
