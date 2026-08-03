"use client";

import { useEffect, useMemo } from "react";
import Hero from "@/components/Hero";
import MarketsSection from "@/components/MarketsSection";
import PurposePicker from "@/components/PurposePicker";
import WhySection from "@/components/WhySection";
import HowSection from "@/components/HowSection";
import Manifesto from "@/components/Manifesto";
import ValueBand from "@/components/ValueBand";
import Testimonials from "@/components/Testimonials";
import Faq from "@/components/Faq";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import RateFlow from "@/components/RateFlow";
import FooterReveal from "@/components/FooterReveal";
import LogoLoop from "@/components/reactbits/LogoLoop";
import type { LogoItem } from "@/components/reactbits/LogoLoop";
import { useI18n } from "@/i18n/I18nProvider";
import { BANKS } from "@/data/banks";

export default function Home() {
  const { t } = useI18n();

  const bankLogos: LogoItem[] = useMemo(
    () =>
      BANKS.map((b) => ({
        src: `/banks/${b.code}.png`,
        alt: b.name,
        title: b.name,
      })),
    []
  );

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
      {/* Opaque column that slides away to uncover the pinned footer. */}
      <div className="page-above">
        <Hero />

        <section className="trust">
          <div className="lab">{t("trust")}</div>
          <LogoLoop
            logos={bankLogos}
            speed={55}
            direction="left"
            logoHeight={36}
            gap={48}
            pauseOnHover
            fadeOut
            fadeOutColor="#f4f7f9"
            scaleOnHover
            ariaLabel="Partner banks"
          />
        </section>

        <PurposePicker />

        <MarketsSection />
        <WhySection />
        <HowSection />
        <Manifesto />
        <ValueBand />
        <RateFlow />
        <Testimonials />
        <Faq />
        <CTA />
      </div>

      <FooterReveal>
        <Footer />
      </FooterReveal>
    </main>
  );
}
