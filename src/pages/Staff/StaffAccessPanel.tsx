import StaffEditorDialog from "./StaffEditorDialog";
import {useContentConfirm} from "./useContentConfirm";
/* eslint-disable react-hooks/set-state-in-effect */
import { appointmentApi,type AccessPermission,type AccessRole,type StaffIdentity } from "@/services/appointmentApi";
import { useCallback,useEffect,useRef,useState,type FormEvent } from "react";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800";
const button = "rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-40";
const emptyRole = { name: "", description: "", is_active: true, permissions: [] as string[] };

export default function StaffAccessPanel({ token, currentId,onDirtyChange,onBusyChange }: { token: string; currentId: number;onDirtyChange?:(value:boolean)=>void;onBusyChange?:(value:boolean)=>void }) {
    const {ask,confirmation}=useContentConfirm();
    const [editor,setEditor]=useState<"role"|"staff"|null>(null);
    const [archived,setArchived]=useState(false);
    const inFlight=useRef(false);
    const [baseline,setBaseline]=useState("");
    const [roles, setRoles] = useState<AccessRole[]>([]);
    const [staff, setStaff] = useState<StaffIdentity[]>([]);
    const [catalog, setCatalog] = useState<AccessPermission[]>([]);
    const [roleId, setRoleId] = useState<number | null>(null);
    const [roleForm, setRoleForm] = useState(emptyRole);
    const [staffId, setStaffId] = useState<number | null>(null);
    const [staffForm, setStaffForm] = useState({ username: "", full_name: "", password: "", is_active: true, role_ids: [] as number[] });
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const load = useCallback(async () => {
        try {
            const [r, s, p] = await Promise.all([appointmentApi.accessRoles(token), appointmentApi.accessStaff(token,archived), appointmentApi.accessPermissions(token)]);
            setRoles(r); setStaff(s); setCatalog(p);
        } catch (e) { setError(e instanceof Error ? e.message : "دریافت دسترسی‌ها ناموفق بود"); }
    }, [token,archived]);
    useEffect(() => { void load(); }, [load]);
    const dirty=Boolean(editor&&JSON.stringify(editor==="role"?roleForm:staffForm)!==baseline);
    useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
    useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
    useEffect(()=>()=>{onDirtyChange?.(false);onBusyChange?.(false);},[onDirtyChange,onBusyChange]);
    useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[dirty]);
    const run = async (action: () => Promise<unknown>, success: string) => {
        if(inFlight.current)return;inFlight.current=true;
        setBusy(true); setError(""); setMessage("");
        try { await action(); setMessage(success); await load(); }
        catch (e) { setError(e instanceof Error ? e.message : "ذخیره ناموفق بود"); }
        finally { inFlight.current=false;setBusy(false); }
    };
    const selectRole = (role: AccessRole) => {
        const form={ name: role.name, description: role.description, is_active: role.is_active, permissions: role.permissions };
        setRoleId(role.id);setRoleForm(form);setBaseline(JSON.stringify(form));setEditor("role");
    };
    const togglePermission = (code: string, checked: boolean) => {
        const chosen = new Set(roleForm.permissions);
        const add = (c: string) => { if (chosen.has(c)) return; chosen.add(c); catalog.find(p => p.code === c)?.requires.forEach(add); };
        if (checked) add(code);
        else {
            chosen.delete(code);
            let removed: boolean;
            do { removed = false; for (const p of catalog) if (chosen.has(p.code) && p.requires.some(c => !chosen.has(c))) { chosen.delete(p.code); removed = true; } } while (removed);
        }
        setRoleForm({ ...roleForm, permissions: [...chosen] });
    };
    const saveRole = (e: FormEvent) => {
        e.preventDefault();
        void run(async () => { const saved = await appointmentApi.saveAccessRole(token, roleId, roleForm); selectRole(saved); }, "نقش ذخیره شد؛ اعضای این نقش باید دوباره وارد شوند.");
    };
    const saveStaff = (e: FormEvent) => {
        e.preventDefault();
        const payload = { full_name: staffForm.full_name, role_ids: staffForm.role_ids, is_active: staffForm.is_active, ...(staffForm.password ? { password: staffForm.password } : {}) };
        void run(async () => {
            const saved = await appointmentApi.saveAccessStaff(token, staffId, staffId ? payload : { ...payload, username: staffForm.username, password: staffForm.password });
            setStaffId(saved.id);
            const next={...staffForm,password:""};setStaffForm(next);setBaseline(JSON.stringify(next));
        }, staffId === currentId ? "حساب شما تغییر کرد؛ برای اعمال دسترسی، خارج شوید و دوباره وارد شوید." : "کارمند ذخیره شد؛ نشست‌های قبلی او باطل شدند.");
    };
    const closeEditor=async()=>{
        if(busy)return;
        const changed=editor&&JSON.stringify(editor==="role"?roleForm:staffForm)!==baseline;
        if(!changed||await ask("تغییرات ذخیره‌نشده کنار گذاشته شود؟")){setEditor(null);setStaffForm(f=>({...f,password:""}));}
    };
    const protectedRole = roles.find(r => r.id === roleId)?.is_superadmin;
    const groups = [...new Set(catalog.map(p => p.group))];
    return <section className="space-y-6 text-slate-800" dir="rtl">{confirmation}
        <div><h2 className="font-dana text-3xl text-primary">نقش‌ها و کارکنان</h2><p className="mt-2 text-sm text-slate-500">هر حساب می‌تواند چند نقش داشته باشد؛ دسترسی‌های نقش‌های فعال با هم جمع می‌شوند. فقط مدیرکل این بخش را مدیریت می‌کند.</p></div>
        {!editor&&error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {!editor&&message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
        <div className="grid gap-5 md:grid-cols-1">
            <section className="min-w-0 rounded-2xl border bg-white p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-primary">نقش‌ها</h3><button type="button" disabled={busy} className={button} onClick={() => { setRoleId(null);setRoleForm(emptyRole);setBaseline(JSON.stringify(emptyRole));setEditor("role"); }}>نقش جدید</button></div>
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="جدول نقش‌ها"><table className="w-full text-right text-sm" style={{minWidth:520}}><thead><tr className="border-b bg-slate-50 text-primary"><th scope="col" className="p-3">نام نقش</th><th scope="col" className="p-3">اعضا</th><th scope="col" className="p-3">وضعیت</th><th scope="col" className="p-3 sm:sticky sm:left-0 sm:z-1" style={{background:"#f8fafc"}}>عملیات</th></tr></thead><tbody>{roles.map(role=><tr key={role.id} className="border-b border-slate-100"><th scope="row" className="p-3 font-bold">{role.name}{role.is_system&&<span className="mt-1 block text-xs font-normal text-slate-600">پیش‌فرض سیستم</span>}</th><td className="p-3">{role.member_count}</td><td className="p-3">{role.is_active?"فعال":"غیرفعال"}</td><td className="p-3 sm:sticky sm:left-0 sm:z-1" style={{background:"white"}}><div className="flex gap-2"><button type="button" disabled={busy} aria-label={`ویرایش نقش ${role.name}`} className="min-h-11 rounded-xl border px-3 text-primary" onClick={()=>selectRole(role)}>ویرایش</button><button type="button" disabled={busy||role.is_system||Boolean(role.member_count)} aria-label={`حذف نقش ${role.name}`} title={role.is_system?"نقش پیش‌فرض سیستم حذف نمی‌شود":role.member_count?"ابتدا اعضا را به نقش دیگری منتقل کنید":"حذف نقش بدون عضو"} className="min-h-11 rounded-xl border border-red-200 px-3 text-red-700 disabled:opacity-40" onClick={()=>{void ask(`نقش «${role.name}» برای همیشه حذف شود؟`,{title:"حذف نقش",confirmLabel:"حذف نقش"}).then(ok=>{if(ok)void run(async()=>{await appointmentApi.deleteAccessRole(token,role.id);setRoleId(null);},"نقش حذف شد");});}}>حذف</button></div></td></tr>)}</tbody></table></div>
                <p className="mt-3 text-xs leading-6 text-slate-600">نقش پیش‌فرض یا دارای عضو حذف نمی‌شود. برای توقف دسترسی، نقش را ویرایش و غیرفعال کنید. روی گوشی جدول را به طرفین بکشید.</p>
            </section>
            {editor==="role"&&<StaffEditorDialog title={roleId?"ویرایش نقش":"تعریف نقش جدید"} busy={busy} onClose={closeEditor}><form onSubmit={saveRole} className="space-y-4 rounded-2xl border bg-white p-5">{error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
                <fieldset disabled={busy} className="space-y-4"><h3 className="font-bold">{roleId ? "ویرایش نقش" : "تعریف نقش جدید"}</h3>
                {protectedRole ? <p className="rounded-xl bg-amber-50 p-4 text-sm">مدیرکل تمام دسترسی‌ها را دارد. این نقش قابل تغییر، حذف یا غیرفعال‌سازی نیست. آخرین مدیرکل فعال نیز محافظت می‌شود.</p> : <>
                    <label className="block text-sm">نام نقش<input required minLength={2} maxLength={120} className={`${input} mt-1`} value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} /></label>
                    <label className="block text-sm">توضیح<textarea maxLength={500} className={`${input} mt-1`} value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} /></label>
                    <label className="flex gap-2 text-sm"><input type="checkbox" checked={roleForm.is_active} onChange={e => setRoleForm({ ...roleForm, is_active: e.target.checked })} />نقش فعال است</label>
                    <p className="text-xs text-slate-500">پیش‌نیاز هر مجوز خودکار انتخاب می‌شود. مجوزهای «مرحله آینده» اکنون ذخیره می‌شوند و با افزودن آن قابلیت به کار می‌روند. مجوزهای مدیرکل به نقش دیگر داده نمی‌شوند.</p>
                    <div className="grid gap-3 md:grid-cols-2">{groups.map(group => <fieldset key={group} className="rounded-xl border border-slate-100 p-3"><legend className="px-2 text-sm font-bold">{group}</legend>{catalog.filter(p => p.group === group).map(p => <label key={p.code} className={`my-2 flex items-start gap-2 text-xs ${p.owner_only ? "text-slate-400" : "text-slate-700"}`}><input type="checkbox" className="mt-0.5" disabled={p.owner_only || busy} checked={roleForm.permissions.includes(p.code)} onChange={e => togglePermission(p.code, e.target.checked)} /><span>{p.title}{p.future && <span className="mr-1 text-amber-700"> · مرحله آینده</span>}</span></label>)}</fieldset>)}</div>
                    <div className="flex flex-wrap gap-3"><button disabled={busy} className={button}>ذخیره نقش</button>{roleId && !roles.find(r => r.id === roleId)?.is_system && <button type="button" disabled={busy || !!roles.find(r => r.id === roleId)?.member_count} className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-40" onClick={() => { void ask("نقش بدون عضو حذف شود؟",{title:"حذف نقش",confirmLabel:"حذف نقش",cancelLabel:"بازگشت"}).then(confirmed=>{if(confirmed)void run(async () => { await appointmentApi.deleteAccessRole(token, roleId); setRoleId(null); setRoleForm(emptyRole); }, "نقش حذف شد");}); }}>حذف نقش بدون عضو</button>}</div>
                </>}
            </fieldset></form></StaffEditorDialog>}
        </div>
        <div className="grid gap-5 md:grid-cols-1">
            <section className="min-w-0 rounded-2xl border bg-white p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-primary">کارکنان</h3><div className="flex flex-wrap items-center gap-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={busy} checked={archived} onChange={event=>setArchived(event.target.checked)}/>نمایش حذف‌شده‌ها</label><button type="button" disabled={busy} className={button} onClick={()=>{const form={username:"",full_name:"",password:"",is_active:true,role_ids:[] as number[]};setStaffId(null);setStaffForm(form);setBaseline(JSON.stringify(form));setEditor("staff");}}>کارمند جدید</button></div></div>
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="جدول کارکنان"><table className="w-full text-right text-sm" style={{minWidth:620}}><thead><tr className="border-b bg-slate-50 text-primary"><th scope="col" className="p-3">کارمند / نام کاربری</th><th scope="col" className="p-3">نقش‌ها</th><th scope="col" className="p-3">وضعیت</th><th scope="col" className="p-3 sm:sticky sm:left-0 sm:z-1" style={{background:"#f8fafc"}}>عملیات</th></tr></thead><tbody>{staff.map(person=><tr key={person.id} className="border-b border-slate-100"><th scope="row" className="p-3 font-bold">{person.full_name}{person.id===currentId?" (شما)":""}<span dir="ltr" className="mt-1 block text-right text-xs font-normal text-slate-600">{person.username}</span></th><td className="p-3">{person.role_titles.join("، ")||"بدون نقش فعال"}</td><td className="p-3">{person.is_archived?"حذف‌شده":person.is_active?"فعال":"غیرفعال"}</td><td className="p-3 sm:sticky sm:left-0 sm:z-1" style={{background:"white"}}><div className="flex gap-2">{person.is_archived?<><button type="button" disabled={busy} aria-label={`بازیابی ${person.username}`} className="min-h-11 rounded-xl border px-3 text-primary" onClick={()=>{void ask("حساب با ورود غیرفعال بازیابی شود؟ فعال‌سازی دوباره از ویرایش کارمند انجام می‌شود.",{title:"بازیابی کارمند",confirmLabel:"بازیابی"}).then(ok=>{if(ok)void run(()=>appointmentApi.restoreAccessStaff(token,person.id),"کارمند بازیابی شد؛ ورود همچنان غیرفعال است");});}}>بازیابی</button><button type="button" disabled={busy} aria-label={`حذف دائمی ${person.username}`} className="min-h-11 rounded-xl border border-red-200 px-3 text-red-700" onClick={()=>{void ask("حساب و اطلاعات ورود برای همیشه حذف می‌شوند و قابل‌بازیابی نیستند. سوابق بیماران حفظ می‌شوند؛ مالکیت محتوای وابسته باید ابتدا تعیین شود.",{title:"حذف دائمی کارمند",confirmLabel:"حذف دائمی",requireText:person.username}).then(ok=>{if(ok)void run(()=>appointmentApi.purgeAccessStaff(token,person.id,person.username),"حساب کارمند برای همیشه حذف شد");});}}>حذف دائمی</button></>:<><button type="button" disabled={busy} aria-label={`ویرایش ${person.username}`} className="min-h-11 rounded-xl border px-3 text-primary" onClick={()=>{const form={username:person.username,full_name:person.full_name,password:"",is_active:person.is_active,role_ids:person.role_ids};setStaffId(person.id);setStaffForm(form);setBaseline(JSON.stringify(form));setEditor("staff");}}>ویرایش</button><button type="button" disabled={busy||person.id===currentId} aria-label={`حذف ${person.username}`} title={person.id===currentId?"حساب فعلی حذف نمی‌شود":"حذف قابل‌بازیابی و بستن ورود"} className="min-h-11 rounded-xl border border-red-200 px-3 text-red-700 disabled:opacity-40" onClick={()=>{void ask(`حساب «${person.full_name}» به حذف‌شده‌ها منتقل و ورود او بسته شود؟ سوابق محفوظ می‌مانند.`,{title:"حذف کارمند",confirmLabel:"حذف کارمند"}).then(ok=>{if(ok)void run(()=>appointmentApi.archiveAccessStaff(token,person.id),"کارمند حذف شد؛ سوابق محفوظ و ورود بسته است");});}}>حذف</button></>}</div></td></tr>)}{!staff.length&&<tr><td colSpan={4} className="p-6 text-center text-slate-600">{archived?"کارمند حذف‌شده‌ای وجود ندارد":"کارمندی در این فهرست نیست"}</td></tr>}</tbody></table></div>
                <p className="mt-3 text-xs leading-6 text-slate-600">حذف معمولی قابل‌بازیابی است. حذف دائمی فقط برای مدیرکل و از بخش حذف‌شده‌ها انجام می‌شود؛ حساب فعلی قابل حذف نیست.</p>
            </section>
            {editor==="staff"&&<StaffEditorDialog title={staffId?"ویرایش کارمند":"افزودن کارمند"} busy={busy} onClose={closeEditor}><form onSubmit={saveStaff} className="space-y-4 rounded-2xl border bg-white p-5">{error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}<fieldset disabled={busy} className="space-y-4"><h3 className="font-bold">{staffId ? "ویرایش کارمند" : "افزودن کارمند"}</h3>
                <label className="block text-sm">نام کاربری<input required disabled={!!staffId} pattern="[a-zA-Z0-9_.-]{3,80}" dir="ltr" autoComplete="off" className={`${input} mt-1`} value={staffForm.username} onChange={e => setStaffForm({ ...staffForm, username: e.target.value })} /></label>
                <label className="block text-sm">نام و نام خانوادگی<input required minLength={2} maxLength={120} className={`${input} mt-1`} value={staffForm.full_name} onChange={e => setStaffForm({ ...staffForm, full_name: e.target.value })} /></label>
                <label className="block text-sm">{staffId ? "رمز جدید (خالی یعنی حفظ رمز فعلی)" : "رمز عبور"}<input type="password" required={!staffId} minLength={12} maxLength={128} autoComplete="new-password" dir="ltr" className={`${input} mt-1`} value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} /></label>
                <fieldset className="rounded-xl border p-3"><legend className="px-2 text-sm font-bold">نقش‌های کارمند</legend>{roles.map(r => <label key={r.id} className="my-2 flex gap-2 text-sm"><input type="checkbox" disabled={!r.is_active && !staffForm.role_ids.includes(r.id)} checked={staffForm.role_ids.includes(r.id)} onChange={e => setStaffForm({ ...staffForm, role_ids: e.target.checked ? [...staffForm.role_ids, r.id] : staffForm.role_ids.filter(id => id !== r.id) })} />{r.name}{!r.is_active ? " (غیرفعال؛ برای ذخیره بردارید)" : ""}</label>)}</fieldset>
                <label className="flex gap-2 text-sm"><input type="checkbox" checked={staffForm.is_active} onChange={e => setStaffForm({ ...staffForm, is_active: e.target.checked })} />حساب فعال است</label>
                <button disabled={busy || !staffForm.role_ids.length} className={button}>ذخیره کارمند</button>
            </fieldset></form></StaffEditorDialog>}
        </div>
    </section>;
}
