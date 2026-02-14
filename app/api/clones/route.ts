import { NextResponse } from "next/server";
import { mockClones, mockPeople } from "@/lib/mock-data";

export async function GET() {
  const clonesWithOwners = mockClones.map((clone) => {
    const owner = mockPeople.find((p) => p.id === clone.owner_id);
    return {
      ...clone,
      owner_name: owner?.name,
      owner_role: owner?.role,
      owner_department: owner?.department,
    };
  });

  return NextResponse.json({ clones: clonesWithOwners });
}
