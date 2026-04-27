"use client";

import { useEffect, useRef } from "react";

export function CustomCursor() {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerWrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const lerped = useRef({ x: -100, y: -100 });
  const mouse = useRef({ x: -100, y: -100 });
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(hover: none)").matches) return;

    const outer = outerRef.current!;
    const innerWrap = innerWrapRef.current!;
    const inner = innerRef.current!;
    if (!outer || !innerWrap || !inner) return;

    document.documentElement.classList.add("custom-cursor");

    const LERP = 0.38;

    function getTheme(el: Element): "dark" | "" {
      // Walk up the DOM — the most specific ancestor wins
      let node: Element | null = el;
      while (node) {
        const attr = node.getAttribute("data-cursor");
        if (attr === "light") return "";
        if (attr === "dark") return "dark";
        node = node.parentElement;
      }
      return "";
    }

    function animate() {
      lerped.current.x += (mouse.current.x - lerped.current.x) * LERP;
      lerped.current.y += (mouse.current.y - lerped.current.y) * LERP;
      outer.style.transform = `translate(calc(${lerped.current.x}px - 50%), calc(${lerped.current.y}px - 50%))`;
      rafId.current = requestAnimationFrame(animate);
    }

    function onMouseMove(e: MouseEvent) {
      mouse.current = { x: e.clientX, y: e.clientY };
      innerWrap.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
      // elementFromPoint is more reliable than e.target (which can return document on window listeners)
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        const theme = getTheme(el);
        if (outer.dataset.theme !== theme) {
          outer.dataset.theme = theme;
          inner.dataset.theme = theme;
        }
      }
    }

    function onMouseOver(e: MouseEvent) {
      const el = e.target as Element;
      if (el.closest("a, button, [role='button']")) {
        outer.dataset.state = "hover";
        inner.dataset.state = "hover";
      }
    }

    function onMouseOut(e: MouseEvent) {
      const to = e.relatedTarget as Element | null;
      if (!to?.closest("a, button, [role='button']")) {
        outer.dataset.state = "";
        inner.dataset.state = "";
      }
    }

    function onDocLeave() {
      outer.style.opacity = "0";
      innerWrap.style.opacity = "0";
    }
    function onDocEnter() {
      outer.style.opacity = "1";
      innerWrap.style.opacity = "1";
    }

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("mouseleave", onDocLeave);
    document.addEventListener("mouseenter", onDocEnter);
    rafId.current = requestAnimationFrame(animate);

    return () => {
      document.documentElement.classList.remove("custom-cursor");
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("mouseleave", onDocLeave);
      document.removeEventListener("mouseenter", onDocEnter);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <>
      <div ref={outerRef} aria-hidden className="cursor-outer" />
      <div ref={innerWrapRef} aria-hidden className="cursor-inner-wrap">
        <div ref={innerRef} aria-hidden className="cursor-inner" />
      </div>
    </>
  );
}
