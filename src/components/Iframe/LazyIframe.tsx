interface LazyIframeProps {
    src: string;
    title: string;
    className?: string;
    fallbackHref?: string;
}

// The browser loads the map automatically as the footer approaches the viewport.
const LazyIframe = ({ src, title, className = "" }: LazyIframeProps) => (
    <iframe title={title} src={src} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" className={`border-0 ${className}`} />
);

export default LazyIframe;
