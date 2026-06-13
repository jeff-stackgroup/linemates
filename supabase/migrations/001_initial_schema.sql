-- Players
CREATE TABLE players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ep_id       INTEGER UNIQUE,                        -- Elite Prospects ID
  name        TEXT NOT NULL,
  position    TEXT,
  shoots      TEXT,
  height_cm   INTEGER,
  weight_kg   INTEGER,
  birthdate   DATE,
  birthplace  TEXT,
  nationality TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Teams / Organizations
CREATE TABLE teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ep_id      INTEGER UNIQUE,
  name       TEXT NOT NULL,
  league     TEXT,
  country    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player stints on a team for a season
CREATE TABLE stints (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id   UUID REFERENCES teams(id) ON DELETE CASCADE,
  season    TEXT NOT NULL,           -- e.g. "2018-19"
  games     INTEGER,
  goals     INTEGER,
  assists   INTEGER,
  points    INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, team_id, season)
);

-- Pre-computed graph edges: two players who shared a team+season
-- Stored with player_a_id < player_b_id to avoid duplicates
CREATE TABLE connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_a_id     UUID REFERENCES players(id) ON DELETE CASCADE,
  player_b_id     UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id         UUID REFERENCES teams(id),
  season          TEXT,
  connection_type TEXT DEFAULT 'teammate',
  UNIQUE(player_a_id, player_b_id, team_id, season),
  CHECK (player_a_id < player_b_id)
);

CREATE INDEX idx_connections_a ON connections(player_a_id);
CREATE INDEX idx_connections_b ON connections(player_b_id);
CREATE INDEX idx_stints_player  ON stints(player_id);
CREATE INDEX idx_stints_team    ON stints(team_id);
CREATE INDEX idx_players_name   ON players USING gin(to_tsvector('english', name));

-- User profiles (linked to Supabase Auth)
CREATE TABLE user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id  UUID REFERENCES players(id),   -- the user's player record if they have one
  ep_id      INTEGER UNIQUE,
  full_name  TEXT,
  position   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat sessions
CREATE TABLE chat_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  metadata   JSONB,        -- stores query results, found paths, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their profile"   ON user_profiles  FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their sessions"  ON chat_sessions  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their messages"  ON chat_messages  FOR ALL
  USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));

-- Public read on hockey data
ALTER TABLE players     ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stints      ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read players"     ON players     FOR SELECT USING (true);
CREATE POLICY "Public read teams"       ON teams       FOR SELECT USING (true);
CREATE POLICY "Public read stints"      ON stints      FOR SELECT USING (true);
CREATE POLICY "Public read connections" ON connections FOR SELECT USING (true);
