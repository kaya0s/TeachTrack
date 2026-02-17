"use client";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-foreground/5 py-8">
            <div className="container mx-auto px-8 md:px-16 lg:px-32">
                <div className="flex flex-col items-center gap-4 text-center">
                    <span className="font-serif text-xl font-bold tracking-tighter">
                        Teach<span className="text-accent">Track</span>
                    </span>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/30">
                        © {currentYear} All Rights Reserved
                    </p>
                </div>
            </div>
        </footer>
    );
}
