import { Settings } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title={<><Settings className="h-5 w-5" />Settings</>} description="Recommended governance settings to add next." />
      <Card>
        <CardHeader>
          <CardTitle>Roadmap configuration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>Alert threshold tuning by school or subject.</li>
            <li>Retention rules for logs, events, and alert history.</li>
            <li>CSV export controls and access policies.</li>
            <li>Audit viewer for admin actions.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
