import { useId, type ReactNode } from "react";
import { FaChevronUp } from "react-icons/fa";

export interface AccordionProps {
    title: ReactNode;
    titleBGColor?: string;
    content: ReactNode;
    contentBGColor?: string;

    active: boolean;
    onToggle: () => void;
}

const Accordion = ({
    title,
    titleBGColor = "bg-gradient-to-br from-primary to-primary-mild",
    content,
    contentBGColor = "bg-gray-100",
    active,
    onToggle,
}: AccordionProps) => {
    const id = useId();
    const buttonId = `accordion-button-${id}`;
    const panelId = `accordion-panel-${id}`;

    return (
        <div className={`shadow-lg flex flex-col rounded-md ${titleBGColor}`}>
            <button
                type="button"
                id={buttonId}
                aria-expanded={active}
                aria-controls={panelId}
                className="py-3 px-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 flex items-center justify-between gap-2"
                onClick={onToggle}
            >
                <p className="font-dana text-white text-lg text-right">
                    {title}
                </p>

                <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition-transform duration-300 ${
                        active ? "" : "rotate-180"
                    }`}
                    aria-hidden="true"
                >
                    <FaChevronUp color="white" className="block" />
                </span>
            </button>

            <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                aria-hidden={!active}
                inert={!active}
                style={{ gridTemplateRows: active ? "1fr" : "0fr" }}
                className={`grid transition-all duration-300 rounded-b-md text-justify ${contentBGColor}`}
            >
                <div className="min-h-0 overflow-hidden"><div className="px-5 py-4 pb-6 text-jetblack">{content}</div></div>
            </div>
        </div>
    );
};

export default Accordion;
