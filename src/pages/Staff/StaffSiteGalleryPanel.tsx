/* eslint-disable react-hooks/set-state-in-effect */
import { emptyGalleryItem, siteGalleryApi, type GalleryContent, type GalleryRow } from "@/services/siteGalleryApi";
import { useCallback, useEffect, useRef, useState } from "react";
import MediaPicker from "./MediaPicker";
import { useStaffAccess } from "./staffAccess";
import { useContentConfirm } from "./useContentConfirm";

const failure = (e: unknown) => (e instanceof Error ? e.message : "خطای ارتباط با سرور");

export default function StaffSiteGalleryPanel({ token, onDirtyChange, onBusyChange }: { token: string; onDirtyChange: (value: boolean) => void; onBusyChange: (value: boolean) => void }) {
    const can = useStaffAccess();
    const { ask, confirmation } = useContentConfirm();
    const [rows, setRows] = useState<GalleryRow[]>([]);
    const [selected, setSelected] = useState<GalleryRow | null>(null);
    const [content, setContent] = useState<GalleryContent | null>(null);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const request = useRef(0);

    const load = useCallback(async () => {
        const sequence = ++request.current;
        try {
            const result = await siteGalleryApi.list(token);
            if (sequence !== request.current) return;
            setRows(result.items);
            setError("");
        } catch (e) {
            if (sequence === request.current) setError(failure(e));
        }
    }, [token]);
    useEffect(() => { void load(); }, [load]);

    const dirty = !!content && JSON.stringify(content) !== JSON.stringify(selected?.content ?? emptyGalleryItem());
    useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
    useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
    useEffect(() => () => { request.current++; onDirtyChange(false); onBusyChange(false); }, [onDirtyChange, onBusyChange]);

    const open = (row: GalleryRow | null) => { setSelected(row); setContent(row ? row.content : emptyGalleryItem()); setNotice(""); };
    const run = async (task: () => Promise<GalleryRow | null>, done: string) => {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            const next = await task();
            setNotice(done);
            if (next) { setSelected(next); setContent(next.content); } else { setSelected(null); setContent(null); }
            await load();
        } catch (e) {
            setError(failure(e));
        } finally {
            setBusy(false);
        }
    };
    const editable = can("site_gallery.edit") && !busy;
    const patch = <K extends keyof GalleryContent>(key: K, value: GalleryContent[K]) =>
        setContent((old) => old && ({ ...old, [key]: value, ...(key === "ref" || key === "alt" ? { consent_received: false, privacy_reviewed: false } : {}) }));
    const preview = (item: GalleryContent) => (item.kind === "static" ? item.ref : item.ref && can("media.manage") ? `/api/v1/staff/media/${item.ref}/file` : "");

    return (
        <div className="content-admin" dir="rtl">
            {confirmation}
            <header className="content-header">
                <div>
                    <h1>نمونه‌کارها</h1>
                    <p>هر تصویر پیش‌نویس جدا دارد. تصویر تازه فقط با ثبت رضایت مراجع و بازبینی حریم خصوصی منتشر می‌شود.</p>
                </div>
                {can("site_gallery.create") && <button className="content-primary" disabled={busy} onClick={() => open(null)}>+ تصویر تازه</button>}
            </header>
            {error && <p role="alert" className="content-error">{error}<button onClick={() => void load()}>خواندن دوباره</button></p>}
            {notice && <p role="status" className="content-notice">{notice}</p>}
            <ul className="source-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12, listStyle: "none", padding: 0 }}>
                {rows.map((row) => (
                    <li key={row.id}>
                        <button type="button" onClick={() => open(row)} aria-pressed={selected?.id === row.id} style={{ width: "100%", textAlign: "center" }}>
                            {preview(row.content) ? <img src={preview(row.content)} alt={row.content.alt} loading="lazy" style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 8 }} /> : <span>بدون پیش‌نمایش</span>}
                            <small style={{ display: "block" }}>{row.published ? (row.unpublished_changes ? "منتشر + تغییر" : "منتشر") : "پیش‌نویس"} · ترتیب {row.content.sort_order}</small>
                        </button>
                    </li>
                ))}
            </ul>
            {content && (
                <section className="article-compose" aria-label="ویرایش تصویر">
                    <h2>{selected ? "ویرایش تصویر" : "تصویر تازه"}</h2>
                    {content.kind === "static" && <p>این تصویر از نسخه‌ی قدیمی سایت است ({content.ref}).</p>}
                    {content.kind === "media" && can("media.manage") && !selected?.published && (
                        <MediaPicker token={token} label="تصویر از رسانه عمومی" value={content.ref} disabled={!editable} onSelect={(m) => setContent((old) => old && ({ ...old, ref: m?.key ?? "", alt: old.alt || m?.alt || "", consent_received: false, privacy_reviewed: false }))} />
                    )}
                    {preview(content) && <img src={preview(content)} alt={content.alt} style={{ maxHeight: 200, borderRadius: 12 }} />}
                    <label>توضیح تصویر (متن جایگزین)<input maxLength={300} value={content.alt} readOnly={!editable} onChange={(e) => patch("alt", e.target.value)} /></label>
                    <label>ترتیب نمایش<input type="number" min={0} max={10000} value={content.sort_order} readOnly={!editable} onChange={(e) => patch("sort_order", Number(e.target.value) || 0)} /></label>
                    {content.kind === "media" && (
                        <fieldset>
                            <legend>رضایت و حریم خصوصی</legend>
                            <label><input type="checkbox" checked={content.consent_received} disabled={!editable} onChange={(e) => patch("consent_received", e.target.checked)} /> رضایت کتبی مراجع برای انتشار دریافت شده است</label>
                            <label>مرجع رضایت‌نامه (شماره یا نام پرونده)<input maxLength={200} value={content.consent_reference} readOnly={!editable} onChange={(e) => patch("consent_reference", e.target.value)} /></label>
                            <label><input type="checkbox" checked={content.privacy_reviewed} disabled={!editable} onChange={(e) => patch("privacy_reviewed", e.target.checked)} /> چهره و نشانه‌های هویتی بازبینی و تأیید شد</label>
                        </fieldset>
                    )}
                    <div className="article-actions">
                        {can(selected ? "site_gallery.edit" : "site_gallery.create") && <button className="content-primary" disabled={busy || !dirty || (content.kind === "media" && !content.ref)} onClick={() => void run(() => siteGalleryApi.save(token, selected, content), "پیش‌نویس ذخیره شد؛ انتشار جداگانه است.")}>ذخیره پیش‌نویس</button>}
                        {selected && can("site_gallery.publish") && <button disabled={busy || dirty || (selected.published && !selected.unpublished_changes)} onClick={async () => { if (await ask("این تصویر روی سایت منتشر شود؟")) await run(() => siteGalleryApi.transition(token, selected, "publish"), "منتشر شد."); }}>انتشار نسخه ذخیره‌شده</button>}
                        {selected?.published && can("site_gallery.publish") && <button disabled={busy} onClick={async () => { if (await ask("انتشار این تصویر متوقف شود؟")) await run(() => siteGalleryApi.transition(token, selected, "unpublish"), "انتشار متوقف شد."); }}>توقف انتشار</button>}
                        {selected && can("site_gallery.delete") && <button disabled={busy} onClick={async () => { if (await ask("این تصویر بایگانی شود؟")) await run(async () => { await siteGalleryApi.archive(token, selected); return null; }, "بایگانی شد."); }}>بایگانی</button>}
                        <button type="button" disabled={busy} onClick={() => { setSelected(null); setContent(null); }}>بستن</button>
                    </div>
                </section>
            )}
        </div>
    );
}
