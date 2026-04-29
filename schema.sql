CREATE TABLE IF NOT EXISTS vote_submissions (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vote_answers (
  id BIGSERIAL PRIMARY KEY,
  submission_id BIGINT NOT NULL REFERENCES vote_submissions(id) ON DELETE CASCADE,
  cluster_id SMALLINT NOT NULL CHECK (cluster_id BETWEEN 1 AND 8),
  vote_type TEXT NOT NULL CHECK (vote_type IN ('qw', 'sb', 'ms')),
  UNIQUE (submission_id, cluster_id)
);

CREATE TABLE IF NOT EXISTS vote_summary (
  cluster_id SMALLINT PRIMARY KEY CHECK (cluster_id BETWEEN 1 AND 8),
  qw_count INTEGER NOT NULL DEFAULT 0,
  sb_count INTEGER NOT NULL DEFAULT 0,
  ms_count INTEGER NOT NULL DEFAULT 0
);

INSERT INTO vote_summary (cluster_id)
VALUES (1), (2), (3), (4), (5), (6), (7), (8)
ON CONFLICT (cluster_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS vote_meta (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  total_voters BIGINT NOT NULL DEFAULT 0
);

INSERT INTO vote_meta (id, total_voters)
VALUES (TRUE, 0)
ON CONFLICT (id) DO NOTHING;
