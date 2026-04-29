package com.lucas.story.service.terminal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileContentService {

    private final ObjectMapper objectMapper;
    private final Map<String, List<String>> contentCache = new HashMap<>();

    @PostConstruct
    public void init() {
        loadContents();
    }

    private void loadContents() {
        try (InputStream is = getClass().getResourceAsStream("/story/chapter02/contents.json")) {
            if (is == null) {
                log.warn("Chapter 2 contents.json not found in classpath.");
                return;
            }
            JsonNode root = objectMapper.readTree(is);
            root.fields().forEachRemaining(entry -> {
                String key = entry.getKey();
                List<String> lines = new ArrayList<>();
                entry.getValue().forEach(line -> lines.add(line.asText()));
                contentCache.put(key, lines);
            });
            log.info("Loaded {} file contents for Chapter 2", contentCache.size());
        } catch (Exception e) {
            log.error("Failed to load Chapter 2 contents.json", e);
        }
    }

    public List<String> getContent(String contentKey) {
        return contentCache.getOrDefault(contentKey, Collections.emptyList());
    }
}
