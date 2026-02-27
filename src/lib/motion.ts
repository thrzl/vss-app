import { animate, stagger, inView } from "motion";

/**
 * Svelte action: fade-in + slide-up entrance animation on mount.
 *
 * Usage: <div use:fadeIn> or
 <div use:fadeIn={{ duration: 0.6, y: 30 }}>
 */
export function fadeIn(
  node: HTMLElement,
  params: { duration?: number; delay?: number; y?: number; x?: number } = {},
) {
  const { duration = 0.45, delay = 0, y = 16, x = 0 } = params;

  node.style.opacity = "0";
  node.style.transform = `translate(${x}px, ${y}px)`;

  animate(
    node as any,
    {
      opacity: [0, 1],
      transform: [`translate(${x}px, ${y}px)`, "translate(0px, 0px)"],
    } as any,
    { duration, delay, ease: [0.25, 0.1, 0.25, 1] },
  );

  return {
    destroy() {
      // nothing to clean up
    },
  };
}

/**
 * Svelte action: fade-in + scale entrance (good for cards, modals).
 *
 * Usage: <div use:fadeInScale> or <div use:fadeInScale={{ duration: 0.4 }}>
 */
export function fadeInScale(
  node: HTMLElement,
  params: { duration?: number; delay?: number; scale?: number } = {},
) {
  const { duration = 0.4, delay = 0, scale = 0.96 } = params;

  node.style.opacity = "0";
  node.style.transform = `scale(${scale})`;

  animate(
    node as any,
    { opacity: [0, 1], transform: [`scale(${scale})`, "scale(1)"] } as any,
    { duration, delay, ease: [0.25, 0.1, 0.25, 1] },
  );

  return {
    destroy() {},
  };
}

/**
 * Svelte action: stagger-animate direct children on mount.
 * Each child fades in + slides up with a stagger delay.
 *
 * Usage: <ul use:staggerChildren> or <ul use:staggerChildren={{ staggerDelay: 0.08 }}>
 */
export function staggerChildren(
  node: HTMLElement,
  params: {
    staggerDelay?: number;
    duration?: number;
    y?: number;
    selector?: string;
  } = {},
) {
  const { staggerDelay = 0.06, duration = 0.4, y = 12, selector } = params;

  const children = selector
    ? Array.from(node.querySelectorAll(selector))
    : Array.from(node.children);

  if (children.length === 0) return { destroy() {} };

  // Set initial state
  for (const child of children) {
    (child as HTMLElement).style.opacity = "0";
    (child as HTMLElement).style.transform = `translateY(${y}px)`;
  }

  // Animate with stagger
  const sel = selector || `:scope > *`;
  animate(
    node.querySelectorAll(sel) as any,
    {
      opacity: [0, 1],
      transform: [`translateY(${y}px)`, "translateY(0px)"],
    } as any,
    { duration, delay: stagger(staggerDelay), ease: [0.25, 0.1, 0.25, 1] },
  );

  return {
    destroy() {},
  };
}

/**
 * Svelte action: animate element when it scrolls into view.
 *
 * Usage: <section use:inViewFade> or <section use:inViewFade={{ y: 30 }}>
 */
export function inViewFade(
  node: HTMLElement,
  params: { duration?: number; y?: number; margin?: string } = {},
) {
  const { duration = 0.5, y = 24, margin = "-64px" } = params;

  node.style.opacity = "0";
  node.style.transform = `translateY(${y}px)`;

  const stop = inView(
    node,
    () => {
      animate(
        node as any,
        {
          opacity: [0, 1],
          transform: [`translateY(${y}px)`, "translateY(0px)"],
        } as any,
        { duration, ease: [0.25, 0.1, 0.25, 1] },
      );
    },
    { margin: margin as any },
  );

  return {
    destroy() {
      stop();
    },
  };
}

/**
 * Svelte action: simple slide-in from the left or right.
 *
 * Usage: <div use:slideIn={{ from: "left" }}>
 */
export function slideIn(
  node: HTMLElement,
  params: {
    from?: "left" | "right";
    duration?: number;
    delay?: number;
    distance?: number;
  } = {},
) {
  const { from = "left", duration = 0.45, delay = 0, distance = 30 } = params;
  const x = from === "left" ? -distance : distance;

  node.style.opacity = "0";
  node.style.transform = `translateX(${x}px)`;

  animate(
    node as any,
    {
      opacity: [0, 1],
      transform: [`translateX(${x}px)`, "translateX(0px)"],
    } as any,
    { duration, delay, ease: [0.25, 0.1, 0.25, 1] },
  );

  return {
    destroy() {},
  };
}

/**
 * Svelte action: subtle pop-in (scale bounce) for icons / badges / buttons.
 *
 * Usage: <span use:popIn>
 */
export function popIn(
  node: HTMLElement,
  params: { duration?: number; delay?: number } = {},
) {
  const { duration = 0.35, delay = 0 } = params;

  node.style.opacity = "0";
  node.style.transform = "scale(0.5)";

  animate(
    node as any,
    {
      opacity: [0, 1],
      transform: ["scale(0.5)", "scale(1.05)", "scale(1)"],
    } as any,
    {
      duration,
      delay,
      ease: [0.34, 1.56, 0.64, 1], // overshoot ease for a playful bounce
    },
  );

  return {
    destroy() {},
  };
}
