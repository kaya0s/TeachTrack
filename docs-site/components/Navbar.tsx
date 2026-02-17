"use client";

import { useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent, useSpring } from "framer-motion";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";

const navItems = [
    { name: "Overview", href: "#overview" },
    { name: "Features", href: "#features" },
    { name: "Team", href: "#team" },
    { name: "How To Use", href: "#how-to-use" },
    { name: "Downloads", href: "#downloads" },
    { name: "Support", href: "#support" },
];

export default function Navbar() {
    const [hidden, setHidden] = useState(false);
    const { scrollY, scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() ?? 0;
        if (latest > previous && latest > 150) {
            setHidden(true);
        } else {
            setHidden(false);
        }
    });

    return (
        <>
            <motion.nav
                variants={{
                    visible: { y: 0, opacity: 1 },
                    hidden: { y: -100, opacity: 0 },
                }}
                animate={hidden ? "hidden" : "visible"}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center"
            >
                <div className="w-full h-[1px] bg-foreground/20 overflow-hidden">
                    <motion.div
                        className="h-full bg-accent/90 origin-left"
                        style={{ scaleX }}
                    />
                </div>

                <div className="mt-4 md:mt-8 flex items-center gap-6 border border-foreground/20 bg-background/90 px-4 py-2 shadow-[0_10px_35px_rgba(0,0,0,0.2)] backdrop-blur-md sm:px-5 md:gap-10 md:px-8 md:py-3">
                    <div className="hidden md:flex items-center gap-10">
                        {navItems.map((item) => (
                            <a
                                key={item.name}
                                href={item.href}
                                className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/80 transition-all hover:text-accent hover:tracking-[0.45em]"
                            >
                                {item.name}
                            </a>
                        ))}
                    </div>

                    <div className="hidden h-4 w-px bg-foreground/30 md:block" />

                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="p-1 text-foreground/80 transition-all hover:text-accent hover:scale-110"
                        aria-label="Toggle theme"
                    >
                        {mounted && (theme === "dark" ? <Sun size={14} className="md:hidden" strokeWidth={2} /> : <Moon size={14} className="md:hidden" strokeWidth={2} />)}
                        {mounted && (theme === "dark" ? <Sun size={16} className="hidden md:block" strokeWidth={2} /> : <Moon size={16} className="hidden md:block" strokeWidth={2} />)}
                    </button>

                    <button
                        className="p-1.5 text-foreground/80 transition-colors hover:text-accent md:hidden"
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu size={18} />
                    </button>
                </div>
            </motion.nav>

            {/* Mobile Menu */}
            <motion.div
                initial={false}
                animate={mobileMenuOpen ? "open" : "closed"}
                variants={{
                    open: { x: 0 },
                    closed: { x: "100%" },
                }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-0 z-[60] overflow-y-auto bg-background/95 backdrop-blur-md md:hidden"
            >
                <div className="flex flex-col min-h-full p-8 sm:p-10">
                    <div className="flex justify-end items-center mb-14 sm:mb-20">
                        <button 
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2 text-foreground/80 transition-colors hover:text-accent"
                        >
                            <X size={28} strokeWidth={1.5} />
                        </button>
                    </div>
                    <div className="flex flex-col gap-10 sm:gap-14">
                        {navItems.map((item, idx) => (
                            <motion.a
                                key={item.name}
                                href={item.href}
                                initial={{ opacity: 0, x: 20 }}
                                animate={mobileMenuOpen ? { opacity: 1, x: 0 } : {}}
                                transition={{ delay: 0.2 + idx * 0.1 }}
                                onClick={() => setMobileMenuOpen(false)}
                                className="text-4xl sm:text-5xl font-black tracking-tighter text-foreground/90 transition-colors hover:text-accent"
                            >
                                {item.name}
                            </motion.a>
                        ))}
                    </div>
                    <div className="mt-auto flex justify-between items-end">
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="border border-foreground/25 p-3 text-foreground/80 transition-colors hover:border-accent hover:text-accent"
                        >
                            {mounted && (theme === "dark" ? <Sun size={24} /> : <Moon size={24} />)}
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-foreground/20">© 2026</span>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
