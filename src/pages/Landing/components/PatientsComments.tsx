import PatientComment from "./PatientComment";
import { motion } from "@/components/Motion";

import { useKeenSlider } from "keen-slider/react";
import { MdNavigateBefore, MdNavigateNext } from "react-icons/md";

function Carousel({ slides }: { slides: React.ReactNode[] }) {
    const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>(
        {
            loop: true,
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
        <div className="relative ">
            <div
                ref={sliderRef}
                className="keen-slider cursor-grab active:cursor-grabbing"
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

            <button
                onClick={() => instanceRef.current?.prev()}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-linear-to-b from-[#182435] to-[#2e3d51] border border-primary-subtle rounded-full text-secondary shadow hover:shadow-lg hover:scale-105 transition duration-150 ease-in-out"
            >
                <MdNavigateBefore size={32} />
            </button>

            <button
                onClick={() => instanceRef.current?.next()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-linear-to-b from-[#182435] to-[#2e3d51] border border-primary-subtle rounded-full text-secondary shadow hover:shadow-lg hover:scale-105 transition duration-150 ease-in-out"
            >
                <MdNavigateNext size={32} />
            </button>
        </div>
    );
}

const PatientsComments = () => {
    return (
        <section
            id="comments"
            style={{
                backgroundImage: `url(/img/comments/background.webp)`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "cover",
            }}
            className="relative bg-linear-to-tl from-jetblack to-[#1B273B] pt-12 pb-20 md:pt-14 flex flex-col items-center gap-12"
        >
            <div className="relative flex flex-col gap-2 items-center z-20">
                <motion.h3
                    className="relative px-4 flex items-center gap-2"
                    initial={{ opacity: 0, y: -20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.4,
                    }}
                    viewport={{ once: true }}
                >
                    <svg
                        className="w-20 md:w-36 lg:w-64"
                        height={32}
                        viewBox="0 0 1200 80"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M0 0 H180
           C220 0 250 30 250 60
           C250 70 255 80 270 80
           H1200"
                            stroke="white"
                            strokeWidth="4"
                            fill="none"
                        />
                    </svg>
                    <h2 className="font-lalezar text-2xl md:text-5xl ">
                        نظرات مراجعین
                    </h2>
                    <svg
                        className="w-20 md:w-36 lg:w-64"
                        height={32}
                        viewBox="0 0 1200 80"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M0 80 H930
           C970 80 1000 50 1000 20
           C1000 10 1010 0 1020 0
           H1200"
                            stroke="white"
                            strokeWidth="4"
                            fill="none"
                        />
                    </svg>
                </motion.h3>
            </div>
            <div className="flex flex-col gap-3 items-center">
                <motion.h5
                    className="text-lg md:text-2xl text-secondary font-dana font-bold"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.4,
                    }}
                    viewport={{ once: true }}
                >
                    رضایت بیماران مهمترین دستاورد ماست.
                </motion.h5>
                <motion.h6
                    className="md:text-lg font-shahab"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{
                        duration: 1.5,
                        type: "spring",
                        bounce: 0.4,
                    }}
                    viewport={{ once: true }}
                >
                    با بیش از ۲۰ سال تجربه و ۱۵۰۰۰ جراحی بینی موفق.
                </motion.h6>
            </div>
            {/* <style>
                {`                    
                    .swiper {
                        cursor: grab !important;
                    }
                    .swiper:active, 
                    .swiper-grabbing {
                        cursor: grabbing !important;
                    }
                    .swiper-button-next, .swiper-button-prev{
                        color: #d5ab64;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        top: 65%;
                        transform: translateY(-65%);
                    }
                    `}
            </style> */}
            <motion.div
                className="w-full md:px-4 lg:px-32"
                initial={{ opacity: 0, y: -20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 1.5,
                    type: "spring",
                    bounce: 0.4,
                }}
                viewport={{ once: true }}
            >
                <Carousel
                    slides={[
                        <PatientComment
                            key="parastoo"
                            img={"/img/comments/profile-1.jpg"}
                            name="پرستو"
                            age={22}
                            body="من خیلی دوست داشتم بینی عمل کنم ولی چون گوشتی بود خیلی نگران نتیجه بودم به دکتر های زیادی مراجعه کردم که نهایتا با دکتر زمانی کار انجام دادم و الان بعد از یک سال نتیجه رو واقعا می پسندم."
                        />,
                        <PatientComment
                            key="niloufar"
                            img={"/img/comments/profile-2.jpg"}
                            name="نیلوفر"
                            age={28}
                            body="به توصیه دوستان با دکتر زمانی آشناشدم و برای تزریق چربی یک جلسه مشاوره با ایشون داشتم که به خوبی به تمام سوالات پاسخ دادن و نگرانی من برای عمل از بین بردند."
                        />,
                        <PatientComment
                            key="fatemeh"
                            img={"/img/comments/profile-3.jpg"}
                            name="فاطمه"
                            age={25}
                            body="تقریبا کار بوتاکس صورت همیشه با دکتر زمانی انجام دادم چون مطمئن هستم از مواد درجه یک استفاده می کنند و  نگران عوارض نیستم."
                        />,
                    ]}
                />
            </motion.div>
        </section>
    );
};

export default PatientsComments;
