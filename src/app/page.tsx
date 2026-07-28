"use client";

import { useEffect } from "react";
import Hero from "@/components/Hero";
import MarketsSection from "@/components/MarketsSection";
import WhySection from "@/components/WhySection";
import HowSection from "@/components/HowSection";
import Manifesto from "@/components/Manifesto";
import Testimonials from "@/components/Testimonials";
import Faq from "@/components/Faq";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import { useI18n } from "@/i18n/I18nProvider";
import { BANKS } from "@/data/banks";

export default function Home() {
  const { t } = useI18n();

  // Reveal-on-scroll (IntersectionObserver) — ported from the source's global
  // observer. Observes every `.reveal:not(.in)` element after mount.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal:not(.in)").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Smooth-scroll to a section when arriving with a hash (e.g. from /#markets).
  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (!id) return;
    const el = document.getElementById(id);
    if (el) {
      // Wait a frame so layout is ready.
      requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth" }));
    }
  }, []);

  return (
    <main id="homeView">
      <Hero />

      <section className="trust">
        <div className="lab">{t("trust")}</div>
        <div className="mq" id="mq">
          {[...BANKS, ...BANKS].map((b, i) => (
            <span key={i}>{b.name}</span>
          ))}
        </div>
      </section>

      <MarketsSection />
      <WhySection />
      <HowSection />
      <Manifesto />
      <Testimonials />
      <Faq />
      <CTA />
      <Footer />
    </main>
  );
}
