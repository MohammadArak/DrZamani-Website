import { useEffect, useState } from "react";
import { apiRequest } from "./appointmentApi";

export type SiteServiceCard = {
    slug: string;
    title: string;
    summary: string;
    tile_label: string;
    image: string;
    sort_order: number;
};

export type SiteServiceContent = SiteServiceCard & {
    description_html: string;
    hero_key: string | null;
    seo_title: string;
    seo_description: string;
};

export type SiteServiceRow = {
    id: number;
    revision: number;
    content: SiteServiceContent;
    published: boolean;
    unpublished_changes: boolean;
    published_at: string | null;
    updated_at: string;
};

export const SERVICE_IMAGES = [
    { value: "rhinoplasty.png", label: "بینی" },
    { value: "belpharoplasty.png", label: "پلک" },
    { value: "face-lift.png", label: "صورت" },
    { value: "mentoplasty.png", label: "چانه" },
] as const;

/** Wording used before the database existed; shown only if the API cannot be reached. */
export const fallbackServices: SiteServiceCard[] = [
    { slug: "rhinoplasty", title: "رینوپلاستی", summary: "افزایش زیبایی چهره با طراحی متناسب بینی", tile_label: "(جراحی زیبایی بینی)", image: "rhinoplasty.png", sort_order: 1 },
    { slug: "blepharoplasty", title: "بلفاروپلاستی", summary: "جوانسازی پلک‌ها و ایجاد ظاهری شاداب‌تر", tile_label: "(جراحی پلک)", image: "belpharoplasty.png", sort_order: 2 },
    { slug: "face-lift", title: "لیفت صورت", summary: "ایجاد ظاهری جوان‌تر با حفظ حالت طبیعی چهره", tile_label: "(جراحی جوانسازی)", image: "face-lift.png", sort_order: 3 },
    { slug: "mentoplasty", title: "منتوپلاستی", summary: "اصلاح فرم چانه و ایجاد تناسب بهتر در چهره", tile_label: "(جراحی فک)", image: "mentoplasty.png", sort_order: 4 },
];

export const emptyService = (): SiteServiceContent => ({
    slug: "", title: "", summary: "", tile_label: "", image: SERVICE_IMAGES[0].value,
    description_html: "<p></p>", hero_key: null, seo_title: "", seo_description: "", sort_order: 50,
});

const isCard = (value: unknown): value is SiteServiceCard =>
    !!value && typeof value === "object" && typeof (value as SiteServiceCard).slug === "string" && typeof (value as SiteServiceCard).title === "string";

/** The server writes the published list into the page, so cards appear without waiting for the API. */
const readBootstrap = (): SiteServiceCard[] | null => {
    try {
        const raw = document.getElementById("services-bootstrap")?.textContent;
        const items = raw ? (JSON.parse(raw) as { items?: unknown[] }).items : null;
        return Array.isArray(items) && items.every(isCard) ? (items as SiteServiceCard[]) : null;
    } catch {
        return null;
    }
};

/** The homepage layout is built for four cards; extra services live on their own pages. */
export const HOME_SERVICE_LIMIT = 4;

export function useSiteServices(limit = HOME_SERVICE_LIMIT): SiteServiceCard[] {
    const [items, setItems] = useState<SiteServiceCard[]>(() => readBootstrap() ?? fallbackServices);
    useEffect(() => {
        let active = true;
        void apiRequest<{ items: SiteServiceCard[] }>("/public-services")
            .then((result) => {
                if (active && Array.isArray(result.items) && result.items.every(isCard)) setItems(result.items);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, []);
    return items.slice(0, limit);
}

export const siteServicesApi = {
    list: (token: string) => apiRequest<{ items: SiteServiceRow[]; total: number }>("/staff/site-services", {}, token),
    get: (token: string, id: number) => apiRequest<SiteServiceRow>(`/staff/site-services/${id}`, {}, token),
    save: (token: string, row: SiteServiceRow | null, content: SiteServiceContent) =>
        apiRequest<SiteServiceRow>(`/staff/site-services${row ? `/${row.id}` : ""}`, {
            method: row ? "PUT" : "POST",
            body: JSON.stringify({ revision: row?.revision ?? 0, content }),
        }, token),
    transition: (token: string, row: SiteServiceRow, action: "publish" | "unpublish") =>
        apiRequest<SiteServiceRow>(`/staff/site-services/${row.id}/transition`, {
            method: "POST",
            body: JSON.stringify({ revision: row.revision, action }),
        }, token),
    archive: (token: string, row: SiteServiceRow) =>
        apiRequest<{ message: string }>(`/staff/site-services/${row.id}`, {
            method: "DELETE",
            body: JSON.stringify({ revision: row.revision }),
        }, token),
};
