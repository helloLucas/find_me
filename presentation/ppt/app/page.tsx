"use client"

import Hls from "hls.js"
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Command,
  Database,
  Eye,
  Filter,
  Gauge,
  GitBranch,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Network,
  Route,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  TrendingDown,
  Users,
  Zap,
} from "lucide-react"
import GlitchText from "@/components/GlitchText"

const PORTFOLIO_VIDEO_URL = "https://djbod0nv85jx9.cloudfront.net/videos/findMePortfolio/findMePortfolio.m3u8"
const FAILURE_RATE_FULL_SCALE = 38.2

type SlideType =
  | "cover"
  | "toc"
  | "goal"
  | "problem"
  | "strategy"
  | "storyContext"
  | "video"
  | "demo"
  | "features"
  | "integrity"
  | "logs"
  | "ux"
  | "hint"
  | "automation"
  | "architecture"
  | "k8s"
  | "infraResult"
  | "behaviorResult"
  | "team"
  | "qa"

const slides: Array<{ id: number; type: SlideType; steps?: number }> = [
  { id: 1, type: "cover" },
  { id: 2, type: "toc" },
  { id: 3, type: "goal" },
  { id: 4, type: "problem" },
  { id: 5, type: "strategy" },
  { id: 6, type: "storyContext" },
  { id: 7, type: "video" },
  { id: 8, type: "demo" },
  { id: 9, type: "features" },
  { id: 10, type: "integrity", steps: 5 },
  { id: 11, type: "logs" },
  { id: 12, type: "ux", steps: 9 },
  { id: 13, type: "hint", steps: 5 },
  { id: 14, type: "automation", steps: 8 },
  { id: 15, type: "architecture" },
  { id: 16, type: "k8s", steps: 3 },
  { id: 17, type: "infraResult", steps: 2 },
  { id: 18, type: "behaviorResult", steps: 3 },
  { id: 19, type: "team" },
  { id: 20, type: "qa" },
]

const slideScripts: Record<SlideType, { title: string; lines: string[] }> = {
  cover: {
    title: "오프닝",
    lines: [
      "FIND ME는 게임 그 자체보다 실제 유저가 들어오는 서비스를 운영해 보기 위한 프로젝트였습니다.",
      "브라우저 안에서 사건을 추적하는 형식을 빌려 유저의 관심과 재방문을 만들었습니다.",
    ],
  },
  toc: {
    title: "발표 흐름",
    lines: [
      "목표, 문제, 계획, 시연, 기능 설명, 성과 순서로 설명하겠습니다.",
      "구현 설명은 기술 계층보다 유저 경험과 운영 흐름 중심으로 묶었습니다.",
    ],
  },
  goal: {
    title: "프로젝트 목표",
    lines: [
      "핵심 목표는 실제 유저가 들어오는 서비스에서 트래픽, 로그, 피드백을 경험하는 것이었습니다.",
      "완성된 기능보다 운영 중 발견되는 문제를 어떻게 보고 고쳤는지가 중요했습니다.",
    ],
  },
  problem: {
    title: "문제 정의",
    lines: [
      "운영 경험을 얻으려면 실제 유저 행동이 필요합니다.",
      "그래서 유저가 다시 들어올 이유를 만들기 위해 게임형 서비스를 선택했습니다.",
    ],
  },
  strategy: {
    title: "전략",
    lines: [
      "유저 흥미를 만들기 위해 게임이라는 형태를 사용했습니다.",
      "재방문을 만들기 위해 주간 챕터 공개 구조를 설계했습니다.",
    ],
  },
  storyContext: {
    title: "챕터형 런타임",
    lines: [
      "챕터는 단순 화면 묶음이 아니라 서버 진행 상태와 연결된 실행 단위입니다.",
      "브라우저, 터미널, 메신저, 미니게임이 같은 진행 맥락을 공유합니다.",
    ],
  },
  video: {
    title: "포트폴리오 영상",
    lines: [
      "영상에서는 사용자가 어떤 분위기에서 단서를 보고 조작하는지 보여줍니다.",
      "이후 시연에서는 실제 진행 검증과 전이 흐름을 짧게 확인합니다.",
    ],
  },
  demo: {
    title: "실시간 시연",
    lines: [
      "시연의 초점은 화면 연출보다 서버가 진행 상태를 어떻게 판단하는지입니다.",
      "유저가 어디까지 왔는지는 URL이 아니라 서버 상태와 전이 그래프가 결정합니다.",
    ],
  },
  features: {
    title: "기능 인덱스",
    lines: [
      "이제 유저가 실제로 플레이하면서 필요해진 기능들을 설명합니다.",
      "진행 무결성, 로그, UX 개선, 힌트, 자동화, 인프라 순서입니다.",
    ],
  },
  integrity: {
    title: "진행 무결성",
    lines: [
      "현재 노드에서 허용된 명령만 다음 단계로 이어질 수 있게 했습니다.",
      "URL 변경, 임의 요청, 보상 위조 같은 우회는 서버 전이 그래프에서 차단됩니다.",
    ],
  },
  logs: {
    title: "로그 도구",
    lines: [
      "ELK는 구조화 로그 검색과 분석에 사용했습니다.",
      "PLG는 메트릭과 로그 스트림 관측을 위한 운영 도구 묶음입니다.",
    ],
  },
  ux: {
    title: "데이터 기반 UX 개선",
    lines: [
      "실패율과 유저 피드백을 보고 Tab 자동완성, 한글화, i18n 구조를 적용했습니다.",
      "피드백 외에도 글리치 연출처럼 몰입을 해치던 부분은 렌더링 최적화로 대응했습니다.",
    ],
  },
  hint: {
    title: "힌트",
    lines: [
      "힌트는 정답을 주는 기능이 아니라 막힌 유저가 이탈하지 않게 하는 장치입니다.",
      "Redis의 최근 행동, 실패 횟수, 현재 입력과 Postgres 전이 데이터를 결합해 현재 상황을 구성합니다.",
      "질문 라우팅, 벡터 검색, 힌트 레벨 조절을 거쳐 필요한 수준의 간접 힌트를 제공합니다.",
    ],
  },
  automation: {
    title: "자동화",
    lines: [
      "RAG 흐름은 입력 데이터 구성, 질문 라우팅, 검색/정제, 레벨별 힌트 생성으로 나눴습니다.",
      "폴백 검색과 후보 정제로 힌트 품질을 유지하고, 단계별 모델 라우팅으로 비용을 제어했습니다.",
    ],
  },
  architecture: {
    title: "시스템 아키텍처",
    lines: [
      "브라우저 런타임부터 서버, 데이터 계층, 관측 도구까지 한 흐름으로 연결했습니다.",
      "유저 경험에서 발생한 행동이 운영 데이터로 이어지도록 구성했습니다.",
    ],
  },
  k8s: {
    title: "운영 인프라",
    lines: [
      "Kubernetes 기반으로 배포 단위를 운영했고, HPA와 Ingress/ALB를 연결했습니다.",
      "목표는 배포 자체가 아니라 유저가 들어온 뒤 상태를 관측하고 대응하는 것이었습니다.",
    ],
  },
  infraResult: {
    title: "운영 지표",
    lines: [
      "ALB 기준 요청량을 일별 선 그래프로 보여줍니다.",
      "다음 단계에서는 총 요청, 피크 시간 요청량, 5xx 비율을 핵심 수치로 정리합니다.",
    ],
  },
  behaviorResult: {
    title: "유저 행동 지표",
    lines: [
      "Kibana, GA4, Clarity는 서로 다른 관점의 지표입니다.",
      "서버 로그, 프론트 이벤트, 사용자 세션을 분리해서 해석해야 합니다.",
    ],
  },
  team: {
    title: "팀 소개",
    lines: [
      "각 팀원이 기능 구현과 운영 흐름의 일부를 맡아 완성했습니다.",
      "발표에서는 개인 역할보다 전체 서비스가 어떻게 연결됐는지에 집중합니다.",
    ],
  },
  qa: {
    title: "마무리",
    lines: [
      "FIND ME는 유저를 모으기 위해 게임을 선택한 운영형 기술 프로젝트입니다.",
      "질문을 받겠습니다.",
    ],
  },
}

