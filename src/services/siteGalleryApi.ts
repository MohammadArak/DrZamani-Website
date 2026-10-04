import { useEffect, useState } from "react";
import { apiRequest } from "./appointmentApi";

export type GalleryImage = { id: number; src: string; alt: string; sort_order: number };

export type GalleryContent = {
    kind: "static" | "media";
    ref: string;
    alt: string;
    sort_order: number;
    consent_received: boolean;
    consent_reference: string;
    privacy_reviewed: boolean;
};

export type GalleryRow = {
    id: number;
    revision: number;
    content: GalleryContent;
    src: string;
    published: boolean;
    unpublished_changes: boolean;
    updated_at: string;
};

/** The sixteen photos shown before the database existed; used only if the API cannot be reached. */
export const fallbackGallery: GalleryImage[] = Array.from({ length: 16 }, (_, index) => ({
    id: index + 1,
    src: `/img/samples/${index + 1}.jpg`,
    alt: `نمونه کار شماره ${index + 1}`,
    sort_order: index + 1,
}));

const isImage = (value: unknown): value is GalleryImage =>
    !!value && typeof value === "object" && typeof (value as GalleryImage).src === "string" && typeof (value as GalleryImage).alt === "string";

const readBootstrap = (): GalleryImage[] | null => {
    try {
        const raw = document.getElementById("gallery-bootstrap")?.textContent;
        const items = raw ? (JSON.parse(raw) as { items?: unknown[] }).items : null;
        return Array.isArray(items) && items.every(isImage) ? (items as GalleryImage[]) : null;
    } catch {
        return null;
    }
};

export function useSiteGallery(): GalleryImage[] {
    const [items, setItems] = useState<GalleryImage[]>(() => readBootstrap() ?? fallbackGallery);
    useEffect(() => {
        let active = true;
        void apiRequest<{ items: GalleryImage[] }>("/public-gallery")
            .then((result) => {
                if (active && Array.isArray(result.items) && result.items.every(isImage)) setItems(result.items);
            })
            .catch(() => undefined);
        return () => {
            active = false;
        };
    }, []);
    return items;
}

export const emptyGalleryItem = (): GalleryContent => ({
    kind: "media", ref: "", alt: "", sort_order: 100, consent_received: false, consent_reference: "", privacy_reviewed: false,
});

export const siteGalleryApi = {
    list: (token: string) => apiRequest<{ items: GalleryRow[]; total: number }>("/staff/site-gallery", {}, token),
    save: (token: string, row: GalleryRow | null, content: GalleryContent) =>
        apiRequest<GalleryRow>(`/staff/site-gallery${row ? `/${row.id}` : ""}`, {
            method: row ? "PUT" : "POST",
            body: JSON.stringify({ revision: row?.revision ?? 0, content }),
        }, token),
    transition: (token: string, row: GalleryRow, action: "publish" | "unpublish") =>
        apiRequest<GalleryRow>(`/staff/site-gallery/${row.id}/transition`, {
            method: "POST",
            body: JSON.stringify({ revision: row.revision, action }),
        }, token),
    archive: (token: string, row: GalleryRow) =>
        apiRequest<{ message: string }>(`/staff/site-gallery/${row.id}`, {
            method: "DELETE",
            body: JSON.stringify({ revision: row.revision }),
        }, token),
};
