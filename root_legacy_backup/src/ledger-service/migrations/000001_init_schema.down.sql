-- src/ledger-service/migrations/000001_init_schema.down.sql
DROP FUNCTION IF EXISTS verify_ledger_integrity();
DROP TRIGGER IF EXISTS ledger_immutability ON ledger_entries;
DROP FUNCTION IF EXISTS prevent_ledger_update();
DROP TABLE IF EXISTS ledger_entries;
DROP TABLE IF EXISTS accounts;
