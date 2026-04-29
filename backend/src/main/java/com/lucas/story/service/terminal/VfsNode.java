package com.lucas.story.service.terminal;

import java.util.Map;

public record VfsNode(
    String path,
    String name,
    String type,
    boolean readable,
    boolean executable,
    boolean isProtected,
    boolean hidden,
    String storyKey,
    String contentKey,
    Map<String, Object> metadata) {
  public boolean isDirectory() {
    return "directory".equals(type);
  }

  public boolean isFile() {
    return "file".equals(type);
  }
}
