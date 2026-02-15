import { NextResponse } from "next/server";
import { getCloneDetailForApi } from "@/lib/memory/clone-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getCloneDetailForApi(id);
  if (!data) {
    return NextResponse.json({ error: "Clone not found" }, { status: 404 });
  }
  return NextResponse.json(data);
}
