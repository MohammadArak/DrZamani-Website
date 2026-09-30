import {
    useEffect,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
} from "react";
import { IoCheckmark, IoChevronDownOutline } from "react-icons/io5";

export type AppSelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

const AppSelect = ({
    value,
    defaultValue = "",
    onChange,
    options,
    name,
    disabled = false,
    ariaLabel,
    className = "",
    buttonClassName = "",
}: {
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    options: readonly AppSelectOption[];
    name?: string;
    disabled?: boolean;
    ariaLabel: string;
    className?: string;
    buttonClassName?: string;
}) => {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [open, setOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const listboxId = useId();
    const selectedValue = value ?? internalValue;
    const selectedIndex = Math.max(
        0,
        options.findIndex((option) => option.value === selectedValue),
    );
    const selected = options[selectedIndex];

    useEffect(() => {
        const close = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, []);

    const choose = (nextValue: string) => {
        if (value === undefined) setInternalValue(nextValue);
        onChange?.(nextValue);
        setOpen(false);
    };

    const openMenu = () => {
        const bounds = rootRef.current?.getBoundingClientRect();
        if (bounds) {
            const spaceBelow = window.innerHeight - bounds.bottom;
            setOpenUpward(spaceBelow < 280 && bounds.top > spaceBelow);
        }
        setActiveIndex(selectedIndex);
        setOpen(true);
    };

    const move = (direction: 1 | -1) => {
        let next = activeIndex;
        do {
            next = (next + direction + options.length) % options.length;
        } while (options[next]?.disabled && next !== activeIndex);
        setActiveIndex(next);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
                openMenu();
            }
            else move(event.key === "ArrowDown" ? 1 : -1);
            return;
        }
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!open) {
                openMenu();
            }
            else if (!options[activeIndex]?.disabled)
                choose(options[activeIndex].value);
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
        }
    };

    return (
        <div
            ref={rootRef}
            className={`relative w-full ${open ? "z-50" : ""} ${className}`}
        >
            {name && <input type="hidden" name={name} value={selectedValue} />}
            <button
                type="button"
                role="combobox"
                aria-label={ariaLabel}
                aria-expanded={open}
                aria-controls={listboxId}
                disabled={disabled}
                onKeyDown={onKeyDown}
                onClick={() => {
                    if (open) setOpen(false);
                    else openMenu();
                }}
                className={`flex h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 text-right text-slate-800 outline-none transition duration-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${
                    open
                        ? "border-emerald-400 ring-4 ring-emerald-100/80"
                        : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                } ${buttonClassName}`}
            >
                <span className="min-w-0 flex-1 truncate">
                    {selected?.label ?? "انتخاب کنید"}
                </span>
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition duration-200 ${open ? "rotate-180" : ""}`}
                >
                    <IoChevronDownOutline />
                </span>
            </button>
            {open && (
                <div
                    id={listboxId}
                    role="listbox"
                    aria-label={ariaLabel}
                    className={`app-dropdown-enter absolute inset-x-0 z-100 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_55px_rgba(15,23,42,0.18)] ${
                        openUpward
                            ? "bottom-[calc(100%+8px)] origin-bottom"
                            : "top-[calc(100%+8px)] origin-top"
                    }`}
                >
                    {options.map((option, index) => {
                        const current = option.value === selectedValue;
                        const active = index === activeIndex;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={current}
                                disabled={option.disabled}
                                onPointerMove={() => setActiveIndex(index)}
                                onClick={() => choose(option.value)}
                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right text-sm transition disabled:opacity-40 ${
                                    current
                                        ? "bg-emerald-50 font-bold text-emerald-800"
                                        : active
                                          ? "bg-slate-50 text-primary"
                                          : "text-slate-700 hover:bg-slate-50"
                                }`}
                            >
                                <span>{option.label}</span>
                                {current && (
                                    <IoCheckmark className="text-lg text-emerald-600" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AppSelect;
