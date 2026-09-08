"use client";

import Section from "./Section";
import { motion } from "framer-motion";
import { useState } from "react";
import {
    Activity,
    BarChart3,
    History,
    ShieldCheck,
    Wrench,
    Smartphone,
    Cloud,
    Sliders,
    ChevronRight,
} from "lucide-react";

const skillCategories = [
    {
        id: "01",
        badge: "SESSION MODES",
        title: "Live Mode Switching",
        icon: <Sliders size={22} />,
        description:
            "Seamlessly switch between Lecture and Exam modes in real time without stopping or resetting the active camera feed.",
        skills: ["Lecture Mode", "Exam Mode", "Zero-Downtime Switch", "Mode Timeline"],
        highlight: "Switch anytime during class",
    },
    {
        id: "02",
        badge: "PROCTORING AI",
        title: "Exam Gadget Detection",
        icon: <Smartphone size={22} />,
        description:
            "YOLO-powered proctoring detects unauthorized phone and gadget usage during exams with instant critical alert notifications and photo evidence.",
        skills: ["Phone Detection", "Critical Alerts", "Visual Snapshots", "Volatile Privacy"],
        highlight: "Real-time unauthorized device alerts",
    },
    {
        id: "03",
        badge: "VISION TELEMETRY",
        title: "Live Student Telemetry",
        icon: <Activity size={22} />,
        description:
            "Continuous tracking of on-task, off-task, sleeping, and device interaction behaviors with dynamic engagement scoring.",
        skills: ["Live Engagement", "Behavior Stream", "Smart Alerts", "Live Camera Feed"],
        highlight: "Adaptive engagement formulas",
    },
    {
        id: "04",
        badge: "DATA RESILIENCE",
        title: "Cloud Backup & Drive",
        icon: <Cloud size={22} />,
        description:
            "Automated & superuser manual database backups safely compressed and synced to Google Drive via OAuth 2.0.",
        skills: ["Google Drive Sync", "OAuth 2.0 Token", "One-Click Backup", "Audit Logging"],
        highlight: "Zero local disk overflow",
    },
    {
        id: "05",
        badge: "INTELLIGENCE",
        title: "Analytics & History",
        icon: <BarChart3 size={22} />,
        description:
            "Comprehensive post-session intelligence, multi-week engagement trends, and chronological mode switch event timelines.",
        skills: ["Dashboard Trends", "Session Details", "Mode History", "Engagement Averages"],
        highlight: "Granular historical analysis",
    },
    {
        id: "06",
        badge: "STRUCTURE",
        title: "Classroom Hierarchy",
        icon: <History size={22} />,
        description:
            "Organized institutional mapping with Colleges, Departments, Majors, Subjects, and Sections for clear administrative context.",
        skills: ["College Mapping", "Departments", "Sections & Subjects", "Teacher Rosters"],
        highlight: "Institutional context mapping",
    },
    {
        id: "07",
        badge: "SECURITY",
        title: "Secure Access & Auth",
        icon: <ShieldCheck size={22} />,
        description:
            "Role-based authentication with email/password, Google OAuth, and secure email verification-code password reset.",
        skills: ["Sign In", "Register", "Google Sign-In", "Password Reset"],
        highlight: "Role-based authorization",
    },
    {
        id: "08",
        badge: "OPERATIONS",
        title: "Admin Portal & Models",
        icon: <Wrench size={22} />,
        description:
            "Full superuser oversight: manage teachers, review audit logs, and dynamically switch active YOLO model weight versions.",
        skills: ["Teacher Management", "Model Weights Switch", "Audit Logs", "Session Controls"],
        highlight: "Dynamic model hot-swapping",
    },
];

export default function Skills() {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    return (
        <Section id="features" title="Features" subtitle="What You Can Do" verticalTitle="Features" className="py-20 md:py-24">
            {/* Grid of feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {skillCategories.map((category, idx) => {
                    const isHovered = hoveredIdx === idx;
                    return (
                        <motion.div
                            key={category.id}
                            onMouseEnter={() => setHoveredIdx(idx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                            whileHover={{ y: -4 }}
                            transition={{ duration: 0.25 }}
                            className={`relative border p-6 md:p-7 flex flex-col justify-between transition-all duration-300 ${
                                isHovered
                                    ? "border-accent/60 bg-foreground/[0.03] shadow-lg shadow-accent/5"
                                    : "border-foreground/10 bg-background hover:border-accent/30"
                            }`}
                        >
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="p-3 bg-accent/[0.08] border border-accent/20 text-accent rounded-sm">
                                        {category.icon}
                                    </div>
                                    <span className="text-[10px] font-black tracking-widest text-accent/80 font-mono">
                                        {category.id}
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-accent/90 block">
                                        {category.badge}
                                    </span>
                                    <h3 className="text-lg md:text-xl font-black uppercase tracking-tight">
                                        {category.title}
                                    </h3>
                                </div>

                                <p className="text-xs text-foreground/65 font-light leading-relaxed">
                                    {category.description}
                                </p>

                                <div className="pt-3 border-t border-foreground/5 flex flex-wrap gap-1.5">
                                    {category.skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="px-2 py-0.5 border border-foreground/10 bg-foreground/[0.02] text-[9px] font-semibold text-foreground/75 uppercase tracking-wider"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4 mt-4 border-t border-foreground/5 flex items-center justify-between text-[10px] font-medium text-foreground/50">
                                <span className="italic">{category.highlight}</span>
                                <ChevronRight size={14} className="text-accent/70" />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Bottom Principle Callout */}
            <div className="mt-14 p-6 md:p-8 border border-accent/20 bg-accent/[0.03] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Design Philosophy</span>
                    <p className="text-sm md:text-base text-foreground/80 font-light">
                        Built for educators: real-time behavioral insights, privacy-compliant proctoring, and cloud reliability without unnecessary friction.
                    </p>
                </div>
                <div className="px-4 py-2 border border-accent/40 bg-accent/10 text-accent text-xs font-black uppercase tracking-widest shrink-0">
                    Accuracy • Privacy • Durability
                </div>
            </div>
        </Section>
    );
}
