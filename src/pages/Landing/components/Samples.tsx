import { motion } from "@/components/Motion";
import { useSiteGallery } from "@/services/siteGalleryApi";

import { useState } from "react";
import { RiCameraAiLine } from "react-icons/ri";

import { useKeenSlider } from "keen-slider/react";
import { MdNavigateBefore, MdNavigateNext } from "react-icons/md";

function Carousel({ slides }: { slides: React.ReactNode[] }) {
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
        [
            (slider) => {
                let timeout: ReturnType<typeof setTimeout>;
                let mouseOver = false;

                function clearNextTimeout() {
                    clearTimeout(timeout);
                }

                function nextTimeout() {
                    clearTimeout(timeout);
                    if (mouseOver) return;
                    timeout = setTimeout(() => {
                        slider.next();
                    }, 3000);
                }

                slider.on("created", () => {
                    slider.container.addEventListener("mouseover", () => {
                        mouseOver = true;
                        clearNextTimeout();
                    });

                    slider.container.addEventListener("mouseout", () => {
                        mouseOver = false;
                        nextTimeout();
                    });

                    nextTimeout();
                });

                slider.on("dragStarted", clearNextTimeout);
                slider.on("animationEnded", nextTimeout);
                slider.on("updated", nextTimeout);
            },
        ],
    );

    return (
        <div className="relative">
            <div
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
            {/* pagination dots */}
            <div className="flex justify-center gap-2 mt-4">
                {slides.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => instanceRef.current?.moveToIdx(idx)}
                        aria-label={`نمایش تصویر ${idx + 1}`}
                        aria-current={current === idx ? "true" : undefined}
                        className={`h-2 rounded-full transition-all duration-300 ${
                            current === idx
                                ? "w-6 bg-secondary"
                                : "w-2 bg-gray-400/50"
                        }`}
                    />
                ))}
            </div>

            <button
                onClick={() => instanceRef.current?.prev()}
                className="absolute -left-4 top-1/2 -translate-y-1/2 p-2 bg-white border border-secondary-mild rounded-full text-secondary shadow hover:shadow-lg hover:scale-105 transition duration-150 ease-in-out"
            >
                <MdNavigateBefore size={32} />
            </button>

            <button
                onClick={() => instanceRef.current?.next()}
                className="absolute -right-4 top-1/2 -translate-y-1/2 p-2 bg-white border border-secondary-mild rounded-full text-secondary shadow hover:shadow-lg hover:scale-105 transition duration-150 ease-in-out"
            >
                <MdNavigateNext size={32} />
            </button>
        </div>
    );
}

const Samples = () => {
    const gallery = useSiteGallery();
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
                <motion.h5
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
                </motion.h5>
            </div>
            <style>
                {`                    
                    .swiper {
                        cursor: grab !important;
                        padding-bottom: 40px !important;
                    }
                    .swiper:active, 
                    .swiper-grabbing {
                        cursor: grabbing !important;
                    }
                    .swiper-pagination {
                        display: absolute;
                        bottom: 0px !important;
                    }
                    .swiper-pagination-bullet {
                        width: 10px;
                        height: 10px;
                    }
                    .swiper-pagination-bullet-active {
                        opacity: 1;
                        width: 15px;
                        border-radius: 5px;
                    }
            `}
            </style>
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
                {gallery.length > 0 && (
                    <Carousel
                        slides={gallery.map((image) => (
                            <img
                                key={image.id}
                                src={image.src}
                                alt={image.alt}
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
