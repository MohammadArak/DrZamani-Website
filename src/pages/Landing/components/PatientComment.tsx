import { type ReactNode } from "react";
import GlassCard from "./GlassCard";

interface Props {
    img: string;
    name: string;
    age: number;
    body: ReactNode;
}

const PatientComment = ({ img, body, name, age }: Props) => {
    return (
        <GlassCard className="md:px-2 w-3/4 py-2">
            <div className="flex flex-col gap-12 justify-center items-center py-4">
                <div className="relative border-2 border-gray-500 outline-2 p-px outline-secondary rounded-full">
                    <img
                        className="h-32 w-32 rounded-full"
                        src={img}
                        alt={name}
                        width="128"
                        height="128"
                        loading="lazy"
                        decoding="async"
                    />
                    <div className="absolute inset-0 -z-10 rounded-full bg-secondary/40 blur-[80px] scale-100" />
                </div>
                <h6 className="text-wrap max-w-3/4 text-justify">{body}</h6>
                <div className="flex flex-col gap-1 justify-center items-center">
                    <span>{name}</span>
                    <span>{age.toString()} ساله</span>
                </div>
            </div>
        </GlassCard>
    );
};

export default PatientComment;
