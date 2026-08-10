-- Migration 009: Add device binding to users and attempt counting to otp_codes

ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id TEXT;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS device_id TEXT;
