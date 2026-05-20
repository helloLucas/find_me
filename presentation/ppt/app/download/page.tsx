"use client"

import { useState } from "react"
import { Download, Presentation, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"

// Base64 encoded PPTX file
const PPTX_BASE64 = `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 0wO9WiXbIx5+iwfu4NH0aA8Yj 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 AQAAUxIAABMAAAAAAAAAAAAAAIABAAAA...`

export default function DownloadPage() {
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const handleDownload = () => {
    setDownloading(true)
    
    // Convert base64 to blob
    const byteCharacters = atob(PPTX_BASE64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" })
    
    // Create download link
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "나를_찾아줘_게임기획발표.pptx"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setTimeout(() => {
      setDownloading(false)
      setDownloaded(true)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Back link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-mono text-sm">프레젠테이션으로 돌아가기</span>
        </Link>

        {/* Download card */}
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Presentation className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground mb-2">
            나를 찾아줘
          </h1>
          <p className="text-muted-foreground mb-6">
            게임 기획 발표 PPT
          </p>

          {/* File info */}
          <div className="bg-secondary/50 rounded-lg p-4 mb-6 font-mono text-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">파일명</span>
              <span className="text-foreground">나를_찾아줘_게임기획발표.pptx</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground">슬라이드</span>
              <span className="text-foreground">12장</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">테마</span>
              <span className="text-primary">사이버펑크 / 터미널</span>
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className={`w-full py-4 px-6 rounded-lg font-medium flex items-center justify-center gap-3 transition-all ${
              downloaded
                ? "bg-cyber-green/20 text-cyber-green border border-cyber-green/50"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {downloading ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>다운로드 중...</span>
              </>
            ) : downloaded ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>다운로드 완료!</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>PPT 다운로드</span>
              </>
            )}
          </button>

          {downloaded && (
            <p className="text-sm text-muted-foreground mt-4">
              다운로드 폴더를 확인해주세요
            </p>
          )}
        </div>

        {/* Contents preview */}
        <div className="mt-8 bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <span className="text-primary font-mono text-sm">[CONTENTS]</span>
            목차
          </h2>
          <ul className="space-y-2 text-sm">
            {[
              "타이틀",
              "목차",
              "게임 개요",
              "세계관",
              "등장인물",
              "게임플레이",
              "Chapter 1 - 연결",
              "Chapter 2 - 탈출",
              "Chapter 3 - 선택",
              "Chapter 4 - 진실",
              "게임 특징",
              "Q&A"
            ].map((item, index) => (
              <li key={index} className="flex items-center gap-3 text-muted-foreground">
                <span className="font-mono text-xs text-primary w-6">{String(index + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
