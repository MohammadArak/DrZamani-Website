import { useState } from "react";

interface LazyIframeProps {
    src: string;
    title: string;
    className?: string;
    fallbackHref?: string;
}

const MapFrame = ({ src, title, className = "", fallbackHref }: LazyIframeProps) => {
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

    return (
        <div className={className} aria-busy={status === "loading"} style={{ position: "relative", overflow: "hidden", background: "#ffffff0d" }}>
            {status !== "ready" && (
                <div role="status" className="flex flex-col items-center justify-center gap-3 text-secondary" style={{ position: "absolute", inset: 0 }}>
                    {status === "loading" ? <><span aria-hidden="true" className="loader motion-reduce:animate-none" style={{ width: 32, height: 32 }} /><span>در حال بارگذاری نقشه…</span></> : <><span>نقشه بارگذاری نشد.</span>{fallbackHref && <a href={fallbackHref} target="_blank" rel="noopener noreferrer" className="underline">مشاهده آدرس روی نقشه</a>}</>}
                </div>
            )}
            <iframe
                title={title}
                src={src}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setStatus("ready")}
                onError={() => setStatus("error")}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, opacity: status === "ready" ? 1 : 0 }}
            />
        </div>
    );
};

// Reserve the footer's map area and reset the loading state when its URL changes.
const LazyIframe = (props: LazyIframeProps) => <MapFrame key={props.src} {...props} />;

export default LazyIframe;
