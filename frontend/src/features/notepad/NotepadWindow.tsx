import React, { useEffect, useState, useRef } from "react";
import { useClipboardStore } from "../../app/store/clipboardStore";
import { useBrowserContentStore } from "../../app/store/browserContentStore";
import { useToastStore } from "../../app/store/toastStore";
import "./NotepadWindow.css";

export const NotepadWindow: React.FC = () => {
  const [content, setContent] = useState<string>(() => {
    // 마운트 시 스토리지에 저장된 값이 있으면 가져옴
    return localStorage.getItem("notebook_memo_content") ?? "";
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 입력 변경 시 실시간으로 localStorage에 저장
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    localStorage.setItem("notebook_memo_content", value);
  };

  // 복사(Copy) 이벤트 가로채기: 외부 유출 차단 및 내부 스토어 저장
  const handleCopy = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault(); // 기본 복사 동작(OS 클립보드 유입) 차단

    const selectionText = window.getSelection()?.toString() || "";
    if (selectionText) {
      useClipboardStore.getState().setClipboardText(selectionText);
    }
  };

  // 붙여넣기(Paste) 이벤트 제한 및 내부 데이터 강제 삽입 처리
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault(); // 기본 외부 붙여넣기 완전 차단 (시스템 클립보드 무시)

    const gameClipboardText = useClipboardStore.getState().text;
    const lastCopiedCommand = useBrowserContentStore.getState().lastCopiedCommand;

    // 우선적으로 적재된 내부 복사 텍스트 채택
    const textToInsert = gameClipboardText || lastCopiedCommand || "";

    // 내부 클립보드 상태값이 완전히 비어 있는 경우에만 경고 알림 표출
    if (!textToInsert) {
      useToastStore.getState().showToast("보안 정책상 허용된 명령어 외에는 붙여넣기가 제한됩니다.");
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    // 현재 커서 위치 확보
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // 텍스트 조립
    const nextContent =
      content.substring(0, start) +
      textToInsert +
      content.substring(end);

    setContent(nextContent);
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
      e.preventDefault(); // 브라우저 기본 붙여넣기 동작 완전 차단
      handlePaste(e);     // 내부 삽입 로직 강제 호출
      return;
    }
  };

  // 포커싱 자동 지정
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // 글자 수 계산
  const charCount = content.length;
  const wordCount = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;

  return (
    <div className="notepad-container">
      {/* CRT Scanline effect */}
      <div className="notepad-scanlines" />

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
