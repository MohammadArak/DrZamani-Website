/* eslint-disable react-hooks/set-state-in-effect */
import { toPersianDigits } from "@/services/appointmentApi";
import { useEffect, useMemo, useState } from "react";
import * as DateObjectPackage from "react-date-object";
import type { Calendar, Locale } from "react-date-object";
import * as gregorianPackage from "react-date-object/calendars/gregorian";
import * as persianPackage from "react-date-object/calendars/persian";
import * as gregorianEnPackage from "react-date-object/locales/gregorian_en";
import * as persianFaPackage from "react-date-object/locales/persian_fa";
import {
    IoChevronBackOutline,
    IoChevronForwardOutline,
} from "react-icons/io5";

const unwrapDefault = (moduleValue: unknown): unknown => {
    let value = moduleValue as Record<string, unknown>;
    while (value && typeof value === "object" && "default" in value) {
        value = value.default as Record<string, unknown>;
    }
    return value;
};

const DateObject = unwrapDefault(DateObjectPackage) as typeof DateObjectPackage.default;
const gregorian = unwrapDefault(gregorianPackage) as Calendar;
const persian = unwrapDefault(persianPackage) as Calendar;
const gregorianEn = unwrapDefault(gregorianEnPackage) as Locale;
const persianFa = unwrapDefault(persianFaPackage) as Locale;

export type AvailabilityCalendarDate = {
    date: string;
    available_slots: number;
};

type PersianMonth = {
    year: number;
    month: number;
};

type CalendarEntry = AvailabilityCalendarDate & {
    year: number;
    month: number;
    day: number;
};

const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const monthFromGregorian = (value: string): PersianMonth | null => {
    if (!value) return null;
    try {
        const converted = new DateObject({
            date: value,
            format: "YYYY-MM-DD",
            calendar: gregorian,
            locale: gregorianEn,
        }).convert(persian, persianFa);
        return { year: converted.year, month: converted.month.number };
    } catch {
        return null;
    }
};

const makePersianDate = (year: number, month: number, day = 1) =>
    new DateObject({
        year,
        month,
        day,
        calendar: persian,
        locale: persianFa,
    });

const compareMonths = (first: PersianMonth, second: PersianMonth) =>
    first.year * 12 + first.month - (second.year * 12 + second.month);

const moveMonth = (current: PersianMonth, amount: number): PersianMonth => {
    const zeroBased = current.year * 12 + (current.month - 1) + amount;
    return {
        year: Math.floor(zeroBased / 12),
        month: (zeroBased % 12 + 12) % 12 + 1,
    };
};

