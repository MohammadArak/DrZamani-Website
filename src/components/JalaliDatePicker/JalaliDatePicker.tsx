import * as DatePickerPackage from "react-multi-date-picker";
import * as DateObjectPackage from "react-date-object";
import type { Calendar, Locale } from "react-date-object";
import * as gregorianPackage from "react-date-object/calendars/gregorian";
import * as persianPackage from "react-date-object/calendars/persian";
import * as gregorianEnPackage from "react-date-object/locales/gregorian_en";
import * as persianFaPackage from "react-date-object/locales/persian_fa";

const unwrapDefault = (moduleValue: unknown): unknown => {
    let value = moduleValue as Record<string, unknown>;
    while (value && typeof value === "object" && "default" in value) {
        value = value.default as Record<string, unknown>;
    }
    return value;
};

const DatePicker = unwrapDefault(DatePickerPackage) as typeof DatePickerPackage.default;
const DateObject = unwrapDefault(DateObjectPackage) as typeof DateObjectPackage.default;
const gregorian = unwrapDefault(gregorianPackage) as Calendar;
const persian = unwrapDefault(persianPackage) as Calendar;
const gregorian_en = unwrapDefault(gregorianEnPackage) as Locale;
const persian_fa = unwrapDefault(persianFaPackage) as Locale;

const JalaliDatePicker = ({
    value,
    onChange,
    output = "gregorian",
    placeholder = "انتخاب تاریخ",
    required = false,
    disabled = false,
    id,
    className = "",
}: {
    value: string;
    onChange: (value: string) => void;
    output?: "gregorian" | "jalali";
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    id?: string;
    className?: string;
}) => {
    let displayValue: InstanceType<typeof DateObject> | "" = "";
    if (value) {
        displayValue =
            output === "jalali"
                ? new DateObject({
                      date: value,
                      format: "YYYY/MM/DD",
                      calendar: persian,
                      locale: persian_fa,
                  })
                : new DateObject({
                      date: value,
                      format: "YYYY-MM-DD",
                      calendar: gregorian,
                      locale: gregorian_en,
                  }).convert(persian, persian_fa);
    }

    return (
        <DatePicker
            id={id}
            value={displayValue}
            onChange={(date) => {
                if (!date || Array.isArray(date)) {
                    onChange("");
                    return;
                }
                const selected = new DateObject(date);
                onChange(
                    output === "jalali"
                        ? selected.convert(persian, persian_fa).format("YYYY/MM/DD")
                        : selected.convert(gregorian, gregorian_en).format("YYYY-MM-DD"),
                );
            }}
            calendar={persian}
            locale={persian_fa}
            format="YYYY/MM/DD"
            calendarPosition="bottom-right"
            portal
            portalTarget={typeof document !== "undefined" ? document.body : undefined}
            offsetY={8}
            zIndex={320}
            className="app-date-picker"
            containerClassName={`w-full ${className}`}
            inputClass="h-13 w-full cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-secondary focus:ring-4 focus:ring-secondary/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            placeholder={placeholder}
            editable={false}
            required={required}
            disabled={disabled}
            digits={["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]}
        />
    );
};

export default JalaliDatePicker;
