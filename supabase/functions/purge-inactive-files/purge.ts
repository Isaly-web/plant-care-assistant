// Deletes uploaded plant photos of users who have been inactive for FILE_RETENTION_MONTHS
// (backlog B3), in the buckets plant-care-photos (public URLs stored in plants/harvests.photo_url),
// plant-diagnosis-photos and plant-identification-photos. Plants, harvests and care tasks stay
// (photo_url is cleared); diagnosis/identification rows are removed with their photo, because
// they are the AI's observation of that photo. The shared auth.users record is never touched.
//
// Activity = latest of the shared auth last_sign_in_at / created_at and the user's own newest
// writes (plants, harvests, diagnoses, identifications) — a long-lived session does not refresh
// last_sign_in_at. Activity in another Isaly app (shared login) also keeps the photos. Fail closed:
// unreadable activity deletes nothing.
import { inactivityCutoff, isInactive, latestActivity } from "./retention.ts";

const BUCKETS = ["plant-care-photos", "plant-diagnosis-photos", "plant-identification-photos"];
const MAX_USERS_PER_RUN = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PurgeResult = {
  ok: true;
  dryRun: boolean;
  checkedUsers: number;
  inactiveUsers: number;
  deletedFiles: number;
  failedUsers: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loosely typed admin client
type Admin = any;

async function listAllPaths(admin: Admin, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [prefix];
  while (stack.length) {
    const p = stack.pop()!;
    const { data, error } = await admin.storage.from(bucket).list(p, { limit: 1000 });
    if (error) throw new Error("list failed");
    for (const item of data ?? []) {
      const full = `${p}/${item.name}`;
      if (item.id === null || item.metadata === null) stack.push(full);
      else out.push(full);
    }
  }
  return out;
}

async function newest(admin: Admin, table: string, col: string, userId: string) {
  const { data, error } = await admin
    .from(table)
    .select(col)
    .eq("user_id", userId)
    .order(col, { ascending: false })
    .limit(1);
  if (error) throw new Error(`read ${table} failed`);
  return (data?.[0]?.[col] as string | undefined) ?? null;
}

export async function purgeInactiveFiles(
  admin: Admin,
  opts: { dryRun: boolean; now?: Date },
): Promise<PurgeResult> {
  const cutoff = inactivityCutoff(opts.now ?? new Date());
  const result: PurgeResult = {
    ok: true,
    dryRun: opts.dryRun,
    checkedUsers: 0,
    inactiveUsers: 0,
    deletedFiles: 0,
    failedUsers: 0,
  };

  // Users = top-level folders across all three buckets.
  const users = new Set<string>();
  for (const bucket of BUCKETS) {
    const { data: folders, error } = await admin.storage
      .from(bucket)
      .list("", { limit: MAX_USERS_PER_RUN, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error("Could not list storage");
    for (const f of folders ?? []) if (UUID.test(f.name)) users.add(f.name);
  }

  for (const userId of [...users].slice(0, MAX_USERS_PER_RUN)) {
    result.checkedUsers++;
    try {
      const { data: u, error: uErr } = await admin.auth.admin.getUserById(userId);
      if (uErr || !u?.user) continue;
      const last = latestActivity(
        u.user.last_sign_in_at,
        u.user.created_at,
        await newest(admin, "plants", "updated_at", userId),
        await newest(admin, "harvests", "created_at", userId),
        await newest(admin, "plant_diagnoses", "created_at", userId),
        await newest(admin, "plant_identifications", "created_at", userId),
      );
      if (!isInactive(last, cutoff)) continue;
      result.inactiveUsers++;

      const perBucket: Array<[string, string[]]> = [];
      for (const bucket of BUCKETS) {
        perBucket.push([bucket, await listAllPaths(admin, bucket, userId)]);
      }
      const total = perBucket.reduce((n, [, p]) => n + p.length, 0);
      if (opts.dryRun) {
        result.deletedFiles += total;
        continue;
      }
      for (const [bucket, paths] of perBucket) {
        for (let i = 0; i < paths.length; i += 100) {
          const { error: rErr } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
          if (rErr) throw new Error("remove failed");
        }
      }
      result.deletedFiles += total;
      // Rows that point at the removed files.
      for (const table of ["plant_diagnoses", "plant_identifications"]) {
        const { error: dErr } = await admin.from(table).delete().eq("user_id", userId);
        if (dErr) throw new Error(`cleanup ${table} failed`);
      }
      for (const table of ["plants", "harvests"]) {
        const { error: pErr } = await admin
          .from(table)
          .update({ photo_url: null })
          .eq("user_id", userId)
          .not("photo_url", "is", null);
        if (pErr) throw new Error(`cleanup ${table} failed`);
      }
      console.log(`[purge-inactive-files] removed ${total} file(s) for an inactive user`);
    } catch {
      result.failedUsers++;
    }
  }
  return result;
}
