import { useState } from "react";
import Dialog from "@/components/Dialog";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";
import SectionHeading from "./SectionHeading";

export default function Samples() {
    const { clinicInfo } = useClinicInfo();
    const [selected, setSelected] = useState<number | null>(null);
    return <section id="samples" className="landing-section landing-gallery"><div className="landing-container">
        <SectionHeading title="نمونه‌کارها" description="برای دیدن تصویر بزرگ‌تر، یک نمونه را انتخاب کنید." />
        <div className="landing-gallery-track" role="region" aria-label="گالری نمونه‌کارها" tabIndex={0}>{Array.from({ length: 16 }, (_, i) => i + 1).map(number => <button key={number} className="landing-gallery-item" onClick={() => setSelected(number)} aria-label={`نمایش نمونه‌کار ${number}`}><img src={`/img/samples/${number}.jpg`} alt={`نمونه‌کار ${number} ${clinicInfo.doctorName}`} loading="lazy" decoding="async" width="400" height="480" /><span>نمونه‌کار {number.toLocaleString("fa-IR")} <span aria-hidden="true">↗</span></span></button>)}</div>
        <p className="landing-gallery-hint">برای دیدن نمونه‌های دیگر، گالری را به طرفین حرکت دهید.</p>
        <Dialog isOpen={selected !== null} onClose={() => setSelected(null)} onRequestClose={() => setSelected(null)} contentLabel="نمایش نمونه‌کار" width={800}>{selected !== null && <img className="landing-gallery-large" src={`/img/samples/${selected}.jpg`} alt={`نمونه‌کار ${selected} ${clinicInfo.doctorName}`} />}</Dialog>
    </div></section>;
}
