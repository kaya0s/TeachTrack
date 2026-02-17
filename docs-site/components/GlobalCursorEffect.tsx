"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function GlobalCursorEffect() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <motion.div
            className="pointer-events-none fixed inset-0 z-50 opacity-20"
            animate={{
                background: `radial-gradient(800px at ${mousePosition.x}px ${mousePosition.y}px, var(--color-accent) 0%, transparent 80%)`,
            }}
            transition={{ type: "tween", ease: "backOut", duration: 0.5 }}
        />
    );
}
