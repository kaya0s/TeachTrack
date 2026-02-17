"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useInView, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionProps {
    children: React.ReactNode;
    id: string;
    className?: string;
    title?: string;
    subtitle?: string;
    verticalTitle?: string;
}

export default function Section({
    children,
    id,
    className,
    title,
    subtitle,
    verticalTitle,
}: SectionProps) {
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: false, amount: 0.1 });

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    });

    // Smooth out the scroll progress for a more "liquid" feel
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 40,
        damping: 20,
        restDelta: 0.001
    });

    // Refined, more minimal animations
    const rotateX = useTransform(smoothProgress, [0, 0.5, 1], [3, 0, -3]);
    const opacity = useTransform(smoothProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const scale = useTransform(smoothProgress, [0, 0.2, 0.8, 1], [0.99, 1, 1, 0.99]);
    const y = useTransform(smoothProgress, [0, 1], [40, -40]);

    return (
        <section
            id={id}
            ref={containerRef}
            className={cn("relative min-h-[60vh] py-20 md:py-32 flex items-center perspective-1000", className)}
        >
            <motion.div
                style={{
                    opacity,
                    scale,
                    rotateX,
                    perspective: "1200px"
                }}
                className="container mx-auto px-6 sm:px-8 md:px-16 lg:px-32 relative z-10"
            >
                {(title || subtitle) && (
                    <div className="mb-16 md:mb-24">
                        <div className="overflow-hidden">
                            {subtitle && (
                                <motion.p
                                    initial={{ y: "100%" }}
                                    animate={isInView ? { y: 0 } : { y: "100%" }}
                                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                    className="mb-4 text-[10px] font-black uppercase tracking-[0.6em] text-accent"
                                >
                                    {subtitle}
                                </motion.p>
                            )}
                        </div>
                        <div className="overflow-hidden">
                            {title && (
                                <motion.h2
                                    initial={{ y: "110%", skewY: 10 }}
                                    animate={isInView ? { y: 0, skewY: 0 } : { y: "110%", skewY: 10 }}
                                    transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                    className="text-5xl sm:text-6xl font-black md:text-8xl lg:text-9xl tracking-tighter leading-none uppercase"
                                >
                                    {title}
                                </motion.h2>
                            )}
                        </div>
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
                            transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                            className="h-[2px] w-32 bg-accent/20 mt-10 origin-left"
                        />
                    </div>
                )}

                <div className="relative">
                    {children}
                </div>
            </motion.div>

            {/* Floating vertical title with heavy parallax */}
            {verticalTitle && (
                <motion.div
                    style={{ y: useTransform(smoothProgress, [0, 1], [100, -100]) }}
                    className="absolute left-10 top-1/2 -translate-y-1/2 hidden lg:block opacity-20"
                >
                    <span className="vertical-rl text-[12px] font-black uppercase tracking-[1.5em] text-foreground select-none italic">
                        {verticalTitle}
                    </span>
                </motion.div>
            )}

            {/* Background Kinetic Canvas Element */}
            <motion.div
                style={{
                    y: useTransform(smoothProgress, [0, 1], [-50, 50]),
                    opacity: useTransform(smoothProgress, [0, 0.5, 1], [0.5, 1, 0.5])
                }}
                className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
            >
                <div className="absolute right-[-5%] top-[10%] text-[25vw] font-black italic text-foreground/[0.01] leading-none select-none">
                    {verticalTitle || title?.split(' ')[0]}
                </div>
                <div className="absolute left-[-5%] bottom-[10%] text-[20vw] font-black text-foreground/[0.01] leading-none select-none">
                    {id.toUpperCase()}
                </div>
            </motion.div>
        </section>
    );
}
