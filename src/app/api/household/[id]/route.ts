import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !["accepted", "rejected"].includes(status)) {
    return NextResponse.json(
      { error: "Status must be 'accepted' or 'rejected'" },
      { status: 400 }
    );
  }

  // Verify this invite belongs to the current user (as the invited member)
  const { data: invite } = await supabase
    .from("household_members")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const isRecipient =
    invite.member_email === user.email || invite.member_id === user.id;

  if (!isRecipient) {
    return NextResponse.json(
      { error: "You can only respond to invites sent to you" },
      { status: 403 }
    );
  }

  // Update status and set member_id if not already set
  const { data: updated, error } = await supabase
    .from("household_members")
    .update({
      status,
      member_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invite: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify this invite belongs to the current user as owner
  const { data: invite } = await supabase
    .from("household_members")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Only the household owner can remove members" },
      { status: 403 }
    );
  }

  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
