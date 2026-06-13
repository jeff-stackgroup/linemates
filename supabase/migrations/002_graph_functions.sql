-- Materialise connections from stints: run after each data import
CREATE OR REPLACE FUNCTION build_connections() RETURNS void AS $$
BEGIN
  INSERT INTO connections (player_a_id, player_b_id, team_id, season)
  SELECT DISTINCT
    LEAST(a.player_id, b.player_id),
    GREATEST(a.player_id, b.player_id),
    a.team_id,
    a.season
  FROM stints a
  JOIN stints b ON a.team_id = b.team_id AND a.season = b.season AND a.player_id <> b.player_id
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- BFS to find shortest path(s) between two players (up to 4 degrees)
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
  -- seed: all direct neighbours of the source
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
  JOIN teams   t    ON t.id  = c.team_id
  JOIN players p_src ON p_src.id = from_player_id
  JOIN players p_nb  ON p_nb.id  = c.neighbour

  UNION ALL

  -- expand one hop at a time
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
  JOIN teams   t   ON t.id  = nb.team_id
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

-- Full-text player search helper (used by the chat API)
CREATE OR REPLACE FUNCTION search_players(query TEXT, result_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  id          UUID,
  name        TEXT,
  position    TEXT,
  nationality TEXT,
  ep_id       INTEGER
) AS $$
  SELECT id, name, position, nationality, ep_id
  FROM players
  WHERE to_tsvector('english', name) @@ plainto_tsquery('english', query)
     OR name ILIKE '%' || query || '%'
  ORDER BY ts_rank(to_tsvector('english', name), plainto_tsquery('english', query)) DESC
  LIMIT result_limit;
$$ LANGUAGE SQL STABLE;

-- Return all teammates of a given player across their career
CREATE OR REPLACE FUNCTION get_career_teammates(target_player_id UUID)
RETURNS TABLE(
  player_id   UUID,
  player_name TEXT,
  team_name   TEXT,
  season      TEXT,
  shared_games INTEGER
) AS $$
  SELECT
    nb.player_id,
    p.name        AS player_name,
    t.name        AS team_name,
    nb.season,
    LEAST(s_a.games, s_nb.games) AS shared_games
  FROM stints s_a
  JOIN stints nb ON nb.team_id = s_a.team_id AND nb.season = s_a.season AND nb.player_id <> s_a.player_id
  JOIN players p ON p.id = nb.player_id
  JOIN teams   t ON t.id = s_a.team_id
  JOIN stints s_nb ON s_nb.player_id = nb.player_id AND s_nb.team_id = s_a.team_id AND s_nb.season = s_a.season
  WHERE s_a.player_id = target_player_id
  ORDER BY s_a.season DESC, t.name;
$$ LANGUAGE SQL STABLE;
