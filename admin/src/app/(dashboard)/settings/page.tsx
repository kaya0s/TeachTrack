import { Settings } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title={<><Settings className="h-5 w-5" />Settings</>} description="System preferences and controls." />
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-4 text-4xl">🚧</div>
          <h2 className="text-xl font-bold">Settings Under Development</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We are working on bringing advanced governance and configuration tools to TeachTrack.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
