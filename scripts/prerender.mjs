import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(projectDirectory, "public_html");

const fallbackClinicSettings = Object.freeze({
    doctor_name: "دکتر فرزاد زمانی",
    specialty: "متخصص گوش، حلق و بینی",
    medical_council_number: "",
    office_phone: "08633146179",
    consultation_phone: "09217357728",
    email: "info@drfarzadzamani.ir",
    address_region: "استان مرکزی",
    address_city: "اراک",
    address:
        "اراک، خیابان خرم، ساختمان پزشکان نیکان، طبقه ششم، واحد B",
    working_hours: "روزهای کاری، با هماهنگی قبلی",
    site_url: "https://drfarzadzamani.ir",
    map_embed_url:
        "https://neshan.org/maps/iframe/places/QbrSKvPB4K9_/34.0784466/49.7015756",
    map_page_url: "https://neshan.org/maps/places/QbrSKvPB4K9_",
    map_latitude: 34.0784466,
    map_longitude: 49.7015756,
    instagram_url: "https://instagram.com/dr.farzad.zamani",
    eitaa_url: "https://eitaa.com/drfarzadzamani",
});

const clinicApiUrl =
    process.env.PRERENDER_CLINIC_API_URL?.trim() ||
    "http://127.0.0.1:8000/api/v1/clinic";
const clinicSettingsFile =
    process.env.PRERENDER_CLINIC_SETTINGS_FILE?.trim() || "";

const mergeClinicPayload = (payload) => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("clinic settings payload is invalid");
    }
    return { ...fallbackClinicSettings, ...payload };
};

const loadClinicSettings = async () => {
    if (clinicSettingsFile) {
        const settingsPath = resolve(projectDirectory, clinicSettingsFile);
        try {
            const payload = mergeClinicPayload(
                JSON.parse(await readFile(settingsPath, "utf8")),
            );
            console.log(`Loaded clinic information from ${settingsPath}`);
            return payload;
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            console.warn(
                `Clinic settings file was unavailable (${reason}); trying the public API.`,
            );
        }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
        const response = await fetch(clinicApiUrl, {
            headers: { accept: "application/json" },
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`Clinic API returned ${response.status}`);
        }
        const payload = mergeClinicPayload(await response.json());
        console.log(`Loaded clinic information from ${clinicApiUrl}`);
        return payload;
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(
            `Clinic information API was unavailable (${reason}); using safe defaults for prerendering.`,
        );
        return fallbackClinicSettings;
    } finally {
        clearTimeout(timeout);
    }
};

const textOrFallback = (value, fallback) =>
    typeof value === "string" && value.trim() ? value.trim() : fallback;

const normalizeSiteUrl = (value, fallback) => {
    const candidate = textOrFallback(value, fallback);
    try {
        const url = new URL(candidate);
        if (!["http:", "https:"].includes(url.protocol)) {
            throw new Error("unsupported protocol");
        }
        return url.href.replace(/\/$/, "");
    } catch {
        return fallback.replace(/\/$/, "");
    }
};

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
const toLatinDigits = (value) =>
    String(value ?? "")
        .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)));
const toPersianDigits = (value) =>
    toLatinDigits(value).replace(/\d/g, (digit) => persianDigits[Number(digit)]);

const phoneDetails = (rawValue) => {
    const normalized = toLatinDigits(rawValue).trim();
    const plusPrefixed = normalized.startsWith("+");
    const digits = normalized.replace(/\D/g, "");
    let value = plusPrefixed ? `+${digits}` : digits;

    if (!plusPrefixed && digits.startsWith("0098")) {
        value = `+98${digits.slice(4)}`;
    }

    let international = value;
    if (!international.startsWith("+")) {
        if (international.startsWith("0")) {
            international = `+98${international.slice(1)}`;
        } else if (international.startsWith("98")) {
            international = `+${international}`;
        } else if (international) {
            international = `+${international}`;
        }
    }

    return {
        value,
        display: toPersianDigits(value),
        international,
    };
};

