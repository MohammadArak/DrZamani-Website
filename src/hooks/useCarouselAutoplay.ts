import { useEffect, useMemo, useRef, useState } from "react";
import type { KeenSliderPlugin } from "keen-slider";

/** Pause for focus, hover, hidden tabs and reduced motion; clean every timer and listener. */
export function useCarouselAutoplay(count: number) {
    const [paused, setPaused] = useState(false);
    const settings = useRef({ paused, count });
    const reschedule = useRef<() => void>(() => undefined);
    useEffect(() => {
        settings.current = { paused, count };
        reschedule.current();
    }, [paused, count]);
    const plugin = useMemo<KeenSliderPlugin>(() => (slider) => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let hovered = false;
        let focused = false;
        const surface = slider.container.parentElement ?? slider.container;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const clear = () => clearTimeout(timer);
        const next = () => {
            clear();
            if (hovered || focused || reduced.matches || document.hidden || settings.current.paused || settings.current.count < 2) return;
            timer = setTimeout(() => slider.next(), 5000);
        };
        const enter = () => { hovered = true; clear(); };
        const leave = () => { hovered = false; next(); };
        const focus = () => { focused = true; clear(); };
        const blur = (event: FocusEvent) => {
            focused = event.relatedTarget instanceof Node && surface.contains(event.relatedTarget);
            next();
        };
        slider.on("created", () => {
            reschedule.current = next;
            surface.addEventListener("mouseenter", enter);
            surface.addEventListener("mouseleave", leave);
            surface.addEventListener("focusin", focus);
            surface.addEventListener("focusout", blur);
            reduced.addEventListener("change", next);
            document.addEventListener("visibilitychange", next);
            next();
        });
        slider.on("destroyed", () => {
            clear();
            reschedule.current = () => undefined;
            surface.removeEventListener("mouseenter", enter);
            surface.removeEventListener("mouseleave", leave);
            surface.removeEventListener("focusin", focus);
            surface.removeEventListener("focusout", blur);
            reduced.removeEventListener("change", next);
            document.removeEventListener("visibilitychange", next);
        });
        slider.on("dragStarted", clear);
        slider.on("animationEnded", next);
        slider.on("updated", next);
    }, []);
    return { plugin, paused, toggle: () => setPaused(value => !value) };
}
