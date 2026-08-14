-- src/payment-service/migrations/000001_init_schema.down.sql
DROP TABLE IF EXISTS atm_codes;
DROP TABLE IF EXISTS outbox_events;
DROP TABLE IF EXISTS payments;
