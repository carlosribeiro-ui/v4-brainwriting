import { neon } from "@neondatabase/serverless";

export const CLUSTER_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
const VALID_VOTE_TYPES = new Set(["qw", "sb", "ms"]);

export function getSql() {
  const databaseUrl = Netlify.env.get("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("missing_env_DATABASE_URL");
  }
  return neon(databaseUrl);
}

export function normalizeVotes(rawVotes: unknown) {
  const normalized: Array<{ clusterId: number; voteType: "qw" | "sb" | "ms" }> = [];
  if (!rawVotes || typeof rawVotes !== "object") return normalized;

  for (const [clusterIdRaw, voteType] of Object.entries(rawVotes as Record<string, unknown>)) {
    const clusterId = Number(clusterIdRaw);
    if (!CLUSTER_IDS.includes(clusterId)) continue;
    if (typeof voteType !== "string" || !VALID_VOTE_TYPES.has(voteType)) continue;
    normalized.push({ clusterId, voteType: voteType as "qw" | "sb" | "ms" });
  }

  return normalized.sort((a, b) => a.clusterId - b.clusterId);
}

export function emptyTotals() {
  return CLUSTER_IDS.reduce<Record<string, { qw: number; sb: number; ms: number }>>((acc, clusterId) => {
    acc[String(clusterId)] = { qw: 0, sb: 0, ms: 0 };
    return acc;
  }, {});
}

export async function fetchResultsSummary() {
  const sql = getSql();
  const result = await sql`
    SELECT
      COALESCE((SELECT total_voters FROM vote_meta WHERE id = true), 0) AS voters,
      COALESCE(
        (
          SELECT json_object_agg(
            cluster_id,
            json_build_object(
              'qw', qw_count,
              'sb', sb_count,
              'ms', ms_count
            )
          )
          FROM vote_summary
        ),
        '{}'::json
      ) AS votes
  `;

  const row = result[0] || {};
  return {
    voters: Number(row.voters || 0),
    votes: {
      ...emptyTotals(),
      ...(row.votes || {})
    }
  };
}

export async function insertVoteSubmission(votes: Array<{ clusterId: number; voteType: "qw" | "sb" | "ms" }>) {
  const sql = getSql();
  const payload = JSON.stringify(votes);

  await sql`
    WITH new_submission AS (
      INSERT INTO vote_submissions DEFAULT VALUES
      RETURNING id
    ),
    inserted_answers AS (
      INSERT INTO vote_answers (submission_id, cluster_id, vote_type)
      SELECT
        new_submission.id,
        (item->>'clusterId')::smallint,
        item->>'voteType'
      FROM new_submission,
      jsonb_array_elements(${payload}::jsonb) AS item
      RETURNING cluster_id, vote_type
    ),
    updated_summary AS (
      INSERT INTO vote_summary (cluster_id, qw_count, sb_count, ms_count)
      SELECT
        cluster_id,
        COUNT(*) FILTER (WHERE vote_type = 'qw')::int,
        COUNT(*) FILTER (WHERE vote_type = 'sb')::int,
        COUNT(*) FILTER (WHERE vote_type = 'ms')::int
      FROM inserted_answers
      GROUP BY cluster_id
      ON CONFLICT (cluster_id) DO UPDATE SET
        qw_count = vote_summary.qw_count + EXCLUDED.qw_count,
        sb_count = vote_summary.sb_count + EXCLUDED.sb_count,
        ms_count = vote_summary.ms_count + EXCLUDED.ms_count
    )
    INSERT INTO vote_meta (id, total_voters)
    VALUES (true, 1)
    ON CONFLICT (id) DO UPDATE SET
      total_voters = vote_meta.total_voters + 1
  `;
}
