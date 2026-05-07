import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fragmentApi } from '../../../shared/api/fragmentApi';
import { useWindowStore } from '../../../app/store/windowStore';
import { useStoryRuntimeStore } from '../../story-runtime/storyRuntime.store';
import type { DesktopWindowId } from '../../../shared/config/desktopWindows';

interface CyberPacketDashTabProps {
  windowId?: DesktopWindowId;
}

interface Obstacle {
  id: number;
  type: 'spike' | 'block';
  x: number;
  y: number; // 바닥 기준으로부터의 수직 높이 오프셋
  w: number;
  h: number;
}

// 60초 연속 칩튠 트랙 레이아웃 (총 트랙 길이: 18000px, 프레임당 이동 속도: 5.0px)
const CONTINUOUS_TRACK_LENGTH = 18000;
const TRACK_SPEED = 5.0;

const TRACK_OBSTACLES: Obstacle[] = [
  // --- INTRO (0초 ~ 10초 - 완만한 빌드업 및 기본 조작 숙지) ---
  { id: 1, type: 'spike', x: 600, y: 0, w: 30, h: 30 },
  { id: 2, type: 'spike', x: 1100, y: 0, w: 30, h: 30 },
  { id: 3, type: 'spike', x: 1600, y: 0, w: 30, h: 30 },
  { id: 4, type: 'block', x: 2100, y: 0, w: 50, h: 40 },
  { id: 5, type: 'spike', x: 2600, y: 0, w: 30, h: 30 },

  // --- VERSE (10초 ~ 25초 - 메인 비트 진입 및 플랫폼 블록 타기 도입) ---
  { id: 6, type: 'block', x: 3300, y: 0, w: 60, h: 40 },
  { id: 7, type: 'spike', x: 3315, y: 40, w: 30, h: 30 }, // 하늘색 블록 위에 위치한 가시 장애물
  { id: 8, type: 'spike', x: 3800, y: 0, w: 30, h: 30 },
  { id: 9, type: 'spike', x: 4300, y: 0, w: 30, h: 30 },
  { id: 10, type: 'spike', x: 4335, y: 0, w: 30, h: 30 }, // 가닥 연속 더블 가시
  { id: 11, type: 'block', x: 4900, y: 0, w: 80, h: 40 },
  { id: 12, type: 'spike', x: 5500, y: 0, w: 30, h: 30 },
  { id: 13, type: 'block', x: 6000, y: 0, w: 50, h: 40 },
  { id: 14, type: 'block', x: 6120, y: 0, w: 50, h: 80 }, // 이단 계단식 블록 배치
  { id: 15, type: 'spike', x: 6700, y: 0, w: 30, h: 30 },
  { id: 16, type: 'spike', x: 7300, y: 0, w: 30, h: 30 },

  // --- CHORUS DROP (25초 ~ 45초 - 음악 절정 구간, 고속 점프 및 고난도 계단 연주!) ---
  { id: 17, type: 'block', x: 8000, y: 0, w: 50, h: 40 },
  { id: 18, type: 'block', x: 8120, y: 0, w: 50, h: 80 },
  { id: 19, type: 'block', x: 8240, y: 0, w: 50, h: 120 }, // 삼단 연속 블록 등반!
  { id: 20, type: 'spike', x: 8800, y: 0, w: 30, h: 30 },
  { id: 21, type: 'spike', x: 8835, y: 0, w: 30, h: 30 }, // 더블 가시
  { id: 22, type: 'block', x: 9400, y: 0, w: 70, h: 40 },
  { id: 23, type: 'spike', x: 9420, y: 40, w: 30, h: 30 },
  { id: 24, type: 'spike', x: 10100, y: 0, w: 30, h: 30 },
  { id: 25, type: 'spike', x: 10700, y: 0, w: 30, h: 30 },
  { id: 26, type: 'spike', x: 10735, y: 0, w: 30, h: 30 }, // 더블 가시
  { id: 27, type: 'block', x: 11300, y: 0, w: 50, h: 40 },
  { id: 28, type: 'block', x: 11420, y: 0, w: 50, h: 80 },
  { id: 29, type: 'spike', x: 12000, y: 0, w: 30, h: 30 },
  { id: 30, type: 'spike', x: 12600, y: 0, w: 30, h: 30 },
  { id: 31, type: 'spike', x: 12635, y: 0, w: 30, h: 30 }, // 더블 가시
  { id: 32, type: 'block', x: 13200, y: 0, w: 80, h: 40 },
  { id: 33, type: 'spike', x: 13800, y: 0, w: 30, h: 30 },

  // --- OUTRO FINALE (45초 ~ 60s - 웅장한 아웃트로 마무리 질주) ---
  { id: 34, type: 'block', x: 14500, y: 0, w: 60, h: 40 },
  { id: 35, type: 'spike', x: 15100, y: 0, w: 30, h: 30 },
  { id: 36, type: 'spike', x: 15700, y: 0, w: 30, h: 30 },
  { id: 37, type: 'spike', x: 16300, y: 0, w: 30, h: 30 },
  { id: 38, type: 'block', x: 16900, y: 0, w: 70, h: 40 }
];

