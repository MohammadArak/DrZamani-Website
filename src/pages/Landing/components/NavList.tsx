import { useRef, useState, type CSSProperties } from "react";
import classNames from "@/utils/classNames";

type LinkTab = {
    title: string;
    value: string;
    href: string;
};

const NavList = ({
    tabs: propTabs,
    tabClassName,
    onTabClick,
}: {
    tabs: LinkTab[];
    tabClassName?: string;
    onTabClick?: () => void;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const [highlightStyle, setHighlightStyle] = useState<CSSProperties>({
        opacity: 0,
    });

    const showHighlight = (idx: number) => {
        const container = containerRef.current;
        const item = itemRefs.current[idx];

        if (!container || !item) {
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        setHighlightStyle({
            opacity: 1,
            width: itemRect.width,
            height: itemRect.height,
            transform: `translate3d(${itemRect.left - containerRect.left}px, ${itemRect.top - containerRect.top}px, 0)`,
        });
    };

    return (
        <div
            ref={containerRef}
            className="relative flex flex-col lg:flex-row"
            onMouseLeave={() =>
                setHighlightStyle((style) => ({ ...style, opacity: 0 }))
            }
        >
            <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 rounded-xl bg-duskblue shadow-[0_8px_24px_rgba(83,115,146,0.3)] transition-[transform,width,height,opacity] duration-300 ease-out"
                style={highlightStyle}
            />
            {propTabs.map((tab, idx) => (
                <a
                    key={tab.title}
                    ref={(node) => {
                        itemRefs.current[idx] = node;
                    }}
                    href={tab.href}
                    className={classNames(
                        "relative z-10 rounded-xl px-5 py-2 transition-colors duration-300 hover:text-white focus-visible:text-white",
                        tabClassName,
                    )}
                    onClick={onTabClick}
                    onMouseEnter={() => showHighlight(idx)}
                    onFocus={() => showHighlight(idx)}
                    onBlur={() =>
                        setHighlightStyle((style) => ({
                            ...style,
                            opacity: 0,
                        }))
                    }
                >
                    <span className="heading-text relative z-10 block text-inherit">
                        {tab.title}
                    </span>
                </a>
            ))}
        </div>
    );
};

export default NavList;
