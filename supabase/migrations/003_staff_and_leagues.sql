-- Leagues
CREATE TABLE leagues (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ep_id      INTEGER UNIQUE,
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  country    TEXT,
  level      INTEGER,   -- 1 = top tier in country
  type       TEXT,      -- 'professional' | 'amateur' | 'junior'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE POLICY "Public read leagues" ON leagues FOR SELECT USING (true);
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- Add league FK to teams and stints
ALTER TABLE teams ADD COLUMN league_id UUID REFERENCES leagues(id);
ALTER TABLE stints ADD COLUMN league_id UUID REFERENCES leagues(id);

-- Staff (coaches, GMs, scouts)
CREATE TABLE staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ep_id       INTEGER UNIQUE,
  name        TEXT NOT NULL,
  role_type   TEXT,      -- 'COACH' | 'MANAGEMENT'
  nationality TEXT,
  birthdate   DATE,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Staff stints on a team for a season
CREATE TABLE staff_stints (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id  UUID REFERENCES staff(id) ON DELETE CASCADE,
  team_id   UUID REFERENCES teams(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id),
  season    TEXT NOT NULL,
  role      TEXT,    -- 'HEAD_COACH' | 'ASSISTANT_COACH' | 'GM' etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, team_id, season, role)
);

CREATE INDEX idx_staff_stints_staff ON staff_stints(staff_id);
CREATE INDEX idx_staff_stints_team  ON staff_stints(team_id);

ALTER TABLE staff        ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_stints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read staff"        ON staff        FOR SELECT USING (true);
CREATE POLICY "Public read staff_stints" ON staff_stints FOR SELECT USING (true);

-- Update find_connection_path to also traverse staff connections
-- (players connected via shared coach)
CREATE OR REPLACE FUNCTION find_connection_path(
  from_player_id UUID,
  to_player_id   UUID,
  max_depth      INTEGER DEFAULT 4
)
RETURNS TABLE(
  path         UUID[],
  player_names TEXT[],
  team_names   TEXT[],
  seasons      TEXT[],
  depth        INTEGER
) AS $$
WITH RECURSIVE bfs AS (
  SELECT
    ARRAY[from_player_id, neighbour] AS path,
    ARRAY[p_src.name, p_nb.name]    AS player_names,
    ARRAY[t.name]                    AS team_names,
    ARRAY[c.season]                  AS seasons,
    1                                AS depth,
    neighbour                        AS tip
  FROM (
    SELECT player_b_id AS neighbour, team_id, season FROM connections WHERE player_a_id = from_player_id
    UNION ALL
    SELECT player_a_id AS neighbour, team_id, season FROM connections WHERE player_b_id = from_player_id
  ) c
  JOIN teams   t     ON t.id  = c.team_id
  JOIN players p_src ON p_src.id = from_player_id
  JOIN players p_nb  ON p_nb.id  = c.neighbour

  UNION ALL

  SELECT
    bfs.path || nb.neighbour,
    bfs.player_names || p_nb.name,
    bfs.team_names   || t.name,
    bfs.seasons      || nb.season,
    bfs.depth + 1,
    nb.neighbour
  FROM bfs
  JOIN LATERAL (
    SELECT player_b_id AS neighbour, team_id, season FROM connections WHERE player_a_id = bfs.tip
    UNION ALL
    SELECT player_a_id AS neighbour, team_id, season FROM connections WHERE player_b_id = bfs.tip
  ) nb ON true
  JOIN teams   t    ON t.id  = nb.team_id
  JOIN players p_nb ON p_nb.id = nb.neighbour
  WHERE
    bfs.depth < max_depth
    AND NOT (nb.neighbour = ANY(bfs.path))
)
SELECT path, player_names, team_names, seasons, depth
FROM bfs
WHERE tip = to_player_id
ORDER BY depth
LIMIT 5;
$$ LANGUAGE SQL STABLE;
