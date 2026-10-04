/* eslint-disable react-hooks/set-state-in-effect */
import { siteContentApi, type BlockKey, type SiteBlockRow, type SiteBlocks } from "@/services/siteContentApi";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStaffAccess } from "./staffAccess";
import { useContentConfirm } from "./useContentConfirm";

const failure = (e: unknown) => (e instanceof Error ? e.message : "خطای ارتباط با سرور");
const HELP = "می‌توانید در متن از {doctorName} (نام پزشک)، {specialty} (تخصص)، {medicalCouncilNumber} (شماره نظام پزشکی)، {officePhone} و {consultationPhone} استفاده کنید؛ هنگام نمایش جایگزین می‌شوند.";

type Draft = SiteBlocks[BlockKey];

function move<T>(list: T[], from: number, to: number): T[] {
    if (to < 0 || to >= list.length) return list;
    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
}

function Fields({ blockKey, draft, onChange, locked }: { blockKey: BlockKey; draft: Draft; onChange: (value: Draft) => void; locked: boolean }) {
    if (blockKey === "hero" || blockKey === "footer") {
        const value = draft as { description: string };
        return (
            <label>متن
                <textarea rows={5} maxLength={blockKey === "hero" ? 700 : 900} value={value.description} readOnly={locked} onChange={(e) => onChange({ description: e.target.value })} />
            </label>
        );
    }
    if (blockKey === "trust") {
        const items = (draft as { items: { title: string; text: string }[] }).items;
        const set = (next: { title: string; text: string }[]) => onChange({ items: next });
        return (
            <>
                <p className="editor-help">نوار زیر بخش بالای صفحه؛ تا ۴ مورد. اگر همه‌ی موردها حذف شوند نوار نمایش داده نمی‌شود. فقط موردهایی بنویسید که مدرکشان را دارید.</p>
                {items.map((item, index) => (
                    <fieldset key={index}>
                        <legend>مورد {index + 1}</legend>
                        <label>عنوان<input maxLength={80} value={item.title} readOnly={locked} onChange={(e) => set(items.map((x, i) => (i === index ? { ...x, title: e.target.value } : x)))} /></label>
                        <label>توضیح کوتاه<input maxLength={160} value={item.text} readOnly={locked} onChange={(e) => set(items.map((x, i) => (i === index ? { ...x, text: e.target.value } : x)))} /></label>
                        {!locked && (
                            <div className="article-actions">
                                <button type="button" aria-label="بالا" onClick={() => set(move(items, index, index - 1))}>↑</button>
                                <button type="button" aria-label="پایین" onClick={() => set(move(items, index, index + 1))}>↓</button>
                                <button type="button" onClick={() => set(items.filter((_, i) => i !== index))}>حذف</button>
                            </div>
                        )}
                    </fieldset>
                ))}
                {!locked && items.length < 4 && <button type="button" onClick={() => set([...items, { title: "", text: "" }])}>+ مورد تازه</button>}
            </>
        );
    }
    if (blockKey === "about") {
        const about = draft as { paragraphs: string[]; quote: string; facts: { value: string; label: string }[] };
        const { paragraphs, quote, facts } = about;
        const set = (next: string[]) => onChange({ ...about, paragraphs: next });
        return (
            <>
                <label>جمله‌ی شاخص روی تصویر (اختیاری؛ خالی یعنی نمایش داده نشود)
                    <textarea rows={2} maxLength={300} value={quote} readOnly={locked} onChange={(e) => onChange({ ...about, quote: e.target.value })} />
                </label>
                {facts.map((fact, index) => (
                    <fieldset key={index}>
                        <legend>مشخصه {index + 1}</legend>
                        <label>مقدار (مثلاً 20+)<input maxLength={30} value={fact.value} readOnly={locked} onChange={(e) => onChange({ ...about, facts: facts.map((x, i) => (i === index ? { ...x, value: e.target.value } : x)) })} /></label>
                        <label>برچسب (مثلاً سال تجربه)<input maxLength={60} value={fact.label} readOnly={locked} onChange={(e) => onChange({ ...about, facts: facts.map((x, i) => (i === index ? { ...x, label: e.target.value } : x)) })} /></label>
                        {!locked && <button type="button" onClick={() => onChange({ ...about, facts: facts.filter((_, i) => i !== index) })}>حذف مشخصه</button>}
                    </fieldset>
                ))}
                {!locked && facts.length < 4 && <button type="button" onClick={() => onChange({ ...about, facts: [...facts, { value: "", label: "" }] })}>+ مشخصه تازه</button>}
                {paragraphs.map((text, index) => (
                    <div key={index} className="source-row">
                        <label>بند {index + 1}
                            <textarea rows={4} maxLength={1500} value={text} readOnly={locked} onChange={(e) => set(paragraphs.map((p, i) => (i === index ? e.target.value : p)))} />
                        </label>
                        {!locked && (
                            <div className="article-actions">
                                <button type="button" aria-label="بالا" onClick={() => set(move(paragraphs, index, index - 1))}>↑</button>
                                <button type="button" aria-label="پایین" onClick={() => set(move(paragraphs, index, index + 1))}>↓</button>
                                <button type="button" disabled={paragraphs.length <= 1} onClick={() => set(paragraphs.filter((_, i) => i !== index))}>حذف</button>
                            </div>
                        )}
                    </div>
                ))}
                {!locked && paragraphs.length < 6 && <button type="button" onClick={() => set([...paragraphs, ""])}>+ بند تازه</button>}
            </>
        );
    }
    const items = (draft as { items: { title: string; content: string }[] }).items;
    const set = (next: { title: string; content: string }[]) => onChange({ items: next });
    return (
        <>
            {items.map((item, index) => (
                <fieldset key={index}>
                    <legend>سوال {index + 1}</legend>
                    <label>عنوان سوال<input maxLength={200} value={item.title} readOnly={locked} onChange={(e) => set(items.map((x, i) => (i === index ? { ...x, title: e.target.value } : x)))} /></label>
                    <label>پاسخ<textarea rows={4} maxLength={2000} value={item.content} readOnly={locked} onChange={(e) => set(items.map((x, i) => (i === index ? { ...x, content: e.target.value } : x)))} /></label>
                    {!locked && (
                        <div className="article-actions">
                            <button type="button" aria-label="بالا" onClick={() => set(move(items, index, index - 1))}>↑</button>
                            <button type="button" aria-label="پایین" onClick={() => set(move(items, index, index + 1))}>↓</button>
                            <button type="button" disabled={items.length <= 1} onClick={() => set(items.filter((_, i) => i !== index))}>حذف سوال</button>
                        </div>
                    )}
                </fieldset>
            ))}
            {!locked && items.length < (blockKey === "privacy" ? 12 : 20) && <button type="button" onClick={() => set([...items, { title: "", content: "" }])}>+ سوال تازه</button>}
        </>
    );
}

