export default function SectionHeading({ title, description }: { title: string; description?: string }) {
    return <div className="landing-section-heading"><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}
