import type { Service } from "@/services/appointmentApi";
import { GiNoseFront } from "react-icons/gi";
import {
    IoChatbubblesOutline,
    IoEarOutline,
    IoMedicalOutline,
    IoRefreshOutline,
    IoSparklesOutline,
} from "react-icons/io5";

const ServiceIcon = ({
    icon,
    className = "",
}: {
    icon: Service["icon_key"];
    className?: string;
}) => {
    const props = { className, "aria-hidden": true };
    switch (icon) {
        case "nose":
            return <GiNoseFront {...props} />;
        case "ear":
            return <IoEarOutline {...props} />;
        case "followup":
            return <IoRefreshOutline {...props} />;
        case "consultation":
            return <IoChatbubblesOutline {...props} />;
        case "surgery":
            return <IoSparklesOutline {...props} />;
        default:
            return <IoMedicalOutline {...props} />;
    }
};

export default ServiceIcon;
