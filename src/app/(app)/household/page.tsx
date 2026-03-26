"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface HouseholdMember {
  id: string;
  owner_id: string;
  member_id: string | null;
  member_email: string;
  status: "pending" | "accepted" | "rejected";
  can_view_logs: boolean;
  can_view_weight: boolean;
  created_at: string;
  updated_at: string;
}

interface SharedLog {
  id: string;
  owner_name: string;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: string;
  logged_at: string;
}

export default function HouseholdPage() {
  const [sent, setSent] = useState<HouseholdMember[]>([]);
  const [received, setReceived] = useState<HouseholdMember[]>([]);
  const [sharedLogs, setSharedLogs] = useState<SharedLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [canViewLogs, setCanViewLogs] = useState(true);
  const [canViewWeight, setCanViewWeight] = useState(false);
  const [error, setError] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/household");
      if (!res.ok) throw new Error("Failed to load household");
      const data = await res.json();
      setSent(data.sent);
      setReceived(data.received);
    } catch {
      setError("Failed to load household data");
    }
  }, []);

  const fetchSharedLogs = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    try {
      const res = await fetch(
        `/api/household/shared-logs?date_start=${today}&date_end=${today}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSharedLogs(data.logs);
    } catch {
      // Shared logs are non-critical; fail silently
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchMembers();
      await fetchSharedLogs();
      setLoading(false);
    }
    load();
  }, [fetchMembers, fetchSharedLogs]);

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError("");

    try {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          can_view_logs: canViewLogs,
          can_view_weight: canViewWeight,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send invite");
        setInviting(false);
        return;
      }

      setInviteEmail("");
      setShowInviteForm(false);
      setCanViewLogs(true);
      setCanViewWeight(false);
      await fetchMembers();
    } catch {
      setError("Failed to send invite");
    }
    setInviting(false);
  }

  async function handleRespond(id: string, status: "accepted" | "rejected") {
    setRespondingId(id);
    setError("");

    try {
      const res = await fetch(`/api/household/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to respond");
        setRespondingId(null);
        return;
      }

      await fetchMembers();
      if (status === "accepted") {
        await fetchSharedLogs();
      }
    } catch {
      setError("Failed to respond to invite");
    }
    setRespondingId(null);
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    setError("");

    try {
      const res = await fetch(`/api/household/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to remove member");
        setRemovingId(null);
        return;
      }

      await fetchMembers();
    } catch {
      setError("Failed to remove member");
    }
    setRemovingId(null);
  }

  function statusBadge(status: string) {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "accepted":
        return <Badge variant="default">Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const hasAcceptedShares = received.some((r) => r.status === "accepted");

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-40 rounded bg-muted" />
        <div className="h-32 rounded-lg bg-muted" />
        <div className="h-32 rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Household</h1>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* My Household — Invites I've Sent */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">My Household</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInviteForm(!showInviteForm)}
          >
            {showInviteForm ? "Cancel" : "Invite"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {showInviteForm && (
            <div className="space-y-3 rounded-md border p-3">
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInvite();
                }}
              />
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={canViewLogs}
                    onChange={(e) => setCanViewLogs(e.target.checked)}
                    className="rounded"
                  />
                  Can view food logs
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={canViewWeight}
                    onChange={(e) => setCanViewWeight(e.target.checked)}
                    className="rounded"
                  />
                  Can view weight
                </label>
              </div>
              <Button
                size="sm"
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full"
              >
                {inviting ? "Sending..." : "Send Invite"}
              </Button>
            </div>
          )}

          {sent.length === 0 && !showInviteForm && (
            <p className="text-sm text-muted-foreground">
              No household members yet. Invite someone to share your nutrition
              data.
            </p>
          )}

          {sent.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.member_email}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {statusBadge(member.status)}
                  <span className="text-xs text-muted-foreground">
                    {member.can_view_logs && "Logs"}
                    {member.can_view_logs && member.can_view_weight && " + "}
                    {member.can_view_weight && "Weight"}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="ml-2 text-destructive hover:text-destructive"
                onClick={() => handleRemove(member.id)}
                disabled={removingId === member.id}
              >
                {removingId === member.id ? "..." : "Remove"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Shared With Me — Invites I've Received */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shared With Me</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {received.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No one has shared their data with you yet.
            </p>
          )}

          {received.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  From: {invite.owner_id.slice(0, 8)}...
                </p>
                <div className="mt-1 flex items-center gap-2">
                  {statusBadge(invite.status)}
                  <span className="text-xs text-muted-foreground">
                    {invite.can_view_logs && "Logs"}
                    {invite.can_view_logs && invite.can_view_weight && " + "}
                    {invite.can_view_weight && "Weight"}
                  </span>
                </div>
              </div>
              {invite.status === "pending" && (
                <div className="ml-2 flex gap-1">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleRespond(invite.id, "accepted")}
                    disabled={respondingId === invite.id}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRespond(invite.id, "rejected")}
                    disabled={respondingId === invite.id}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Shared Logs */}
      {hasAcceptedShares && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Shared Logs (Today)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sharedLogs.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No shared food logs for today.
                </p>
              )}

              {sharedLogs.map((log) => (
                <div key={log.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{log.food_name}</p>
                    <Badge variant="outline">{log.owner_name}</Badge>
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>{log.calories} kcal</span>
                    <span>P: {log.protein_g}g</span>
                    <span>C: {log.carbs_g}g</span>
                    <span>F: {log.fat_g}g</span>
                  </div>
                  {log.meal_type && (
                    <p className="mt-1 text-xs text-muted-foreground capitalize">
                      {log.meal_type}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
