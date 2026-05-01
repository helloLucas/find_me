-- 용도: 소스 DB에서 week02(chapter2) lucas_knowledge 데이터를 INSERT 문 형태로 추출하는 스크립트.

-- 실행시킨 후 결과를 저장

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
ORDER BY id;
