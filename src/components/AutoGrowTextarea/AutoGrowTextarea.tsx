import {
    useLayoutEffect,
    useRef,
    type ChangeEventHandler,
    type TextareaHTMLAttributes,
} from "react";

type AutoGrowTextareaProps = Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange"
> & {
    value: string;
    onChange: ChangeEventHandler<HTMLTextAreaElement>;
    maxHeight?: number;
};

const AutoGrowTextarea = ({
    value,
    onChange,
    maxHeight = 144,
    className = "",
    style,
    ...props
}: AutoGrowTextareaProps) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
        textarea.style.height = `${nextHeight}px`;
        textarea.style.overflowY =
            textarea.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [maxHeight, value]);

    return (
        <textarea
            {...props}
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={onChange}
            className={`resize-none overflow-y-hidden ${className}`}
            style={{ ...style, maxHeight }}
        />
    );
};

export default AutoGrowTextarea;
