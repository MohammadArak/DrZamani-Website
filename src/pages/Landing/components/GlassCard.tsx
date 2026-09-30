import classNames from "@/utils/classNames";
import type { ReactNode } from "react";

interface GlassCardProps {
    children: ReactNode;
    className?: string;
    childClassName?: string;
}

const GlassCard = ({ children, className, childClassName }: GlassCardProps) => {
    return (
        <div
            className={classNames(
                `
                relative
                overflow-hidden
                rounded-4xl

                border border-white/20

                bg-linear-to-br
                from-white/20
                via-white/10
                to-white/5

                backdrop-blur-[30px]

                shadow-[0_20px_60px_rgba(0,0,0,.18)]

                before:absolute
                before:-left-20
                before:-bottom-20
                before:h-60
                before:w-60
                before:rounded-full
                before:bg-white/20
                before:blur-[90px]
                before:content-['']

                after:absolute
                after:inset-0
                after:rounded-4xl
                after:ring-1
                after:ring-white/10
                after:pointer-events-none
                `,
                className,
            )}
        >
            <div className={classNames("relative z-10 " + childClassName)}>
                {children}
            </div>
        </div>
    );
};

export default GlassCard;