export default function Presentation() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [glitchActive, setGlitchActive] = useState(false)
  const [isScriptOpen, setIsScriptOpen] = useState(false)
  const stepCount = slides[currentSlide].steps ?? 1
  const currentSlideType = slides[currentSlide].type
  const currentScript = slideScripts[currentSlideType]

  const goToSlide = useCallback(
    (index: number, step = 0) => {
      if (index < 0 || index >= slides.length || isTransitioning) return

      setIsTransitioning(true)
      setGlitchActive(true)
      setIsScriptOpen(false)
      setTimeout(() => {
        setCurrentSlide(index)
        setCurrentStep(Math.max(0, Math.min(step, (slides[index].steps ?? 1) - 1)))
        setGlitchActive(false)
        setIsTransitioning(false)
      }, 150)
    },
    [isTransitioning],
  )

  const next = useCallback(() => {
    if (isTransitioning) return
    if (currentStep < stepCount - 1) {
      setCurrentStep((step) => step + 1)
      return
    }

    goToSlide(currentSlide + 1)
  }, [currentSlide, currentStep, goToSlide, isTransitioning, stepCount])

  const prev = useCallback(() => {
    if (isTransitioning) return
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
      return
    }

    const previousSlide = currentSlide - 1
    goToSlide(previousSlide, previousSlide >= 0 ? (slides[previousSlide].steps ?? 1) - 1 : 0)
  }, [currentSlide, currentStep, goToSlide, isTransitioning])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScriptOpen) {
        if (e.key === "Escape") {
          e.preventDefault()
          setIsScriptOpen(false)
          return
        }

        if (e.key === "ArrowRight" || e.key === " " || e.key === "ArrowLeft" || e.key === "Backspace") {
          e.preventDefault()
          return
        }
      }

      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault()
        next()
      } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault()
        prev()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isScriptOpen, next, prev])

  return (
    <main className="min-h-screen bg-background relative overflow-hidden crt-effect noise-bg">
      <div className="scanline absolute inset-0 pointer-events-none z-50" />

      <nav className="fixed top-0 left-0 right-0 z-40 px-8 py-6 flex items-center justify-between border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Terminal className="w-7 h-7 text-primary" />
          <span className="font-mono text-lg text-muted-foreground">
            <span className="text-primary">b102</span>@find-me:~$
          </span>
        </div>

        <div className="flex items-center gap-5">
          <button
            onClick={prev}
            disabled={(currentSlide === 0 && currentStep === 0) || isTransitioning}
            className="p-2 border border-border rounded-md text-muted-foreground hover:text-primary hover:border-primary/40 disabled:opacity-30 disabled:hover:text-muted-foreground disabled:hover:border-border transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="font-mono text-base text-muted-foreground min-w-20 text-center">
            [{String(currentSlide + 1).padStart(2, "0")}/{String(slides.length).padStart(2, "0")}]
          </span>
          {stepCount > 1 && (
            <span className="font-mono text-sm text-primary min-w-16">
              step {currentStep + 1}/{stepCount}
            </span>
          )}

          <button
            onClick={next}
            disabled={(currentSlide === slides.length - 1 && currentStep === stepCount - 1) || isTransitioning}
            className="p-2 border border-border rounded-md text-muted-foreground hover:text-primary hover:border-primary/40 disabled:opacity-30 disabled:hover:text-muted-foreground disabled:hover:border-border transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="hidden xl:flex gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => goToSlide(i)}
                className={`h-3 rounded-sm transition-all duration-300 ${i === currentSlide ? "w-8 bg-primary" : "w-3 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                aria-label={`Go to slide ${slide.id}`}
              />
            ))}
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center pt-20 pb-10 px-6 md:px-12 h-screen">
        <div
          className={`w-full max-w-[1920px] aspect-video bg-card border border-border/30 shadow-[0_0_80px_-20px_rgba(var(--primary-rgb),0.3)] relative overflow-hidden transition-all duration-150 ${glitchActive ? "glitch-text" : ""
            }`}
        >
          <SlideContent type={slides[currentSlide].type} step={currentStep} />
          <button
            type="button"
            onClick={() => setIsScriptOpen(true)}
            className="absolute bottom-4 right-4 z-40 rounded-md border border-primary/35 bg-background/80 px-3 py-2 font-mono text-sm font-bold text-primary shadow-[0_0_20px_rgba(0,255,255,0.12)] backdrop-blur hover:bg-primary/10 hover:border-primary transition-colors"
            aria-label="Open B102 script"
          >
            B102
          </button>
          {isScriptOpen && (
            <ScriptModal
              script={currentScript}
              slideNumber={currentSlide + 1}
              step={currentStep + 1}
              stepCount={stepCount}
              onClose={() => setIsScriptOpen(false)}
            />
          )}
        </div>
      </div>
    </main>
  )
}

function ScriptModal({
  script,
  slideNumber,
  step,
  stepCount,
  onClose,
}: {
  script: { title: string; lines: string[] }
  slideNumber: number
  step: number
  stepCount: number
  onClose: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/82 px-10 py-8 backdrop-blur-md">
      <div className="w-full max-w-4xl rounded-2xl border border-primary/35 bg-card/95 p-8 text-left shadow-[0_0_70px_rgba(0,255,255,0.14)]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="font-mono text-primary text-base tracking-[0.24em]">B102 SCRIPT</p>
            <h3 className="mt-3 text-5xl font-black text-foreground">{script.title}</h3>
            <p className="mt-3 font-mono text-muted-foreground text-lg">
              slide {String(slideNumber).padStart(2, "0")} / step {step}/{stepCount}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-background/70 px-4 py-2 font-mono text-lg text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
            aria-label="Close script modal"
          >
            close
          </button>
        </div>

        <div className="mt-8 space-y-5">
          {script.lines.map((line, index) => (
            <div key={line} className="rounded-xl border border-border bg-background/55 px-6 py-5">
              <p className="font-mono text-primary text-base mb-2">{String(index + 1).padStart(2, "0")}</p>
              <p className="text-2xl leading-relaxed text-foreground">{line}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 font-mono text-sm text-muted-foreground">Esc로 닫기</p>
      </div>
    </div>
  )
}

function SlideContent({ type, step }: { type: SlideType; step: number }) {
  switch (type) {
    case "cover":
      return <CoverSlide />
    case "toc":
      return <TocSlide />
    case "goal":
      return <GoalSlide />
    case "problem":
      return <ProblemSlide />
    case "strategy":
      return <StrategySlide />
    case "storyContext":
      return <StoryContextSlide />
    case "video":
      return <VideoSlide />
    case "demo":
      return <DemoSlide />
    case "features":
      return <FeaturesSlide />
    case "integrity":
      return <IntegritySlide step={step} />
    case "logs":
      return <LogsSlide step={step} />
    case "ux":
      return <UXImprovementSlide step={step} />
    case "hint":
      return <HintSlide step={step} />
    case "automation":
      return <AutomationSlide step={step} />
    case "architecture":
      return <ArchitectureSlide />
    case "k8s":
      return <K8sSlide step={step} />
    case "infraResult":
      return <InfraResultSlide step={step} />
    case "behaviorResult":
      return <BehaviorResultSlide step={step} />
    case "team":
      return <TeamSlide />
    case "qa":
      return <QASlide />
    default:
      return null
  }
}

function SlideShell({
  eyebrow,
  title,
  children,
  center = false,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
  center?: boolean
}) {
  return (
    <div className={`h-full px-10 py-12 relative overflow-hidden ${center ? "flex items-center justify-center" : ""}`}>
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <div className={`relative z-10 h-full ${center ? "w-full flex flex-col items-center justify-center text-center" : ""}`}>
        <p className="font-mono text-xl text-primary mb-5 tracking-widest">{eyebrow}</p>
        <h2 className="text-6xl md:text-8xl font-bold text-foreground tracking-tighter leading-tight">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function CoverSlide() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 relative">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/4 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative z-10 text-center">
        <p className="font-mono text-xl text-primary mb-6 tracking-widest">[PROJECT_FINDME // GAME_PROPOSAL]</p>
        <h1 className="text-8xl md:text-[10rem] font-bold mb-8 tracking-tight">
          <GlitchText text="Find" className="text-foreground" />{" "}
          <GlitchText text="Me" className="text-primary pulse-glow inline-block" />
        </h1>
        <p className="text-3xl md:text-4xl text-muted-foreground font-mono mb-10">B102</p>
        <div className="flex flex-wrap justify-center gap-4 text-base font-mono">
          <span className="px-4 py-2 bg-primary/10 border border-primary/30 rounded text-primary">TERMINAL</span>
          <span className="px-4 py-2 bg-accent/10 border border-accent/30 rounded text-accent">MYSTERY</span>
          <span className="px-4 py-2 bg-cyber-green/10 border border-cyber-green/30 rounded text-cyber-green">LIVE OPS</span>
        </div>
      </div>
    </div>
  )
}

function TocSlide() {
  const items = [
    ["01", "프로젝트 목표"],
    ["02", "문제"],
    ["03", "계획"],
    ["04", "시연"],
    ["05", "기능 설명"],
    ["06", "성적"],
  ]

  return (
    <SlideShell eyebrow="[TABLE_OF_CONTENTS]" title="목차" center>
      <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mt-12 items-stretch">
        {items.map(([num, title]) => (
          <div key={num} className="h-full bg-card/80 border border-border rounded-2xl p-8 text-left hover:border-primary/50 transition-colors flex flex-col justify-center">
            <p className="font-mono text-primary text-2xl mb-4">{num}</p>
            <h3 className="text-3xl font-bold text-foreground">{title}</h3>
          </div>
        ))}
      </div>
    </SlideShell>
  )
}

function GoalSlide() {
  return (
    <SlideShell eyebrow="[01] PROJECT_GOAL" title="기술 프로젝트" center>
      <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mt-14 items-stretch">
        <KeywordCard icon={<Server className="w-10 h-10" />} title="인프라 운영" />
        <KeywordCard icon={<Network className="w-10 h-10" />} title="트래픽 대응" />
        <KeywordCard icon={<Eye className="w-10 h-10" />} title="로그 모니터링" />
      </div>
    </SlideShell>
  )
}

function ProblemSlide() {
  return (
    <SlideShell eyebrow="[02] PROBLEM" title="문제" center>
      <div className="mt-14 w-full max-w-5xl">
        <div className="grid md:grid-cols-[1fr_auto_1fr] items-stretch gap-6">
          <ProsNode
            label="유저"
            description="실제 방문 / 재접속 / 피드백"
          />
          <div className="flex flex-col items-center justify-center gap-2 text-primary self-center">
            <ArrowRight className="w-16 h-16" />
            <span className="font-mono text-sm tracking-[0.28em] text-muted-foreground">

            </span>
          </div>
          <ConsNode
            label="운영 검증"
            description="로그 / 트래픽 / 피드백"
          />
        </div>

        <div className="mt-12 mx-auto max-w-3xl rounded-2xl border border-border/40 bg-card/35 px-8 py-6 font-mono text-left opacity-55">
          <p className="text-muted-foreground/70 text-base mb-3">condition</p>
          <p className="text-3xl md:text-4xl text-foreground/70">
            if user.count == 0
          </p>
          <p className="mt-2 pl-10 text-3xl md:text-4xl text-accent/70">
            logs = traffic = feedback = 0
          </p>
        </div>
      </div>
    </SlideShell>
  )
}

function ProsNode({
  label,
  description,
}: {
  label: string
  description: string
}) {
  return (
    <div className="h-full rounded-2xl border border-border bg-card/80 px-8 py-8 text-left shadow-[0_0_30px_rgba(0,0,0,0.2)] flex flex-col justify-center">
      <p className="font-mono text-base tracking-[0.24em] text-primary mb-5">
        pros
      </p>
      <p className="text-4xl md:text-5xl font-black text-foreground">
        {label}
      </p>
      <p className="mt-4 text-xl text-muted-foreground">{description}</p>
    </div>
  )
}

function ConsNode({
  label,
  description,
}: {
  label: string
  description: string
}) {
  return (
    <div className="h-full rounded-2xl border border-border bg-card/80 px-8 py-8 text-left shadow-[0_0_30px_rgba(0,0,0,0.2)] flex flex-col justify-center">
      <p className="font-mono text-base tracking-[0.24em] text-primary mb-5">
        cons
      </p>
      <p className="text-4xl md:text-5xl font-black text-foreground">
        {label}
      </p>
      <p className="mt-4 text-xl text-muted-foreground">{description}</p>
    </div>
  )
}

function StrategySlide() {
  return (
    <SlideShell eyebrow="[03] STRATEGY" title="전략" center>
      <div className="grid gap-8 w-full max-w-5xl mt-12">
        <FlowLine left="유저 흥미 유도" right="게임" icon={<Users className="w-10 h-10" />} />
        <FlowLine left="재방문 유도" right="주간 챕터 공개" icon={<Calendar className="w-10 h-10" />} accent />
      </div>
    </SlideShell>
  )
}

function StoryContextSlide() {
  return (
    <SlideShell eyebrow="[04] STORY_CONTEXT" title="챕터형 런타임" center>
      <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-8 w-full max-w-6xl mt-10 items-stretch">
        <div className="overflow-hidden rounded-xl border border-primary/25 bg-terminal-bg">
          <img src="/prologue_frame.png" alt="프롤로그 장면" className="h-full w-full object-cover opacity-85" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-stretch">
          {[
            ["CH01", "진입과 단서 수집"],
            ["CH02", "명령 입력과 파일 탐색"],
            ["CH03", "패킷 / 미니게임 보상"],
            ["CH04", "최종 전이와 진엔딩"],
          ].map(([chapter, desc]) => (
            <div key={chapter} className="h-full rounded-xl border border-border bg-card/80 p-6 text-left flex flex-col justify-center">
              <p className="font-mono text-primary text-xl">{chapter}</p>
              <p className="mt-4 text-3xl font-bold text-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  )
}

function VideoSlide() {
  return (
    <SlideShell eyebrow="[04] VIDEO" title="포트폴리오 영상" center>
      <HlsVideoPlayer />
    </SlideShell>
  )
}

function HlsVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [status, setStatus] = useState("loading hls stream")

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = PORTFOLIO_VIDEO_URL
      setStatus("native hls ready")
      return () => {
        video.removeAttribute("src")
        video.load()
      }
    }

    if (!Hls.isSupported()) {
      setStatus("hls is not supported in this browser")
      return
    }

    hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
    })

    hls.loadSource(PORTFOLIO_VIDEO_URL)
    hls.attachMedia(video)
    hls.on(Hls.Events.MANIFEST_PARSED, () => setStatus("hls stream ready"))
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        setStatus("network error: retrying")
        hls?.startLoad()
        return
      }

      if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        setStatus("media error: recovering")
        hls?.recoverMediaError()
        return
      }

      setStatus("fatal hls error")
      hls?.destroy()
    })

    return () => {
      hls?.destroy()
      video.removeAttribute("src")
      video.load()
    }
  }, [])

  return (
    <div className="mt-10 w-full max-w-5xl">
      <div className="aspect-video bg-terminal-bg border border-primary/30 rounded-3xl overflow-hidden shadow-[0_0_70px_-20px_rgba(var(--primary-rgb),0.55)]">
        <video
          ref={videoRef}
          className="w-full h-full bg-black"
          controls
          playsInline
          preload="metadata"
          crossOrigin="anonymous"
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 font-mono text-base text-muted-foreground">
        <span>
          <span className="text-primary">$</span> play {PORTFOLIO_VIDEO_URL}
        </span>
        <span className="text-primary">{status}</span>
      </div>
    </div>
  )
}

function DemoSlide() {
  return (
    <SlideShell eyebrow="[04] LIVE_DEMO" title="실시간 시연" center>
      <div className="mt-14 w-full max-w-4xl bg-terminal-bg border border-accent/30 rounded-3xl p-10 font-mono text-left text-2xl leading-loose">
        <p className="text-primary">$ load_chapter --id=4 --status=ACTIVE</p>
        <p className="text-muted-foreground">[SYS] Chapter 4 initialized. Awaiting player input...</p>
        <p className="text-cyber-green mt-6">$ resolve --ending=true</p>
        <p className="text-accent">[!] FINAL_BRANCH_DETECTED</p>
      </div>
    </SlideShell>
  )
}

function FeaturesSlide() {
  const features: Array<{ title: string; icon: ReactNode }> = [
    { title: "진행 무결성", icon: <ShieldCheck className="w-9 h-9" /> },
    { title: "로그 수집", icon: <Database className="w-9 h-9" /> },
    { title: "UI/UX 개선", icon: <TrendingDown className="w-9 h-9" /> },
    { title: "힌트", icon: <BrainCircuit className="w-9 h-9" /> },
    { title: "운영 자동화", icon: <MessageSquare className="w-9 h-9" /> },
    { title: "HPA 기반 K8s", icon: <Activity className="w-9 h-9" /> },
  ]

  return (
    <SlideShell eyebrow="[05] FEATURE_INDEX" title="기능 설명" center>
      <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mt-12 items-stretch">
        {features.map((feature) => (
          <KeywordCard key={feature.title} icon={feature.icon} title={feature.title} />
        ))}
      </div>
    </SlideShell>
  )
}

function IntegritySlide({ step }: { step: number }) {
  const flow = [
    "현재 노드",
    "허용 명령",
    "유효성 검증",
    "다음 노드",
  ]

  return (
    <SlideShell eyebrow="[05.1] INTEGRITY" title="악용을 막는 진행 무결성" center>
      <div className="mt-12 grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-4 w-full max-w-6xl items-stretch">
        {flow.map((title, index) => (
          <div key={title} className="contents">
            <StepReveal show={step >= index}>
              <div className="h-full rounded-xl border border-primary/25 bg-primary/10 px-5 py-8 text-center flex items-center justify-center">
                <p className="text-4xl md:text-3xl font-black text-primary leading-tight">{title}</p>
              </div>
            </StepReveal>
            {index < flow.length - 1 && (
              <StepReveal show={step > index}>
                <div className="h-full flex items-center justify-center text-primary">
                  <ArrowRight className="w-8 h-8" />
                </div>
              </StepReveal>
            )}
          </div>
        ))}
      </div>
      <StepReveal show={step >= 3} className="mt-10">
        <div className="relative mx-auto max-w-5xl rounded-xl border border-accent/30 bg-accent/10 px-8 py-8 font-mono text-4xl text-accent overflow-hidden">
          URL 변경 / 임의 요청 / 보상 위조
          <div
            className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${step >= 4 ? "opacity-100 scale-100" : "opacity-0 scale-125"}`}
            aria-hidden="true"
          >
            <div className="absolute h-2 w-[92%] rotate-[-8deg] rounded-full bg-accent shadow-[0_0_30px_rgba(255,60,60,0.7)]" />
            <div className="absolute h-2 w-[92%] rotate-[8deg] rounded-full bg-accent shadow-[0_0_30px_rgba(255,60,60,0.7)]" />
          </div>
        </div>
      </StepReveal>
    </SlideShell>
  )
}

