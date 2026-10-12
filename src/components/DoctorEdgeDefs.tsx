// Feather only the transparency boundary. Interior RGB pixels remain the original photo.
const DoctorEdgeDefs = () => (
    <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }}>
        <defs>
            <filter id="doctor-edge-soft" x="-1%" y="-1%" width="102%" height="102%" colorInterpolationFilters="sRGB">
                <feMorphology in="SourceAlpha" operator="erode" radius="0.65" result="edge" />
                <feGaussianBlur in="edge" stdDeviation="0.35" result="soft-edge" />
                <feComposite in="SourceGraphic" in2="soft-edge" operator="in" />
            </filter>
        </defs>
    </svg>
);
export default DoctorEdgeDefs;
