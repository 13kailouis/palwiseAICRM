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
 * Two more things stop the visible jump while the keyboard slides in:
 * - iOS pans the page the moment a field is focused but reports it only when the
 *   keyboard animation ends, so after any focus change the position is followed
 *   every frame for a second instead of waiting for that report.
 * - Chat composers marked `data-fokus-tenang` already sit right above the
 *   keyboard, so their first tap focuses with preventScroll and Safari does not
 *   scroll the page to "reveal" them. A tap that moved (a scroll) is left alone.
 *
 * During a pinch zoom everything is released, so zooming never drags the layout.
 */
export function LayarHp() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const el = document.documentElement;
    let bingkai = 0;
    let ikut = 0;
    let sampai = 0;
    let awal: { x: number; y: number } | null = null;

    const lepas = () => {
      el.style.removeProperty("--layar-tinggi");
      el.style.removeProperty("--layar-atas");
      delete el.dataset.keyboard;
    };

    const setel = () => {
      if (Math.abs(vv.scale - 1) > 0.01) return lepas();
      el.style.setProperty("--layar-tinggi", `${Math.round(vv.height)}px`);
      el.style.setProperty("--layar-atas", `${Math.max(0, Math.round(vv.offsetTop))}px`);
      // 140px is taller than any browser toolbar change, shorter than any keyboard.
      if (window.innerHeight - vv.height > 140) el.dataset.keyboard = "1";
      else delete el.dataset.keyboard;
    };

    const ukur = () => {
      cancelAnimationFrame(bingkai);
      bingkai = requestAnimationFrame(setel);
    };

    // Follow the viewport every frame for a second after a focus change.
    const ikuti = () => {
      sampai = performance.now() + 1000;
      if (ikut) return;
      const langkah = () => {
        setel();
        ikut = performance.now() < sampai ? requestAnimationFrame(langkah) : 0;
      };
      ikut = requestAnimationFrame(langkah);
    };

    const bisaDiketik = (t: EventTarget | null) =>
      t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const saatFokus = (e: FocusEvent) => {
      if (bisaDiketik(e.target)) ikuti();
    };

    const saatMulai = (e: TouchEvent) => {
      const s = e.touches[0];
      awal = s ? { x: s.clientX, y: s.clientY } : null;
    };
    const saatSentuh = (e: TouchEvent) => {
      const t = e.target instanceof Element
        ? e.target.closest<HTMLInputElement | HTMLTextAreaElement>("[data-fokus-tenang]")
        : null;
      if (!t || t === document.activeElement || t.disabled || t.readOnly) return;
      const s = e.changedTouches[0];
      if (!awal || !s || Math.hypot(s.clientX - awal.x, s.clientY - awal.y) > 10) return;
      e.preventDefault();
      t.focus({ preventScroll: true });
      const akhir = t.value.length;
      try {
        t.setSelectionRange(akhir, akhir);
      } catch {
        // Some input types refuse a selection; the caret position is not worth an error.
      }
      ikuti();
    };

    setel();
    vv.addEventListener("resize", ukur);
    vv.addEventListener("scroll", ukur);
    document.addEventListener("focusin", saatFokus);
    document.addEventListener("focusout", saatFokus);
    document.addEventListener("touchstart", saatMulai, { passive: true });
    document.addEventListener("touchend", saatSentuh, { passive: false });
    return () => {
      cancelAnimationFrame(bingkai);
      cancelAnimationFrame(ikut);
      vv.removeEventListener("resize", ukur);
      vv.removeEventListener("scroll", ukur);
      document.removeEventListener("focusin", saatFokus);
      document.removeEventListener("focusout", saatFokus);
      document.removeEventListener("touchstart", saatMulai);
      document.removeEventListener("touchend", saatSentuh);
      lepas();
    };
  }, []);

  return null;
}
