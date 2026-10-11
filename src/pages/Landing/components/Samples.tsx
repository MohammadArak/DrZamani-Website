import { useCarouselAutoplay } from "@/hooks/useCarouselAutoplay";
import { motion } from "@/components/Motion";
import { useSiteGallery } from "@/services/siteGalleryApi";

import { useState } from "react";
import { RiCameraAiLine } from "react-icons/ri";

import { useKeenSlider } from "keen-slider/react";
import { MdNavigateBefore, MdNavigateNext } from "react-icons/md";

function Carousel({ slides }: { slides: React.ReactNode[] }) {
    const autoplay = useCarouselAutoplay(slides.length);
    const [current, setCurrent] = useState(0);

    const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
        {
            loop: true,
            slideChanged(slider) {
                setCurrent(slider.track.details.rel);
            },
            slides: {
                perView: 1,
                spacing: 20,
            },
            breakpoints: {
                "(min-width: 768px)": {
                    slides: {
                        perView: 3,
                        spacing: 20,
                    },
                },
            },
        },
        [autoplay.plugin],
    );

    return (
        <div className="relative">
            <div
                role="region"
                aria-label="نمونه‌کارها"
                aria-roledescription="اسلایدر"
                tabIndex={0}
                onKeyDown={event => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "ArrowLeft") { event.preventDefault(); instanceRef.current?.next(); }
                    if (event.key === "ArrowRight") { event.preventDefault(); instanceRef.current?.prev(); }
                }}
                ref={sliderRef}
                className="keen-slider cursor-grab active:cursor-grabbing py-4"
            >
                {slides.map((slide, i) => (
                    <div
                        className="keen-slider__slide flex justify-center"
                        key={i}
                    >
                        {slide}
                    </div>
                ))}
            </div>
            {slides.length > 1 && (
                <div className="mt-4 flex justify-center">
                    <button type="button" onClick={autoplay.toggle} aria-pressed={autoplay.paused} className="rounded-lg border border-secondary px-4 py-2 text-primary-deep focus-visible:outline-2 focus-visible:outline-offset-4">
                        {autoplay.paused ? "ادامه نمایش خودکار" : "توقف نمایش خودکار"}
                    </button>
                </div>
            )}
            {/* pagination dots */}
            <div className="flex flex-wrap justify-center gap-1 mt-4">
                {slides.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => instanceRef.current?.moveToIdx(idx)}
                        aria-label={`نمایش تصویر ${idx + 1}`}
                        aria-current={current === idx ? "true" : undefined}
                        className={`h-6 shrink-0 rounded-full border-8 border-transparent bg-clip-padding transition-all duration-300 ${
                            current === idx
                                ? "w-10 bg-secondary-deep"
                                : "w-6 bg-gray-500"
                        }`}
                    />
                ))}
            </div>

            <button
                aria-label="تصویر قبلی"
                onClick={() => instanceRef.current?.prev()}
                className="absolute -left-4 top-1/2 -translate-y-1/2 p-2 bg-white border border-secondary-mild rounded-full text-secondary shadow hover:shadow-lg hover:scale-105 transition duration-150 ease-in-out"
            >
                <MdNavigateBefore size={32} />
            </button>

            <button
                aria-label="تصویر بعدی"
                onClick={() => instanceRef.current?.next()}
                className="absolute -right-4 top-1/2 -translate-y-1/2 p-2 bg-white border border-secondary-mild rounded-full text-secondary shadow hover:shadow-lg hover:scale-105 transition duration-150 ease-in-out"
            >
                <MdNavigateNext size={32} />
            </button>
        </div>
    );
}

const Samples = () => {
    const { items: gallery, loading, error, retry } = useSiteGallery();
    return (
        <section
            id="samples"
            style={{
                backgroundImage: `url(/img/samples/background.webp)`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
            }}
            className="relative pt-10 pb-12 md:pt-14 md:pb-15 px-5 md:px-10 flex flex-col items-center gap-12 z-20"
        >
            <div className="flex flex-col gap-4 items-center z-20">
                <motion.div
                    className="bg-linear-to-br from-secondary-mild to-secondary-subtle p-4 rounded-full shadow-2xl border border-secondary"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.4,
                    }}
                    viewport={{ once: true }}
                >
                    <RiCameraAiLine size={48} className="text-secondary" />
                </motion.div>
                <motion.h2
                    className="text-jetblack  font-dana text-5xl"
                    initial={{ opacity: 0, y: -40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.5,
                    }}
                    viewport={{ once: true }}
                >
                    نمونه کارها
                </motion.h2>
                <motion.p
                    className="text-2xl text-primary-mild font-dana font-bold"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.4,
                    }}
                    viewport={{ once: true }}
                >
                    تغییرات شگرف در چهره مراجعین ما
                </motion.p>
            </div>

            <motion.div
                className="w-full md:px-4"
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 1.5,
                    type: "spring",
                    bounce: 0.4,
                }}
                viewport={{ once: true }}
            >
                <p className="mb-4 text-center text-sm text-gray-600">
                    نتیجه‌ی درمان برای هر فرد متفاوت است و این تصاویر وعده‌ی نتیجه نیستند.
                </p>
                {!gallery.length && (
                    <p role="status" className="text-center text-gray-700">
                        {loading ? "در حال دریافت نمونه‌کارها…" : error ? "دریافت نمونه‌کارها ممکن نشد." : "هنوز نمونه‌کاری برای نمایش منتشر نشده است."}
                        {error && <button type="button" onClick={retry} className="mr-2 rounded border border-primary px-3 py-2 text-primary">تلاش مجدد</button>}
                    </p>
                )}
                {gallery.length > 0 && (
                    <Carousel
                        slides={gallery.map((image) => (
                            <img
                                key={image.id}
                                src={image.src}
                                alt={image.alt}
                                srcSet={/^\/media\/[a-f0-9]{32}\.webp$/.test(image.src) ? [320, 480, 640, 960].map(width => `${image.src}?w=${width} ${width}w`).join(", ") : undefined}
                                sizes="(min-width: 768px) 30vw, 90vw"
                                width={image.src.startsWith("/img/samples/") ? 614 : undefined}
                                height={image.src.startsWith("/img/samples/") ? 768 : undefined}
                                className="max-h-96 h-fit rounded-xl shadow-lg"
                                loading="lazy"
                                decoding="async"
                            />
                        ))}
                    />
                )}
            </motion.div>
        </section>
    );
};

export default Samples;