export const CyberPacketDashTab: React.FC<CyberPacketDashTabProps> = ({ windowId }) => {
  const queryClient = useQueryClient();
  const { currentNode } = useStoryRuntimeStore();
  const maximizeWindow = useWindowStore((state) => state.maximizeWindow);

  // 챕터 3 활성화 노드 구역 검증
  const isInCh3 = Boolean(currentNode?.code?.startsWith("CH3_"));

  // 세션 조각 동기화 유무 조회
  const { data: isCleared, isLoading: isCheckLoading } = useQuery({
    queryKey: ['fragment', '3'],
    queryFn: () => fragmentApi.checkFragment('3'),
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always'
  });

  const acquireMutation = useMutation({
    mutationFn: () => fragmentApi.acquireFragment('3'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fragment', '3'] });
    }
  });

  const [gameState, setGameState] = useState<'intro' | 'playing' | 'crashed' | 'cleared'>('intro');
  const [progressPercent, setProgressPercent] = useState(0);

  // --- 사이버 패킷 대시 캔버스 게임 엔진 ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 60FPS 하이퍼 스무스 렌더링을 위해 물리 상태 값을 useRef로 관리
  const playerRef = useRef({
    x: 80,
    y: 326, // 기준 바닥 높이 Y=350. 플레이어 안착 좌표는 350 - 24 = 326
    vy: 0,
    onGround: true,
    jumpsCount: 0, // 점프 횟수 트래킹 (0: 바닥, 1: 1차 도약, 2: 2차 공중 이단점프)
    rotation: 0,
    trail: [] as Array<{ x: number; y: number }>
  });

  const trackOffsetRef = useRef(0);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; color: string; life: number }>>([]);
  const screenShakeRef = useRef(0);

  // --- WEB AUDIO API 실시간 8비트 주파수 합성기 ---
  const playSynthesizedSound = (type: 'jump' | 'crash' | 'win') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'jump') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
        osc.start();
        osc.stop(ctx.currentTime + 0.14);
      } else if (type === 'crash') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(261.63, ctx.currentTime); // 도 (C4)
        osc.frequency.setValueAtTime(329.63, ctx.currentTime + 0.1); // 미 (E4)
        osc.frequency.setValueAtTime(392.00, ctx.currentTime + 0.2); // 솔 (G4)
        osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.3); // 도 (C5)
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (err) {
      console.warn('사용자 터치 인터랙션 이전에 오디오 가동 제한 상태입니다.', err);
    }
  };

  const initLevel = () => {
    playerRef.current = {
      x: 80,
      y: 326,
      vy: 0,
      onGround: true,
      jumpsCount: 0,
      rotation: 0,
      trail: []
    };
    trackOffsetRef.current = 0;
    setProgressPercent(0);
    particlesRef.current = [];
    screenShakeRef.current = 0;
  };

  const spawnParticles = (x: number, y: number, color: string, count = 10, speedMultiplier = 1.0) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 3 + 2) * speedMultiplier;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.0,
        color,
        life: 25
      });
    }
  };

  const handleJump = () => {
    if (gameState !== 'playing') return;
    const p = playerRef.current;
    if (p.onGround) {
      p.vy = -8.2; // 1차 기본 점프 도약
      p.onGround = false;
      p.jumpsCount = 1;
      playSynthesizedSound('jump');
      spawnParticles(p.x, p.y + 12, '#00ff66', 6, 0.6);
    } else if (p.jumpsCount === 1) {
      p.vy = -7.4; // 2차 공중 이단 점프 작동!
      p.jumpsCount = 2;
      playSynthesizedSound('jump');
      // 공중 더블 도약 전용 화사한 하늘색 스파크 네온 파티클 살포
      spawnParticles(p.x, p.y, '#05d9e8', 12, 1.2);
    }
  };

  // 키보드 방향키 및 스페이스바 점프 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleJump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // 60FPS 실시간 초정밀 렌더링 및 물리 처리 메인 루프
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const tick = () => {
      const p = playerRef.current;
      const obstacles = TRACK_OBSTACLES;
      const speed = TRACK_SPEED;

      // 1. 트랙 스크롤 전진 연산 (장애물과 바닥 그리드가 왼쪽으로 순감)
      trackOffsetRef.current += speed;
      const trackOffset = trackOffsetRef.current;
      const currentProgress = Math.min(100, (trackOffset / CONTINUOUS_TRACK_LENGTH) * 100);
      setProgressPercent(Math.floor(currentProgress));

      // 2. 가속도 중력 수직 낙하 적용
      const gravity = 0.42;
      p.vy += gravity;
      p.y += p.vy;

      // 공중에 체공해 있는 동안 큐브 캐릭터 부드럽게 롤링 회전
      if (!p.onGround) {
        p.rotation += 0.092;
      } else {
        // 착지 순간 캐릭터 각도를 가장 자연스러운 90도(PI / 2) 배수로 수렴
        const targetRot = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
        p.rotation += (targetRot - p.rotation) * 0.35;
      }

      // 3. 충돌 바닥 한계점 수평선 설정 (바닥 350 기준, 캐릭터 높이 고려한 안착점 326)
      let landingY = 326;
      let onPlatform = false;

      // 4. 장애물별 정밀 바운딩 박스 충돌 판정 및 블록 윗면 안착 연산
      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        const obsScreenX = obs.x - trackOffset;

        if (obsScreenX < -100 || obsScreenX > 500) continue;

        if (obs.type === 'spike') {
          // 백신 가시 (삼각형 정밀 AABB 충돌)
          const spikeY = 350 - obs.y - 30;
          const playerCenterX = p.x;
          const playerCenterY = p.y + 12;

          const distX = Math.abs(playerCenterX - (obsScreenX + 15));

          // 억울함 없는 완벽한 플레이 느낌을 보장하는 관대 마진 적용 충돌
          if (distX < 18 && playerCenterY > spikeY + 2) {
            // 패킷 공중 파쇄 크래시 발생!
            setGameState('crashed');
            playSynthesizedSound('crash');
            screenShakeRef.current = 15;
            spawnParticles(p.x, p.y, '#ff3b30', 25, 2.2);
            return;
          }
        } else if (obs.type === 'block') {
          // 메인프레임 블록 (사이드 충돌사 및 윗면 안착 기법 구현)
          const blockTopY = 350 - obs.y - obs.h;
          const blockScreenLeft = obsScreenX;
          const blockScreenRight = obsScreenX + obs.w;

          const playerLeft = p.x - 12;
          const playerRight = p.x + 12;
          const playerBottom = p.y + 24;

          // 블록 플랫폼의 윗면 렌딩 완벽 감지
          if (
            playerRight > blockScreenLeft + 3 &&
            playerLeft < blockScreenRight - 3 &&
            p.vy >= 0 &&
            playerBottom >= blockTopY &&
            playerBottom <= blockTopY + 10
          ) {
            landingY = blockTopY - 24;
            onPlatform = true;
          } else if (
            playerRight > blockScreenLeft &&
            playerLeft < blockScreenLeft + 8 &&
            playerBottom > blockTopY + 4
          ) {
            // 블록 좌측 정면을 그대로 들이받아 전송 에러 크래시 판정
            setGameState('crashed');
            playSynthesizedSound('crash');
            screenShakeRef.current = 15;
            spawnParticles(p.x, p.y, '#ff3b30', 25, 2.2);
            return;
          }
        }
      }

      // 낙하 수렴 처리 및 상태 초기화
      if (p.y >= landingY) {
        p.y = landingY;
        p.vy = 0;
        p.onGround = true;
        p.jumpsCount = 0; // 바닥 안착 시 이단 점프 횟수 전격 재충전!
      } else if (!onPlatform) {
        p.onGround = false;
        // 코요테 타임(Coyote Time): 도약 없이 그냥 아래로 흘러내려 떨어졌을 때 공중 1회 도약 구명 가동
        if (p.jumpsCount === 0) {
          p.jumpsCount = 1;
        }
      }

      // 네온 트레일 자취 수집 연산
      p.trail.push({ x: p.x, y: p.y + 12 });
      if (p.trail.length > 12) p.trail.shift();

      // 5. 완주율 100% 최종 목적지 관문 골인 통과 체크
      if (trackOffset >= CONTINUOUS_TRACK_LENGTH) {
        setGameState('cleared');
        playSynthesizedSound('win');
        acquireMutation.mutate();
        return;
      }

      // --- 화면 캔버스 직접 렌더링 페이즈 ---
      ctx.clearRect(0, 0, 400, 500);

      // 크래시 발생 시의 격정적인 화면 흔들림(Juice) 연산 컨텍스트 적용
      ctx.save();
      if (screenShakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * screenShakeRef.current;
        const dy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(dx, dy);
        screenShakeRef.current *= 0.9;
      }

      // 왼쪽으로 동적 흐름을 표출하는 동시성 배경 그리드 격자선 드로잉
      ctx.strokeStyle = '#0e0b30';
      ctx.lineWidth = 1;
      const gridOffset = -(trackOffset % 40);
      for (let x = gridOffset; x < 400; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 350);
        ctx.stroke();
      }
      for (let y = 0; y < 350; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(400, y);
        ctx.stroke();
      }

      // 우아하게 빛나는 네온 그린 그라운드 라인 드로잉
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ff66';
      ctx.strokeStyle = '#00ff66';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 350);
      ctx.lineTo(400, 350);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#050215';
      ctx.fillRect(0, 352, 400, 150);

      // 플레이어 잔상 네온 꼬리선 드로잉
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.45)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      p.trail.forEach((t, index) => {
        if (index === 0) ctx.moveTo(t.x, t.y);
        else ctx.lineTo(t.x, t.y);
      });
      ctx.stroke();

      // 장애물 요소 물리 연동 렌더링
      obstacles.forEach((obs) => {
        const obsScreenX = obs.x - trackOffset;
        if (obsScreenX < -100 || obsScreenX > 500) return;

        ctx.save();
        if (obs.type === 'spike') {
          // 사이버 펑크 스타일의 네온 삼각 가시(백신 방화벽) 렌더링
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#ff2a6d';
          ctx.fillStyle = '#ff2a6d';
          const topY = 350 - obs.y - obs.h;
          ctx.beginPath();
          ctx.moveTo(obsScreenX, 350 - obs.y);
          ctx.lineTo(obsScreenX + obs.w / 2, topY);
          ctx.lineTo(obsScreenX + obs.w, 350 - obs.y);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(obsScreenX + 5, 349 - obs.y);
          ctx.lineTo(obsScreenX + obs.w / 2, topY + 8);
          ctx.lineTo(obsScreenX + obs.w - 5, 349 - obs.y);
          ctx.closePath();
          ctx.fill();
        } else if (obs.type === 'block') {
          // 하늘색 격자무늬 내부 회로 기판을 묘사하는 메인프레임 블록 드로잉
          ctx.shadowBlur = 8;
          ctx.shadowColor = '#05d9e8';
          ctx.strokeStyle = '#05d9e8';
          ctx.lineWidth = 2;
          ctx.fillStyle = '#0c072b';
          const blockY = 350 - obs.y - obs.h;
          ctx.fillRect(obsScreenX, blockY, obs.w, obs.h);
          ctx.strokeRect(obsScreenX, blockY, obs.w, obs.h);

          ctx.fillStyle = 'rgba(5, 217, 232, 0.25)';
          ctx.fillRect(obsScreenX + 4, blockY + 4, obs.w - 8, obs.h - 8);
        }
        ctx.restore();
      });

      // 피니시 곡의 마지막 관문 거대 초록 전송 포탈 드로잉
      const finishPortalX = CONTINUOUS_TRACK_LENGTH - trackOffset;
      if (finishPortalX > -100 && finishPortalX < 500) {
        ctx.save();
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#00ff66';
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(finishPortalX, 250, 80, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 255, 102, 0.15)';
        ctx.fill();
        ctx.restore();
      }

      // 플레이어 그린 큐브 본체 그리기
      ctx.save();
      ctx.translate(p.x, p.y + 12);
      ctx.rotate(p.rotation);

      ctx.shadowBlur = 18;
      ctx.shadowColor = '#00ff66';
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(-12, -12, 24, 24);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -6, 4, 12);
      ctx.fillRect(2, -6, 4, 12);
      ctx.restore();

      // 사방으로 튀는 찬란한 스파크 파티클 업데이트 연산
      const activeParticles = particlesRef.current;
      activeParticles.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = pt.life / 25;
        ctx.fillRect(pt.x, pt.y, 4, 4);
      });
      ctx.globalAlpha = 1.0;
      particlesRef.current = activeParticles.filter((pt) => pt.life > 0);

      ctx.restore(); // 화면 쉐이크 보정 해제

      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationId);
  }, [gameState]);

  const startContinuousRun = () => {
    setGameState('playing');
    setTimeout(() => initLevel(), 50);
  };

  // 1. 챕터 3 외부 노드 접근 차단 처리 화면
  if (!isInCh3) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#040112] text-[#ff2a6d] font-mono select-none p-6">
        <div className="border-4 border-[#ff2a6d] px-8 py-6 rounded-xl text-center bg-[#150116] shadow-[0_0_30px_rgba(255,42,109,0.35)] animate-pulse">
          <div className="text-5xl font-black mb-3 tracking-widest">🚨 ACCESS DENIED 🚨</div>
          <p className="text-cyan-400 text-lg font-bold">Chapter 3 Session Only</p>
          <p className="text-gray-500 text-xs mt-4">Security protocol blocks access outside Active Node.</p>
        </div>
      </div>
    );
  }

  // 2. React Query 동기화 서버 지연 시 로딩 화면
  if (isCheckLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#040112] text-cyan-400 font-mono p-6">
        <div className="text-xl font-bold animate-pulse">ESTABLISHING DATA TUNNEL...</div>
      </div>
    );
  }

  // 3. 이미 침투에 완수하여 동기화 세션이 영구 확보된 상태 화면
  if (isCleared) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#040112] text-cyan-400 font-mono p-6 select-none">
        <div className="max-w-md w-full border border-cyan-400/30 bg-[#0c081e] px-8 py-8 rounded-xl text-center shadow-[0_0_40px_rgba(5,217,232,0.18)]">
          <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-950 border border-cyan-400 shadow-[0_0_15px_rgba(5,217,232,0.4)] animate-bounce">
            <svg viewBox="0 0 8 8" className="w-8 h-8" style={{ imageRendering: 'pixelated' }}>
              <path d="M1 5h1v1h1v1h2V6h1V5h1V3H6V2H5V1H3v1H2v1H1v2z" fill="#05d9e8" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold mb-2 tracking-widest text-white">FRAGMENT 3 SECURED</h2>
          <p className="text-green-400 text-sm font-semibold mb-4">60s Audio Transmission Synced</p>
          <div className="text-left bg-[#130f2a] border border-cyan-400/10 p-4 rounded text-xs text-gray-400 space-y-1">
            <p><span className="text-cyan-400 font-bold">DAEMON:</span> CONTINUOUS_BEAT_DASH</p>
            <p><span className="text-cyan-400 font-bold">STATUS:</span> COMPLETED / SYNCHRONIZED</p>
            <p><span className="text-cyan-400 font-bold">HASHCODE:</span> CLD_DSH_03_VERIFIED</p>
          </div>
          <p className="text-gray-500 text-[10px] mt-6">Master gateway secured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#040112] text-cyan-50 font-mono select-none flex flex-col overflow-hidden">
      {/* 게임 상단 네비 바 */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-[#00ff66]/15 bg-[#08031d]">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66]" />
          <span className="text-sm font-black tracking-widest text-[#00ff66]">CYBER PACKET DASH</span>
        </div>
        {gameState === 'playing' && (
          <div className="flex items-center gap-6">
            <div className="text-xs">
              TRACK: <span className="text-yellow-400 font-bold">60s CHIPTUNE RUN</span>
            </div>
            <div className="text-xs">
              PROGRESS: <span className="text-[#00ff66] font-black">{progressPercent}%</span>
            </div>
          </div>
        )}
      </div>

      {/* 게임 주요 실행부 컨테이너 */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0d072a] via-[#040112] to-[#010006]">
        {gameState === 'intro' && (
          <div className="max-w-md w-full text-center border border-[#00ff66]/30 bg-[#0a051d] px-8 py-8 rounded-xl shadow-[0_0_30px_rgba(0,255,102,0.12)]">
            <h3 className="text-xl font-black mb-2 tracking-widest text-white">60-SECOND FIREWALL BREACH</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              서버 복구 터널을 통과하기 위해 단 하나의 연속적인 **1분짜리 리드미컬 칩튠 트랙**을 완주하십시오.<br />
              지오메트리 대쉬 물리 엔진 기반의 초정밀 점프로 구성되어 있으며, **공중에서 한번 더 점프하면 이단 점프(Double Jump)**가 가능합니다!
              <br /><br />
              <span className="text-cyan-400 font-bold">🎮 리듬 플레이 가이드:</span><br />
              곡이 흐르면서 **Intro(0~10초) ➔ Verse(10~25초) ➔ Chorus Drop(25~45초) ➔ Outro(45~60초)**로 이어지며 장애물 속도와 배치 난이도가 리드미컬하게 변화합니다.
              <br /><br />
              점프 단축키: <span className="text-white">Spacebar / ArrowUp / W Key / 화면 아무 곳이나 클릭 (공중 연속 입력 시 이단 점프)</span>
              <br /><br />
              <span className="text-[#ff2a6d] font-bold">주의: 장애물 충돌 시 즉시 폭발음 사운드와 함께 0%부터 다시 시작해야 하니 고도의 집중력을 발휘해 주십시오!</span>
            </p>
            <button
              onClick={startContinuousRun}
              className="w-full py-3 rounded bg-[#00ff66] hover:bg-[#00dd55] text-[#040112] font-black transition-all shadow-[0_0_15px_rgba(0,255,102,0.4)]"
            >
              BREACH FIREWALL (START SONG)
            </button>
          </div>
        )}

        {gameState === 'crashed' && (
          <div className="max-w-md w-full text-center border border-red-500/30 bg-[#1d0611] px-8 py-8 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.22)]">
            <div className="text-5xl font-black text-red-500 mb-4 animate-bounce">PACKET CRASHED</div>
            <p className="text-sm text-gray-400 mb-2">
              방화벽 백신에 탐지되어 오디오 데이터 패킷이 공중 파쇄되었습니다.<br />
              100% 완성을 향해 60초의 오디오 궤적을 다시 한 번 돌파하십시오!
            </p>
            <p className="text-xs text-yellow-400 font-bold mb-6">최종 도달율: {progressPercent}%</p>
            <button
              onClick={startContinuousRun}
              className="w-full py-3 rounded bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)]"
            >
              RESTART SONG
            </button>
          </div>
        )}

        {gameState === 'cleared' && (
          <div className="max-w-md w-full text-center border border-green-500/30 bg-[#091e11] px-8 py-8 rounded-xl shadow-[0_0_40px_rgba(34,197,94,0.25)] animate-in fade-in zoom-in-95 duration-300">
            <div className="text-5xl font-black text-green-400 mb-2 tracking-widest animate-pulse">TRANSMITTED!</div>
            <p className="text-sm text-gray-400 mb-6">
              축하합니다! 60초의 칩튠 트랙 완주 성공!<br />
              우회 터널 최상단 메인 게이트를 통과해 파일(FRAGMENT 3)을 성공적으로 안전하게 복원하였습니다.
            </p>
            <div className="bg-[#0b2816] border border-green-400/20 px-4 py-3 rounded text-xs text-green-300 mb-6">
              FRAGMENT 3 SYNCED TO MAIN DATABASE
            </div>
            <p className="text-[10px] text-gray-500">Master session synchronization complete.</p>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="flex flex-col items-center">
            {/* 상단 완주 전송률 프로그레스 바 */}
            <div className="w-full max-w-[400px] bg-[#0c0926] h-3.5 rounded-full overflow-hidden border border-[#00ff66]/20 mb-4 shadow-[0_0_15px_rgba(0,0,0,0.6)] relative">
              <div
                className="h-full bg-gradient-to-r from-[#00ff66] to-[#05d9e8] transition-all duration-100 ease-out shadow-[0_0_15px_#00ff66]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* 인게임 Canvas 화면 렌더링 컨테이너 (화면 직접 터치 시 점프 작동) */}
            <div
              onClick={handleJump}
              className="relative border border-[#00ff66]/20 rounded-xl bg-[#03010b] p-1 shadow-[0_0_30px_rgba(0,255,102,0.12)] cursor-pointer active:scale-[0.995] transition-all"
            >
              <canvas
                ref={canvasRef}
                width={400}
                height={500}
                className="block bg-[#040112] rounded-lg"
              />
            </div>

            {/* 터치스크린 및 마우스 클릭 중심의 대형 하단 점프 패널 */}
            <div className="w-full max-w-[400px] mt-6">
              <button
                onClick={handleJump}
                className="w-full py-4 rounded-xl border border-[#00ff66]/30 bg-gradient-to-b from-[#06341d] to-[#020e08] hover:from-[#0b542f] hover:to-[#041622] active:scale-95 transition-all text-[#00ff66] font-black text-xl tracking-widest shadow-[0_0_20px_rgba(0,255,102,0.15)] flex flex-col items-center justify-center"
              >
                <span>TAP TO JUMP</span>
                <span className="text-[9px] opacity-60 mt-0.5">Spacebar / ArrowUp / W Key / Click Canvas</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default CyberPacketDashTab;
