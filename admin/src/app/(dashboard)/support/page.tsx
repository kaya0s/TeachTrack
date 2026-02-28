"use client";

import { LifeBuoy, Mail, MessageSquare, Phone } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const developers = [
    {
        name: "Kayaos",
        role: "Fullstack Developer",
        avatar: "/images/profile1.png",
        email: "kayaos@teachtrack.io",
        status: "Online",
    },
    {
        name: "JASSEL",
        role: "Documentation Lead",
        avatar: "/images/profile2.png",
        email: "jassel@teachtrack.io",
        status: "Away",
    },
    {
        name: "JOSUA",
        role: "UI/UX Designer",
        avatar: "/images/profile3.png",
        email: "josua@teachtrack.io",
        status: "Online",
    },
];

export default function SupportPage() {
    return (
        <div className="mx-auto max-w-5xl space-y-8">
            <PageHeader
                title={
                    <>
                        <LifeBuoy className="h-5 w-5" /> Developer Support
                    </>
                }
                description="Direct line to the TeachTrack engineering team for critical issues."
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {developers.map((dev) => (
                    <Card key={dev.name} className="overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:shadow-lg">
                        <CardHeader className="flex flex-col items-center pb-2">
                            <div className="relative mb-4">
                                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-primary/10 ring-4 ring-background">
                                    <img src={dev.avatar} alt={dev.name} className="h-full w-full object-cover" />
                                </div>
                                <div
                                    className={`absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-background ${dev.status === "Online" ? "bg-success" : "bg-warning"
                                        }`}
                                />
                            </div>
                            <CardTitle className="text-center text-lg">{dev.name}</CardTitle>
                            <p className="text-xs font-medium text-muted-foreground">{dev.role}</p>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex flex-col gap-2">
                                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                                    <Mail className="h-4 w-4 text-primary" />
                                    <span className="truncate text-xs">{dev.email}</span>
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                                    <MessageSquare className="h-4 w-4 text-primary" />
                                    <span className="text-xs">Chat with {dev.name.split(" ")[0]}</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="border-border/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Phone className="h-4 w-4" /> Emergency Hotline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg font-bold">+1 (800) TEACH-TRACK</p>
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider">
                            <Mail className="h-4 w-4" /> Technical Documentation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="link" className="h-auto p-0 text-primary">
                            Visit developer portal &rarr;
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-xl border border-warning/20 bg-warning/5 p-4 text-center">
                <p className="text-xs font-medium text-warning-foreground/80">
                    🚧 This support portal is currently being connected to our live ticketing system.
                </p>
            </div>
        </div>
    );
}
