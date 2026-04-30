import React, { useState } from "react";
import imageCompression from "browser-image-compression";
import { WindowFrame } from "../../shared/ui/WindowFrame";
import { bugReportApi } from "../../shared/api/bugReportApi";
import { useAuthStore } from "../../app/store/authStore";
import { useStoryRuntimeStore } from "../../features/story-runtime/storyRuntime.store";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose, zIndex = 9000, onFocus }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCompleteText, setShowCompleteText] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const nickname = useAuthStore((state) => state.nickname);
  const currentNode = useStoryRuntimeStore((state) => state.currentNode);

  // currentNode?.code 값을 사용하여 현재 챕터/노드 정보를 가져옴 (예: "CH1_SSH_CONNECTED")
  const currentChapter = currentNode?.code || "N/A";

  // 성공 상태일 때 프로그래스바 애니메이션 및 문구 노출 트리거
  React.useEffect(() => {
    if (success) {
      // 1. 프로그래스바 애니메이션 시작 (100ms 후)
      const barTimer = setTimeout(() => setProgress(100), 100);
      // 2. 애니메이션 완료(1500ms) 후 텍스트 노출 (총 1600ms 후)
      const textTimer = setTimeout(() => setShowCompleteText(true), 1600);
      return () => {
        clearTimeout(barTimer);
        clearTimeout(textTimer);
      };
    } else {
      setProgress(0);
      setShowCompleteText(false);
    }
  }, [success]);

  if (!isOpen) return null;

  const processFiles = async (newFiles: File[]) => {
    setIsCompressing(true);
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      const processedFiles = await Promise.all(
        newFiles.map(async (file) => {
          if (file.type.startsWith("image/")) {
            try {
              const compressedFile = await imageCompression(file, options);
              // 압축 과정에서 유실될 수 있는 원본 파일명을 유지
              return new File([compressedFile], file.name, { type: file.type });
            } catch (err) {
              console.error("Compression error for file:", file.name, err);
              return file;
            }
          }
          return file;
        })
      );
      return processedFiles;
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const processedFiles = await processFiles(selectedFiles);

      const currentTotalSize = files.reduce((acc, f) => acc + f.size, 0);
      const newTotalSize = processedFiles.reduce((acc, f) => acc + f.size, 0);

      if (currentTotalSize + newTotalSize > MAX_FILE_SIZE) {
        setError("Total file size cannot exceed 10MB.");
        e.target.value = '';
        return;
      }

      setError(null);
      setFiles((prev) => [...prev, ...processedFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const processedFiles = await processFiles(droppedFiles);

      const currentTotalSize = files.reduce((acc, f) => acc + f.size, 0);
      const newTotalSize = processedFiles.reduce((acc, f) => acc + f.size, 0);

      if (currentTotalSize + newTotalSize > MAX_FILE_SIZE) {
        setError("Total file size cannot exceed 10MB.");
        return;
      }

      setError(null);
      setFiles((prev) => [...prev, ...processedFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();

      const requestData = {
        title,
        content,
        nickname: nickname || "GUEST",
        currentChapter,
      };

      // request 파트는 application/json 형태의 Blob으로 추가 (서버에서 @RequestPart("request") 로 받음)
      formData.append(
        "request",
        new Blob([JSON.stringify(requestData)], { type: "application/json" })
      );

      // files 파트는 첨부파일이 있을 경우 순회하여 추가 (서버에서 @RequestPart("files") 로 받음)
      files.forEach((file) => {
        formData.append("files", file);
      });

      await bugReportApi.sendBugReport(formData);

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while sending the bug report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessConfirm = () => {
    onClose();
    setTitle("");
    setContent("");
    setFiles([]);
    setSuccess(false);
    setProgress(0);
    setShowCompleteText(false);
  };

  return (
    <WindowFrame
      title="Bug Report System"
      zIndex={zIndex}
      onClose={onClose}
      onFocus={onFocus}
      allowMinimize={false}
      allowMaximize={true}
      theme="cyan"
      defaultPosition={{ x: window.innerWidth / 2 - 250, y: window.innerHeight / 2 - 325 }}
      defaultSize={{ w: 500, h: 650 }}
      minSize={{ w: 400, h: 500 }}
    >
      <div className="flex flex-col h-full bg-black text-[#00D4FF] p-4 font-mono overflow-y-auto terminal-scrollbar relative">
        {/* Compression Overlay */}
        {isCompressing && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] border border-[#00D4FF]/30">
            <div className="absolute inset-0 crt-overlay opacity-30 pointer-events-none" />
            <div className="relative flex flex-col items-center">
              <div className="w-16 h-16 border-4 border-t-[#00D4FF] border-r-transparent border-b-[#00D4FF] border-l-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(0,212,255,0.5)]" />
              <div className="text-[#00D4FF] font-bold text-xl tracking-[0.2em] animate-pulse drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]">
                OPTIMIZING...
              </div>
              <p className="text-[#0099CC] text-[10px] mt-2 uppercase tracking-widest">
                Compressing high-res visual data
              </p>
            </div>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center drop-shadow-[0_0_10px_rgba(0,212,255,0.8)] h-16 flex flex-col justify-center">
              <p className={`text-xl font-bold mb-1 text-[#00D4FF] transition-all duration-500 ${showCompleteText ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}>
                시스템 오류 로그 전송 완료
              </p>
              <p className={`text-[#0099CC] text-sm transition-opacity duration-500 ${showCompleteText ? "opacity-100" : "opacity-40 animate-pulse"}`}>
                {showCompleteText ? "신고해주셔서 감사합니다." : "데이터 패킷 전송 중..."}
              </p>
            </div>

            {/* Progress Bar UI */}
            <div className="w-64 h-3 border border-[#00D4FF]/30 p-[2px] bg-black">
              <div
                className="h-full bg-[#00D4FF] shadow-[0_0_15px_rgba(0,212,255,0.6)] transition-all duration-1500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="text-[10px] text-[#0099CC] mt-[-10px] tracking-widest font-bold">
              TRANSMISSION {progress}% {progress === 100 ? "COMPLETE" : "IN PROGRESS"}
            </div>

            <button
              type="button"
              onClick={handleSuccessConfirm}
              className="px-10 py-2 bg-[#00D4FF] text-black hover:bg-[#0099CC] hover:shadow-[0_0_15px_rgba(0,212,255,0.8)] transition-all uppercase text-sm font-bold shadow-[0_0_8px_rgba(0,212,255,0.6)] mt-4"
            >
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
            <div className="border-b border-[#0099CC]/50 pb-2 mb-2">
              <h2 className="text-lg font-bold drop-shadow-[0_0_5px_rgba(0,212,255,0.8)]">[시스템 오류 보고 전송]</h2>
              <p className="text-xs text-[#0099CC]">AGENT: {nickname} | LOC: {currentChapter}</p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#00D4FF] uppercase drop-shadow-[0_0_5px_rgba(0,212,255,0.8)]">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-gray-900 border border-[#0099CC] text-white p-2 outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] focus:bg-[#00D4FF]/[0.05] focus:shadow-[0_0_8px_rgba(0,212,255,0.6)] transition-all"
                placeholder="오류 데이터 요약..."
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-bold text-[#00D4FF] uppercase drop-shadow-[0_0_5px_rgba(0,212,255,0.8)]">Details</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-gray-900 border border-[#0099CC] text-white p-2 outline-none focus:border-[#00D4FF] focus:ring-1 focus:ring-[#00D4FF] focus:bg-[#00D4FF]/[0.05] focus:shadow-[0_0_8px_rgba(0,212,255,0.6)] transition-all flex-1 resize-none terminal-scrollbar"
                placeholder="어떤 행동을 했을 때 오류가 발생했나요?"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#00D4FF] uppercase drop-shadow-[0_0_5px_rgba(0,212,255,0.8)]">Attachments (Optional)</label>

              <div
                className={`relative overflow-hidden w-full border-2 border-dashed transition-all p-4 flex flex-col items-center justify-center gap-2 ${
                  isDragging ? "border-[#00D4FF] bg-[#00D4FF]/20 shadow-[inset_0_0_20px_rgba(0,212,255,0.2)]" : "border-[#0099CC]/50 bg-black hover:border-[#00D4FF]/70"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  disabled={isSubmitting || isCompressing}
                />
                <span className="font-bold uppercase text-sm transition-colors text-center pointer-events-none drop-shadow-[0_0_5px_rgba(0,212,255,0.8)]" style={{ color: isDragging ? '#ffffff' : '#00D4FF' }}>
                  {isCompressing ? "COMPRESSING IMAGES..." : isDragging ? "DROP FILES HERE" : "파일 업로드"}
                </span>
                <span className="text-xs text-[#0099CC] pointer-events-none">
                  [용량 제한: 총 10MB]
                </span>
              </div>

              {files.length > 0 && (
                <div className="text-xs text-[#00D4FF] mt-2 max-h-24 overflow-y-auto flex flex-col gap-1 terminal-scrollbar pr-1">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#00D4FF]/5 p-1 px-2 border border-[#0099CC]/50 hover:border-[#00D4FF]/50 transition-colors">
                      <span className="truncate flex-1 text-white">- {f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-red-500 hover:text-red-400 hover:bg-red-900/20 font-bold px-2 py-1 ml-2 transition-colors"
                        disabled={isSubmitting || isCompressing}
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="text-[#00D4FF] text-sm font-bold border border-[#00D4FF] bg-[#00D4FF]/10 p-2 drop-shadow-[0_0_5px_rgba(0,212,255,0.8)] text-center">{error}</div>}

            <div className="mt-auto pt-4 border-t border-[#0099CC]/50 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:shadow-[0_0_10px_rgba(0,212,255,0.4)] transition-all uppercase text-sm font-bold"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#00D4FF] border border-[#00D4FF] text-black hover:bg-[#0099CC] hover:shadow-[0_0_15px_rgba(0,212,255,0.8)] transition-all uppercase text-sm font-bold shadow-[0_0_8px_rgba(0,212,255,0.6)]"
                disabled={isSubmitting || isCompressing}
              >
                {isSubmitting ? "TRANSMITTING..." : isCompressing ? "OPTIMIZING..." : "TRANSMIT"}
              </button>
            </div>
          </form>
        )}
      </div>
    </WindowFrame>
  );
};
