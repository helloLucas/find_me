import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useClipboardStore } from "../../app/store/clipboardStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useToastStore } from "../../app/store/toastStore";
import { useNotepadStore, type NotepadTab } from "../../app/store/notepadStore";
import "./NotepadWindow.css";

export const NotepadWindow: React.FC = () => {
  const { chapterCode: rawChapterCode } = useParams();
  const chapterCode = rawChapterCode || "default";
  const isChapter3 = chapterCode === "week03";

  const {
    tabs: allTabs,
    activeTabId: allActiveTabIds,
    addTab,
    updateTabContent,
    updateTabTitle,
    removeTab,
    setActiveTabId,
  } = useNotepadStore();

  const tabs = allTabs[chapterCode] || [];
  const activeTabId = allActiveTabIds[chapterCode] || "";

  // 탭 타이틀 인라인 수정을 위한 임시 상태
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 초기 탭 생성 (만약 탭이 하나도 없다면)
  useEffect(() => {
    if (tabs.length === 0) {
      addTab(chapterCode, "제목 없음", "");
    }
  }, [tabs.length, chapterCode, addTab]);

  // 외부(예: TrashWindow)에서 업데이트 되었을 때 감지 (기존 호환성 유지)
  useEffect(() => {
    const handleUpdate = () => {
      const newContent = localStorage.getItem("notebook_memo_content") ?? "";
      addTab(chapterCode, "recovery_notes", newContent);
    };
    window.addEventListener("notepad-update", handleUpdate);
    return () => window.removeEventListener("notepad-update", handleUpdate);
  }, [chapterCode, addTab]);

  // 현재 활성화된 탭 객체 계산
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || { id: "", title: "제목 없음", content: "" };
  const content = activeTab.content;

  // 텍스트 에어리어 실시간 입력 수정 연동
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeTab.id) return;
    updateTabContent(chapterCode, activeTab.id, e.target.value);
  };

  // 탭 추가 인터랙션
  const handleAddTab = () => {
    addTab(chapterCode, "제목 없음", "");
  };

  // 탭 닫기 인터랙션
  const handleCloseTab = (e: React.MouseEvent, tabIdToClose: string) => {
    e.stopPropagation();
    removeTab(chapterCode, tabIdToClose);
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
    updateTabTitle(chapterCode, tabId, tempTitle.trim());
    setEditingTabId(null);
  };

  // 복사(Copy) 이벤트 가로채기: 보안 정책상 내부 스토어에만 저장
  const handleCopy = (e: React.ClipboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const selectionText = window.getSelection()?.toString() || "";
    if (selectionText) {
      useClipboardStore.getState().setClipboardText(selectionText);
    }
  };

  // 붙여넣기(Paste) 이벤트: 내부 스토어 또는 브라우저 복사 명령어에서 가져옴
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();

    const gameClipboardText = useClipboardStore.getState().text;
    const lastCopiedCommand = useBrowserContentStore.getState().lastCopiedCommand;
    const textToInsert = gameClipboardText || lastCopiedCommand || "";

    if (!textToInsert) {
      useToastStore.getState().showToast("보안 정책상 허용된 데이터 외에는 붙여넣기가 제한됩니다.");
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea || !activeTab.id) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const nextContent =
      content.substring(0, start) +
      textToInsert +
      content.substring(end);

    updateTabContent(chapterCode, activeTab.id, nextContent);

    const newCursorPos = start + textToInsert.length;
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isCopyCombo = (e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C");
    const isPasteCombo = (e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V");

    if (isCopyCombo) {
      handleCopy(e);
      return;
    }

    if (isPasteCombo) {
      handlePaste(e);
      return;
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeTabId]);

  const charCount = content.length;
  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;

  return (
    <div className="notepad-container">
      <div className="notepad-scanlines" />

      <div className="notepad-tab-bar">
        <div className="notepad-tabs-scroll-area">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isEditing = tab.id === editingTabId;

            return (
              <div
                key={tab.id}
                className={`notepad-tab-item ${isActive ? "active" : ""}`}
                onClick={() => !isEditing && setActiveTabId(chapterCode, tab.id)}
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