function LogsSlide() {
  return (
    <SlideShell eyebrow="[05.2] OBSERVABILITY" title="로그 분석" center>
      <div className="mt-12 grid md:grid-cols-2 gap-8 w-full max-w-6xl items-stretch">
        <ToolGroup
          title="ELK"
          subtitle="structured logs / search"
          tools={["Elasticsearch", "Logstash", "Kibana", "Filebeat"]}
        />
        <ToolGroup
          title="PLG"
          subtitle="metrics / log stream"
          tools={["Prometheus", "Loki", "Grafana", "Promtail"]}
          accent
        />
      </div>
    </SlideShell>
  )
}

function UXImprovementSlide({ step }: { step: number }) {
  return (
    <SlideShell eyebrow="[05.3] DATA_TO_UX" title="로그와 유저 데이터로 고친 것" center>
      <div className="mt-10 w-full max-w-6xl min-h-[470px]">
        {step <= 3 && <CliImprovementScene step={step} />}
        {step >= 4 && step <= 6 && <LocalizationScene step={step - 4} />}
        {step === 7 && <FeedbackScene />}
        {step >= 8 && <GlitchOptimizationScene />}
      </div>
    </SlideShell>
  )
}

function CliImprovementScene({ step }: { step: number }) {
  return (
    <div className="h-full min-h-[470px] rounded-2xl border border-border bg-card/80 p-10 flex items-center justify-center">
      {step === 0 && (
        <div className="grid grid-cols-2 gap-8 w-full max-w-4xl">
          <BigRate label="챕터1" value="7.1%" startValue={7.1} />
          <BigRate label="챕터2" value="38.2%" startValue={7.1} accent />
        </div>
      )}
      {step === 1 && (
        <div className="text-center">
          <Terminal className="w-20 h-20 text-primary mx-auto mb-8" />
          <p className="font-mono text-8xl font-black text-primary">Tab</p>
          <p className="mt-6 text-5xl font-black text-foreground">자동완성 적용</p>
        </div>
      )}
      {step >= 2 && <FailRateComparison improved={step >= 3} />}
    </div>
  )
}

