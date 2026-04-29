package com.lucas.hint.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lucas.hint.model.HintVectorCandidate;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * lucas_knowledge 벡터 검색 전용 Repository입니다.
 *
 * <p>strict/fallback phase별 쿼리를 분리해 실행하고, 후보를 동일 구조로 반환합니다.
 */
@Repository
@RequiredArgsConstructor
@Slf4j
public class LucasKnowledgeVectorSearchRepository {

  private static final String BASE_SELECT =
      """
      WITH q AS (
        SELECT CAST(:queryVector AS vector) AS v
      ),
      scored AS (
        SELECT
          lk.id,
          lk.chapter,
          lk.puzzle_id,
          lk.content,
          lk.metadata,
          (lk.embedding <=> q.v) AS cosine_distance,
          (1 - (lk.embedding <=> q.v)) AS similarity,
          COALESCE((lk.metadata->>'priority')::int, 0) AS priority,
          COALESCE((lk.metadata->>'priority_rank')::int, 9999) AS priority_rank,
          COALESCE((lk.metadata->>'candidate_count')::int, 1) AS candidate_count
        FROM lucas_knowledge lk
        CROSS JOIN q
        WHERE lk.embedding IS NOT NULL
          AND lk.metadata->>'source' = 'story_transitions'
          AND lk.metadata->>'knowledge_kind' = 'next_node_answer'
          AND lk.metadata->>'chapter_code' = :chapterCode
      %s
      )
      SELECT *
      FROM scored
      ORDER BY
        cosine_distance ASC,
        priority_rank ASC,
        priority DESC,
        id ASC
      LIMIT :searchTopK
      """;

  private final NamedParameterJdbcTemplate jdbcTemplate;
  private final ObjectMapper objectMapper;

  public List<HintVectorCandidate> searchStrict(
      String queryVector, String chapterCode, String fromNodeCode, String actionType, int searchTopK) {

    String where =
        """
          AND lk.metadata->>'from_node_code' = :fromNodeCode
          AND (
            :actionType IS NULL
            OR :actionType = ''
            OR lk.metadata->>'action_type' = :actionType
          )
        """;

    return query(formatSql(where), params(queryVector, chapterCode, fromNodeCode, actionType, searchTopK));
  }

  public List<HintVectorCandidate> searchFallbackActionRemoved(
      String queryVector, String chapterCode, String fromNodeCode, int searchTopK) {

    String where = "  AND lk.metadata->>'from_node_code' = :fromNodeCode";
    return query(formatSql(where), params(queryVector, chapterCode, fromNodeCode, null, searchTopK));
  }

  public List<HintVectorCandidate> searchFallbackChapterOnly(
      String queryVector, String chapterCode, int searchTopK) {

    return query(formatSql(""), params(queryVector, chapterCode, null, null, searchTopK));
  }

  private List<HintVectorCandidate> query(String sql, MapSqlParameterSource params) {
    return jdbcTemplate.query(sql, params, rowMapper());
  }

  private String formatSql(String where) {
    return BASE_SELECT.formatted(where);
  }

  private MapSqlParameterSource params(
      String queryVector, String chapterCode, String fromNodeCode, String actionType, int searchTopK) {
    return new MapSqlParameterSource()
        .addValue("queryVector", queryVector)
        .addValue("chapterCode", chapterCode)
        .addValue("fromNodeCode", fromNodeCode)
        .addValue("actionType", actionType)
        .addValue("searchTopK", searchTopK);
  }

  private RowMapper<HintVectorCandidate> rowMapper() {
    return (rs, rowNum) -> mapCandidate(rs);
  }

  private HintVectorCandidate mapCandidate(ResultSet rs) throws SQLException {
    return HintVectorCandidate.builder()
        .id(rs.getLong("id"))
        .chapter((Integer) rs.getObject("chapter"))
        .puzzleId(rs.getString("puzzle_id"))
        .content(rs.getString("content"))
        .metadata(parseMetadata(rs.getString("metadata")))
        .cosineDistance(rs.getDouble("cosine_distance"))
        .similarity(rs.getDouble("similarity"))
        .priority(rs.getInt("priority"))
        .priorityRank(rs.getInt("priority_rank"))
        .candidateCount(rs.getInt("candidate_count"))
        .build();
  }

  private Map<String, Object> parseMetadata(String metadataJson) {
    if (metadataJson == null || metadataJson.isBlank()) {
      return Collections.emptyMap();
    }
    try {
      return objectMapper.readValue(metadataJson, new TypeReference<>() {});
    } catch (Exception e) {
      log.warn("Failed to parse lucas_knowledge.metadata json: {}", e.getMessage());
      return Collections.emptyMap();
    }
  }
}

