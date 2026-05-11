import React from "react";
import { useWindowStore } from "../../app/store/windowStore";
import { useModalStore } from "../../app/store/modalStore";
import { useNotepadStore } from "../../app/store/notepadStore";
import { useParams } from "react-router-dom";

interface TrashItem {
  id: string;
  name: string;
  content: string;
}

export const TrashWindow: React.FC = () => {
  const { chapterCode } = useParams();
  const { addTab } = useNotepadStore();
  const { openWindow, focusWindow } = useWindowStore.getState();

  const trashItems: TrashItem[] = [
    {
      id: "hint-1",
      name: "recovery_notes.txt",
      content: `기본 터미널 명령어 사용법

1. grep
- 역할: 파일 내에서 특정 문자열을 검색합니다.
- 사용법: grep '검색할단어' 파일명
- 예시: grep 'ERROR' system.log

2. echo
- 역할: 텍스트를 출력하거나 다른 명령어로 전달(파이프)합니다.
- 사용법: echo '출력할내용' | 전달받을명령어
- 예시: echo 'hello' | nc [IP] 22`
    },
    {
      id: "hint-2",
      name: "sh_command_guide.txt",
      content: `[고급 명령어 가이드]

특정 서버에 단편 데이터를 요청하고 그 결과를 스크립트 파일로 저장하는 방법:

명령어:
echo FRAGMENT | nc 127.0.0.1 9091 > laplace_fragment_02.sh

설명:
- 'FRAGMENT' 메시지를 로컬호스트의 9091 포트로 전송합니다.
- 응답받은 내용을 'laplace_fragment_02.sh' 파일로 생성합니다.
- 생성된 파일은 'sh laplace_fragment_02.sh'로 실행할 수 있습니다.`
    },
    {
      id: "hint-3",
      name: "mission_note.txt",
      content: `[분석 보고서 - 기밀]

라플라스 시스템의 핵심 로직을 복구하기 위해서는 분산된 데이터 조각들을 모두 수집해야 합니다.

수집 대상:
- laplace_fragment_01
- laplace_fragment_02
- laplace_fragment_03

이 세 가지 조각을 모두 모아야 다음 단계인 'laplace.qasm' 생성이 가능해질 것으로 보입니다.`
    }
  ];

  const handleRestore = (item: TrashItem) => {
    useModalStore.getState().openModal({
      title: "SYSTEM_PROMPT",
      message: `'${item.name}' 파일을 메모장으로 복원하시겠습니까?`,
      type: "confirm",
      onConfirm: () => {
        addTab(chapterCode || "default", item.name.replace(".txt", ""), item.content);
        
        openWindow("notepad");
        focusWindow("notepad");
      }
    });
  };

  const isChapter3 = chapterCode === "week03";

  return (
    <div className="p-6 h-full bg-[#1e1e1e] select-none text-white font-mono overflow-y-auto">
      {isChapter3 ? (
        <div className="grid grid-cols-3 gap-6">
          {trashItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col items-center gap-2 cursor-pointer p-2 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/20 group"
              onDoubleClick={() => handleRestore(item)}
            >
              <div className="relative">
                <img src="/pixel_notepad_icon.svg" alt="Text file" className="w-12 h-12 opacity-80 group-hover:opacity-100" />
                <div className="absolute -bottom-1 -right-1 bg-red-500 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold border border-[#1e1e1e]">
                  !
                </div>
              </div>
              <span className="text-[11px] tracking-tight text-center break-all leading-tight">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full opacity-30 grayscale">
          <img src="/pixel_trash_icon.svg" alt="Empty trash" className="w-16 h-16 mb-2" />
          <p className="text-xs uppercase tracking-widest">Trash is empty</p>
        </div>
      )}
    </div>
  );
};
