-- src/auth-service/migrations/000001_init_schema.down.sql
DROP TABLE IF EXISTS system_config;
DROP TABLE IF EXISTS kyc_documents;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