function FailRateComparison({ improved }: { improved: boolean }) {
  const week03Value = improved ? 24.7 : 38.2

  return (
    <div className="grid md:grid-cols-[1fr_1fr_0.9fr] gap-6 w-full items-stretch">
      <AnimatedRate label="챕터2" value={38.2} accent />
      <AnimatedRate label="챕터3" value={week03Value} />
      <div className={`h-full rounded-2xl border p-8 flex flex-col items-center justify-center text-center transition-all duration-500 ${improved ? "border-primary/30 bg-primary/10 opacity-100" : "border-border bg-background/40 opacity-35"}`}>
        <p className="mt-5 text-6xl font-black text-primary">35.3%</p>
        <p className="mt-4 text-4xl font-black text-foreground">감소</p>
      </div>
    </div>
  )
}

function AnimatedRate({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  const color = accent ? "bg-accent text-accent border-accent/30" : "bg-primary text-primary border-primary/30"

  return (
    <div className={`h-full rounded-2xl border p-8 flex flex-col items-center justify-end text-center overflow-hidden ${accent ? "border-accent/30 bg-accent/10" : "border-primary/30 bg-primary/10"}`}>
      <p className="font-mono text-3xl text-muted-foreground">{label}</p>
      <p className={`mt-6 text-7xl font-black ${accent ? "text-accent" : "text-primary"} transition-all duration-500`}>
        {value.toFixed(1)}%
      </p>
      <div className="mt-8 h-44 w-full rounded-xl border border-border bg-background/50 flex items-end overflow-hidden">
        <div
          className={`w-full ${color.split(" ")[0]} transition-all duration-700 ease-out`}
          style={{ height: `${Math.min(100, Math.max(8, (value / FAILURE_RATE_FULL_SCALE) * 100))}%` }}
        />
      </div>
    </div>
  )
}

function LocalizationScene({ step }: { step: number }) {
  return (
    <div className="h-full min-h-[470px] rounded-2xl border border-border bg-card/80 overflow-hidden">
      {step === 0 && (
        <div className="relative h-full min-h-[470px]">
          <img
            src="/user_feedback_03.png"
            alt="영어 UI 피드백"
            className="absolute right-8 top-1/2 h-[80%] w-[54%] -translate-y-1/2 object-contain opacity-85 rounded-xl border border-primary/20 shadow-2xl"
          />
          <div className="absolute inset-y-0 left-0 w-[55%] bg-gradient-to-r from-background via-background/95 to-background/20" />
          <div className="relative z-10 h-full flex flex-col justify-center pl-12 pr-[58%] text-left">
            <p className="font-mono text-accent text-3xl">사용자 피드백</p>
            <p className="mt-6 text-7xl font-black text-foreground">영어 UI</p>
            <p className="mt-5 text-5xl font-black text-accent">이해도 저하</p>
          </div>
        </div>
      )}
      {step === 1 && (
        <div className="h-full min-h-[470px] flex flex-col items-center justify-center text-center">
          <p className="font-mono text-4xl text-muted-foreground">문구 하드코딩</p>
          <p className="mt-8 text-7xl font-black text-foreground">언어 전환</p>
          <p className="mt-6 text-6xl font-black text-accent">어려움</p>
        </div>
      )}
      {step === 2 && (
        <div className="h-full min-h-[470px] grid md:grid-cols-[0.9fr_1.1fr] gap-8 p-10 items-stretch">
          <div className="h-full rounded-2xl border border-primary/30 bg-primary/10 flex flex-col items-center justify-center text-center">
            <p className="font-mono text-8xl font-black text-primary">i18n</p>
            <p className="mt-6 text-4xl font-black text-foreground">다국어 구조</p>
          </div>
          <div className="h-full rounded-2xl border border-border bg-background/50 flex flex-col items-center justify-center text-center">
            <p className="text-6xl font-black text-foreground">한국어 UI</p>
            <p className="mt-6 text-5xl font-black text-primary">글로벌 확장</p>
          </div>
        </div>
      )}
    </div>
  )
}

function FeedbackScene() {
  return (
    <div className="relative h-full min-h-[470px] rounded-2xl border border-border bg-terminal-bg overflow-hidden">
      {["/user_feedback_01.png", "/user_feedback_02.png", "/user_feedback_03.png"].map((src, index) => (
        <img
          key={src}
          src={src}
          alt="유저 피드백"
          className="absolute top-12 h-80 w-[46%] object-cover rounded-xl border border-primary/25 shadow-2xl"
          style={{
            left: `${8 + index * 23}%`,
            zIndex: 10 + index,
            transform: `rotate(${(index - 1) * 4}deg)`,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />
      <div className="relative z-20 h-full flex items-end px-10 pb-3">
        <p className="text-7xl font-black text-foreground">다양한 피드백</p>
      </div>
    </div>
  )
}

function GlitchOptimizationScene() {
  const improvements = [
    "기사 가독성",
    "입력 피드백",
    "Tab 자동완성",
    "한글화 / i18n",
    "창 크기",
    "알림 문구",
    "상태 누수",
    "네트워크 예외",
    "미니게임 포커스",
    "힌트 정합성",
  ]

  return (
    <div className="h-full min-h-[470px] rounded-2xl border border-accent/30 bg-accent/10 p-10 grid md:grid-cols-[0.9fr_1.1fr] gap-8 items-stretch">
      <div className="h-full rounded-2xl border border-accent/30 bg-background/45 flex flex-col items-center justify-center text-center">
        <Zap className="w-20 h-20 text-accent mb-8" />
        <p className="font-mono text-3xl text-accent">대표 사례</p>
        <p className="mt-6 text-8xl font-black text-foreground">글리치</p>
        <p className="mt-6 text-6xl font-black text-accent">최적화</p>
      </div>
      <div className="h-full rounded-2xl border border-border bg-card/80 p-8 flex flex-col justify-center text-left">
        <p className="font-mono text-primary text-2xl">USER FEEDBACK</p>
        <p className="mt-4 text-5xl font-black text-foreground leading-tight">
          유저 피드백 기반 개선
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {improvements.map((item) => (
            <span
              key={item}
              className="rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-2xl font-bold text-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function BigRate({
  label,
  value,
  startValue = 0,
  accent = false,
}: {
  label: string
  value: string
  startValue?: number
  accent?: boolean
}) {
  const targetValue = Number(value.replace("%", ""))
  const [displayValue, setDisplayValue] = useState(startValue)

  useEffect(() => {
    setDisplayValue(startValue)

    if (startValue === targetValue) {
      return
    }

    const timeout = window.setTimeout(() => {
      setDisplayValue(targetValue)
    }, 180)

    return () => window.clearTimeout(timeout)
  }, [startValue, targetValue])

  return <AnimatedRate label={label} value={displayValue} accent={accent} />
}

function HintSlide({ step }: { step: number }) {
  const cards = [
    {
      icon: <GitBranch className="w-9 h-9" />,
      title: "입력 컨텍스트",
      lines: ["Redis 최근 행동", "실패 횟수 / 현재 입력", "유저 질문"],
    },
    {
      icon: <AlertTriangle className="w-9 h-9" />,
      title: "질문 라우팅",
      lines: ["게임 관련 / 무관 분류", "진행 질문 / 명령어 질문"],
    },
    {
      icon: <HelpCircle className="w-9 h-9" />,
      title: "벡터 검색",
      lines: ["PGVector 유사도 검색", "Postgres 노드 전이 결합"],
    },
    {
      icon: <Lightbulb className="w-9 h-9" />,
      title: "힌트 생성",
      lines: ["질문/실패 횟수 가중치", "힌트 레벨별 모델 라우팅", "후처리"],
    },
  ]

  return (
    <SlideShell eyebrow="[05.4] HINT" title="힌트" center>
      <div className="mt-10 w-full max-w-6xl">
        <div className="grid md:grid-cols-4 gap-4 items-stretch">
          {cards.map((card, index) => (
            <HintInfoCard
              key={card.title}
              visible={step >= index}
              icon={card.icon}
              title={card.title}
              lines={card.lines}
            />
          ))}
        </div>
        <StepReveal show={step >= 4} className="mt-10">
          <p className="text-5xl md:text-6xl font-black text-primary">정답 제공이 아니라 이탈 방지</p>
        </StepReveal>
      </div>
    </SlideShell>
  )
}

function AutomationSlide({ step }: { step: number }) {
  const isFlow = step <= 3

  return (
    <SlideShell eyebrow="[05.5] AUTOMATION" title={isFlow ? "RAG 흐름도" : "운영 포인트"} center>
      <div className="mt-10 w-full max-w-6xl">
        {isFlow ? <RagFlowScene step={step} /> : <RagPointsScene step={step - 4} />}
      </div>
    </SlideShell>
  )
}

function HintInfoCard({
  visible,
  icon,
  title,
  lines,
  tone = "primary",
}: {
  visible: boolean
  icon: ReactNode
  title: string
  lines: string[]
  tone?: "primary" | "green"
}) {
  const toneClasses =
    tone === "green"
      ? "border-cyber-green/25 bg-cyber-green/10 text-cyber-green"
      : "border-primary/25 bg-primary/10 text-primary"

  return (
    <StepReveal show={visible}>
      <div className="h-[330px] rounded-2xl border border-border bg-card/80 p-5 text-center flex flex-col items-center justify-center">
        <div className={`w-16 h-16 rounded-2xl border flex items-center justify-center ${toneClasses}`}>
          {icon}
        </div>
        <p className="mt-5 text-3xl font-black text-foreground leading-tight">{title}</p>
        <div className="mt-5 space-y-2">
          {lines.map((line) => (
            <p key={line} className="font-mono text-base leading-snug text-muted-foreground">
              {line}
            </p>
          ))}
        </div>
      </div>
    </StepReveal>
  )
}

function RagFlowScene({ step }: { step: number }) {
  const stages = [
    {
      icon: <GitBranch className="w-9 h-9" />,
      title: "입력 데이터 구성",
      lines: ["최근 행동 / 실패 횟수", "현재 입력 조회", "챕터·노드·전이 정보 결합"],
    },
    {
      icon: <AlertTriangle className="w-9 h-9" />,
      title: "질문 라우팅",
      lines: ["게임 진행 관련 / 무관 분류", "명령어 사용법 질문 의도 판별"],
    },
    {
      icon: <Search className="w-9 h-9" />,
      title: "검색 / 정제",
      lines: ["PGVector + 3단계 폴백", "중복 제거 / 최근 성공 제외", "함정 후보 억제"],
    },
    {
      icon: <Lightbulb className="w-9 h-9" />,
      title: "레벨 / 생성",
      lines: ["반복 횟수 / 실패 횟수 기반", "LIGHT / MEDIUM / STRONG"],
    },
  ]

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-7">
      <AutomationPipeline />
      <div className="mt-7 grid md:grid-cols-4 gap-4 items-stretch">
        {stages.map((stage, index) => (
          <HintInfoCard
            key={stage.title}
            visible={step >= index}
            icon={stage.icon}
            title={stage.title}
            lines={stage.lines}
          />
        ))}
      </div>
    </div>
  )
}

function RagPointsScene({ step }: { step: number }) {
  const cards = [
    {
      icon: <Search className="w-9 h-9" />,
      title: "폴백 검색",
      lines: ["1차 챕터+노드+행동 유형", "2차 행동 유형 완화", "3차 챕터 범위 검색"],
    },
    {
      icon: <Filter className="w-9 h-9" />,
      title: "후보 정제",
      lines: ["transition_id 중복 제거", "최근 성공 패턴 제외", "함정 후보 억제"],
    },
    {
      icon: <Gauge className="w-9 h-9" />,
      title: "레벨 결정",
      lines: ["실패 횟수 + 반복 횟수", "레벨 가중치 계산"],
    },
    {
      icon: <Command className="w-9 h-9" />,
      title: "명령어 분기",
      lines: ["질문 임베딩", "명령어 catalog 검색", "실제 사용 명령어와 병합"],
    },
  ]

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-7">
      <div className="grid md:grid-cols-4 gap-4 items-stretch">
        {cards.map((card, index) => (
          <HintInfoCard
            key={card.title}
            visible={step >= index}
            icon={card.icon}
            title={card.title}
            lines={card.lines}
            tone="green"
          />
        ))}
      </div>
      <StepReveal show={step >= 3} className="mt-8">
        <p className="text-5xl font-black text-cyber-green">비용 제어 + 이탈 방지 + 단계적 유도</p>
      </StepReveal>
    </div>
  )
}

function AutomationPipeline() {
  const stages = [
    ["REDIS", "행동 / 실패 맥락"],
    ["RAG", "검색 / 레벨링 / 생성"],
    ["HINT", "간접 힌트 제공"],
  ]

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-4 items-stretch">
      {stages.map(([title, desc], index) => (
        <div key={title} className="contents">
          <div className="rounded-xl border border-primary/25 bg-background/55 px-5 py-4 text-left">
            <p className="font-mono text-primary text-2xl">{title}</p>
            <p className="mt-2 text-xl text-muted-foreground">{desc}</p>
          </div>
          {index < stages.length - 1 && (
            <div className="flex items-center justify-center text-primary">
              <ArrowRight className="w-7 h-7" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function K8sSlide({ step }: { step: number }) {
  return (
    <SlideShell eyebrow="[05.7] INFRA" title="유저가 몰려와도 볼 수 있게(아마 삭제)" center>
      <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mt-14 items-stretch">
        <StepReveal show={step >= 0}>
          <KeywordCard icon={<Server className="w-9 h-9" />} title="Kubernetes" desc="" />
        </StepReveal>
        <StepReveal show={step >= 1}>
          <KeywordCard icon={<Activity className="w-9 h-9" />} title="HPA" desc="" />
        </StepReveal>
        <StepReveal show={step >= 2}>
          <KeywordCard icon={<Network className="w-9 h-9" />} title="Ingress / ALB" desc="" />
        </StepReveal>
      </div>
    </SlideShell>
  )
}

function ArchitectureSlide() {
  return (
    <div className="h-full w-full bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>
      <div className="absolute left-8 top-8 z-10 rounded-lg border border-primary/30 bg-background/85 px-5 py-3 backdrop-blur">
        <p className="font-mono text-base tracking-[0.2em] text-primary">[05.6] ARCHITECTURE</p>
        <p className="text-3xl font-black text-foreground">유저 경험에서 운영 데이터까지</p>
      </div>
      <img src="/system_architecture.png" alt="시스템 아키텍처" className="h-full w-full object-contain p-10 pt-24" />
    </div>
  )
}

function InfraResultSlide({ step }: { step: number }) {
  return (
    <SlideShell eyebrow="[06.1] INFRA_RESULT" title="운영 지표" center>
      <div className="mt-10 w-full max-w-6xl">
        <TrafficLineChart showMetrics={step >= 1} />
      </div>
    </SlideShell>
  )
}

const albDailyRequests = [
  { label: "04/29", value: 4897 },
  { label: "04/30", value: 8177 },
  { label: "05/01", value: 6204 },
  { label: "05/02", value: 7511 },
  { label: "05/03", value: 6220 },
  { label: "05/04", value: 13241 },
  { label: "05/05", value: 6194 },
  { label: "05/06", value: 7857 },
  { label: "05/07", value: 6515 },
  { label: "05/08", value: 6521 },
  { label: "05/09", value: 5922 },
  { label: "05/10", value: 5892 },
  { label: "05/11", value: 6925 },
  { label: "05/12", value: 11714 },
  { label: "05/13", value: 7901 },
  { label: "05/14", value: 7629 },
  { label: "05/15", value: 9580 },
  { label: "05/16", value: 10126 },
  { label: "05/17", value: 7181 },
  { label: "05/18", value: 4296 },
]

function TrafficLineChart({ showMetrics }: { showMetrics: boolean }) {
  const width = 1000
  const height = 360
  const padding = { top: 28, right: 34, bottom: 58, left: 68 }
  const maxValue = 14000
  const domainStart = getChartDateValue("04/28")
  const domainEnd = getChartDateValue("05/18")
  const domainSpan = domainEnd - domainStart
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const points = albDailyRequests.map((point, index) => {
    const x = padding.left + ((getChartDateValue(point.label) - domainStart) / domainSpan) * chartWidth
    const y = padding.top + chartHeight - (point.value / maxValue) * chartHeight
    return { ...point, x, y }
  })
  const peakPoint = points.reduce((peak, point) => point.value > peak.value ? point : peak, points[0])
  const peakLabelX = Math.min(peakPoint.x + 18, width - padding.right - 210)
  const peakLabelY = Math.max(14, peakPoint.y - 52)
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")
  const ticks = [0, 3500, 7000, 10500, 14000]
  const dateTicks = ["04/28", "05/04", "05/08", "05/12", "05/16", "05/18"]

  return (
    <div className="relative rounded-2xl border border-primary/25 bg-terminal-bg p-7 overflow-hidden">
      <style>{`
        @keyframes drawTrafficLine {
          from { stroke-dashoffset: 1; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div className="flex items-center justify-between mb-4">
        <div className="text-left">
          <p className="font-mono text-primary text-2xl">ALB RequestCount</p>
          <p className="font-mono text-muted-foreground text-base">04/28 - 05/18</p>
        </div>

      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[360px]">
        {ticks.map((tick) => {
          const y = padding.top + chartHeight - (tick / maxValue) * chartHeight
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="rgba(148,163,184,0.18)" strokeWidth="1" />
              <text x={padding.left - 14} y={y + 6} textAnchor="end" className="fill-muted-foreground font-mono text-[18px]">
                {tick === 0 ? "0" : `${Math.round(tick / 1000)}k`}
              </text>
            </g>
          )
        })}

        {dateTicks.map((label, index) => {
          const x = padding.left + ((getChartDateValue(label) - domainStart) / domainSpan) * chartWidth
          return (
            <text key={label} x={x} y={height - 16} textAnchor="middle" className="fill-muted-foreground font-mono text-[18px]">
              {label}
            </text>
          )
        })}

        <path
          d={path}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "drawTrafficLine 1400ms ease-out forwards" }}
        />

        {points.map((point, index) => (
          <circle
            key={point.label}
            cx={point.x}
            cy={point.y}
            r={point.value >= 10000 ? 7 : 4}
            className={point.value >= 10000 ? "fill-accent" : "fill-primary"}
            style={{
              opacity: 0,
              animation: "fadeIn 260ms ease-out forwards",
              animationDelay: `${350 + index * 55}ms`,
            }}
          />
        ))}

        <g
          className={`transition-opacity duration-300 ${showMetrics ? "opacity-100" : "opacity-0"}`}
          style={{ transitionDelay: showMetrics ? "180ms" : "0ms" }}
        >
          <circle
            cx={peakPoint.x}
            cy={peakPoint.y}
            r="11"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="3"
          />
          <line
            x1={peakPoint.x + 10}
            y1={peakPoint.y - 8}
            x2={peakLabelX}
            y2={peakLabelY + 26}
            stroke="var(--accent)"
            strokeWidth="2"
            strokeOpacity="0.65"
          />
          <rect
            x={peakLabelX}
            y={peakLabelY}
            width="194"
            height="62"
            rx="10"
            fill="rgba(2,6,23,0.88)"
            stroke="var(--accent)"
            strokeOpacity="0.55"
          />
          <text x={peakLabelX + 14} y={peakLabelY + 24} className="fill-accent font-mono text-[16px]">
            peak day {peakPoint.label}
          </text>
          <text x={peakLabelX + 14} y={peakLabelY + 50} className="fill-foreground font-mono text-[22px]">
            {peakPoint.value.toLocaleString()} req/day
          </text>
        </g>
      </svg>

      <div className={`mt-5 grid grid-cols-3 gap-4 transition-all duration-300 ${showMetrics ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}`}>
        <MetricTile label="total requests" value="150,503" />
        <MetricTile label="peak hour" value="3,467" tone="primary" />
        <MetricTile label="5xx rate" value="0.08%" tone="accent" />
      </div>
    </div>
  )
}

function getChartDateValue(label: string) {
  const [month, day] = label.split("/").map(Number)
  return Date.UTC(2026, month - 1, day)
}

function BehaviorResultSlide({ step }: { step: number }) {
  return (
    <SlideShell eyebrow="[06.2] USER_RESULT" title="회고" center>
      <div className="mt-10 grid md:grid-cols-3 gap-5 w-full max-w-6xl items-stretch">
        <StepReveal show={step >= 0}>
          <ResultPanel
            title="테일스케일"
            metrics={[
              ["Raw logs", "167,608"],
              ["Game events", "9,476"],
              ["SUCCESS / FAIL / ERROR", "6,698 / 2,675 / 103"],
            ]}
          />
        </StepReveal>
        <StepReveal show={step >= 1}>
          <ResultPanel
            title="리눅스 명령어"
            image="/ga4.png"
            metrics={[
              ["Active users", "75"],
              ["Views", "2,815"],
              ["Avg engagement", "25m 48s"],
            ]}
          />
        </StepReveal>
        <StepReveal show={step >= 2}>
          <ResultPanel
            title="GMS 호출시간"
            image="/clarity.png"
            metrics={[
              ["Sessions", "134"],
              ["Unique users", "61"],
              ["Dead clicks", "51.49%"],
            ]}
          />
        </StepReveal>
      </div>
    </SlideShell>
  )
}

function TeamSlide() {
  const roles = ["김아린", "민웅기", "박서현", "유동훈", "이유진", "이재용"]

  return (
    <SlideShell eyebrow="[06] TEAM" title="팀원소개" center>
      <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl mt-12 items-stretch">
        {roles.map((role) => (
          <div key={role} className="h-full bg-card/80 border border-border rounded-2xl p-8 text-center flex flex-col items-center justify-center">
            <Users className="w-10 h-10 text-primary mx-auto mb-4" />
            <p className="text-3xl font-bold text-foreground">{role}</p>
          </div>
        ))}
      </div>
    </SlideShell>
  )
}

function QASlide() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-10 py-12 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 text-center">
        <p className="font-mono text-xl text-primary mb-8 tracking-widest">[SESSION_COMPLETE]</p>
        <h2 className="text-8xl md:text-[10rem] font-bold text-foreground tracking-tighter">Q & A</h2>
        <div className="mt-14 font-mono text-3xl text-muted-foreground bg-terminal-bg border border-primary/30 rounded-2xl px-10 py-8 text-left">
          <span className="text-primary">$</span> echo &quot;Will you find me?&quot;
          <br />
          <span className="text-primary">root@b102:~$</span> <span className="text-primary animate-pulse">_</span>
        </div>
      </div>
    </div>
  )
}

function StepReveal({
  show,
  children,
  className = "",
}: {
  show: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`${className} transition-all duration-300 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
    >
      {children}
    </div>
  )
}

function MetricTile({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "primary" | "accent"
}) {
  const toneClass =
    tone === "primary"
      ? "text-primary border-primary/30 bg-primary/10"
      : tone === "accent"
        ? "text-accent border-accent/30 bg-accent/10"
        : "text-foreground border-border bg-background/50"

  return (
    <div className={`h-full rounded-xl border px-5 py-5 text-left flex flex-col justify-center ${toneClass}`}>
      <p className="font-mono text-sm uppercase tracking-[0.2em] opacity-70">{label}</p>
      <p className="mt-3 text-4xl md:text-5xl font-black">{value}</p>
    </div>
  )
}

function LogStage({
  icon,
  title,
  desc,
  accent = false,
}: {
  icon: ReactNode
  title: string
  desc: string
  accent?: boolean
}) {
  return (
    <div className={`h-full rounded-xl border p-5 text-left flex gap-4 items-start ${accent ? "border-accent/30 bg-accent/10" : "border-primary/25 bg-card/80"}`}>
      <div className={`mt-1 ${accent ? "text-accent" : "text-primary"}`}>{icon}</div>
      <div>
        <p className="text-3xl font-black text-foreground">{title}</p>
        <p className="mt-2 text-xl text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function ImprovementCard({
  number,
  title,
  desc,
  icon,
  accent = false,
}: {
  number: string
  title: string
  desc: string
  icon: ReactNode
  accent?: boolean
}) {
  return (
    <div className={`h-full rounded-xl border p-5 text-left grid grid-cols-[auto_1fr] gap-4 ${accent ? "border-primary/35 bg-primary/10" : "border-border bg-card/80"}`}>
      <div className={`w-14 h-14 rounded-lg border flex items-center justify-center ${accent ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground bg-background/50"}`}>
        {icon}
      </div>
      <div>
        <p className="font-mono text-sm tracking-[0.22em] text-muted-foreground">{number}</p>
        <p className="mt-1 text-3xl font-black text-foreground">{title}</p>
        <p className="mt-2 text-xl text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function Bar({
  label,
  value,
  max,
  tone,
}: {
  label: string
  value: number
  max: number
  tone: "primary" | "accent"
}) {
  const color = tone === "primary" ? "bg-primary" : "bg-accent"

  return (
    <div className="h-full flex flex-1 flex-col items-center justify-end gap-2">
      <div className="text-base font-mono text-muted-foreground">{value.toFixed(1)}%</div>
      <div
        className={`w-full rounded-t ${color}`}
        style={{ height: `${Math.max(8, (value / max) * 100)}%` }}
      />
      <div className="text-base font-mono text-muted-foreground">{label}</div>
    </div>
  )
}

function ResultPanel({
  title,
  image,
  metrics,
}: {
  title: string
  image?: string
  metrics: Array<[string, string]>
}) {
  return (
    <div className="h-full rounded-xl border border-border bg-card/80 p-5 text-left flex flex-col">
      <div className="h-32 overflow-hidden rounded-lg border border-primary/20 bg-terminal-bg">
        {image ? (
          <img src={image} alt={`${title} dashboard`} className="h-full w-full object-cover object-left-top opacity-85" />
        ) : (
          <div className="h-full flex items-center justify-center font-mono text-4xl text-primary">
            KIBANA
          </div>
        )}
      </div>
      <p className="mt-5 text-4xl font-black text-foreground">{title}</p>
      <div className="mt-5 space-y-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3">
            <span className="text-lg text-muted-foreground">{label}</span>
            <span className="font-mono text-primary text-xl">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ToolGroup({
  title,
  subtitle,
  tools,
  accent = false,
}: {
  title: string
  subtitle: string
  tools: string[]
  accent?: boolean
}) {
  const tone = accent
    ? "border-accent/35 bg-accent/10 text-accent"
    : "border-primary/35 bg-primary/10 text-primary"

  return (
    <div className={`h-full rounded-2xl border px-8 py-8 text-left ${tone}`}>
      <p className="font-mono text-5xl font-black">{title}</p>
      <p className="mt-3 font-mono text-base tracking-[0.18em] text-muted-foreground uppercase">{subtitle}</p>
      <div className="mt-8 grid gap-4">
        {tools.map((tool) => (
          <div
            key={tool}
            className="rounded-xl border border-border bg-background/55 px-6 py-5 text-center"
          >
            <p className="font-mono text-3xl font-black text-foreground">{tool}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function KeywordCard({ icon, title, desc }: { icon: ReactNode; title: string; desc?: string }) {
  return (
    <div className="h-full bg-card/80 border border-border rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/30 mx-auto mb-5">
        {icon}
      </div>
      <h3 className="text-3xl font-bold text-foreground">{title}</h3>
      {desc && <p className="text-xl text-muted-foreground mt-3">{desc}</p>}
    </div>
  )
}

function FlowLine({
  left,
  right,
  icon,
  accent = false,
}: {
  left: string
  right: string
  icon: ReactNode
  accent?: boolean
}) {
  return (
    <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
      <div className="h-full flex items-center justify-center bg-card/80 border border-border rounded-3xl p-10 text-3xl font-bold text-foreground">{left}</div>
      <div className={`w-20 h-20 rounded-full border flex items-center justify-center mx-auto self-center ${accent ? "border-accent/40 text-accent bg-accent/10" : "border-primary/40 text-primary bg-primary/10"}`}>
        {icon}
      </div>
      <div className={`h-full flex items-center justify-center rounded-3xl p-10 text-3xl font-bold border ${accent ? "bg-accent/10 border-accent/30 text-accent" : "bg-primary/10 border-primary/30 text-primary"}`}>{right}</div>
    </div>
  )
}
