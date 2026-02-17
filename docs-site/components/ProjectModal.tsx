"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Github, ArrowRight } from "lucide-react";
import { useEffect } from "react";

interface Project {
    id: number;
    title: string;
    category: string;
    description: string;
    longDescription: string;
    image: string;
    tech: string[];
    features: string[];
}

interface ProjectModalProps {
    project: Project | null;
    onClose: () => void;
}

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
    useEffect(() => {
        if (project) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
    }, [project]);

    return (
        <AnimatePresence>
            {project && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-8">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/90 backdrop-blur-xl"
                    />

                    {/* Modal Content */}
                    <motion.div
                        layoutId={`project-${project.id}`}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="relative z-10 w-full max-w-5xl max-h-[92svh] md:max-h-[85vh] overflow-hidden border border-foreground/5 bg-background shadow-[0_0_100px_rgba(0,0,0,0.2)] md:my-auto"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute right-4 top-4 md:right-6 md:top-6 z-50 rounded-full bg-background/50 p-3 text-foreground/40 backdrop-blur-md transition-all hover:bg-accent hover:text-background"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col md:flex-row h-full max-h-[92svh] md:max-h-[85vh] overflow-hidden">
                            {/* Visual Side with Conditional Collage */}
                            <div
                                className={`relative w-full md:w-1/2 bg-foreground/[0.02] overflow-hidden md:border-r border-foreground/5 ${
                                    project.image && project.image !== "/images/will-be-put-soon.jpg" ? "" : "hidden md:block"
                                }`}
                            >
                                <div className="absolute inset-0 japanese-grid opacity-10" />
                                
                                {project.image && project.image !== "/images/will-be-put-soon.jpg" ? (
                                    /* Scrollable Collage Container - Only when image exists */
                                    <div className="h-full overflow-y-auto custom-scrollbar">
                                        <div className="relative">
                                            {/* Large Hero Image - Full Width */}
                                            <div className="relative overflow-hidden border-b border-foreground/5">
                                                <img
                                                    src={project.image}
                                                    alt={project.title}
                                                    className="w-full h-56 object-cover transition-transform duration-700 hover:scale-105"
                                                />
                                                <div className="absolute bottom-4 left-4 text-white text-xs font-black uppercase tracking-widest opacity-80">
                                                    {project.category}
                                                </div>
                                            </div>

                                            {/* Asymmetric Grid */}
                                            <div className="grid grid-cols-3 gap-0">
                                                {/* Tall Left Image */}
                                                <div className="col-span-1 row-span-2 relative overflow-hidden border-r border-b border-foreground/5">
                                                    <img
                                                        src={project.image}
                                                        alt={`${project.title} detail 1`}
                                                        className="w-full h-40 object-cover transition-all duration-700 hover:scale-110"
                                                    />
                                                </div>
                                                
                                                {/* Top Right Image */}
                                                <div className="col-span-2 relative overflow-hidden border-b border-foreground/5">
                                                    <img
                                                        src={project.image}
                                                        alt={`${project.title} detail 2`}
                                                        className="w-full h-20 object-cover transition-transform duration-700 hover:scale-105"
                                                    />
                                                </div>
                                                
                                                {/* Bottom Right Image */}
                                                <div className="col-span-2 relative overflow-hidden border-b border-foreground/5">
                                                    <img
                                                        src={project.image}
                                                        alt={`${project.title} detail 3`}
                                                        className="w-full h-20 object-cover transition-transform duration-700 hover:scale-105"
                                                    />
                                                </div>
                                            </div>

                                            {/* Overlapping Images Section */}
                                            <div className="relative h-32 overflow-hidden border-b border-foreground/5">
                                                <img
                                                    src={project.image}
                                                    alt={`${project.title} workflow`}
                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                                />
                                                
                                                {/* Floating Overlay Elements */}
                                                <div className="absolute top-2 left-2 w-16 h-16 border-2 border-accent/30 transform rotate-45 transition-transform duration-700 hover:rotate-90" />
                                                <div className="absolute bottom-2 right-2 w-12 h-12 border border-accent/20 transition-all duration-700 hover:scale-150" />
                                            </div>

                                            {/* Mosaic Strip */}
                                            <div className="grid grid-cols-4 gap-0 border-b border-foreground/5">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div key={i} className="relative overflow-hidden border-r border-foreground/5 last:border-r-0">
                                                        <img
                                                            src={project.image}
                                                            alt={`${project.title} mosaic ${i}`}
                                                            className="w-full h-16 object-cover transition-all duration-700 hover:scale-110 "
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Diagonal Split Section */}
                                            <div className="relative h-24 overflow-hidden border-b border-foreground/5">
                                                <div className="absolute inset-0 flex">
                                                    <div className="relative w-1/2 overflow-hidden border-r border-foreground/5">
                                                        <img
                                                            src={project.image}
                                                            alt={`${project.title} split 1`}
                                                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                                        />
                                                    </div>
                                                    <div className="relative w-1/2 overflow-hidden">
                                                        <img
                                                            src={project.image}
                                                            alt={`${project.title} split 2`}
                                                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                {/* Diagonal Line Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-full h-px bg-accent/30 transform rotate-12" />
                                                </div>
                                            </div>

                                            {/* Bottom Info with Background */}
                                            <div className="relative p-8 bg-gradient-to-b from-foreground/[0.02] to-foreground/[0.05]">
                                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
                                                <div className="text-center">
                                                    <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.6em] text-accent">
                                                        Trajectory {project.id}
                                                    </span>
                                                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mb-4">
                                                        {project.title.split(' ')[0]} <br />
                                                        <span className="text-outline-accent text-transparent">{project.title.split(' ')[1] || "Project"}</span>
                                                    </h2>
                                                    <div className="h-12 w-px bg-gradient-to-b from-accent to-transparent mx-auto" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Clean Layout - No Images */
                                    <div className="h-full flex flex-col items-center justify-center p-10 md:p-12">
                                        <div className="text-center space-y-8">
                                            <span className="font-serif text-[8vw] md:text-6vw font-black opacity-[0.03] select-none uppercase tracking-tighter">
                                                {project.title.split(' ')[0]}
                                            </span>
                                            <div className="space-y-4">
                                                <span className="mb-4 block text-[10px] font-black uppercase tracking-[0.6em] text-accent">
                                                    Trajectory {project.id}
                                                </span>
                                                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none">
                                                    {project.title.split(' ')[0]} <br />
                                                    <span className="text-outline-accent text-transparent">{project.title.split(' ')[1] || "Project"}</span>
                                                </h2>
                                                <div className="h-12 w-px bg-gradient-to-b from-accent to-transparent mx-auto" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Info Side */}
                            <div className="w-full md:w-1/2 overflow-y-auto p-6 sm:p-8 md:p-16 custom-scrollbar">
                                {(!project.image || project.image === "/images/will-be-put-soon.jpg") && (
                                    <div className="mb-10 md:hidden">
                                        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-foreground/30">
                                            Trajectory 0{project.id}
                                        </span>
                                        <div className="mt-4 h-px w-full bg-foreground/5" />
                                    </div>
                                )}
                                <div className="mb-12">
                                    <div className="flex items-center gap-4 mb-6">
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">
                                            {project.category}
                                        </span>
                                        <div className="h-px flex-1 bg-foreground/5" />
                                    </div>
                                    <h3 className="text-3xl font-black tracking-tighter mb-4 uppercase">{project.title}</h3>
                                    <p className="text-base text-foreground/50 leading-relaxed font-light">
                                        {project.longDescription}
                                    </p>
                                </div>

                                <div className="mb-12 space-y-10">
                                    <div>
                                        <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 flex items-center gap-4">
                                            Features <div className="h-px flex-1 bg-foreground/5" />
                                        </h4>
                                        <ul className="space-y-4">
                                            {project.features.map((f) => (
                                                <li key={f} className="flex items-center gap-4 text-sm text-foreground/70 font-light group">
                                                    <ArrowRight size={14} className="text-accent group-hover:translate-x-1 transition-transform" />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/30 flex items-center gap-4">
                                            Stack <div className="h-px flex-1 bg-foreground/5" />
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {project.tech.map((t) => (
                                                <span
                                                    key={t}
                                                    className="px-3 py-1.5 border border-foreground/10 text-[9px] font-black uppercase tracking-widest text-foreground/40 hover:border-accent hover:text-accent transition-colors"
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-foreground/5">
                                    <a
                                        href="#"
                                        className="flex-1 group flex items-center justify-center gap-3 bg-foreground py-4 text-[10px] font-black uppercase tracking-widest text-background hover:bg-accent transition-colors"
                                    >
                                        Live Preview <ExternalLink size={14} />
                                    </a>
                                    <a
                                        href="#"
                                        className="flex-1 flex items-center justify-center gap-3 border border-foreground/10 py-4 text-[10px] font-black uppercase tracking-widest hover:border-accent hover:text-accent transition-colors"
                                    >
                                        Source Code <Github size={16} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
