import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useClipboardStore } from "../../app/store/clipboardStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useToastStore } from "../../app/store/toastStore";
import "./NotepadWindow.css";

interface NotepadTab {
  id: string;
  title: string;
  content: string;
}

export const NotepadWindow: React.FC = () => {
  const { chapterCode } = useParams();

  // 챕터 고유 세션 키 생성 (챕터 이동/종료 시 완전한 메모 격리 실현)
  const storageTabsKey = `notebook_memo_tabs_${chapterCode ?? "default"}`;
  const storageActiveTabIdKey = `notebook_memo_active_tab_id_${chapterCode ?? "default"}`;

  // 1. 상태 관리 구조 (State Management)
  const [tabs, setTabs] = useState<NotepadTab[]>(() => {
    const savedTabs = localStorage.getItem(storageTabsKey);
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse tabs", e);
      }
    }
    // 기존 단일 컨텐츠 데이터를 첫 번째 탭의 내용으로 안전하게 승계
    const legacyContent = localStorage.getItem("notebook_memo_content") ?? "";
    return [{ id: "tab-default", title: "제목 없음", content: legacyContent }];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedActiveId = localStorage.getItem(storageActiveTabIdKey);
    if (savedActiveId && tabs.some(t => t.id === savedActiveId)) {
      return savedActiveId;
    }
    return tabs[0]?.id ?? "tab-default";
  });

  // 탭 타이틀 인라인 수정을 위한 임시 상태
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 외부(예: TrashWindow)에서 업데이트 되었을 때 감지
  useEffect(() => {
    const handleUpdate = () => {
      setContent(localStorage.getItem("notebook_memo_content") ?? "");
    };
    window.addEventListener("notepad-update", handleUpdate);
    return () => window.removeEventListener("notepad-update", handleUpdate);
  }, []);

  // 입력 변경 시 실시간으로 localStorage에 저장
  // 현재 활성화된 탭 객체 계산
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || { id: "tab-default", title: "제목 없음", content: "" };
  const content = activeTab.content;

  // 전체 탭 상태와 localStorage 저장 연동 (챕터 고유 키 적용)
  const updateTabs = (newTabs: NotepadTab[]) => {
    setTabs(newTabs);
    localStorage.setItem(storageTabsKey, JSON.stringify(newTabs));
  };

  const selectTab = (id: string) => {
    setActiveTabId(id);
    localStorage.setItem(storageActiveTabIdKey, id);
  };

  // 텍스트 에어리어 실시간 입력 수정 연동
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const updated = tabs.map((tab) => {
      if (tab.id === activeTabId) {
        return { ...tab, content: value };
      }
      return tab;
    });
    updateTabs(updated);
    // 레거시 상태 호환을 위해 유지
    localStorage.setItem("notebook_memo_content", value);
  };

  // 탭 추가 인터랙션
  const handleAddTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: NotepadTab = {
      id: newId,
      title: "제목 없음",
      content: "",
    };
    const newTabs = [...tabs, newTab];
    updateTabs(newTabs);
    selectTab(newId);
  };

  // 탭 닫기 인터랙션
  const handleCloseTab = (e: React.MouseEvent, tabIdToClose: string) => {
    e.stopPropagation(); // 탭 변경 전파 방지

    const filteredTabs = tabs.filter((t) => t.id !== tabIdToClose);

    if (filteredTabs.length === 0) {
      // 모든 탭 삭제 시 빈 상태의 기본 탭 자동 생성
      const defaultTab: NotepadTab = { id: "tab-default", title: "제목 없음", content: "" };
      updateTabs([defaultTab]);
      selectTab("tab-default");
      return;
    }

    updateTabs(filteredTabs);

    // 닫은 탭이 현재 활성화된 탭이었을 경우 이전/다음 탭으로 자동 전환
    if (activeTabId === tabIdToClose) {
      const closedIndex = tabs.findIndex((t) => t.id === tabIdToClose);
      const nextActiveIndex = Math.min(filteredTabs.length - 1, Math.max(0, closedIndex - 1));
      const nextActiveId = filteredTabs[nextActiveIndex].id;
      selectTab(nextActiveId);
    }
  };

  // 탭 이름 수정 제어
  const startEditing = (tabId: string, currentTitle: string) => {
    setEditingTabId(tabId);
    setTempTitle(currentTitle);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, tabId: string) => {
    if (e.key === "Enter") {
      finishEditing(tabId);
    } else if (e.key === "Escape") {
      setEditingTabId(null);
    }
  };

  const finishEditing = (tabId: string) => {
    if (!tempTitle.trim()) {
      setEditingTabId(null);
      return;
    }
    const updated = tabs.map((tab) => {
      if (tab.id === tabId) {
        return { ...tab, title: tempTitle.trim() };
      }
      return tab;
    });
    updateTabs(updated);
    setEditingTabId(null);
  };

  // 복사(Copy) 이벤트 가로채기: 외부 유출 차단 및 내부 스토어 저장
  const handleCopy = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();

    const selectionText = window.getSelection()?.toString() || "";
    if (selectionText) {
      useClipboardStore.getState().setClipboardText(selectionText);
    }
  };

  // 붙여넣기(Paste) 이벤트 제한 및 내부 데이터 강제 삽입 처리
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();

    const gameClipboardText = useClipboardStore.getState().text;
    const lastCopiedCommand = useBrowserContentStore.getState().lastCopiedCommand;
    const textToInsert = gameClipboardText || lastCopiedCommand || "";

    if (!textToInsert) {
      useToastStore.getState().showToast("보안 정책상 허용된 명령어 외에는 붙여넣기가 제한됩니다.");
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    // 현재 커서 위치 확보
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 현재 활성 탭 내용 조립
    const nextContent =
      content.substring(0, start) +
      textToInsert +
      content.substring(end);

    const updated = tabs.map((tab) => {
      if (tab.id === activeTabId) {
        return { ...tab, content: nextContent };
      }
      return tab;
    });
    updateTabs(updated);
    localStorage.setItem("notebook_memo_content", nextContent);

    // 붙여넣기 후 커서 위치 조정
    const newCursorPos = start + textToInsert.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    }, 0);
  };

  // OS 교차 붙여넣기 단축키(Ctrl+V / Cmd+V) 명시적 감지 및 가로채기
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isPasteCombo = (e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V");

    if (isPasteCombo) {
      e.preventDefault();
      handlePaste(e);
      return;
    }
  };

  // 탭이 바뀔 때마다 텍스트 에어리어 자동 포커스
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeTabId]);

  // 글자 수 및 단어 수 실시간 동기화 계산
  const charCount = content.length;
  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;

  return (
    <div className="notepad-container">
      {/* CRT Scanline effect */}
      <div className="notepad-scanlines" />

      {/* 2. 탭 바 (Tab Bar) UI 컴포넌트 */}
      <div className="notepad-tab-bar">
        <div className="notepad-tabs-scroll-area">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = tab.id === editingTabId;

            return (
              <div
                key={tab.id}
                className={`notepad-tab-item ${isActive ? "active" : ""}`}
                onClick={() => !isEditing && selectTab(tab.id)}
                onDoubleClick={() => !isEditing && startEditing(tab.id, tab.title)}
              >
                {isEditing ? (
                  <input
                    type="text"
                    className="notepad-tab-title-input"
                    value={tempTitle}
                    onChange={(event) => setTempTitle(event.target.value)}
                    onBlur={() => finishEditing(tab.id)}
                    onKeyDown={(event) => handleTitleKeyDown(event, tab.id)}
                    autoFocus
                    maxLength={15}
                  />
                ) : (
                  <span className="notepad-tab-title-text" title="더블 클릭하여 수정">
                    {tab.title}
                  </span>
                )}
                <button
                  type="button"
                  className="notepad-tab-close-btn"
                  onClick={(event) => handleCloseTab(event, tab.id)}
                  title="탭 닫기"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="notepad-tab-add-btn"
          onClick={handleAddTab}
          title="새 탭 추가"
        >
          +
        </button>
      </div>

      {/* Text Area */}
      <div className="notepad-editor-wrapper">
        <textarea
          ref={textareaRef}
          className="notepad-textarea"
          value={content}
          onChange={handleChange}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
      </div>

      {/* Cyber status bar */}
      <div className="notepad-status-bar">
        <div className="notepad-status-item">
          <span className="status-label">STATUS:</span>
          <span className="status-value status-online">ONLINE</span>
        </div>
        <div className="notepad-status-item">
          <span className="status-label">WORDS:</span>
          <span className="status-value">{wordCount}</span>
        </div>
        <div className="notepad-status-item">
          <span className="status-label">CHARS:</span>
          <span className="status-value">{charCount}</span>
        </div>
      </div>
    </div>
  );
};
