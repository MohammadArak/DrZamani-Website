import {
    toPersianDigits
} from "@/services/appointmentApi";

export const StatCard = ({
    label,
    value,
    icon,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
}) => (
    <div className="group rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_45px_rgba(24,48,79,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_55px_rgba(24,48,79,0.09)]">
        <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/15 text-xl text-secondary-deep transition group-hover:scale-105">
                {icon}
            </span>
        </div>
        <strong className="mt-4 block font-dana text-3xl text-primary">
            {toPersianDigits(value)}
        </strong>
    </div>
);

export const MiniBarChart = ({
    title,
    points,
}: {
    title: string;
    points: Array<{ label: string; value: number }>;
}) => {
    const max = Math.max(1, ...points.map((point) => point.value));
    const bars = (items: Array<{ label: string; value: number }>, compact = false) =>
        items.map((point) => (
            <div
                key={point.label}
                className={`group flex min-w-0 flex-col items-center justify-end gap-2 ${compact ? "" : "sm:min-w-10 sm:flex-1"}`}
            >
                <span className="text-[10px] text-slate-400 opacity-0 transition group-hover:opacity-100">
                    {toPersianDigits(point.value)}
                </span>
                <div
                    className="w-full max-w-10 rounded-t-xl bg-linear-to-t from-primary to-secondary transition duration-300 group-hover:brightness-110"
                    style={{
                        height: `${Math.max(point.value ? 12 : 3, (point.value / max) * 145)}px`,
                    }}
                    title={`${point.label}: ${point.value}`}
                />
                <span className="w-full truncate text-center text-[10px] text-slate-500">
                    {point.label}
                </span>
            </div>
        ));
    return (
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex min-w-0 items-center justify-between gap-3">
                <h2 className="font-dana text-lg text-primary">{title}</h2>
                <span className="shrink-0 text-xs text-slate-400">تعداد نوبت</span>
            </div>
            <div
                className="mt-6 grid h-48 min-w-0 items-end gap-2 pb-1 sm:hidden"
                style={{ gridTemplateColumns: `repeat(${Math.min(points.length, 7)}, minmax(0, 1fr))` }}
            >
                {bars(points.slice(-7), true)}
            </div>
            <div className="mt-6 hidden h-48 min-w-0 items-end gap-2 overflow-x-auto pb-1 sm:flex">
                {bars(points)}
            </div>
        </div>
    );
};

