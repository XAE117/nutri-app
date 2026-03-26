import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStart = searchParams.get("date_start");
  const dateEnd = searchParams.get("date_end");

  if (!dateStart || !dateEnd) {
    return NextResponse.json(
      { error: "date_start and date_end are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("get_shared_food_logs", {
    p_viewer_id: user.id,
    p_date_start: dateStart,
    p_date_end: dateEnd,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}
