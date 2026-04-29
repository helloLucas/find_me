package com.lucas.story.service.terminal;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Stack;

public class PathResolver {

    /**
     * 현재 cwd와 입력된 경로를 조합하여 정규화된 절대 경로를 반환한다.
     * 
     * @param cwd 현재 작업 디렉토리 (절대 경로)
     * @param inputPath 사용자가 입력한 경로 (상대 또는 절대)
     * @param rootPath 터미널의 최상위 루트 경로
     * @return 정규화된 절대 경로
     */
    public String resolve(String cwd, String inputPath, String rootPath) {
        if (inputPath == null || inputPath.isEmpty() || inputPath.equals(".")) {
            return cwd;
        }

        String absolutePath;
        if (inputPath.startsWith("/")) {
            absolutePath = inputPath;
        } else {
            absolutePath = cwd + (cwd.endsWith("/") ? "" : "/") + inputPath;
        }

        String normalized = normalize(absolutePath);

        // Root Escape 방지
        if (!normalized.startsWith(rootPath)) {
            return rootPath; // 루트 밖으로 나가려 하면 루트로 고정
        }

        return normalized;
    }

    private String normalize(String path) {
        String[] parts = path.split("/");
        Stack<String> stack = new Stack<>();

        for (String part : parts) {
            if (part.isEmpty() || part.equals(".")) {
                continue;
            }
            if (part.equals("..")) {
                if (!stack.isEmpty()) {
                    stack.pop();
                }
            } else {
                stack.push(part);
            }
        }

        if (stack.isEmpty()) {
            return "/";
        }

        StringBuilder sb = new StringBuilder();
        for (String s : stack) {
            sb.append("/").append(s);
        }
        return sb.toString();
    }
}
