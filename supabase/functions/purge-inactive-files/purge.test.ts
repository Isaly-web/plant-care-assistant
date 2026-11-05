import { describe, expect, it } from "vitest";
import { purgeInactiveFiles } from "./purge.ts";

const UID = "11111111-1111-1111-1111-111111111111";
const now = new Date("2026-11-04T00:00:00Z");

function fake(o: { lastSignIn: string | null; plantUpdated?: string }) {
  const removed: string[] = [];
  const deleted: string[] = [];
  const updated: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
  const admin: any = {
    removed,
    deleted,
    updated,
    auth: {
      admin: {
        getUserById: async () =>
          o.lastSignIn === null
            ? { data: null, error: new Error("x") }
            : {
                data: { user: { last_sign_in_at: o.lastSignIn, created_at: o.lastSignIn } },
                error: null,
              },
      },
    },
    storage: {
      from: (bucket: string) => ({
        list: async (p: string) =>
          p === ""
            ? { data: bucket === "plant-care-photos" ? [{ name: UID, id: null }] : [], error: null }
            : { data: [{ name: "a.jpg", id: "1", metadata: {} }], error: null },
        remove: async (paths: string[]) => (
          removed.push(...paths.map((x) => `${bucket}:${x}`)),
          { error: null }
        ),
      }),
    },
    from(table: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test double
      const q: any = {
        select: () => q,
        eq: () => q,
        not: () => q,
        order: () => q,
        limit: () =>
          Promise.resolve({
            data: table === "plants" && o.plantUpdated ? [{ updated_at: o.plantUpdated }] : [],
            error: null,
          }),
        delete: () => (deleted.push(table), q),
        update: () => (updated.push(table), q),
        then: (res: (v: unknown) => unknown) => res({ data: [], error: null }),
      };
      return q;
    },
  };
  return admin;
}

describe("purgeInactiveFiles", () => {
  it("removes files from every bucket and cleans rows for an inactive user", async () => {
    const a = fake({ lastSignIn: "2025-01-01T00:00:00Z" });
    const r = await purgeInactiveFiles(a, { dryRun: false, now });
    expect(r.inactiveUsers).toBe(1);
    expect(a.removed).toContain(`plant-care-photos:${UID}/a.jpg`);
    expect(a.removed).toContain(`plant-diagnosis-photos:${UID}/a.jpg`);
    expect(a.deleted).toEqual(["plant_diagnoses", "plant_identifications"]);
    expect(a.updated).toEqual(["plants", "harvests"]);
  });
  it("dry run deletes nothing", async () => {
    const a = fake({ lastSignIn: "2025-01-01T00:00:00Z" });
    const r = await purgeInactiveFiles(a, { dryRun: true, now });
    expect(r.deletedFiles).toBe(3);
    expect(a.removed.length).toBe(0);
  });
  it("recent plant edits keep the photos", async () => {
    const a = fake({ lastSignIn: "2025-01-01T00:00:00Z", plantUpdated: "2026-10-20T00:00:00Z" });
    expect((await purgeInactiveFiles(a, { dryRun: false, now })).inactiveUsers).toBe(0);
  });
  it("unreadable user keeps the photos", async () => {
    const a = fake({ lastSignIn: null });
    expect((await purgeInactiveFiles(a, { dryRun: false, now })).inactiveUsers).toBe(0);
  });
});
