import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/current-session", () => ({
  requireSession: vi.fn(),
}));

import { requireSession } from "@/lib/auth/current-session";
import { GET } from "./route";

describe("backup export authorization", () => {
  beforeEach(() => {
    vi.mocked(requireSession).mockRejectedValue(new Error("Not authenticated"));
  });

  it("does not expose exports without a session", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/backup/export?format=json"),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Not authenticated" });
  });
});
