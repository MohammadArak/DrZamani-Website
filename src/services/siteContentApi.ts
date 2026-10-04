import { useEffect, useState } from "react";
import defaultBlocks from "../../api/app/site_content_defaults.json";
import type { ClinicInfo } from "@/config/clinicInfo";
import { apiRequest } from "./appointmentApi";

export type SiteBlocks = {
    hero: { description: string };
    trust: { items: { title: string; text: string }[] };
    about: { paragraphs: string[]; quote: string; facts: { value: string; label: string }[] };
    faq: { items: { title: string; content: string }[] };
    privacy: { items: { title: string; content: string }[] };
    footer: { description: string };
};
export type BlockKey = keyof SiteBlocks;

export type SiteBlockRow<K extends BlockKey = BlockKey> = {
    key: K;
    title: string;
    revision: number;
    content: SiteBlocks[K];
    published: SiteBlocks[K] | null;
    unpublished_changes: boolean;
    published_at: string | null;
    updated_at: string;
};

/** Same wording the server seeds; used only when the API and the page bootstrap are both unavailable. */
const fallback = defaultBlocks as SiteBlocks;

const valid = (blocks: Partial<SiteBlocks> | null | undefined): blocks is Partial<SiteBlocks> => !!blocks && typeof blocks === "object";

const merge = (incoming: Partial<SiteBlocks> | null | undefined): SiteBlocks => {
    const source = valid(incoming) ? incoming : {};
    return {
        hero: typeof source.hero?.description === "string" ? source.hero : fallback.hero,
        // An empty list is a deliberate choice (the strip is hidden), so only a missing block falls back.
        trust: Array.isArray(source.trust?.items) ? source.trust : fallback.trust,
        about:
            Array.isArray(source.about?.paragraphs) && source.about.paragraphs.length
                ? { paragraphs: source.about.paragraphs, quote: typeof source.about.quote === "string" ? source.about.quote : "", facts: Array.isArray(source.about.facts) ? source.about.facts : fallback.about.facts }
                : fallback.about,
        faq: Array.isArray(source.faq?.items) && source.faq.items.length ? source.faq : fallback.faq,
        privacy: Array.isArray(source.privacy?.items) && source.privacy.items.length ? source.privacy : fallback.privacy,
        footer: typeof source.footer?.description === "string" ? source.footer : fallback.footer,
    };
};

const readBootstrap = (): SiteBlocks => {
    try {
        const raw = document.getElementById("site-content-bootstrap")?.textContent;
        return merge(raw ? (JSON.parse(raw) as { blocks?: Partial<SiteBlocks> }).blocks : null);
    } catch {
        return merge(null);
    }
};

export function useSiteContent(): SiteBlocks {
    const [blocks, setBlocks] = useState<SiteBlocks>(readBootstrap);
    useEffect(() => {
        let active = true;
        void apiRequest<{ blocks: Partial<SiteBlocks> }>("/site-content")
            .then((result) => { if (active) setBlocks(merge(result.blocks)); })
            .catch(() => undefined);
        return () => { active = false; };
    }, []);
    return blocks;
}

/** Replace {doctorName}, {specialty}, {medicalCouncilNumber}, {officePhone} and {consultationPhone} in editable text. */
export const fillText = (text: string, info: ClinicInfo): string =>
    text
        .replaceAll("{doctorName}", info.doctorName)
        .replaceAll("{specialty}", info.specialty)
        .replaceAll("{medicalCouncilNumber}", info.medicalCouncilNumber)
        .replaceAll("{officePhone}", info.phones.office.display)
        .replaceAll("{consultationPhone}", info.phones.consultation.display);

export const siteContentApi = {
    list: (token: string) => apiRequest<{ items: SiteBlockRow[] }>("/staff/site-content", {}, token),
    save: (token: string, key: BlockKey, revision: number, content: SiteBlocks[BlockKey]) =>
        apiRequest<SiteBlockRow>(`/staff/site-content/${key}`, { method: "PUT", body: JSON.stringify({ revision, content }) }, token),
    transition: (token: string, row: SiteBlockRow, action: "publish" | "discard") =>
        apiRequest<SiteBlockRow>(`/staff/site-content/${row.key}/transition`, { method: "POST", body: JSON.stringify({ revision: row.revision, action }) }, token),
};
