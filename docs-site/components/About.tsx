"use client";

import Section from "./Section";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function About() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });

    const rotate = useTransform(scrollYProgress, [0, 1], [0, 15]);
    const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.8]);

    return (
        <Section id="overview" title="Overview" subtitle="TeachTrack" verticalTitle="Overview">
            <div ref={ref} className="grid gap-12 lg:grid-cols-12 items-center">
                <div className="lg:col-span-7 space-y-10">
                    <p className="text-2xl md:text-4xl leading-[1.3] text-foreground/90 font-light tracking-tight">
                        TeachTrack helps educators monitor engagement and classroom behavior through <span className="text-accent italic">clear insights</span> and an easy workflow.
                    </p>
                    <div className="flex gap-12">
                        <div className="space-y-6 flex-1">
                            <p className="text-sm md:text-base leading-relaxed text-foreground/60 font-light">
                                This site is the official user guide for the app: what it does, what you need to get started,
                                and the steps to run a session smoothly. Use it as a quick reference during setup and day-to-day use.
                            </p>
                        </div>
                        <div className="space-y-6 flex-1 hidden md:block border-l border-foreground/5 pl-12">
                            <p className="text-sm md:text-base leading-relaxed text-foreground/60 font-light italic">
                                "Simple steps. Clear results."
                                <br />
                                <span className="text-[10px] mt-2 block opacity-30 not-italic">— TeachTrack</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 relative group">
                    <motion.div
                        style={{ rotate, scale }}
                        className="relative aspect-square overflow-hidden bg-foreground/[0.02] border border-foreground/5 flex items-center justify-center p-8"
                    >
                        <div className="absolute inset-0 japanese-grid opacity-10" />
                        <img
                            src="/images/about.png"
                            alt="TeachTrack overview visual"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-background/20" />

                        {/* Minimalist Floating Elements */}
                        <motion.div
                            animate={{ y: [0, -20, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-12 left-12 h-16 w-[1px] bg-accent/20"
                        />
                        <motion.div
                            animate={{ x: [0, 20, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute bottom-12 right-12 w-16 h-[1px] bg-accent/20"
                        />
                    </motion.div>

                    <div className="absolute -bottom-8 -right-8 h-32 w-32 border border-foreground/5 -z-10 group-hover:translate-x-4 group-hover:translate-y-4 transition-transform duration-700" />
                </div>
            </div>
        </Section>
    );
}
