import { type ReactNode } from "react";
import GlassCard from "./GlassCard";

interface Props {
    img?: string;
    imageAlt?: string;
    name: string;
    age?: number;
    body: ReactNode;
}

const PatientComment = ({ img, imageAlt, body, name, age }: Props) => {
    return (
        <GlassCard className="md:px-2 w-3/4 py-2">
            <div className="flex flex-col gap-12 justify-center items-center py-4 text-white">
                <div className="relative border-2 border-gray-500 outline-2 p-px outline-secondary rounded-full">
                    {img ? <img
                        className="h-32 w-32 rounded-full object-cover"
                        src={img}
                        alt={imageAlt || name}
                        width="128"
                        height="128"
                        loading="lazy"
                        decoding="async"
                    /> : <svg className="h-32 w-32 rounded-full bg-slate-600 p-7 text-slate-300" role="img" aria-label="بدون تصویر" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="20" r="12" stroke="currentColor" strokeWidth="3"/><path d="M8 58c0-16 10-24 24-24s24 8 24 24" stroke="currentColor" strokeWidth="3"/></svg>}
                    <div className="absolute inset-0 -z-10 rounded-full opacity-40 [background:radial-gradient(closest-side,var(--secondary),transparent)] scale-110 scale-100" />
                </div>
                <h6 className="text-wrap max-w-3/4 text-justify text-white whitespace-pre-line">{body}</h6>
                <div className="flex flex-col gap-1 justify-center items-center">
                    <span>{name}</span>
                    {age !== undefined && <span>{age.toString()} ساله</span>}
                </div>
            </div>
        </GlassCard>
    );
};

export default PatientComment;
