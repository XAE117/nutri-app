import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Invites I've sent (I'm the owner)
  const { data: sent, error: sentError } = await supabase
    .from("household_members")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (sentError) {
    return NextResponse.json({ error: sentError.message }, { status: 500 });
  }

  // Invites I've received (match by my email or my member_id)
  const { data: receivedByEmail, error: recvEmailError } = await supabase
    .from("household_members")
    .select("*")
    .eq("member_email", user.email!)
    .order("created_at", { ascending: false });

  if (recvEmailError) {
    return NextResponse.json(
      { error: recvEmailError.message },
      { status: 500 }
    );
  }

  const { data: receivedById, error: recvIdError } = await supabase
    .from("household_members")
    .select("*")
    .eq("member_id", user.id)
    .order("created_at", { ascending: false });

  if (recvIdError) {
    return NextResponse.json({ error: recvIdError.message }, { status: 500 });
  }

  // Merge received invites, dedup by id
  const receivedMap = new Map<string, (typeof receivedByEmail)[number]>();
  for (const row of receivedByEmail ?? []) {
    receivedMap.set(row.id, row);
  }
  for (const row of receivedById ?? []) {
    receivedMap.set(row.id, row);
  }
  const received = Array.from(receivedMap.values());

  return NextResponse.json({ sent: sent ?? [], received });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { email, can_view_logs = true, can_view_weight = false } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json(
      { error: "Email is required" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail === user.email) {
    return NextResponse.json(
      { error: "You cannot invite yourself" },
      { status: 400 }
    );
  }

  // Check for existing invite to same email from this owner
  const { data: existing } = await supabase
    .from("household_members")
    .select("id, status")
    .eq("owner_id", user.id)
    .eq("member_email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Invite already exists (${existing.status})` },
      { status: 409 }
    );
  }

  // Try to find the user by email in profiles (via auth metadata isn't
  // accessible with anon key, so we look up profiles by email match).
  // If the invited person already has an account, set member_id.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  const { data: invite, error } = await supabase
    .from("household_members")
    .insert({
      owner_id: user.id,
      member_id: profile?.id ?? null,
      member_email: normalizedEmail,
      status: "pending",
      can_view_logs,
      can_view_weight,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invite }, { status: 201 });
}
