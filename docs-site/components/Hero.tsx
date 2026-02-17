"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Apple, Smartphone } from "lucide-react";
import { useRef } from "react";

export default function Hero() {
    const containerRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    });

    const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);
    const opacity = useTransform(scrollYProgress, [0, 0.3, 1], [1, 0.5, 0]);
    const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
    const imgY = useTransform(scrollYProgress, [0, 1], [0, 100]);

    return (
        <section
            ref={containerRef}
            className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-background pt-0 md:pt-20"
        >
            <div className="japanese-grid absolute inset-0 opacity-[0.03]" />

            {/* Background Name (Behind Photo) */}
            <motion.div
                layoutId="kayaos-branding"
                style={{ opacity: useTransform(scrollYProgress, [0, 0.3], [0.03, 0]), scale }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
            >
                <span className="text-[25vw] font-black tracking-tighter uppercase text-foreground">
                    TEACHTRACK
                </span>
            </motion.div>

            <div className="container relative z-10 mx-auto px-6 sm:px-8 md:px-16 lg:px-32 flex flex-col md:flex-row items-center justify-between gap-10 sm:gap-12 md:gap-24">

                {/* Left Content (Text) */}
                <motion.div
                    style={{ opacity, y }}
                    className="flex-1 order-2 md:order-1"
                >
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-4">
                            <span className="h-px w-12 bg-accent" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-accent">Documentation</span>
                        </div>

                        <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] uppercase">
                            TeachTrack <br />
                            <span className="text-outline-accent text-transparent">User Guide</span>
                        </h1>

                        <p className="max-w-md text-sm md:text-base leading-relaxed text-foreground/50 font-light tracking-wide">
                            Learn what the app can do and follow a clear step-by-step guide.
                            Download the Android APK when it becomes available.
                        </p>

                        <div className="pt-2 space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="h-px w-10 bg-foreground/10" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground/40">Downloads</span>
                            </div>
                            <div className="grid w-full max-w-md gap-3 sm:max-w-lg sm:gap-4 sm:grid-cols-2">
                                <motion.a
                                    href="#"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-3 bg-foreground py-3 sm:py-4 text-[11px] sm:text-sm font-semibold text-background transition-opacity hover:opacity-90"
                                >
                                    <Smartphone size={16} className="sm:hidden" />
                                    <Smartphone size={18} className="hidden sm:block" />
                                    Android (APK)
                                </motion.a>
                                <motion.a
                                    href="#"
                                    whileHover={{ scale: 1.02, backgroundColor: "rgba(var(--foreground), 0.05)" }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex items-center justify-center gap-3 border border-foreground/10 py-3 sm:py-4 text-[11px] sm:text-sm font-semibold transition-colors"
                                >
                                    <Apple size={16} className="sm:hidden" />
                                    <Apple size={18} className="hidden sm:block" />
                                    iOS
                                </motion.a>
                            </div>
                        </div>

                    </div>
                </motion.div>

                {/* Right Content (Creative Photo) */}
                <motion.div
                    style={{ opacity, scale, y: imgY }}
                    className="relative flex-1 order-1 md:order-2"
                >
                    <div className="relative aspect-[4/5] w-full max-w-[360px] sm:max-w-[420px] md:max-w-[450px] mx-auto overflow-hidden border border-foreground/5 bg-foreground/[0.02] collage-mask">
                        {/* Main Profile Photo Placeholder */}
                        <motion.div
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                            className="h-full w-full"
                        >
                            <img
                                src="/images/mobile.png"
                                alt="TeachTrack app mockup"
                                className="h-full w-full object-cover"
                            />
                        </motion.div>

                        {/* Decorative Glitch/Editorial Overlays */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-0 right-0 h-32 w-32 border-t border-r border-accent/30" />
                            <div className="absolute bottom-0 left-0 h-32 w-32 border-b border-l border-accent/20" />
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-foreground/5" />
                        </div>

                        {/* Floating Info Tag */}
                    </div>

                    {/* Background Text behind photo */}
                    <div className="absolute -top-10 -left-10 z-[-1] pointer-events-none hidden lg:block">
                        <span className="text-[12rem] font-bold text-foreground/[0.02] italic select-none">匠</span>
                    </div>
                </motion.div>

            </div>

            {/* Dynamic Scroll Indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="absolute bottom-6 sm:bottom-10 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 md:gap-4"
            >
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.7em] md:tracking-[0.8em] text-foreground/20 italic">
                    Scroll
                </span>
                <div className="h-10 sm:h-12 w-[1px] bg-gradient-to-b from-accent to-transparent" />
            </motion.div>

        </section>
    );
}
