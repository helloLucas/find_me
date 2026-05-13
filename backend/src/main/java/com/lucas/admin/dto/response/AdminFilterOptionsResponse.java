package com.lucas.admin.dto.response;

import java.util.List;

public record AdminFilterOptionsResponse(List<ChapterOption> chapters, List<NodeOption> nodes) {

  public record ChapterOption(String chapterCode, String chapterTitle) {}

  public record NodeOption(String nodeCode, String chapterCode) {}
}

