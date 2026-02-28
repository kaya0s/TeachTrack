"use client";

import { FormEvent, useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getUsers, patchUser, resetPassword } from "@/features/admin/api";
import type { AdminUser } from "@/features/admin/types";

export default function UsersPage() {
  const { notify } = useToast();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params = query ? `?q=${encodeURIComponent(query)}` : "";
      const res = await getUsers(params);
      setItems(res.items);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
      notify({ tone: "danger", title: "Users load failed", description: message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await load();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Users" description="Manage teacher/operator access and account states." />
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={onSearch} className="mb-4 flex gap-2">
            <Input placeholder="Search username or email" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button variant="outline" type="submit">Search</Button>
          </form>
          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : items.length ? (
            <Table>
              <THead><TR><TH>ID</TH><TH>Username</TH><TH>Email</TH><TH>Role</TH><TH>Status</TH><TH>Actions</TH></TR></THead>
              <TBody>
                {items.map((user) => (
                  <TR key={user.id}>
                    <TD>{user.id}</TD>
                    <TD>{user.username}</TD>
                    <TD>{user.email}</TD>
                    <TD><Badge tone={user.is_superuser ? "warning" : "default"}>{user.is_superuser ? "Admin" : "User"}</Badge></TD>
                    <TD><Badge tone={user.is_active ? "success" : "danger"}>{user.is_active ? "Active" : "Disabled"}</Badge></TD>
                    <TD className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          await patchUser(user.id, { is_active: !user.is_active });
                          notify({
                            tone: "success",
                            title: `User ${user.is_active ? "disabled" : "enabled"}`,
                            description: user.username,
                          });
                          await load();
                        } catch (err) {
                          notify({
                            tone: "danger",
                            title: "Status update failed",
                            description: err instanceof Error ? err.message : "Could not update user status.",
                          });
                        }
                      }}>
                        {user.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          await patchUser(user.id, { is_superuser: !user.is_superuser });
                          notify({
                            tone: "success",
                            title: user.is_superuser ? "Admin role removed" : "Admin role granted",
                            description: user.username,
                          });
                          await load();
                        } catch (err) {
                          notify({
                            tone: "danger",
                            title: "Role update failed",
                            description: err instanceof Error ? err.message : "Could not update role.",
                          });
                        }
                      }}>
                        {user.is_superuser ? "Remove admin" : "Make admin"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        const newPass = window.prompt("Set temporary password (min 8 chars):");
                        if (!newPass) return;
                        try {
                          await resetPassword(user.id, newPass);
                          notify({
                            tone: "success",
                            title: "Temporary password set",
                            description: `Account: ${user.username}`,
                          });
                        } catch (err) {
                          notify({
                            tone: "danger",
                            title: "Password reset failed",
                            description: err instanceof Error ? err.message : "Could not reset password.",
                          });
                        }
                      }}>
                        Reset password
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No users found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
