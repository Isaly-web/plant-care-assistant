import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deleteMyData, PHOTO_BUCKETS } from "./account";

type Entry = { name: string; id: string | null };

function makeClient(tree: Record<string, Entry[]>, opts: { failBucket?: string } = {}) {
  const calls: string[] = [];
  const client = {
    rpc: async (fn: string) => {
      calls.push(`rpc:${fn}`);
      return { data: null, error: null };
    },
    storage: {
      from: (bucket: string) => ({
        list: async (path: string, o: { limit: number; offset: number }) => {
          const entries = tree[`${bucket}/${path}`] ?? [];
          return { data: entries.slice(o.offset, o.offset + o.limit), error: null };
        },
        remove: async (paths: string[]) => {
          calls.push(`remove:${bucket}:${paths.join(",")}`);
          return { error: bucket === opts.failBucket ? new Error("nope") : null };
        },
      }),
    },
    auth: {
      signOut: async (o?: { scope?: string }) => {
        calls.push(`signOut:${o?.scope}`);
      },
    },
  };
  return { client: client as never, calls };
}

describe("deleteMyData", () => {
  it("empties all three buckets, then deletes the rows, then signs out locally", async () => {
    const { client, calls } = makeClient({
      "plant-care-photos/u1": [{ name: "plants", id: null }],
      "plant-care-photos/u1/plants": [{ name: "a.jpg", id: "x" }],
      "plant-diagnosis-photos/u1": [{ name: "d1", id: null }],
      "plant-diagnosis-photos/u1/d1": [{ name: "photo.jpg", id: "y" }],
    });
    await deleteMyData(client, "u1");
    expect(calls).toEqual([
      "remove:plant-care-photos:u1/plants/a.jpg",
      "remove:plant-diagnosis-photos:u1/d1/photo.jpg",
      "rpc:delete_account_app_data",
      "signOut:local",
    ]);
  });

  it("covers every bucket the migrations create", () => {
    const dir = join(__dirname, "../../supabase/migrations");
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .join("\n");
    const buckets = [
      ...sql.matchAll(/insert into storage\.buckets[^;]*?values \('([\w-]+)'/gi),
    ].map((m) => m[1]);
    expect(buckets.length).toBeGreaterThan(0);
    for (const b of buckets) expect(PHOTO_BUCKETS as readonly string[]).toContain(b);
  });

  it("deletes no rows and does not sign out when files cannot be removed", async () => {
    const { client, calls } = makeClient(
      { "plant-diagnosis-photos/u1": [{ name: "a.jpg", id: "x" }] },
      { failBucket: "plant-diagnosis-photos" },
    );
    await expect(deleteMyData(client, "u1")).rejects.toThrow();
    expect(calls.some((c) => c.startsWith("rpc:") || c.startsWith("signOut"))).toBe(false);
  });
});

describe("delete_account_app_data migration", () => {
  const dir = join(__dirname, "../../supabase/migrations");
  const sqls = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(join(dir, f), "utf8"));
  const fn = readFileSync(join(dir, "20261105120000_delete_account_app_data.sql"), "utf8").replace(
    /--.*$/gm,
    "",
  );

  it("never touches auth.users", () => {
    expect(fn).not.toMatch(/auth\.users/i);
  });

  it("covers every plant_care table that references auth.users", () => {
    const tables = new Set<string>();
    for (const sql of sqls) {
      for (const m of sql.matchAll(
        /create table (?:if not exists )?plant_care\.(\w+)\s*\(([\s\S]*?)\n\);/gi,
      )) {
        if (/references auth\.users/i.test(m[2]!)) tables.add(m[1]!);
      }
    }
    expect(tables.size).toBeGreaterThan(0);
    for (const t of tables) expect(fn, `missing ${t}`).toMatch(new RegExp(`plant_care\\.${t}\\b`));
  });
});
