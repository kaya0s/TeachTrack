"use client";

import Section from "./Section";
import { AlertCircle, Apple, Smartphone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { type MouseEvent, useEffect, useState } from "react";

export default function CVSection() {
    const [showToast, setShowToast] = useState(false);

    const handleDownloadClick = (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        setShowToast(false);
        requestAnimationFrame(() => setShowToast(true));
    };

    useEffect(() => {
        if (!showToast) return;
        const timeout = setTimeout(() => setShowToast(false), 2200);
        return () => clearTimeout(timeout);
    }, [showToast]);

    return (
        <Section id="downloads" title="Downloads" subtitle="Get The App" verticalTitle="Downloads">
            <div className="flex flex-col items-center justify-center space-y-6 sm:space-y-8">
                <div className="max-w-2xl text-center">
                    <p className="text-base sm:text-lg leading-relaxed text-foreground/70">
                        Download the app and supporting files. Links will be added once the APK and iOS build are ready.
                    </p>
                </div>

                <div className="grid w-full max-w-md gap-3 sm:max-w-lg sm:gap-4 sm:grid-cols-2">
                    <motion.a
                        href="#"
                        onClick={handleDownloadClick}
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
                        onClick={handleDownloadClick}
                        whileHover={{ scale: 1.02, backgroundColor: "rgba(var(--foreground), 0.05)" }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center justify-center gap-3 border border-foreground/10 py-3 sm:py-4 text-[11px] sm:text-sm font-semibold transition-colors"
                    >
                        <Apple size={16} className="sm:hidden" />
                        <Apple size={18} className="hidden sm:block" />
                        iOS
                    </motion.a>
                </div>

                <AnimatePresence>
                    {showToast && (
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            transition={{ duration: 0.2 }}
                            className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 border border-accent/40 bg-accent/15 px-4 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur-sm sm:text-sm"
                        >
                            <AlertCircle size={16} className="text-accent" />
                            Not yet available
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Section>
    );
}