const rawClinicSettings = await loadClinicSettings();
const siteUrl = normalizeSiteUrl(
    rawClinicSettings.site_url,
    fallbackClinicSettings.site_url,
);
const clinic = {
    doctorName: textOrFallback(
        rawClinicSettings.doctor_name,
        fallbackClinicSettings.doctor_name,
    ),
    specialty: textOrFallback(
        rawClinicSettings.specialty,
        fallbackClinicSettings.specialty,
    ),
    medicalCouncilNumber: textOrFallback(
        rawClinicSettings.medical_council_number,
        fallbackClinicSettings.medical_council_number,
    ),
    officePhone: phoneDetails(
        textOrFallback(
            rawClinicSettings.office_phone,
            fallbackClinicSettings.office_phone,
        ),
    ),
    consultationPhone: phoneDetails(
        textOrFallback(
            rawClinicSettings.consultation_phone,
            fallbackClinicSettings.consultation_phone,
        ),
    ),
    email: textOrFallback(
        rawClinicSettings.email,
        fallbackClinicSettings.email,
    ),
    addressRegion: textOrFallback(
        rawClinicSettings.address_region,
        fallbackClinicSettings.address_region,
    ),
    addressCity: textOrFallback(
        rawClinicSettings.address_city,
        fallbackClinicSettings.address_city,
    ),
    address: textOrFallback(
        rawClinicSettings.address,
        fallbackClinicSettings.address,
    ),
    workingHours: textOrFallback(
        rawClinicSettings.working_hours,
        fallbackClinicSettings.working_hours,
    ),
    siteUrl,
    mapEmbedUrl: textOrFallback(rawClinicSettings.map_embed_url, ""),
    mapPageUrl: textOrFallback(rawClinicSettings.map_page_url, ""),
    latitude: Number.isFinite(Number(rawClinicSettings.map_latitude))
        ? Number(rawClinicSettings.map_latitude)
        : fallbackClinicSettings.map_latitude,
    longitude: Number.isFinite(Number(rawClinicSettings.map_longitude))
        ? Number(rawClinicSettings.map_longitude)
        : fallbackClinicSettings.map_longitude,
    instagramUrl: textOrFallback(rawClinicSettings.instagram_url, ""),
    eitaaUrl: textOrFallback(rawClinicSettings.eitaa_url, ""),
};

// Existing articles are intentionally unpublished until clinical review is complete.
const articles = [];

const template = await readFile(resolve(outputDirectory, "index.html"), "utf8");

const escapeHtml = (value = "") =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const setTitle = (html, title) =>
    html.replace(
        /<title\b[^>]*>[\s\S]*?<\/title>/i,
        `<title data-rh="true">${escapeHtml(title)}</title>`,
    );

