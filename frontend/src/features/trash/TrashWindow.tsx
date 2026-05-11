import React from "react";
import { useWindowStore } from "../../app/store/windowStore";
import { useModalStore } from "../../app/store/modalStore";

export const TrashWindow: React.FC = () => {
  const handleRestore = () => {
    useModalStore.getState().openModal({
      title: "SYSTEM_PROMPT",
      message: "파일을 복원하시겠습니까?",
      type: "confirm",
      onConfirm: () => {
        const hintContent = `
기본 터미널 명령어 사용법

1. grep
- 역할: 파일 내에서 특정 문자열을 검색합니다.
- 사용법: grep '검색할단어' 파일명
- 예시: grep 'ERROR' system.log

2. echo
- 역할: 텍스트를 출력하거나 다른 명령어로 전달(파이프)합니다.
- 사용법: echo '출력할내용' | 전달받을명령어
- 예시: echo 'hello' | nc [IP] 22
`;

        localStorage.setItem("notebook_memo_content", hintContent);
        window.dispatchEvent(new Event("notepad-update"));

        const { openWindow, focusWindow } = useWindowStore.getState();
        openWindow("notepad");
        focusWindow("notepad");
      }
    });
  };

  return (
    <div className="p-4 flex flex-col items-start gap-4 h-full bg-[#1e1e1e] select-none text-white font-mono">
      <div
        className="flex flex-col items-center gap-2 cursor-pointer p-4 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/20"
        onDoubleClick={handleRestore}
      >
        <img src="/pixel_notepad_icon.svg" alt="Text file" className="w-12 h-12" />
        <span className="text-sm tracking-wide">recovery_notes.txt</span>
      </div>
    </div>
  );
};
