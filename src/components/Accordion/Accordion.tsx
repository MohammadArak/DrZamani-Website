import { useEffect, useRef, useState, type ReactNode } from "react";
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
    const [height, setHeight] = useState("0px");
    const contentSpace = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentSpace.current) {
            setHeight(
                active ? `${contentSpace.current.scrollHeight}px` : "0px",
            );
        }
    }, [active]);

    return (
        <div className={`shadow-lg flex flex-col rounded-md ${titleBGColor}`}>
            <button
                className="py-3 px-4 cursor-pointer focus:outline-none flex items-center justify-between gap-2"
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
                ref={contentSpace}
                style={{ maxHeight: height }}
                className={`overflow-hidden transition-all duration-300 rounded-b-md px-5 text-justify ${contentBGColor}`}
            >
                <div className="py-4 pb-6 text-jetblack">{content}</div>
            </div>
        </div>
    );
};

export default Accordion;