const setMeta = (html, attribute, key, content) => {
    const expression = new RegExp(
        `<meta(?=[^>]*\\b${attribute}=["']${escapeRegex(key)}["'])[^>]*>`,
        "i",
    );
    const tag = `<meta data-rh="true" ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;

    return expression.test(html)
        ? html.replace(expression, tag)
        : html.replace("</head>", `    ${tag}\n    </head>`);
};

const setCanonical = (html, canonical) => {
    const expression =
        /<link(?=[^>]*\brel=["']canonical["'])[^>]*>/i;
    const tag = `<link data-rh="true" rel="canonical" href="${escapeHtml(canonical)}" />`;

    return expression.test(html)
        ? html.replace(expression, tag)
        : html.replace("</head>", `    ${tag}\n    </head>`);
};

const setImagePreloads = (html, images = []) => {
    const withoutInheritedImagePreloads = html.replace(
        /\s*<link(?=[^>]*\brel=["']preload["'])(?=[^>]*\bas=["']image["'])[^>]*>\s*/gi,
        "\n",
    );
    const tags = images
        .map(
            ({ href, type }) =>
                `    <link rel="preload" as="image" href="${escapeHtml(href)}" type="${escapeHtml(type)}" fetchpriority="high" />`,
        )
        .join("\n");

    return tags
        ? withoutInheritedImagePreloads.replace(
              "</head>",
              `${tags}\n    </head>`,
          )
        : withoutInheritedImagePreloads;
};

const setJsonLd = (html, schema) => {
    const json = JSON.stringify(schema).replaceAll("<", "\\u003c");
    return html.replace(
        "</head>",
        `    <script data-rh="true" type="application/ld+json">${json}</script>\n    </head>`,
    );
};

const setRootContent = (html, content) =>
    html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);

const renderParagraphs = (paragraphs = []) =>
    paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");

const renderArticleBody = (article) => {
    const categories = [...new Set(articles.map((item) => item.category))];
    const latestArticles = articles
        .filter((item) => item.slug !== article.slug)
        .slice(0, 4);

    return `
        <header dir="rtl" lang="fa">
            <img
                src="/img/blog/article-header-surgeon.webp"
                alt="${escapeHtml(`${clinic.doctorName} در اتاق عمل`)}"
                width="2048"
                height="706"
                loading="eager"
                fetchpriority="high"
            />
        </header>
        <main dir="rtl" lang="fa" class="bg-[#f5f7fd] px-4 py-12 text-gray-800">
            <div class="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
                <article class="rounded-3xl bg-white p-6 md:p-12">
                    <nav aria-label="مسیر صفحه">
                        <a href="/">صفحه اصلی</a> /
                        <a href="/articles/">مقالات</a> /
                        <span>${escapeHtml(article.title)}</span>
                    </nav>
                    <header class="py-8">
                        <p>${escapeHtml(article.category)} · ${escapeHtml(article.persianDate)} · ${escapeHtml(article.readingTime)}</p>
                        <h1 class="font-dana text-3xl text-primary md:text-5xl">${escapeHtml(article.title)}</h1>
                        <p>${escapeHtml(article.description)}</p>
                    </header>
                    <img
                        src="${escapeHtml(article.image)}"
                        alt="${escapeHtml(article.imageAlt)}"
                        width="1280"
                        height="800"
                        loading="eager"
                    />
                    <nav aria-label="فهرست مطالب">
                        <h2>در این مقاله می‌خوانید</h2>
                        <ol>
                            ${article.sections
                                .map(
                                    (section) =>
                                        `<li><a href="#${escapeHtml(section.id)}">${escapeHtml(section.heading)}</a></li>`,
                                )
                                .join("")}
                        </ol>
                    </nav>
                    <div class="space-y-6 py-10 leading-9">
                        ${renderParagraphs(article.intro)}
                        ${article.sections
                            .map(
                                (section) => `
                                    <section id="${escapeHtml(section.id)}">
                                        <h2>${escapeHtml(section.heading)}</h2>
                                        ${renderParagraphs(section.paragraphs)}
                                        ${
                                            section.bullets
                                                ? `<ul>${section.bullets
                                                      .map(
                                                          (item) =>
                                                              `<li>${escapeHtml(item)}</li>`,
                                                      )
                                                      .join("")}</ul>`
                                                : ""
                                        }
                                    </section>
                                `,
                            )
                            .join("")}
                        <aside>
                            این مطلب برای آموزش عمومی است و جایگزین معاینه، تشخیص یا دستور پزشک شما نیست.
                        </aside>
                        <section>
                            <h2>پرسش‌های رایج</h2>
                            ${article.faqs
                                .map(
                                    (faq) => `
                                        <h3>${escapeHtml(faq.question)}</h3>
                                        <p>${escapeHtml(faq.answer)}</p>
                                    `,
                                )
                                .join("")}
                        </section>
                        <section>
                            <h2>منابع علمی</h2>
                            <ol>
                                ${article.sources
                                    .map(
                                        (source) => `
                                            <li>
                                                <a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a>
                                                — ${escapeHtml(source.publisher)} (${escapeHtml(source.year)})
                                            </li>
                                        `,
                                    )
                                    .join("")}
                            </ol>
                        </section>
                    </div>
                </article>
                <aside aria-label="ابزارهای مقالات">
                    <section>
                        <h2>جست‌وجو</h2>
                        <form action="/articles/" method="get">
                            <label for="article-search-static">جست‌وجو در مقالات</label>
                            <input id="article-search-static" name="q" type="search" />
                            <button type="submit">جست‌وجو</button>
                        </form>
                    </section>
                    <section>
                        <h2>دسته‌بندی</h2>
                        <ul>
                            ${categories
                                .map(
                                    (category) =>
                                        `<li><a href="/articles/?category=${encodeURIComponent(category)}">${escapeHtml(category)}</a></li>`,
                                )
                                .join("")}
                        </ul>
                    </section>
                    <section>
                        <h2>آخرین مطالب</h2>
                        <ul>
                            ${latestArticles
                                .map(
                                    (item) => `
                                        <li>
                                            <a href="/articles/${escapeHtml(item.slug)}/">
                                                <img src="${escapeHtml(item.image)}" alt="" width="128" height="80" loading="lazy" />
                                                <span>${escapeHtml(item.title)}</span>
                                            </a>
                                        </li>
                                    `,
                                )
                                .join("")}
                        </ul>
                    </section>
                </aside>
            </div>
        </main>
    `;
};

const renderArticleSchema = (article) => [
    {
        "@context": "https://schema.org",
        "@type": ["Article", "MedicalWebPage"],
        headline: article.title,
        description: article.description,
        image: `${siteUrl}${article.image}`,
        datePublished: article.publishedAt,
        dateModified: article.modifiedAt,
        inLanguage: "fa-IR",
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${siteUrl}/articles/${article.slug}/`,
        },
        author: {
            "@type": "Organization",
            name: `وب‌سایت ${clinic.doctorName}`,
            url: `${siteUrl}/`,
        },
        publisher: {
            "@type": "Organization",
            name: clinic.doctorName,
            url: `${siteUrl}/`,
        },
        citation: article.sources.map((source) => source.url),
        keywords: article.keywords.join(", "),
    },
    {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: article.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
        })),
    },
];

