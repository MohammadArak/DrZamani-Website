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
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setFailed(true);
        }, timeout);

        return () => clearTimeout(timer);
    }, [src, timeout]);

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
