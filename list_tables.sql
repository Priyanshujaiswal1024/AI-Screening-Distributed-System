-- List tables in all relevant DBs

\connect resume_db
SELECT 'resume_db' as db, tablename FROM pg_tables WHERE schemaname='public';

\connect ranking_db
SELECT 'ranking_db' as db, tablename FROM pg_tables WHERE schemaname='public';

\connect screening_db
SELECT 'screening_db' as db, tablename FROM pg_tables WHERE schemaname='public';

\connect chat_db
SELECT 'chat_db' as db, tablename FROM pg_tables WHERE schemaname='public';
