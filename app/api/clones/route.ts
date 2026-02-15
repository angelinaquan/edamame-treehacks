import { NextResponse } from "next/server";
import { listClonesForApi } from "@/lib/clone-repository";

export async function GET() {
  const clones = await listClonesForApi();
  return NextResponse.json({ clones });
}
