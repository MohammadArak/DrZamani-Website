import { type ReactNode } from "react";
import GlassCard from "./GlassCard";
import { MdOutlineNavigateBefore } from "react-icons/md";

interface Props {
    img: string;
    header: string;
    body: ReactNode;
}

const ServiceCard = ({ img, header, body }: Props) => {
    return (
        <GlassCard className="p-5 border-none hover:scale-105 transition ease-in-out duration-200">
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-center">
                    <div className="bg-linear-to-br from-duskblue/60 to-duskblue p-5 rounded-full shadow-lg shadow-duskblue">
                        <img
                            src={img}
                            className="w-18"
                            alt={header}
                            width="72"
                            height="72"
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                </div>
                <div className="flex flex-col justify-center items-center gap-5 ">
                    <h6 className="text-duskblue font-dana text-2xl">
                        {header}
                    </h6>
                    <img
                        className="w-32"
                        src="/img/services/line.png"
                        alt="خط افقی"
                        width="128"
                        height="10"
                        loading="lazy"
                    />
                    <span className="text-center max-w-2/3 text-jetblack/70 text-sm">
                        {body}
                    </span>
                </div>
                <div className="flex justify-center items-center">
                    <a
                        href="/#footer"
                        className="flex items-center gap-1 text-secondary border border-secondary rounded-full px-5 py-2 hover:bg-secondary hover:scale-105 hover:text-white transition duration-125 ease-in-out"
                    >
                        مشاوره و اطلاعات بیشتر
                        <MdOutlineNavigateBefore
                            size={24}
                            className="text-inherit"
                        />
                    </a>
                </div>
            </div>
        </GlassCard>
    );
};

export default ServiceCard;