export default function StaffSiteContentPanel({ token, onDirtyChange, onBusyChange }: { token: string; onDirtyChange: (value: boolean) => void; onBusyChange: (value: boolean) => void }) {
    const can = useStaffAccess();
    const { ask, confirmation } = useContentConfirm();
    const [rows, setRows] = useState<SiteBlockRow[]>([]);
    const [drafts, setDrafts] = useState<Partial<Record<BlockKey, Draft>>>({});
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const request = useRef(0);

    const load = useCallback(async () => {
        const sequence = ++request.current;
        try {
            const result = await siteContentApi.list(token);
            if (sequence !== request.current) return;
            setRows(result.items);
            setDrafts(Object.fromEntries(result.items.map((row) => [row.key, row.content])) as Partial<Record<BlockKey, Draft>>);
            setError("");
        } catch (e) {
            if (sequence === request.current) setError(failure(e));
        }
    }, [token]);
    useEffect(() => { void load(); }, [load]);

    const dirtyKeys = rows.filter((row) => drafts[row.key] && JSON.stringify(drafts[row.key]) !== JSON.stringify(row.content)).map((row) => row.key);
    const anyDirty = dirtyKeys.length > 0;
    useEffect(() => { onDirtyChange(anyDirty); }, [anyDirty, onDirtyChange]);
    useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
    useEffect(() => () => { request.current++; onDirtyChange(false); onBusyChange(false); }, [onDirtyChange, onBusyChange]);
    useEffect(() => {
        if (!anyDirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [anyDirty]);

    const replace = (next: SiteBlockRow) => {
        setRows((old) => old.map((row) => (row.key === next.key ? next : row)));
        setDrafts((old) => ({ ...old, [next.key]: next.content }));
    };
    const run = async (task: () => Promise<SiteBlockRow>, done: string) => {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            replace(await task());
            setNotice(done);
        } catch (e) {
            setError(failure(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="content-admin" dir="rtl">
            {confirmation}
            <header className="content-header">
                <div>
                    <h1>متن‌های صفحه اصلی</h1>
                    <p>هر بخش پیش‌نویس جدا دارد؛ تا منتشر نکنید روی سایت تغییری دیده نمی‌شود.</p>
                </div>
            </header>
            <p className="editor-help">{HELP}</p>
            {error && <p role="alert" className="content-error">{error}<button onClick={() => void load()}>خواندن دوباره</button></p>}
            {notice && <p role="status" className="content-notice">{notice}</p>}
            {rows.map((row) => {
                const draft = drafts[row.key] ?? row.content;
                const dirty = dirtyKeys.includes(row.key);
                const locked = !can("site_content.edit") || busy;
                return (
                    <section key={row.key} className="article-compose" style={{ marginBottom: 24 }}>
                        <h2>{row.title}</h2>
                        <p>{row.unpublished_changes || dirty ? "تغییرات منتشرنشده دارد" : "همین نسخه روی سایت است"} · نسخه {row.revision}</p>
                        <Fields blockKey={row.key} draft={draft} locked={locked} onChange={(value) => setDrafts((old) => ({ ...old, [row.key]: value }))} />
                        <div className="article-actions">
                            {can("site_content.edit") && <button className="content-primary" disabled={busy || !dirty} onClick={() => void run(() => siteContentApi.save(token, row.key, row.revision, draft), "پیش‌نویس ذخیره شد؛ انتشار جداگانه است.")}>ذخیره پیش‌نویس</button>}
                            {can("site_content.publish") && <button disabled={busy || dirty || !row.unpublished_changes} onClick={async () => { if (await ask("این نسخه روی سایت منتشر شود؟")) await run(() => siteContentApi.transition(token, row, "publish"), "منتشر شد."); }}>انتشار نسخه ذخیره‌شده</button>}
                            {can("site_content.publish") && row.unpublished_changes && <button disabled={busy} onClick={async () => { if (await ask("پیش‌نویس کنار گذاشته شود و به نسخه منتشرشده برگردد؟")) await run(() => siteContentApi.transition(token, row, "discard"), "به نسخه منتشرشده برگشت."); }}>بازگشت به نسخه منتشرشده</button>}
                            {dirty && <button disabled={busy} onClick={() => setDrafts((old) => ({ ...old, [row.key]: row.content }))}>لغو تغییرات این بخش</button>}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
