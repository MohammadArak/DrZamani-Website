import type { ReactNode } from "react";
interface Props { img?: string; imageAlt?: string; name: string; age?: number; body: ReactNode; }
export default function PatientComment({ img, imageAlt, body, name, age }: Props) {
    return <figure className="landing-comment-card">{img ? <img src={img} alt={imageAlt || name} width="82" height="82" loading="lazy" decoding="async" /> : <div className="landing-comment-avatar" aria-label="بدون تصویر">{name.slice(0, 1)}</div>}<blockquote>{body}</blockquote><figcaption>{name}{age !== undefined && <small>{age.toLocaleString("fa-IR")} ساله</small>}</figcaption></figure>;
}
