import { Helmet } from "react-helmet-async";
import { useClinicInfo } from "@/contexts/ClinicInfoContext";

interface SeoProps {
    title: string;
    description: string;
    canonical: string;
    image?: string;
    imageAlt?: string;
    keywords?: string[];
    noIndex?: boolean;
    type?: "website" | "article";
    publishedTime?: string;
    modifiedTime?: string;
    schema?: Record<string, unknown> | Record<string, unknown>[];
}

const Seo = ({
    title,
    description,
    canonical,
    image,
    imageAlt,
    keywords,
    noIndex = false,
    type = "website",
    publishedTime,
    modifiedTime,
    schema,
}: SeoProps) => {
    const { clinicInfo } = useClinicInfo();
    const siteRoot = `${clinicInfo.siteUrl.replace(/\/$/, "")}/`;
    const physicianId = `${siteRoot}#physician`;
    const clinicId = `${siteRoot}#clinic`;
    const websiteId = `${siteRoot}#website`;
    const resolvedImage =
        image ?? `${siteRoot}img/zamani/dr-zamani-hero.webp`;
    const resolvedImageAlt =
        imageAlt ?? `${clinicInfo.doctorName}، ${clinicInfo.specialty}`;
    const resolvedKeywords =
        keywords ?? [
            "متخصص گوش و حلق و بینی",
            "جراحی بینی",
            "رینوپلاستی",
            clinicInfo.doctorName,
        ];
    const socialProfiles = [
        clinicInfo.social.instagram,
        clinicInfo.social.eitaa,
    ].filter(Boolean);
    const telephone = [
        clinicInfo.phones.office.international,
        clinicInfo.phones.consultation.international,
    ].filter(Boolean);

    const defaultSchema = [
        {
            "@context": "https://schema.org",
            "@type": "Person",
            "@id": physicianId,
            name: clinicInfo.doctorName,
            jobTitle: clinicInfo.specialty,
            url: siteRoot,
            image: {
                "@type": "ImageObject",
                url: resolvedImage,
                caption: resolvedImageAlt,
            },
            worksFor: { "@id": clinicId },
            ...(clinicInfo.medicalCouncilNumber
                ? { identifier: clinicInfo.medicalCouncilNumber }
                : {}),
            ...(socialProfiles.length ? { sameAs: socialProfiles } : {}),
        },
        {
            "@context": "https://schema.org",
            "@type": "MedicalClinic",
            "@id": clinicId,
            name: `مطب ${clinicInfo.doctorName}`,
            url: siteRoot,
            image: resolvedImage,
            email: clinicInfo.email,
            medicalSpecialty: "Otolaryngology",
            address: {
                "@type": "PostalAddress",
                addressCountry: clinicInfo.address.country,
                addressRegion: clinicInfo.address.region,
                addressLocality: clinicInfo.address.city,
                streetAddress: clinicInfo.address.street,
            },
            telephone,
            geo: {
                "@type": "GeoCoordinates",
                latitude: clinicInfo.mapCoordinates.latitude,
                longitude: clinicInfo.mapCoordinates.longitude,
            },
            employee: { "@id": physicianId },
        },
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": websiteId,
            name: `وب‌سایت ${clinicInfo.doctorName}`,
            url: siteRoot,
            inLanguage: "fa-IR",
        },
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: title,
            primaryImageOfPage: {
                "@type": "ImageObject",
                url: resolvedImage,
            },
            about: { "@id": physicianId },
        },
    ];

    return (
        <Helmet>
            <title>{title}</title>

            <meta name="description" content={description} />

            <meta
                name="robots"
                content={
                    noIndex
                        ? "noindex, follow"
                        : "index, follow, max-image-preview:large"
                }
            />

            <link rel="canonical" href={canonical} />

            <meta name="keywords" content={resolvedKeywords.join(", ")} />

            <meta property="og:type" content={type} />

            <meta property="og:locale" content="fa_IR" />

            <meta property="og:site_name" content={clinicInfo.doctorName} />

            <meta property="og:title" content={title} />

            <meta property="og:description" content={description} />

            <meta property="og:url" content={canonical} />

            <meta property="og:image" content={resolvedImage} />

            <meta property="og:image:alt" content={resolvedImageAlt} />

            {publishedTime && (
                <meta
                    property="article:published_time"
                    content={publishedTime}
                />
            )}

            {modifiedTime && (
                <meta
                    property="article:modified_time"
                    content={modifiedTime}
                />
            )}

            <meta name="twitter:card" content="summary_large_image" />

            <meta name="twitter:title" content={title} />

            <meta name="twitter:description" content={description} />

            <meta name="twitter:image" content={resolvedImage} />

            <meta name="twitter:image:alt" content={resolvedImageAlt} />

            <meta name="theme-color" content="#293241" />

            <script type="application/ld+json">
                {JSON.stringify(schema ?? defaultSchema)}
            </script>

            <meta name="apple-mobile-web-app-capable" content="yes" />

            <meta
                name="apple-mobile-web-app-status-bar-style"
                content="default"
            />
        </Helmet>
    );
};

export default Seo;
