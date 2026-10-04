/* eslint-disable react-hooks/set-state-in-effect */
import { safeContentHtml } from "@/services/contentApi";
import {
    emptyService,
    SERVICE_IMAGES,
    siteServicesApi,
    type SiteServiceContent,
    type SiteServiceRow,
} from "@/services/siteServicesApi";
import { useCallback, useEffect, useRef, useState } from "react";
import ArticleEditor from "./ArticleEditor";
import { useStaffAccess } from "./staffAccess";
import { useContentConfirm } from "./useContentConfirm";

const failure = (e: unknown) => (e instanceof Error ? e.message : "خطای ارتباط با سرور");
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type FormProps = {
    token: string;
    initial: SiteServiceRow | null;
    onSaved: (row: SiteServiceRow) => void;
    onDirty: (dirty: boolean) => void;
    onBusy: (busy: boolean) => void;
};

function ServiceForm({ token, initial, onSaved, onDirty, onBusy }: FormProps) {
    const can = useStaffAccess();
    const { ask, confirmation } = useContentConfirm();
    const [row, setRow] = useState(initial);
    const [content, setContent] = useState<SiteServiceContent>(initial?.content ?? emptyService());
    const [saved, setSaved] = useState(JSON.stringify(initial?.content ?? emptyService()));
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState(false);
    const [preview, setPreview] = useState(false);
    const editable = row ? can("site_services.edit") : can("site_services.create");
    const dirty = editable && JSON.stringify(content) !== saved;

    useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
    useEffect(() => { onBusy(busy); }, [busy, onBusy]);
    useEffect(() => {
        if (!dirty) return;
        const warn = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const patch = <K extends keyof SiteServiceContent>(key: K, value: SiteServiceContent[K]) => {
        setPreview(false);
        setContent((old) => ({ ...old, [key]: value }));
    };
    const accept = (next: SiteServiceRow) => {
        setRow(next);
        setContent(next.content);
        setSaved(JSON.stringify(next.content));
        setError("");
        onSaved(next);
    };
    const save = async () => {
        if (!editable || busy) return;
        if (content.title.trim().length < 2) { setError("عنوان خدمت را کامل کنید."); return; }
        if (!SLUG_PATTERN.test(content.slug)) { setError("نشانی صفحه فقط حروف کوچک انگلیسی، عدد و خط تیره دارد (مثل face-lift)."); return; }
        setBusy(true);
        setError("");
        try {
            accept(await siteServicesApi.save(token, row, content));
            setNotice("پیش‌نویس ذخیره شد؛ انتشار جداگانه است.");
        } catch (e) {
            setError(failure(e));
        } finally {
            setBusy(false);
        }
    };
    const transition = async (action: "publish" | "unpublish") => {
        if (!row || busy) return;
        if (dirty) { setError("ابتدا پیش‌نویس را ذخیره کنید."); return; }
        const question = action === "publish"
            ? "این نسخه ذخیره‌شده روی سایت منتشر شود؟"
            : "صفحه از نمایش عمومی خارج شود؟ لینک آن 404 می‌دهد.";
        if (!await ask(question)) return;
        setBusy(true);
        try {
            accept(await siteServicesApi.transition(token, row, action));
            setNotice(action === "publish" ? "صفحه منتشر شد." : "انتشار متوقف شد.");
        } catch (e) {
            setError(failure(e));
        } finally {
            setBusy(false);
        }
    };
    const reload = async () => {
        if (!row || busy || !await ask("متن محلی با نسخه تازه سرور جایگزین شود؟")) return;
        setBusy(true);
        try {
            accept(await siteServicesApi.get(token, row.id));
            setPreview(false);
        } catch (e) {
            setError(failure(e));
        } finally {
            setBusy(false);
        }
    };

    const locked = !editable || busy;
    return (
        <section className="article-compose">
            {confirmation}
            <h2>{row ? "ویرایش صفحه خدمت" : "خدمت تازه"}</h2>
            <p>
                {row ? `${row.published ? "منتشرشده" : "پیش‌نویس"} · نسخه ${row.revision}` : "متن را بنویسید، ذخیره کنید و سپس منتشر کنید."}
                {row?.unpublished_changes ? " · تغییرات جدید هنوز عمومی نیستند" : ""}
            </p>
            {error && <p role="alert" className="content-error">{error} {row && <button onClick={() => void reload()}>خواندن نسخه تازه</button>}</p>}
            {notice && <p role="status" className="content-notice">{notice}</p>}
            <div className="article-fields">
                <label>عنوان خدمت<input maxLength={120} value={content.title} readOnly={locked} onChange={(e) => patch("title", e.target.value)} /></label>
                <label>نشانی صفحه (انگلیسی)
                    <input dir="ltr" maxLength={80} value={content.slug} readOnly={locked || !!row?.published} onChange={(e) => patch("slug", e.target.value.toLowerCase())} placeholder="face-lift" />
                </label>
            </div>
            {row?.published && <p className="editor-help">نشانی صفحه منتشرشده تغییر نمی‌کند؛ برای تغییر، ابتدا انتشار را متوقف کنید.</p>}
            <label>خلاصه (روی کارت‌ها و توضیح گوگل)
                <textarea maxLength={300} value={content.summary} readOnly={locked} onChange={(e) => patch("summary", e.target.value)} />
            </label>
            <div className="article-fields">
                <label>برچسب کوتاه کاشی «درباره پزشک»
                    <input maxLength={60} value={content.tile_label} readOnly={locked} onChange={(e) => patch("tile_label", e.target.value)} placeholder="(جراحی پلک)" />
                </label>
                <label>نماد
                    <select value={content.image} disabled={locked} onChange={(e) => patch("image", e.target.value)}>
                        {SERVICE_IMAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                </label>
                <label>ترتیب نمایش
                    <input type="number" min={0} max={10000} value={content.sort_order} readOnly={locked} onChange={(e) => patch("sort_order", Number(e.target.value))} />
                </label>
            </div>
            <h3>متن کامل صفحه</h3>
            <ArticleEditor html={content.description_html} onChange={(value) => patch("description_html", value)} token={token} editable={!locked} canUseMedia={can("media.manage")} />
            <fieldset>
                <legend>سئو (اختیاری)</legend>
                <label>عنوان نتیجه جست‌وجو<input maxLength={200} value={content.seo_title} readOnly={locked} onChange={(e) => patch("seo_title", e.target.value)} /></label>
                <label>توضیح نتیجه جست‌وجو<textarea maxLength={400} value={content.seo_description} readOnly={locked} onChange={(e) => patch("seo_description", e.target.value)} /></label>
            </fieldset>
            <div className="article-actions">
                {editable && <button className="content-primary" disabled={busy} onClick={() => void save()}>ذخیره پیش‌نویس</button>}
                <button onClick={() => setPreview(!preview)}>{preview ? "بستن پیش‌نمایش" : "پیش‌نمایش"}</button>
                {row && can("site_services.publish") && <button disabled={busy || dirty} onClick={() => void transition("publish")}>انتشار نسخه ذخیره‌شده</button>}
                {row?.published && can("site_services.publish") && <button disabled={busy} onClick={() => void transition("unpublish")}>توقف انتشار</button>}
                {row?.published && <a href={`/services/${row.content.slug}/`} target="_blank" rel="noopener noreferrer">مشاهده صفحه عمومی</a>}
            </div>
            {preview && (
                <section aria-label="پیش‌نمایش صفحه خدمت" className="article-preview">
                    <h1>{content.title}</h1>
                    <p>{content.summary}</p>
                    <div className="article-body" dangerouslySetInnerHTML={{ __html: safeContentHtml(content.description_html, true) }} />
                </section>
            )}
        </section>
    );
}

export default function StaffSiteServicesPanel({ token, onDirtyChange, onBusyChange }: { token: string; onDirtyChange: (value: boolean) => void; onBusyChange: (value: boolean) => void }) {
    const can = useStaffAccess();
    const { ask, confirmation } = useContentConfirm();
    const [items, setItems] = useState<SiteServiceRow[]>([]);
    const [selected, setSelected] = useState<SiteServiceRow | null>(null);
    const [open, setOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [error, setError] = useState("");
    const [dirty, setDirty] = useState(false);
    const [busy, setBusy] = useState(false);
    const request = useRef(0);

    const load = useCallback(async () => {
        const sequence = ++request.current;
        try {
            const result = await siteServicesApi.list(token);
            if (sequence !== request.current) return;
            setItems(result.items);
            setError("");
        } catch (e) {
            if (sequence === request.current) setError(failure(e));
        }
    }, [token]);
    useEffect(() => { void load(); }, [load]);
    useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
    useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
    useEffect(() => () => { request.current++; onDirtyChange(false); onBusyChange(false); }, [onDirtyChange, onBusyChange]);

    const saved = useCallback((row: SiteServiceRow) => { setSelected(row); void load(); }, [load]);
    const select = async (row: SiteServiceRow | null) => {
        if (busy) return;
        if (dirty && !await ask("متن ذخیره‌نشده کنار گذاشته شود؟")) return;
        try {
            setSelected(row ? await siteServicesApi.get(token, row.id) : null);
            setFormKey((v) => v + 1);
            setOpen(true);
            setDirty(false);
        } catch (e) {
            setError(failure(e));
        }
    };
    const archive = async (row: SiteServiceRow) => {
        if (busy) return;
        if (dirty && !await ask("پیش از بایگانی، متن ذخیره‌نشده کنار گذاشته شود؟")) return;
        if (!await ask("صفحه بایگانی و از سایت حذف شود؟ نشانی آن برای استفاده‌ی دوباره رزرو می‌ماند.")) return;
        setBusy(true);
        try {
            await siteServicesApi.archive(token, row);
            setOpen(false);
            setDirty(false);
            void load();
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
                    <h1>صفحه‌های خدمات</h1>
                    <p>متن این صفحه‌ها در صفحه اصلی، منو و آدرس‌های /services/ نمایش داده می‌شود</p>
                </div>
                {can("site_services.create") && <button onClick={() => void select(null)}>+ خدمت تازه</button>}
            </header>
            {error && <p role="alert" className="content-error">{error}<button onClick={() => void load()}>تلاش مجدد</button></p>}
            <div className="article-list">
                {items.map((row) => (
                    <article key={row.id}>
                        <div>
                            <b>{row.content.title}</b>
                            <p>/{row.content.slug}/ · {row.published ? "منتشرشده" : "پیش‌نویس"}{row.unpublished_changes ? " · تغییرات منتشرنشده" : ""}</p>
                        </div>
                        <button disabled={busy} onClick={() => void select(row)}>باز کردن</button>
                        {can("site_services.delete") && <button disabled={busy} onClick={() => void archive(row)}>بایگانی</button>}
                    </article>
                ))}
                {!items.length && <p>هنوز صفحه خدمتی ثبت نشده است.</p>}
            </div>
            {open && <ServiceForm key={formKey} token={token} initial={selected} onSaved={saved} onDirty={setDirty} onBusy={setBusy} />}
        </div>
    );
}
