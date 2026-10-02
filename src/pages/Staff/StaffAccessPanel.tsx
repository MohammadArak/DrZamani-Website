/* eslint-disable react-hooks/set-state-in-effect */
import { appointmentApi,type AccessPermission,type AccessRole,type StaffIdentity } from "@/services/appointmentApi";
import { useCallback,useEffect,useState,type FormEvent } from "react";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800";
const button = "rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-40";
const emptyRole = { name: "", description: "", is_active: true, permissions: [] as string[] };

export default function StaffAccessPanel({ token, currentId }: { token: string; currentId: number }) {
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
            const [r, s, p] = await Promise.all([appointmentApi.accessRoles(token), appointmentApi.accessStaff(token), appointmentApi.accessPermissions(token)]);
            setRoles(r); setStaff(s); setCatalog(p);
        } catch (e) { setError(e instanceof Error ? e.message : "دریافت دسترسی‌ها ناموفق بود"); }
    }, [token]);
    useEffect(() => { void load(); }, [load]);
    const run = async (action: () => Promise<unknown>, success: string) => {
        setBusy(true); setError(""); setMessage("");
        try { await action(); setMessage(success); await load(); }
        catch (e) { setError(e instanceof Error ? e.message : "ذخیره ناموفق بود"); }
        finally { setBusy(false); }
    };
    const selectRole = (role: AccessRole) => {
        setRoleId(role.id); setRoleForm({ name: role.name, description: role.description, is_active: role.is_active, permissions: role.permissions });
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
            setStaffForm(f => ({ ...f, password: "" }));
        }, staffId === currentId ? "حساب شما تغییر کرد؛ برای اعمال دسترسی، خارج شوید و دوباره وارد شوید." : "کارمند ذخیره شد؛ نشست‌های قبلی او باطل شدند.");
    };
    const protectedRole = roles.find(r => r.id === roleId)?.is_superadmin;
    const groups = [...new Set(catalog.map(p => p.group))];
    return <section className="space-y-6 text-slate-800" dir="rtl">
        <div><h2 className="font-dana text-3xl text-primary">نقش‌ها و کارکنان</h2><p className="mt-2 text-sm text-slate-500">هر حساب می‌تواند چند نقش داشته باشد؛ دسترسی‌های نقش‌های فعال با هم جمع می‌شوند. فقط مدیرکل این بخش را مدیریت می‌کند.</p></div>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-700">{message}</p>}
        <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
            <aside className="space-y-2 rounded-2xl border bg-white p-4"><h3 className="mb-3 font-bold">نقش‌ها</h3>
                <button type="button" disabled={busy} className={button} onClick={() => { setRoleId(null); setRoleForm(emptyRole); }}>نقش جدید</button>
                {roles.map(r => <button type="button" key={r.id} onClick={() => selectRole(r)} className={`block w-full rounded-xl p-3 text-right text-sm ${roleId === r.id ? "bg-secondary/15" : "bg-slate-50"}`}><b>{r.name}</b><span className="mt-1 block text-xs text-slate-500">{r.member_count} عضو · {r.is_active ? "فعال" : "غیرفعال"}{r.is_superadmin ? " · محافظت‌شده" : ""}</span></button>)}
            </aside>
            <form onSubmit={saveRole} className="space-y-4 rounded-2xl border bg-white p-5">
                <h3 className="font-bold">{roleId ? "ویرایش نقش" : "تعریف نقش جدید"}</h3>
                {protectedRole ? <p className="rounded-xl bg-amber-50 p-4 text-sm">مدیرکل تمام دسترسی‌ها را دارد. این نقش قابل تغییر، حذف یا غیرفعال‌سازی نیست. آخرین مدیرکل فعال نیز محافظت می‌شود.</p> : <>
                    <label className="block text-sm">نام نقش<input required minLength={2} maxLength={120} className={`${input} mt-1`} value={roleForm.name} onChange={e => setRoleForm({ ...roleForm, name: e.target.value })} /></label>
                    <label className="block text-sm">توضیح<textarea maxLength={500} className={`${input} mt-1`} value={roleForm.description} onChange={e => setRoleForm({ ...roleForm, description: e.target.value })} /></label>
                    <label className="flex gap-2 text-sm"><input type="checkbox" checked={roleForm.is_active} onChange={e => setRoleForm({ ...roleForm, is_active: e.target.checked })} />نقش فعال است</label>
                    <p className="text-xs text-slate-500">پیش‌نیاز هر مجوز خودکار انتخاب می‌شود. مجوزهای «مرحله آینده» اکنون ذخیره می‌شوند و با افزودن آن قابلیت به کار می‌روند. مجوزهای مدیرکل به نقش دیگر داده نمی‌شوند.</p>
                    <div className="grid gap-3 md:grid-cols-2">{groups.map(group => <fieldset key={group} className="rounded-xl border border-slate-100 p-3"><legend className="px-2 text-sm font-bold">{group}</legend>{catalog.filter(p => p.group === group).map(p => <label key={p.code} className={`my-2 flex items-start gap-2 text-xs ${p.owner_only ? "text-slate-400" : "text-slate-700"}`}><input type="checkbox" className="mt-0.5" disabled={p.owner_only || busy} checked={roleForm.permissions.includes(p.code)} onChange={e => togglePermission(p.code, e.target.checked)} /><span>{p.title}{p.future && <span className="mr-1 text-amber-700"> · مرحله آینده</span>}</span></label>)}</fieldset>)}</div>
                    <div className="flex flex-wrap gap-3"><button disabled={busy} className={button}>ذخیره نقش</button>{roleId && !roles.find(r => r.id === roleId)?.is_system && <button type="button" disabled={busy || !!roles.find(r => r.id === roleId)?.member_count} className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-40" onClick={() => { if (window.confirm("نقش بدون عضو حذف شود؟")) void run(async () => { await appointmentApi.deleteAccessRole(token, roleId); setRoleId(null); setRoleForm(emptyRole); }, "نقش حذف شد"); }}>حذف نقش بدون عضو</button>}</div>
                </>}
            </form>
        </div>
        <div className="grid gap-5 xl:grid-cols-[260px_1fr]">
            <aside className="space-y-2 rounded-2xl border bg-white p-4"><h3 className="mb-3 font-bold">کارکنان</h3><button type="button" disabled={busy} className={button} onClick={() => { setStaffId(null); setStaffForm({ username: "", full_name: "", password: "", is_active: true, role_ids: [] }); }}>کارمند جدید</button>{staff.map(s => <button type="button" key={s.id} onClick={() => { setStaffId(s.id); setStaffForm({ username: s.username, full_name: s.full_name, password: "", is_active: s.is_active, role_ids: s.role_ids }); }} className={`block w-full rounded-xl p-3 text-right text-sm ${staffId === s.id ? "bg-secondary/15" : "bg-slate-50"}`}><b>{s.full_name}{s.id === currentId ? " (شما)" : ""}</b><span className="mt-1 block text-xs text-slate-500">{s.role_titles.join("، ") || "بدون نقش فعال"} · {s.is_active ? "فعال" : "غیرفعال"}</span></button>)}</aside>
            <form onSubmit={saveStaff} className="space-y-4 rounded-2xl border bg-white p-5"><h3 className="font-bold">{staffId ? "ویرایش کارمند" : "افزودن کارمند"}</h3>
                <label className="block text-sm">نام کاربری<input required disabled={!!staffId} pattern="[a-zA-Z0-9_.-]{3,80}" dir="ltr" autoComplete="off" className={`${input} mt-1`} value={staffForm.username} onChange={e => setStaffForm({ ...staffForm, username: e.target.value })} /></label>
                <label className="block text-sm">نام و نام خانوادگی<input required minLength={2} maxLength={120} className={`${input} mt-1`} value={staffForm.full_name} onChange={e => setStaffForm({ ...staffForm, full_name: e.target.value })} /></label>
                <label className="block text-sm">{staffId ? "رمز جدید (خالی یعنی حفظ رمز فعلی)" : "رمز عبور"}<input type="password" required={!staffId} minLength={12} maxLength={128} autoComplete="new-password" dir="ltr" className={`${input} mt-1`} value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })} /></label>
                <fieldset className="rounded-xl border p-3"><legend className="px-2 text-sm font-bold">نقش‌های کارمند</legend>{roles.map(r => <label key={r.id} className="my-2 flex gap-2 text-sm"><input type="checkbox" disabled={!r.is_active && !staffForm.role_ids.includes(r.id)} checked={staffForm.role_ids.includes(r.id)} onChange={e => setStaffForm({ ...staffForm, role_ids: e.target.checked ? [...staffForm.role_ids, r.id] : staffForm.role_ids.filter(id => id !== r.id) })} />{r.name}{!r.is_active ? " (غیرفعال؛ برای ذخیره بردارید)" : ""}</label>)}</fieldset>
                <label className="flex gap-2 text-sm"><input type="checkbox" checked={staffForm.is_active} onChange={e => setStaffForm({ ...staffForm, is_active: e.target.checked })} />حساب فعال است</label>
                <button disabled={busy || !staffForm.role_ids.length} className={button}>ذخیره کارمند</button>
            </form>
        </div>
    </section>;
}
