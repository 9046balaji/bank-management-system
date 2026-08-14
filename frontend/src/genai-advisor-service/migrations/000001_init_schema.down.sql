-- src/genai-advisor-service/migrations/000001_init_schema.down.sql
DROP INDEX IF EXISTS idx_financial_knowledge_embedding;
DROP TABLE IF EXISTS financial_knowledge;
DROP TABLE IF EXISTS feedback_corrections;
