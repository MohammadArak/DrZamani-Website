import SpaceSignBoard from "@/assets/svg/SpaceSignBoard";
import { useEffect, useState } from "react";

interface LazyIframeProps {
    src: string;
    title: string;
    className?: string;
    timeout?: number;
    fallbackHref?: string;
}

const LazyIframe = ({
    src,
    title,
    className = "",
    timeout = 5000,
    fallbackHref = "",
}: LazyIframeProps) => {
    const [active, setActive] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!active) return;
        const timer = setTimeout(() => {
            setFailed(true);
        }, timeout);

        return () => clearTimeout(timer);
    }, [active, src, timeout]);

    // The third-party map (cookies, tracking, ~1 MB) only loads when the visitor asks for it.
    if (!active) {
        return (
            <div className={`relative overflow-hidden ${className}`}>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/5 text-center">
                    <button
                        type="button"
                        onClick={() => setActive(true)}
                        className="rounded-xl bg-secondary px-5 py-2 text-sm font-bold text-white hover:bg-secondary-deep"
                    >
                        نمایش نقشه
                    </button>
                    {fallbackHref && (
                        <a href={fallbackHref} target="_blank" rel="noreferrer noopener" className="text-sm text-secondary underline">
                            مشاهده آدرس روی نقشه
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {!loaded && !failed && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent" />
                        <span className="text-sm text-gray-500">
                            در حال بارگذاری...
                        </span>
                    </div>
                </div>
            )}

            {failed && !loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                    <div className="flex flex-col items-center gap-3">
                        <SpaceSignBoard />
                        <span className="text-sm text-gray-500">
                            نقشه بارگذاری نشد
                        </span>
                        {fallbackHref && (
                            <a
                                href={fallbackHref}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-primary underline"
                            >
                                مشاهده آدرس روی نقشه
                            </a>
                        )}
                    </div>
                </div>
            )}

            <iframe
                title={title}
                src={src}
                loading="lazy"
                onLoad={() => {
                    setLoaded(true);
                    setFailed(false);
                }}
                referrerPolicy="strict-origin-when-cross-origin"
                className={`h-full w-full border-0 transition-opacity duration-300 ${
                    loaded ? "opacity-100" : "opacity-0"
                }`}
            />
        </div>
    );
};

export default LazyIframe;
