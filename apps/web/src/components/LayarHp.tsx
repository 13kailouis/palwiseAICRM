"use client";

import { useEffect } from "react";

/**
 * Pins the phone layout to the area that is actually visible.
 *
 * When a phone keyboard opens, iOS Safari shrinks the VISUAL viewport and pans
 * it down (visualViewport.offsetTop) to reveal the focused field, while the
 * layout viewport and anything sized with 100vh/100dvh stay put. A layout that
 * only shrinks its height therefore stays glued to the top of the page while the
 * visible part is lower: Palwise AI's composer jumped to the top of the screen
 * with a blank gap above the keyboard.
 *
 * This writes two CSS variables on <html>, --layar-tinggi (visible height) and
 * --layar-atas (how far the page is panned), plus data-keyboard="1" while a
 * keyboard is open. globals.css uses them for the app shell and full-screen
 * chats, on phones only. Both `resize` AND `scroll` are listened to: the pan
 * arrives as a scroll event, which the old per-page code missed.
 *
 * During a pinch zoom everything is released, so zooming never drags the layout.
 */
export function LayarHp() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const el = document.documentElement;
    let bingkai = 0;

    const lepas = () => {
      el.style.removeProperty("--layar-tinggi");
      el.style.removeProperty("--layar-atas");
      delete el.dataset.keyboard;
    };

    const ukur = () => {
      cancelAnimationFrame(bingkai);
      bingkai = requestAnimationFrame(() => {
        if (Math.abs(vv.scale - 1) > 0.01) return lepas();
        el.style.setProperty("--layar-tinggi", `${Math.round(vv.height)}px`);
        el.style.setProperty("--layar-atas", `${Math.max(0, Math.round(vv.offsetTop))}px`);
        // 140px is taller than any browser toolbar change, shorter than any keyboard.
        if (window.innerHeight - vv.height > 140) el.dataset.keyboard = "1";
        else delete el.dataset.keyboard;
      });
    };

    ukur();
    vv.addEventListener("resize", ukur);
    vv.addEventListener("scroll", ukur);
    return () => {
      cancelAnimationFrame(bingkai);
      vv.removeEventListener("resize", ukur);
      vv.removeEventListener("scroll", ukur);
      lepas();
    };
  }, []);

  return null;
}
