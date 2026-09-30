import { type CSSProperties, type ElementType } from "react";
import classNames from "@/utils/classNames";

type TextGenerateEffectProps<T extends ElementType = "div"> = {
    as?: T;
    words: string;
    className?: string;
    wordClassName?: string;
    filter?: boolean;
    duration?: number;
    wordsCallbackClass?: (payload: { word: string }) => string;
};

const TextGenerateEffect = <T extends ElementType = "div">({
    as,
    words,
    className,
    wordClassName,
    filter = true,
    duration = 0.5,
    wordsCallbackClass,
}: TextGenerateEffectProps<T>) => {
    const Component = as || "div";

    const wordsArray = words.split(" ");

    return (
        <Component
            className={classNames(
                "font-bold mt-4 text-black dark:text-white text-2xl leading-snug",
                className,
            )}
        >
            {wordsArray.map((word, idx) => (
                <span
                    key={`${word}-${idx}`}
                    className={classNames(
                        "word-reveal",
                        wordClassName,
                        wordsCallbackClass?.({ word }),
                    )}
                    style={
                        {
                            "--word-delay": `${idx * 0.075}s`,
                            "--word-duration": `${duration}s`,
                            "--word-filter": filter ? "blur(10px)" : "none",
                        } as CSSProperties
                    }
                >
                    {word}{" "}
                </span>
            ))}
        </Component>
    );
};

export default TextGenerateEffect;
