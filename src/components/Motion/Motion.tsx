import {
    createElement,
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type HTMLAttributes,
    type ReactNode,
} from "react";

/* eslint-disable react-hooks/refs, react-refresh/only-export-components */

type MotionState = {
    opacity?: number;
    x?: number | string;
    y?: number | string;
    scale?: number;
    transform?: string;
    filter?: string;
};

type MotionTransition = {
    duration?: number;
    delay?: number;
    ease?: string | number[];
    type?: string;
    bounce?: number;
};

type MotionProps = HTMLAttributes<HTMLElement> & {
    animate?: MotionState;
    exit?: MotionState;
    initial?: MotionState | false;
    layoutId?: string;
    src?: string;
    alt?: string;
    loading?: "eager" | "lazy";
    decoding?: "sync" | "async" | "auto";
    fetchPriority?: "high" | "low" | "auto";
    height?: number | string;
    width?: number | string;
    transition?: MotionTransition;
    viewport?: {
        amount?: number;
        once?: boolean;
    };
    whileInView?: MotionState;
};

const toPixelValue = (value: number | string | undefined) => {
    if (typeof value === "number") {
        return `${value}px`;
    }

    return value ?? "0px";
};

const toTransform = (state?: MotionState) => {
    if (!state) {
        return undefined;
    }

    if (state.transform) {
        return state.transform;
    }

    const transforms: string[] = [];

    if (state.x !== undefined) {
        transforms.push(`translateX(${toPixelValue(state.x)})`);
    }

    if (state.y !== undefined) {
        transforms.push(`translateY(${toPixelValue(state.y)})`);
    }

    if (state.scale !== undefined) {
        transforms.push(`scale(${state.scale})`);
    }

    return transforms.length ? transforms.join(" ") : undefined;
};

const toEasing = (transition?: MotionTransition) => {
    if (Array.isArray(transition?.ease)) {
        return `cubic-bezier(${transition.ease.join(",")})`;
    }

    if (typeof transition?.ease === "string") {
        return transition.ease;
    }

    if (transition?.type === "spring") {
        return transition.bounce && transition.bounce > 0.2
            ? "cubic-bezier(.2,.85,.35,1.15)"
            : "cubic-bezier(.2,.8,.2,1)";
    }

    return "ease-out";
};

const stateToStyle = (state?: MotionState): CSSProperties => ({
    opacity: state?.opacity,
    transform: toTransform(state),
    filter: state?.filter,
});

const createMotionElement = (tagName: keyof HTMLElementTagNameMap) => {
    const MotionElement = forwardRef<HTMLElement, MotionProps>(
        (
            {
                animate,
                children,
                exit,
                initial,
                layoutId,
                style,
                transition,
                viewport,
                whileInView,
                ...rest
            },
            forwardedRef,
        ) => {
            const localRef = useRef<HTMLElement | null>(null);
            const [isVisible, setIsVisible] = useState(() => {
                const reducedMotion =
                    typeof window !== "undefined" &&
                    window.matchMedia("(prefers-reduced-motion: reduce)")
                        .matches;
                const hasEntranceAnimation =
                    (Boolean(animate) && initial !== false) ||
                    Boolean(whileInView);

                return reducedMotion || !hasEntranceAnimation;
            });
            useImperativeHandle(
                forwardedRef,
                () => localRef.current as HTMLElement,
            );

            // These props are accepted for API compatibility but are not passed
            // to the DOM by the lightweight motion implementation.
            void exit;
            void layoutId;

            useEffect(() => {
                if (!animate || whileInView || initial === false) {
                    return;
                }

                let secondFrame = 0;
                const firstFrame = requestAnimationFrame(() => {
                    secondFrame = requestAnimationFrame(() => {
                        setIsVisible(true);
                    });
                });

                return () => {
                    cancelAnimationFrame(firstFrame);
                    cancelAnimationFrame(secondFrame);
                };
            }, [animate, initial, whileInView]);

            useEffect(() => {
                const element = localRef.current;

                if (!element || !whileInView) {
                    return;
                }

                if (
                    window.matchMedia("(prefers-reduced-motion: reduce)")
                        .matches
                ) {
                    return;
                }

                const observer = new IntersectionObserver(
                    ([entry]) => {
                        setIsVisible(entry.isIntersecting);

                        if (entry.isIntersecting && viewport?.once !== false) {
                            observer.unobserve(element);
                        }
                    },
                    {
                        threshold: viewport?.amount ?? 0.12,
                        rootMargin: "0px 0px -4% 0px",
                    },
                );

                observer.observe(element);
                return () => observer.disconnect();
            }, [viewport?.amount, viewport?.once, whileInView]);

            const animatedStyle = useMemo<CSSProperties>(() => {
                const targetState = isVisible
                    ? (whileInView ?? animate)
                    : initial === false
                      ? undefined
                      : initial;

                return {
                    ...stateToStyle(targetState),
                    transitionProperty: "opacity, transform, filter",
                    transitionDuration: `${transition?.duration ?? 0.7}s`,
                    transitionDelay: `${transition?.delay ?? 0}s`,
                    transitionTimingFunction: toEasing(transition),
                    // Promote an element only while it is waiting to enter the
                    // viewport. Keeping dozens of completed animations on GPU
                    // layers caused visible scrolling stutter on the landing
                    // page, especially on mobile devices.
                    willChange:
                        !isVisible && (initial || whileInView)
                            ? "opacity, transform"
                            : undefined,
                    ...style,
                };
            }, [
                animate,
                initial,
                isVisible,
                style,
                transition,
                whileInView,
            ]);

            return createElement(
                tagName,
                {
                    ...rest,
                    ref: localRef,
                    style: animatedStyle,
                },
                children,
            );
        },
    );

    MotionElement.displayName = `Motion.${tagName}`;
    return MotionElement;
};

export const motion = {
    div: createMotionElement("div"),
    h2: createMotionElement("h2"),
    h3: createMotionElement("h3"),
    h5: createMotionElement("h5"),
    h6: createMotionElement("h6"),
    img: createMotionElement("img"),
    p: createMotionElement("p"),
    span: createMotionElement("span"),
};

export const AnimatePresence = ({
    children,
}: {
    children?: ReactNode;
    mode?: "wait" | "sync" | "popLayout";
}) => children;
