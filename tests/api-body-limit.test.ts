import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseJsonBody } from "@/lib/api/handlers";

const URL = "https://app.example.com/api/test";
const oversizedJson = JSON.stringify("x".repeat(256 * 1024));

describe("parseJsonBody size limit", () => {
  it("rejects an oversized streamed body when content-length is absent", async () => {
    const request = new NextRequest(URL, {
      method: "POST",
      body: oversizedJson,
    });

    await expect(parseJsonBody(request, z.string())).rejects.toMatchObject({ status: 413 });
  });

  it("rejects an oversized body even when content-length understates its size", async () => {
    const request = new NextRequest(URL, {
      method: "POST",
      headers: { "content-length": "1" },
      body: oversizedJson,
    });

    await expect(parseJsonBody(request, z.string())).rejects.toMatchObject({ status: 413 });
  });
});