const AvailabilityCalendar = ({
    dates,
    value,
    onChange,
    className = "",
}: {
    dates: AvailabilityCalendarDate[];
    value: string;
    onChange: (date: string) => void;
    className?: string;
}) => {
    const entries = useMemo<CalendarEntry[]>(
        () =>
            dates
                .map((item) => {
                    try {
                        const converted = new DateObject({
                            date: item.date,
                            format: "YYYY-MM-DD",
                            calendar: gregorian,
                            locale: gregorianEn,
                        }).convert(persian, persianFa);
                        return {
                            ...item,
                            year: converted.year,
                            month: converted.month.number,
                            day: converted.day,
                        };
                    } catch {
                        return null;
                    }
                })
                .filter((item): item is CalendarEntry => item !== null)
                .sort((first, second) => first.date.localeCompare(second.date)),
        [dates],
    );

    const firstAvailableMonth = entries[0]
        ? { year: entries[0].year, month: entries[0].month }
        : null;
    const lastAvailableMonth = entries.at(-1)
        ? {
              year: entries.at(-1)!.year,
              month: entries.at(-1)!.month,
          }
        : null;
    const selectedMonth = monthFromGregorian(value);
    const fallbackToday = useMemo(() => {
        const today = new DateObject().convert(persian, persianFa);
        return { year: today.year, month: today.month.number };
    }, []);
    const [visibleMonth, setVisibleMonth] = useState<PersianMonth>(
        selectedMonth ?? firstAvailableMonth ?? fallbackToday,
    );

    useEffect(() => {
        const target = monthFromGregorian(value) ?? firstAvailableMonth;
        if (target && compareMonths(target, visibleMonth) !== 0) {
            setVisibleMonth(target);
        }
    }, [firstAvailableMonth, value, visibleMonth]);

    const entryMap = useMemo(
        () =>
            new Map(
                entries.map((item) => [
                    `${item.year}-${item.month}-${item.day}`,
                    item,
                ]),
            ),
        [entries],
    );
    const firstOfMonth = makePersianDate(
        visibleMonth.year,
        visibleMonth.month,
    );
    const monthLength = firstOfMonth.month.length;
    const firstGregorian = makePersianDate(
        visibleMonth.year,
        visibleMonth.month,
    )
        .convert(gregorian, gregorianEn)
        .toDate();
    const leadingEmptyCells = (firstGregorian.getDay() + 1) % 7;
    const monthLabel = `${firstOfMonth.month.name} ${toPersianDigits(visibleMonth.year)}`;
    const today = useMemo(() => {
        const result = new DateObject().convert(persian, persianFa);
        return `${result.year}-${result.month.number}-${result.day}`;
    }, []);
    const previousMonth = moveMonth(visibleMonth, -1);
    const nextMonth = moveMonth(visibleMonth, 1);
    const canGoPrevious =
        firstAvailableMonth !== null &&
        compareMonths(previousMonth, firstAvailableMonth) >= 0;
    const canGoNext =
        lastAvailableMonth !== null &&
        compareMonths(nextMonth, lastAvailableMonth) <= 0;

    return (
        <section
            className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${className}`}
            aria-label="تقویم روزهای قابل رزرو"
        >
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-3 py-3 sm:px-5">
                <button
                    type="button"
                    disabled={!canGoPrevious}
                    onClick={() => setVisibleMonth(previousMonth)}
                    aria-label="ماه قبل"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-primary transition hover:border-secondary disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <IoChevronForwardOutline />
                </button>
                <div className="min-w-0 text-center">
                    <b className="block truncate font-dana text-lg text-primary">
                        {monthLabel}
                    </b>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                        روزهای دارای ظرفیت را انتخاب کنید
                    </span>
                </div>
                <button
                    type="button"
                    disabled={!canGoNext}
                    onClick={() => setVisibleMonth(nextMonth)}
                    aria-label="ماه بعد"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-primary transition hover:border-secondary disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <IoChevronBackOutline />
                </button>
            </header>

            <div className="p-3 sm:p-5">
                <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">
                    {weekDays.map((day) => (
                        <span
                            key={day}
                            className="pb-1 text-xs font-bold text-slate-400"
                        >
                            {day}
                        </span>
                    ))}
                    {Array.from({ length: leadingEmptyCells }, (_, index) => (
                        <span key={`empty-${index}`} aria-hidden="true" />
                    ))}
                    {Array.from({ length: monthLength }, (_, index) => {
                        const day = index + 1;
                        const key = `${visibleMonth.year}-${visibleMonth.month}-${day}`;
                        const entry = entryMap.get(key);
                        const selected = entry?.date === value;
                        const isToday = key === today;
                        return (
                            <button
                                key={key}
                                type="button"
                                disabled={!entry}
                                onClick={() => entry && onChange(entry.date)}
                                aria-label={
                                    entry
                                        ? `${toPersianDigits(day)}، ${toPersianDigits(entry.available_slots)} زمان خالی`
                                        : `${toPersianDigits(day)}، بدون ظرفیت`
                                }
                                className={`relative flex min-h-15 min-w-0 flex-col items-center justify-center rounded-2xl border px-0.5 py-1.5 text-center transition sm:min-h-17 sm:px-1 ${
                                    selected
                                        ? "border-secondary bg-secondary text-primary shadow-lg shadow-secondary/20 ring-2 ring-secondary/20"
                                        : entry
                                          ? "border-slate-200 bg-white text-primary hover:-translate-y-0.5 hover:border-secondary hover:bg-secondary/8"
                                          : "cursor-not-allowed border-transparent bg-slate-50/70 text-slate-300"
                                }`}
                            >
                                <span className="text-sm font-bold sm:text-base">
                                    {toPersianDigits(day)}
                                </span>
                                {entry && (
                                    <span
                                        className={`mt-1 max-w-full truncate text-[8px] leading-none sm:text-[10px] ${
                                            selected
                                                ? "text-primary/75"
                                                : "text-slate-400"
                                        }`}
                                    >
                                        {toPersianDigits(entry.available_slots)} خالی
                                    </span>
                                )}
                                {isToday && !selected && (
                                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-secondary-deep" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default AvailabilityCalendar;
