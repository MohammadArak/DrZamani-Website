import type { ClinicSettings } from "@/services/appointmentApi";

export type ClinicPhone = {
    value: string;
    display: string;
    international: string;
};

export type ClinicInfo = {
    doctorName: string;
    specialty: string;
    medicalCouncilNumber: string;
    siteUrl: string;
    email: string;
    phones: {
        office: ClinicPhone;
        consultation: ClinicPhone;
    };
    address: {
        country: "IR";
        region: string;
        city: string;
        street: string;
        full: string;
    };
    workingHours: string;
    mapEmbedUrl: string;
    mapPageUrl: string;
    mapCoordinates: {
        latitude: number;
        longitude: number;
    };
    social: {
        instagram: string;
        eitaa: string;
    };
};

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

const toLatinDigits = (value: string) =>
    value
        .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));

const toPersianDigits = (value: string) =>
    toLatinDigits(value).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)]);

const phoneDetails = (rawValue: string): ClinicPhone => {
    const normalized = toLatinDigits(rawValue).trim();
    const plusPrefixed = normalized.startsWith("+");
    const digits = normalized.replace(/\D/g, "");
    let value = plusPrefixed ? `+${digits}` : digits;

    if (!plusPrefixed && digits.startsWith("0098")) {
        value = `+98${digits.slice(4)}`;
    }

    let international = value;
    if (!international.startsWith("+")) {
        if (international.startsWith("0")) {
            international = `+98${international.slice(1)}`;
        } else if (international.startsWith("98")) {
            international = `+${international}`;
        } else {
            international = `+${international}`;
        }
    }

    return {
        value,
        display: toPersianDigits(value),
        international,
    };
};

export const fallbackClinicInfo: ClinicInfo = {
    doctorName: "دکتر فرزاد زمانی",
    specialty: "متخصص گوش، حلق و بینی",
    medicalCouncilNumber: "",
    siteUrl: "https://drfarzadzamani.ir",
    email: "info@drfarzadzamani.ir",
    phones: {
        office: phoneDetails("08633146179"),
        consultation: phoneDetails("09217357728"),
    },
    address: {
        country: "IR",
        region: "استان مرکزی",
        city: "اراک",
        street: "اراک، خیابان خرم، ساختمان پزشکان نیکان، طبقه ششم، واحد B",
        full: "اراک، خیابان خرم، ساختمان پزشکان نیکان، طبقه ششم، واحد B",
    },
    workingHours: "روزهای کاری، با هماهنگی قبلی",
    mapEmbedUrl:
        "https://neshan.org/maps/iframe/places/QbrSKvPB4K9_/34.0784466/49.7015756",
    mapPageUrl: "https://neshan.org/maps/places/QbrSKvPB4K9_",
    mapCoordinates: {
        latitude: 34.0784466,
        longitude: 49.7015756,
    },
    social: {
        instagram: "https://instagram.com/dr.farzad.zamani",
        eitaa: "https://eitaa.com/drfarzadzamani",
    },
};

const textOrFallback = (value: string | null | undefined, fallback: string) =>
    value?.trim() || fallback;

export const buildClinicInfo = (settings: ClinicSettings): ClinicInfo => ({
    doctorName: textOrFallback(settings.doctor_name, fallbackClinicInfo.doctorName),
    specialty: textOrFallback(settings.specialty, fallbackClinicInfo.specialty),
    medicalCouncilNumber: settings.medical_council_number?.trim() ?? "",
    siteUrl: textOrFallback(settings.site_url, fallbackClinicInfo.siteUrl).replace(/\/$/, ""),
    email: textOrFallback(settings.email, fallbackClinicInfo.email),
    phones: {
        office: phoneDetails(
            textOrFallback(settings.office_phone, fallbackClinicInfo.phones.office.value),
        ),
        consultation: phoneDetails(
            textOrFallback(
                settings.consultation_phone,
                fallbackClinicInfo.phones.consultation.value,
            ),
        ),
    },
    address: {
        country: "IR",
        region: textOrFallback(
            settings.address_region,
            fallbackClinicInfo.address.region,
        ),
        city: textOrFallback(settings.address_city, fallbackClinicInfo.address.city),
        street: textOrFallback(settings.address, fallbackClinicInfo.address.street),
        full: textOrFallback(settings.address, fallbackClinicInfo.address.full),
    },
    workingHours: textOrFallback(
        settings.working_hours,
        fallbackClinicInfo.workingHours,
    ),
    mapEmbedUrl: settings.map_embed_url?.trim() ?? "",
    mapPageUrl: settings.map_page_url?.trim() ?? "",
    mapCoordinates: {
        latitude: Number.isFinite(settings.map_latitude)
            ? settings.map_latitude
            : fallbackClinicInfo.mapCoordinates.latitude,
        longitude: Number.isFinite(settings.map_longitude)
            ? settings.map_longitude
            : fallbackClinicInfo.mapCoordinates.longitude,
    },
    social: {
        instagram: settings.instagram_url?.trim() ?? "",
        eitaa: settings.eitaa_url?.trim() ?? "",
    },
});
