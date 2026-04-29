package com.lucas.story.service.terminal;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class VfsContext {
    private final String rootPath;
    private final Map<String, VfsNode> nodes;

    private VfsContext(String rootPath, Map<String, VfsNode> nodes) {
        this.rootPath = rootPath;
        this.nodes = nodes;
    }

    public static VfsContext of(JsonNode vfsJson, JsonNode snapshotOverlay) {
        String rootPath = vfsJson.path("rootPath").asText("/home/guest");
        Map<String, VfsNode> effectiveNodes = new HashMap<>();

        // 1. Base VFS 로드
        JsonNode nodesNode = vfsJson.path("nodes");
        nodesNode.fields().forEachRemaining(entry -> {
            String path = entry.getKey();
            JsonNode config = entry.getValue();
            effectiveNodes.put(path, parseNode(path, config));
        });

        // 2. Snapshot Overlay 합성 (새로 생성되거나 변경된 파일들)
        if (snapshotOverlay != null && !snapshotOverlay.isMissingNode()) {
            snapshotOverlay.fields().forEachRemaining(entry -> {
                String path = entry.getKey();
                JsonNode config = entry.getValue();
                effectiveNodes.put(path, parseNode(path, config));
            });
        }

        return new VfsContext(rootPath, effectiveNodes);
    }

    private static VfsNode parseNode(String path, JsonNode config) {
        return new VfsNode(
            path,
            config.path("name").asText("unknown"),
            config.path("type").asText("file"),
            config.path("readable").asBoolean(true),
            config.path("executable").asBoolean(false),
            config.path("protected").asBoolean(false),
            config.path("hidden").asBoolean(false),
            config.path("storyKey").asText(null),
            config.path("contentKey").asText(null),
            config.path("metadata").isObject() ? new HashMap<>() : null // metadata는 필요시 확장
        );
    }

    public VfsNode resolve(String absolutePath) {
        return nodes.get(absolutePath);
    }

    public List<VfsNode> listChildren(String directoryPath) {
        String prefix = directoryPath.endsWith("/") ? directoryPath : directoryPath + "/";
        return nodes.entrySet().stream()
            .filter(e -> e.getKey().startsWith(prefix))
            .filter(e -> {
                String remaining = e.getKey().substring(prefix.length());
                return !remaining.contains("/") && !remaining.isEmpty();
            })
            .map(Map.Entry::getValue)
            .sorted((a, b) -> a.name().compareToIgnoreCase(b.name()))
            .collect(Collectors.toList());
    }

    public boolean exists(String absolutePath) {
        return nodes.containsKey(absolutePath);
    }

    public String getRootPath() {
        return rootPath;
    }
}
