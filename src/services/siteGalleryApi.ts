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

export function useSiteGallery() {
    const [state, setState] = useState(() => ({ items: readBootstrap() ?? [], loading: true, error: false }));
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        void apiRequest<{ items: GalleryImage[] }>("/public-gallery", { signal: controller.signal })
            .then((result) => {
                if (!Array.isArray(result.items) || !result.items.every(isImage)) throw new Error("Invalid gallery response");
                if (active) setState({ items: result.items, loading: false, error: false });
            })
            .catch(() => {
                // Never revive legacy photographs or retain stale publication after a failed policy read.
                if (active) setState({ items: [], loading: false, error: true });
            });
        return () => { active = false; controller.abort(); };
    }, [attempt]);
    return { ...state, retry: () => { setState(value => ({ ...value, loading: true, error: false })); setAttempt(value => value + 1); } };
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
