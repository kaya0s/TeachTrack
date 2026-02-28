"use client";

import { Database } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function BackupPage() {
    return (
        <div className="space-y-4">
            <PageHeader
                title={
                    <>
                        <Database className="h-5 w-5" /> Backup
                    </>
                }
                description="Data redundancy and restoration controls."
            />
            <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="mb-4 text-4xl">🚧</div>
                    <h2 className="text-xl font-bold">Backup Under Development</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        We are building a robust backup and recovery system for TeachTrack.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
