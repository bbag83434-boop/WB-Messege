-- Existing PIN-based installations retain the column but no longer use it.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pin_hash') THEN
    ALTER TABLE users ALTER COLUMN pin_hash DROP NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  mobile VARCHAR(10) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  CONSTRAINT otp_mobile_format CHECK (mobile ~ '^[6-9][0-9]{9}$')
);
CREATE INDEX IF NOT EXISTS otp_codes_mobile_created_idx ON otp_codes (mobile, created_at DESC);
