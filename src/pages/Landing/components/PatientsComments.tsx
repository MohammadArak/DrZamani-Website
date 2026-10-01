import PatientComment from "./PatientComment";
import {useCallback,useEffect,useRef,useState} from "react";
import {commentsApi,type CommentPage,type PublicComment} from "@/services/commentsApi";
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
                let paused = false;
                const interaction = slider.container.parentElement ?? slider.container;
                const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
                const clear = () => clearTimeout(timeout);
                const next = () => {
                    clear();
                    if (paused || reduced.matches || slides.length < 2) return;
                    timeout = setTimeout(() => slider.next(), 3000);
                };
                const enter = () => { paused = true; clear(); };
                const leave = () => { paused = false; next(); };
                slider.on("created", () => {
                    interaction.addEventListener("mouseenter", enter);
                    interaction.addEventListener("mouseleave", leave);
                    interaction.addEventListener("focusin", enter);
                    interaction.addEventListener("focusout", leave);
                    reduced.addEventListener("change", next);
                    next();
                });
                slider.on("destroyed", () => {
                    clear();
                    interaction.removeEventListener("mouseenter", enter);
                    interaction.removeEventListener("mouseleave", leave);
                    interaction.removeEventListener("focusin", enter);
                    interaction.removeEventListener("focusout", leave);
                    reduced.removeEventListener("change", next);
                });
                slider.on("dragStarted", clear);
                slider.on("animationEnded", next);
                slider.on("updated", next);
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
                aria-label="نظر قبلی" onClick={() => instanceRef.current?.prev()}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-linear-to-b from-[#182435] to-[#2e3d51] border border-primary-subtle rounded-full text-secondary shadow hover:shadow-lg hover:scale-105 transition duration-150 ease-in-out"
            >
                <MdNavigateBefore size={32} />
            </button>

            <button
                aria-label="نظر بعدی" onClick={() => instanceRef.current?.next()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-linear-to-b from-[#182435] to-[#2e3d51] border border-primary-subtle rounded-full text-secondary shadow hover:shadow-lg hover:scale-105 transition duration-150 ease-in-out"
            >
                <MdNavigateNext size={32} />
            </button>
        </div>
    );
}

function initial():CommentPage<PublicComment>{
    try{return JSON.parse(document.getElementById("comment-bootstrap")?.textContent??"");}catch{return {items:[],total:0,page:1};}
}
const PatientsComments = () => {
    const [result,setResult]=useState(initial); const [busy,setBusy]=useState(false); const [error,setError]=useState(false); const generation=useRef({value:0});
    const load=useCallback(async()=>{
        const sequence=++generation.current.value;setBusy(true);
        try{
            let next=await commentsApi.publicList(); const items=[...next.items];
            while(next.page*12<next.total && next.items.length){
                if(sequence!==generation.current.value)return;
                next=await commentsApi.publicList(next.page+1);items.push(...next.items);
            }
            if(sequence===generation.current.value){setResult({...next,items:[...new Map(items.map(item=>[item.id,item])).values()]});setError(false);}
        }
        catch{if(sequence===generation.current.value){setResult({items:[],total:0,page:1});setError(true);}}
        finally{if(sequence===generation.current.value)setBusy(false);}
    },[]);
    useEffect(()=>{const requests=generation.current;const refresh=()=>{if(document.visibilityState==="visible")void load();};const start=window.setTimeout(()=>void load(),0);const timer=window.setInterval(refresh,30000);window.addEventListener("focus",refresh);return()=>{requests.value++;window.clearTimeout(start);window.clearInterval(timer);window.removeEventListener("focus",refresh);};},[load]);
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
                <motion.div
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
                    <h2 className="font-lalezar text-2xl md:text-5xl text-white ">
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
                </motion.div>
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
                    className="md:text-lg font-shahab text-white"
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
                {error&&<p role="status" className="text-center text-white">دریافت نظرات ممکن نشد. <button onClick={()=>void load()} className="underline">تلاش مجدد</button></p>}
                {!result.items.length&&!error&&<p className="text-center text-white">{busy?"در حال دریافت نظرات…":"هنوز نظری برای نمایش منتشر نشده است."}</p>}
                {result.items.length>0&&<Carousel key={result.items.map(r=>r.id).join(",")} slides={result.items.map(item=><PatientComment key={item.id} img={item.photo_key?`/media/${item.photo_key}.webp`:undefined} imageAlt={item.photo_alt} name={item.display_name} age={item.age??undefined} body={item.body}/>)}/>}

            </motion.div>
        </section>
    );
};

export default PatientsComments;
