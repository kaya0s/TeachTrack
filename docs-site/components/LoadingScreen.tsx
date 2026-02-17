"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
    const [percent, setPercent] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setPercent((prev) => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(onComplete, 300);
                    return 100;
                }
                return prev + 2;
            });
        }, 20);
        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <>
            {/* TEACHTRACK Branding */}
            <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                className="fixed inset-0 z-[199] flex items-center justify-center pointer-events-none"
            >
                <motion.span
                    animate={{
                        opacity: percent === 100 ? 0 : 1
                    }}
                    transition={{ duration: 0.8 }}
                    className="text-[25vw] font-black tracking-tighter uppercase text-foreground/5"
                >
                    TEACHTRACK
                </motion.span>
            </motion.div>

            {/* Loading Line */}
            <motion.div
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="fixed bottom-0 left-0 right-0 z-[200] h-1 bg-background/80 backdrop-blur-sm"
            >
                <motion.div
                    className="h-full bg-accent"
                    initial={{ width: "0%" }}
                    animate={{ width: `${percent}%` }}
                    transition={{ 
                        type: "spring", 
                        stiffness: 50, 
                        damping: 20,
                        mass: 1
                    }}
                    style={{
                        boxShadow: "0 0 8px rgba(42, 51, 78, 0.4)"
                    }}
                />
            </motion.div>
        </>
    );
}