const prepareDocument = ({
    title,
    description,
    canonical,
    image,
    type,
    body,
    schema,
    preloadImages = [],
    robots = "index, follow, max-image-preview:large",
}) => {
    let html = setImagePreloads(template, preloadImages);
    html = setTitle(html, title);
    html = setMeta(html, "name", "description", description);
    html = setMeta(
        html,
        "name",
        "robots",
        robots,
    );
    html = setMeta(html, "property", "og:title", title);
    html = setMeta(html, "property", "og:description", description);
    html = setMeta(html, "property", "og:url", canonical);
    html = setMeta(html, "property", "og:type", type);
    html = setMeta(html, "property", "og:image", image);
    html = setMeta(html, "name", "twitter:card", "summary_large_image");
    html = setMeta(html, "name", "twitter:title", title);
    html = setMeta(html, "name", "twitter:description", description);
    html = setMeta(html, "name", "twitter:image", image);
    html = setCanonical(html, canonical);
    html = setJsonLd(html, schema);
    return setRootContent(html, body);
};

const homeTitle = textOrFallback(rawClinicSettings.seo_title, `${clinic.doctorName} | ${clinic.specialty}`);
const homeDescription = textOrFallback(rawClinicSettings.seo_description, `وب‌سایت رسمی ${clinic.doctorName}، ${clinic.specialty} در ${clinic.addressCity}؛ معرفی خدمات و راه‌های ارتباطی.`);
const homeImage = textOrFallback(rawClinicSettings.seo_image_url, `${siteUrl}/og-cover.jpg`);
const clinicSameAs = [clinic.instagramUrl, clinic.eitaaUrl].filter(Boolean);

