package com.lucas.story.service;

import java.util.List;

/** 사용자가 입력한 CLI 명령어 로그를 관리하는 서비스 인터페이스입니다. 최근 입력된 10개의 명령어를 Redis에 저장하고 조회합니다. */
public interface CommandLogService {

    /**
     * 사용자가 입력한 명령어를 로그에 저장합니다. 최근 10개까지만 유지하며 가장 최신 명령어가 리스트의 앞에 위치합니다.
     *
     * @param userId 사용자 ID
     * @param command 입력된 명령어 문자열
     */
    void logCommand(Long userId, String command);

    /**
     * 특정 사용자의 최근 명령어 로그 10개를 조회합니다.
     *
     * @param userId 사용자 ID
     * @return 최근 명령어 리스트 (최대 10개)
     */
    List<String> getRecentCommands(Long userId);
}
