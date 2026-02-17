"use client";

import Section from "./Section";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ArrowUpRight, Activity, BarChart3, ShieldCheck } from "lucide-react";

const skillCategories = [
    {
        id: "01",
        title: "Secure Access",
        icon: <ShieldCheck size={20} />,
        description: "Authenticate with email/password or Google, then recover access with verification-code password reset.",
        skills: ["Login", "Register", "Google Sign-In", "Forgot Password"],
    },
    {
        id: "02",
        title: "Live AI Monitoring",
        icon: <Activity size={20} />,
        description: "Run active sessions with server-side detector control, heartbeat checks, and real-time behavior tracking.",
        skills: ["Start/Stop Session", "Detector Control", "Behavior Logs", "Smart Alerts"],
    },
    {
        id: "03",
        title: "Classroom Analytics",
        icon: <BarChart3 size={20} />,
        description: "Manage subjects and sections, upload class cover images, and review engagement metrics and session history.",
        skills: ["Subjects & Sections", "Cover Upload", "Engagement Trends", "Model Selection"],
    },
];

export default function Skills() {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    return (
        <Section id="features" title="Features" subtitle="What You Can Do" verticalTitle="Features">
            <div className="relative mt-12 border-t border-foreground/5">
                {skillCategories.map((category, idx) => (
                    <motion.div
                        key={category.id}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        className="group relative border-b border-foreground/5 py-12 md:py-16 overflow-hidden cursor-default"
                    >
                        {/* Background Slide Effect */}
                        <motion.div
                            className="absolute inset-0 bg-accent/[0.02] -z-10"
                            animate={{
                                x: hoveredIdx === idx ? 0 : "-100%"
                            }}
                            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                        />

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                            {/* Title & Info */}
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-accent">{category.id}</span>
                                    <span className="h-px w-8 bg-accent/20" />
                                    <span className="text-accent/80">{category.icon}</span>
                                    <span className="text-[10px] uppercase tracking-widest text-foreground/40">{category.title}</span>
                                </div>

                                <h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none group-hover:text-accent transition-colors duration-500">
                                    {category.title.split(' ')[0]}
                                </h3>
                            </div>

                            {/* Description - Visible on hover or tablet+ */}
                            <div className="flex-1 max-w-md">
                                <motion.p
                                    className="text-sm md:text-base text-foreground/50 font-light leading-relaxed"
                                    animate={{
                                        opacity: hoveredIdx === idx ? 1 : 0.3,
                                        x: hoveredIdx === idx ? 0 : -10
                                    }}
                                >
                                    {category.description}
                                </motion.p>
                            </div>

                            {/* Skills List - Kinetic Reveal */}
                            <div className="flex-1 md:flex justify-end hidden">
                                <AnimatePresence>
                                    {hoveredIdx === idx && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex flex-wrap justify-end gap-3 max-w-sm"
                                        >
                                            {category.skills.map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="px-4 py-2 border border-foreground/10 text-[9px] font-black uppercase tracking-widest bg-background hover:bg-accent hover:text-background hover:border-accent transition-all duration-300"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="md:hidden flex flex-wrap gap-2 pt-4">
                                {category.skills.map((skill) => (
                                    <span key={skill} className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30">{skill}</span>
                                ))}
                            </div>
                        </div>

                        {/* Kinetic Arrow */}
                        <motion.div
                            className="absolute top-1/2 -translate-y-1/2 right-0 pointer-events-none hidden md:block"
                            animate={{
                                opacity: hoveredIdx === idx ? 0.1 : 0,
                                x: hoveredIdx === idx ? 0 : 50
                            }}
                        >
                            <ArrowUpRight size={180} strokeWidth={1} className="text-foreground" />
                        </motion.div>
                    </motion.div>
                ))}
            </div>

            {/* Bottom Footer Callout */}
            <div className="mt-20 flex flex-col md:flex-row items-end justify-between gap-12 border-l-2 border-accent/20 pl-8">
                <p className="max-w-xl text-lg md:text-xl text-foreground/60 font-light leading-relaxed">
                    Use TeachTrack as a complete flow: <span className="text-foreground font-black uppercase">secure access</span>, configure classrooms, monitor behavior in real time, and review post-session outcomes.
                    This guide mirrors the current system behavior.
                </p>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-accent mb-2">Principle</span>
                    <span className="text-2xl font-black italic tracking-tighter">Clarity First</span>
                </div>
            </div>
        </Section>
    );
}
