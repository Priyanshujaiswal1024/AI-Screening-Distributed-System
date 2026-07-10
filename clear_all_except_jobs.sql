-- ================================================
-- CLEAR ALL DATA EXCEPT JOBS
-- Keeps: job_description_db (untouched)
-- Clears: resumes, screening reports, pgvector, chat
-- ================================================

-- 1. resume_db: clear resumes, sagas, outbox events
\connect resume_db
TRUNCATE TABLE candidate_resumes CASCADE;
TRUNCATE TABLE saga_instances CASCADE;
TRUNCATE TABLE outbox_events CASCADE;

-- 2. ranking_db: clear screening reports and processed events
\connect ranking_db
TRUNCATE TABLE screening_reports CASCADE;
TRUNCATE TABLE processed_events CASCADE;

-- 3. screening_db: clear pgvector embeddings, chunks, processed events
\connect screening_db
TRUNCATE TABLE vector_store CASCADE;
TRUNCATE TABLE resume_chunks CASCADE;
TRUNCATE TABLE processed_events CASCADE;

-- 4. chat_db: clear chat messages and chat vector store
\connect chat_db
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE vector_store CASCADE;

\echo ''
\echo '================================================'
\echo ' ALL DATA CLEARED SUCCESSFULLY'
\echo ' Jobs are preserved in job_description_db'
\echo '================================================'
