-- SOURCE DB (chapter2만 INSERT 문 생성)
-- 챕터 2
SELECT
  'INSERT INTO lucas_knowledge (id, chapter, puzzle_id, content, metadata, embedding) VALUES ('
  || id || ', '
  || COALESCE(chapter::text, 'NULL') || ', '
  || COALESCE(quote_literal(puzzle_id), 'NULL') || ', '
  || quote_literal(content) || ', '
  || quote_literal(metadata::text) || '::jsonb, '
  || COALESCE(quote_literal(embedding::text) || '::vector', 'NULL')
  || ');' AS dump_sql
FROM lucas_knowledge
WHERE metadata->>'chapter_code' = 'week02'
ORDER BY id;