const homeBody = `
    <main dir="rtl" lang="fa" class="bg-[#f5f7fd] px-4 py-12 text-gray-800">
        <section class="mx-auto max-w-5xl rounded-3xl bg-white p-6 md:p-12">
            <img
                src="/img/logo/logo-dark-full.webp"
                alt="${escapeHtml(clinic.doctorName)}"
                width="560"
                height="175"
            />
            <h1>${escapeHtml(clinic.doctorName)}؛ ${escapeHtml(clinic.specialty)} در ${escapeHtml(clinic.addressCity)}</h1>
            <p>
                معرفی خدمات، نمونه‌کارها، راه‌های ارتباطی و رزرو اینترنتی نوبت.
            </p>
            <p>
                <a href="tel:${escapeHtml(clinic.officePhone.international)}">تماس مطب: ${escapeHtml(clinic.officePhone.display)}</a>
                ·
                <a href="tel:${escapeHtml(clinic.consultationPhone.international)}">شماره مشاوره: ${escapeHtml(clinic.consultationPhone.display)}</a>
            </p>
            <p>ساعات کاری: ${escapeHtml(clinic.workingHours)}</p>
            <address>${escapeHtml(clinic.address)}</address>
        </section>
    </main>
`;

const homeDocument = prepareDocument({
    title: homeTitle,
    description: homeDescription,
    canonical: `${siteUrl}/`,
    image: homeImage,
    type: "website",
    body: homeBody,
    preloadImages: [
        {
            href: "/img/zamani/dr-zamani-hero.webp",
            type: "image/webp",
        },
        {
            href: "/img/zamani/shoar.png",
            type: "image/png",
        },
    ],
    schema: [
        {
            "@context": "https://schema.org",
            "@type": ["Physician", "MedicalClinic"],
            name: clinic.doctorName,
            url: `${siteUrl}/`,
            image: homeImage,
            telephone: [
                clinic.officePhone.international,
                clinic.consultationPhone.international,
            ].filter(Boolean),
            email: clinic.email,
            medicalSpecialty: clinic.specialty,
            ...(clinic.medicalCouncilNumber
                ? {
                      identifier: {
                          "@type": "PropertyValue",
                          propertyID: "شماره نظام پزشکی",
                          value: clinic.medicalCouncilNumber,
                      },
                  }
                : {}),
            address: {
                "@type": "PostalAddress",
                addressLocality: clinic.addressCity,
                addressRegion: clinic.addressRegion,
                addressCountry: "IR",
                streetAddress: clinic.address,
            },
            geo: {
                "@type": "GeoCoordinates",
                latitude: clinic.latitude,
                longitude: clinic.longitude,
            },
            ...(clinicSameAs.length ? { sameAs: clinicSameAs } : {}),
        },
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: `وب‌سایت ${clinic.doctorName}`,
            url: `${siteUrl}/`,
            inLanguage: "fa-IR",
        },
    ],
});

await Promise.all([
    mkdir(resolve(outputDirectory, "appointment"), { recursive: true }),
    mkdir(resolve(outputDirectory, "staff"), { recursive: true }),
]);

for (const article of articles) {
    const canonical = `${siteUrl}/articles/${article.slug}/`;
    const articleDocument = prepareDocument({
        title: article.metaTitle,
        description: article.description,
        canonical,
        image: `${siteUrl}${article.image}`,
        type: "article",
        body: renderArticleBody(article),
        schema: renderArticleSchema(article),
        preloadImages: [
            {
                href: "/img/blog/article-header-surgeon.webp",
                type: "image/webp",
            },
        ],
    });
    const destination = resolve(
        outputDirectory,
        `articles/${article.slug}/index.html`,
    );

    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, articleDocument, "utf8");
}

