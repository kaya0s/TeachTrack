"use client";

import Section from "./Section";
import { Apple, Smartphone } from "lucide-react";
import { motion } from "framer-motion";

export default function CVSection() {
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
        </Section>
    );
}
