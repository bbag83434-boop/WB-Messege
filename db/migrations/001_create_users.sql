CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  mobile VARCHAR(10) NOT NULL UNIQUE,
  profile_photo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT users_mobile_format CHECK (mobile ~ '^[6-9][0-9]{9}$')
);
CREATE INDEX IF NOT EXISTS users_mobile_idx ON users (mobile);