const notFoundDocument = prepareDocument({
    title: `صفحه پیدا نشد | ${clinic.doctorName}`,
    description: `صفحه‌ای که به دنبال آن بودید پیدا نشد. از صفحه اصلی وب‌سایت ${clinic.doctorName} استفاده کنید.`,
    canonical: `${siteUrl}/404.html`,
    image: `${siteUrl}/og-cover.jpg`,
    type: "website",
    robots: "noindex, follow",
    body: `
        <main dir="rtl" lang="fa" class="bg-[#f5f7fd] px-4 py-20 text-center text-gray-800">
            <section class="mx-auto max-w-xl rounded-3xl bg-white p-8">
                <h1>صفحه پیدا نشد</h1>
                <p>آدرس واردشده وجود ندارد یا جابه‌جا شده است.</p>
                <p>
                    <a href="/">بازگشت به صفحه اصلی</a>
                </p>
            </section>
        </main>
    `,
    schema: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "صفحه پیدا نشد",
        url: `${siteUrl}/404.html`,
    },
});

const appointmentDocument = prepareDocument({
    title: `سامانه نوبت‌دهی مطب ${clinic.doctorName}`,
    description: `ورود امن با شماره موبایل و انتخاب خدمت، تاریخ و ساعت مراجعه به مطب ${clinic.doctorName}.`,
    canonical: `${siteUrl}/appointment/`,
    image: `${siteUrl}/og-cover.jpg`,
    type: "website",
    robots: "noindex, follow",
    body: `
        <main dir="rtl" lang="fa" class="bg-[#f5f7fd] px-4 py-20 text-center text-gray-800">
            <section class="mx-auto max-w-xl rounded-3xl bg-white p-8">
                <img src="/img/logo/logo-dark-full.webp" alt="${escapeHtml(clinic.doctorName)}" width="560" height="175" />
                <h1>سامانه نوبت‌دهی مطب ${escapeHtml(clinic.doctorName)}</h1>
                <p>برای ورود یا ثبت‌نام، شماره موبایل خود را وارد و کد یک‌بارمصرف را تأیید کنید.</p>
            </section>
        </main>
    `,
    schema: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `سامانه نوبت‌دهی مطب ${clinic.doctorName}`,
        url: `${siteUrl}/appointment/`,
        inLanguage: "fa-IR",
    },
});

const staffDocument = prepareDocument({
    title: `پنل مدیریت نوبت‌ها | ${clinic.doctorName}`,
    description: `پنل داخلی کارکنان مطب ${clinic.doctorName}.`,
    canonical: `${siteUrl}/staff/`,
    image: `${siteUrl}/og-cover.jpg`,
    type: "website",
    robots: "noindex, nofollow",
    body: `
        <main dir="rtl" lang="fa" class="bg-[#f5f7fd] px-4 py-20 text-center text-gray-800">
            <section class="mx-auto max-w-lg rounded-3xl bg-white p-8">
                <h1>پنل مدیریت نوبت‌های مطب</h1>
                <p>این بخش فقط برای کارکنان مجاز مطب در دسترس است.</p>
            </section>
        </main>
    `,
    schema: {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: `پنل مدیریت نوبت‌های مطب ${clinic.doctorName}`,
        url: `${siteUrl}/staff/`,
    },
});

const latestModifiedAt = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${siteUrl}/</loc>
        <lastmod>${latestModifiedAt}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>
`;
const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
Host: ${new URL(siteUrl).hostname}
`;

await Promise.all([
    writeFile(resolve(outputDirectory, "index.html"), homeDocument, "utf8"),
    writeFile(resolve(outputDirectory, "404.html"), notFoundDocument, "utf8"),
    writeFile(
        resolve(outputDirectory, "appointment/index.html"),
        appointmentDocument,
        "utf8",
    ),
    writeFile(
        resolve(outputDirectory, "staff/index.html"),
        staffDocument,
        "utf8",
    ),
    writeFile(resolve(outputDirectory, "sitemap.xml"), sitemap, "utf8"),
    writeFile(resolve(outputDirectory, "robots.txt"), robots, "utf8"),
]);

console.log(
    "Prerendered homepage, appointment, staff and 404. Articles remain retired pending review.",
);
