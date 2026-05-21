-- Initial migration · mirrors db/schema.sql for fresh setups
-- Idempotent (uses CREATE TABLE IF NOT EXISTS)
\i schema.sql
