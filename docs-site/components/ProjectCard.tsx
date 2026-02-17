"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface Project {
    id: number;
    title: string;
    category: string;
    description: string;
    image: string;
    tech: string[];
}

interface ProjectCardProps {
    project: Project;
    onClick: () => void;
    className?: string;
}

export default function ProjectCard({ project, onClick, className }: ProjectCardProps) {
    return (
        <motion.div
            layoutId={`project-${project.id}`}
            onClick={onClick}
            whileHover="hover"
            initial="initial"
            className={`group relative cursor-pointer overflow-hidden bg-background ${className}`}
        >
            <div className="relative h-full w-full overflow-hidden">
                <motion.div
                    variants={{
                        initial: { scale: 1 },
                        hover: { scale: 1.05 }
                    }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full w-full bg-foreground/[0.02]"
                >
                    {/* Dynamic Image or Placeholder */}
                    {project.image && project.image !== "/images/will-be-put-soon.jpg" ? (
                        <img
                            src={project.image}
                            alt={project.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                // Fallback to placeholder if image fails to load
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                    ) : null}
                    
                    {/* Placeholder/Abstract Design - Always present but hidden when image loads */}
                    <div className={`flex h-full w-full items-center justify-center p-12 ${project.image && project.image !== "/images/will-be-put-soon.jpg" ? 'hidden' : ''}`}>
                        <span className="font-serif text-[10vw] md:text-[6vw] font-black opacity-[0.03] select-none uppercase tracking-tighter">
                            {project.title.split(' ')[0]}
                        </span>
                    </div>
                </motion.div>

                {/* Hover Gradient */}
                <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>

            {/* Mobile Overlay (minimal) */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 pointer-events-none md:hidden">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black tracking-widest text-foreground/20">/ 0{project.id}</span>
                        <div className="h-px flex-1 bg-foreground/5" />
                    </div>
                    <h3 className="text-3xl font-black tracking-tighter leading-none uppercase">
                        {project.title}
                    </h3>
                    <div className="inline-flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">Review</span>
                        <ArrowUpRight size={18} className="text-accent" />
                    </div>
                </div>
            </div>

            {/* Overlay Content - Desktop */}
            <div className="absolute inset-0 z-20 hidden md:flex flex-col justify-end p-10 pointer-events-none">
                <motion.div
                    variants={{
                        initial: { y: 0 },
                        hover: { y: -10 }
                    }}
                    className="space-y-3"
                >
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-accent">
                            {project.category}
                        </span>
                        <div className="h-px flex-1 bg-foreground/5" />
                    </div>

                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl md:text-5xl font-black tracking-tighter leading-none">
                            {project.title}
                        </h3>
                        <div className="mb-1 overflow-hidden">
                            <motion.div
                                variants={{
                                    initial: { x: -20, y: 20, opacity: 0 },
                                    hover: { x: 0, y: 0, opacity: 1 }
                                }}
                            >
                                <ArrowUpRight size={24} className="text-accent" />
                            </motion.div>
                        </div>
                    </div>

                    <motion.div
                        variants={{
                            initial: { opacity: 0, height: 0 },
                            hover: { opacity: 1, height: 'auto' }
                        }}
                        className="flex flex-wrap gap-x-4 gap-y-2 pt-2"
                    >
                        {project.tech.map((t) => (
                            <span key={t} className="text-[8px] font-black uppercase tracking-widest text-foreground/30">
                                {t}
                            </span>
                        ))}
                    </motion.div>
                </motion.div>
            </div>

            {/* Decorative Index */}
            <div className="absolute top-6 left-6 z-10 hidden md:block">
                <span className="text-[9px] font-black tracking-widest text-foreground/10">/ 0{project.id}</span>
            </div>
        </motion.div>
    );
}
