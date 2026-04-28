import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fragmentApi } from '../../../shared/api/fragmentApi';
import { useWindowStore } from '../../../app/store/windowStore';
import type { DesktopWindowId } from '../../../shared/config/desktopWindows';

// 0: empty, 1: wall, 2: dot, 3: power pellet (optional, acting as dot for now)
const INITIAL_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 1, 1, 2, 1, 2, 2, 2, 1, 2, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 0, 1, 0, 1, 1, 2, 1, 1, 1],
  [0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0],
  [1, 1, 1, 2, 1, 0, 1, 1, 1, 0, 1, 2, 1, 1, 1],
  [2, 2, 2, 2, 2, 0, 1, 1, 1, 0, 2, 2, 2, 2, 2],
  [1, 1, 1, 2, 1, 0, 1, 1, 1, 0, 1, 2, 1, 1, 1],
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  [1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1],
  [1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null;

interface Entity {
  x: number;
  y: number;
}

interface Ghost extends Entity {
  color: string;
  dir: Direction;
}

interface PacmanTabProps {
  windowId?: DesktopWindowId;
}

export const PacmanTab: React.FC<PacmanTabProps> = ({ windowId }) => {
  const [grid, setGrid] = useState<number[][]>(INITIAL_GRID.map(row => [...row]));
  const [pacman, setPacman] = useState<Entity>({ x: 7, y: 10 });
  const [ghosts, setGhosts] = useState<Ghost[]>([
    { x: 7, y: 6, color: '#f00', dir: 'LEFT' },
    { x: 8, y: 6, color: '#ffb8ff', dir: 'RIGHT' },
  ]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [isMusicReady, setIsMusicReady] = useState(false);
  const queryClient = useQueryClient();
  const maximizeWindow = useWindowStore(state => state.maximizeWindow);

  // 1. Fragment Check
  const { data: isCleared, isLoading: isCheckLoading } = useQuery({
    queryKey: ['fragment', '1'],
    queryFn: () => fragmentApi.checkFragment('1'),
    retry: 1,
    staleTime: 0, // Always check with server
    refetchOnMount: 'always'
  });

  useEffect(() => {
    if (windowId && isMusicReady && !isCleared) {
      maximizeWindow(windowId);
    }
  }, [windowId, isMusicReady, isCleared, maximizeWindow]);

  // 2. Fragment Acquisition
  const acquireMutation = useMutation({
    mutationFn: () => fragmentApi.acquireFragment('1'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fragment', '1'] });
    }
  });

  // 3. BGM Setup
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const audio = new Audio('https://djbod0nv85jx9.cloudfront.net/audios/minigame_1_v1.mp3');
    audio.loop = true;
    audio.preload = 'auto';
    bgmRef.current = audio;

    const handleReady = () => setIsMusicReady(true);
    const handleError = () => {
      console.error('Failed to load BGM');
      setIsMusicReady(true); // Proceed without music if it fails
    };

    audio.addEventListener('canplaythrough', handleReady);
    audio.addEventListener('error', handleError);

    if (audio.readyState >= 4) {
      setIsMusicReady(true);
    }

    return () => {
      audio.removeEventListener('canplaythrough', handleReady);
      audio.removeEventListener('error', handleError);
      audio.pause();
      bgmRef.current = null;
    };
  }, []);

  const playBgm = () => {
    if (bgmRef.current && bgmRef.current.paused && !gameOver && !won && !isCleared) {
      bgmRef.current.play().catch(e => console.warn('Autoplay blocked:', e));
    }
  };

  useEffect(() => {
    if (isMusicReady) {
      playBgm();
    }
  }, [isMusicReady, gameOver, won, isCleared]);

  const handleRetry = () => {
    setGrid(INITIAL_GRID.map(row => [...row]));
    setPacman({ x: 7, y: 10 });
    setGhosts([
      { x: 7, y: 6, color: '#f00', dir: 'LEFT' },
      { x: 8, y: 6, color: '#ffb8ff', dir: 'RIGHT' },
    ]);
    setScore(0);
    setGameOver(false);
    setWon(false);
    directionRef.current = null;
    keysPressed.current.clear();
  };

  const directionRef = useRef<Direction>(null);
  const keysPressed = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(40);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        if (width === 0 || height === 0) return;

        const cols = 15;
        const rows = 15;

        // Very aggressive scaling: use 95% of width or 85% of height
        const sizeW = (width * 0.95) / cols;
        const sizeH = (height * 0.85) / rows;

        const nextSize = Math.floor(Math.min(sizeW, sizeH));
        if (nextSize > 10) {
          setCellSize(nextSize);
        }
      }
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(updateSize);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);
      updateDirection();
      playBgm();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
      updateDirection();
    };

    const updateDirection = () => {
      const keys = keysPressed.current;
      if (keys.has('ArrowUp') || keys.has('w') || keys.has('W')) directionRef.current = 'UP';
      else if (keys.has('ArrowDown') || keys.has('s') || keys.has('S')) directionRef.current = 'DOWN';
      else if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) directionRef.current = 'LEFT';
      else if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) directionRef.current = 'RIGHT';
      else directionRef.current = null;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameOver || won || !isMusicReady) return;

    const moveEntity = (ent: Entity, dir: Direction): Entity => {
      if (!dir) return { ...ent };
      let nx = ent.x;
      let ny = ent.y;
      if (dir === 'UP') ny -= 1;
      if (dir === 'DOWN') ny += 1;
      if (dir === 'LEFT') nx -= 1;
      if (dir === 'RIGHT') nx += 1;

      // Wrap around tunnel
      // Check grid boundaries for tunnel rows (index 6 and 8 in INITIAL_GRID)
      if (ny === 6 || ny === 8) {
        if (nx < 0) nx = grid[0].length - 1;
        else if (nx >= grid[0].length) nx = 0;
      }

      // Keep in bounds & check walls
      if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[0].length) {
        if (grid[ny][nx] !== 1) {
          return { x: nx, y: ny };
        }
      }
      return { ...ent };
    };

    const interval = setInterval(() => {
      setPacman(prev => {
        if (!directionRef.current) return prev;
        const next = moveEntity(prev, directionRef.current);

        if (grid[next.y][next.x] === 2) {
          const newGrid = [...grid];
          newGrid[next.y][next.x] = 0;
          setGrid(newGrid);
          setScore(s => s + 10);
        }
        return next;
      });

      // Difficulty adjustment: Ghosts move only 70% of the time (making them slower)
      if (Math.random() > 0.3) {
        setGhosts(prevGhosts => prevGhosts.map(ghost => {
          const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
          const nextInSameDir = moveEntity(ghost, ghost.dir);
          const canStay = nextInSameDir.x !== ghost.x || nextInSameDir.y !== ghost.y;

          const availableDirs = dirs.filter(d => {
            const opposites: Record<string, string> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
            if (d === opposites[ghost.dir as string]) return false;
            const np = moveEntity(ghost, d);
            return np.x !== ghost.x || np.y !== ghost.y;
          });

          let nextDir = ghost.dir;
          // Increased randomness (0.5 instead of 0.3) to make them less focused
          if (!canStay || (availableDirs.length > 0 && Math.random() < 0.5)) {
            if (availableDirs.length > 0) {
              nextDir = availableDirs[Math.floor(Math.random() * availableDirs.length)];
            } else {
              const allDirs = dirs.filter(d => {
                const np = moveEntity(ghost, d);
                return np.x !== ghost.x || np.y !== ghost.y;
              });
              nextDir = allDirs[Math.floor(Math.random() * allDirs.length)] || null;
            }
          }

          const nextPos = moveEntity(ghost, nextDir);
          return { ...ghost, ...nextPos, dir: nextDir };
        }));
      }
    }, 100);

    return () => clearInterval(interval);
  }, [grid, gameOver, won, isMusicReady]);

  // Check collisions and win state
  useEffect(() => {
    // Collision
    for (const g of ghosts) {
      if (g.x === pacman.x && g.y === pacman.y) {
        setGameOver(true);
      }
    }
    // Win (no more dots: 2)
    const DEBUG_MODE = false; // Set to true to win after eating 1 bone
    const hasDots = grid.some(row => row.includes(2));
    if (!won && (!hasDots || (DEBUG_MODE && score >= 10))) {
      setWon(true);
      if (!isCleared) {
        // Optimistically update the cache so new tabs immediately see it
        queryClient.setQueryData(['fragment', '1'], true);
        acquireMutation.mutate();
      }
    }
  }, [pacman, ghosts, grid, isCleared, score, won, queryClient, acquireMutation]);

  // 1. Check if we are still checking the database
  if (isCheckLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-[#a48cff] font-pixel text-xl animate-pulse">
        <div className="mb-4 tracking-widest uppercase">Checking System Status...</div>
        <div className="w-48 h-1 bg-[#1a1130] rounded-full overflow-hidden border border-[#543ab7]/30">
          <div className="h-full bg-[#543ab7] animate-progress" style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  // 2. If already cleared in DB AND we didn't just win it in this session, show 404
  if (isCleared && !won) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-[#ff2255] font-pixel p-10 text-center select-none">
        <div className="text-8xl mb-6 opacity-80 drop-shadow-[0_0_20px_rgba(255,34,85,0.5)]">404</div>
        <div className="text-2xl mb-2 tracking-tighter uppercase font-bold">Resource Already Secured</div>
        <p className="text-sm opacity-50 max-w-md leading-relaxed">
          The requested system fragment (1) has been successfully synchronized and is no longer available for direct access.
        </p>
        <div className="mt-8 px-4 py-2 border border-[#ff2255]/30 text-[#ff2255]/50 text-xs tracking-widest uppercase">
          Access Denied: Fragment_Already_Acquired
        </div>
      </div>
    );
  }

  // 3. Music loading state (Only if we are allowed to play)
  if (!isMusicReady) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-[#a48cff] font-pixel text-xl animate-pulse">
        <div className="mb-4 tracking-widest uppercase">Initializing Driver...</div>
        <div className="w-48 h-2 bg-[#1a1130] rounded-full overflow-hidden border border-[#543ab7]">
          <div className="h-full bg-[#543ab7] transition-all duration-300" style={{ width: '50%' }} />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center bg-black font-pixel overflow-hidden select-none">
      {/* Header Section */}
      <div className="w-full flex flex-col items-center z-10 mb-1">
        <div
          className="text-white text-2xl flex justify-between w-full items-center transition-all duration-200 font-bold bg-black/40 p-1 px-4 rounded-t-lg border-x-4 border-t-4 border-[#2255ff]/50"
          style={{ maxWidth: 15 * cellSize + 8 }}
        >
          <span>SCORE: {score}</span>
          <div className="flex items-center gap-4">
            {gameOver && <span className="text-red-500 font-bold animate-bounce text-xl">GAME OVER</span>}
            {gameOver && (
              <button
                onClick={handleRetry}
                className="px-3 py-1 bg-[#2255ff] hover:bg-[#3366ff] text-white rounded border-2 border-white/20 transition-all active:scale-95 text-sm shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
              >
                RETRY
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Central Game Area */}
      <div className="flex flex-col items-center justify-center overflow-hidden">
        <div
          className="relative grid bg-[#000d33] border-4 border-[#2255ff] shadow-[0_0_30px_rgba(34,85,255,0.4)]"
          style={{
            gridTemplateColumns: `repeat(${grid[0].length}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${grid.length}, ${cellSize}px)`,
            gap: cellSize > 50 ? '2px' : '1px'
          }}
        >
          {grid.map((row, y) => row.map((cell, x) => {
            const isPacman = pacman.x === x && pacman.y === y;
            const ghostHere = ghosts.find(g => g.x === x && g.y === y);

            return (
              <div
                key={`${x}-${y}`}
                className={`flex items-center justify-center relative overflow-hidden
                  ${cell === 1 ? 'bg-[#2255ff] border-[1px] border-[#3366ff] rounded-sm' : 'bg-black'}
                `}
                style={{ width: cellSize, height: cellSize }}
              >
                {isPacman && !gameOver && (
                  <img
                    src="/pacman/dog.png"
                    className="z-10"
                    style={{
                      width: cellSize * 0.8,
                      height: cellSize * 0.8,
                      imageRendering: 'pixelated'
                    }}
                    alt="dog"
                  />
                )}
                {!isPacman && ghostHere && (
                  <img
                    src="/pacman/person.svg"
                    className="z-10"
                    style={{
                      width: cellSize * 0.8,
                      height: cellSize * 0.8,
                      filter: ghostHere.color === '#f00' ? 'none' : `hue-rotate(${ghostHere.color === '#ffb8ff' ? '280deg' : '180deg'}) brightness(1.2)`,
                      imageRendering: 'pixelated'
                    }}
                    alt="person"
                  />
                )}
                {!isPacman && !ghostHere && cell === 2 && (
                  <img
                    src="/pacman/bone.svg"
                    style={{
                      width: cellSize * 0.7,
                      height: cellSize * 0.7,
                      imageRendering: 'pixelated'
                    }}
                    alt="bone"
                  />
                )}
              </div>
            );
          }))}
        </div>
      </div>

      {/* Bottom Instructions Section */}
      <div className="w-full flex flex-col items-center mt-2">
        <div
          className="text-[#a48cff] text-[10px] text-center leading-tight opacity-50 border-t border-white/10 pt-1"
          style={{ maxWidth: 15 * cellSize }}
        >
          Use W A S D or Arrow Keys to move. Eat bones. Avoid people!
        </div>
      </div>

      {/* CLEAR Overlay */}
      {won && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 animate-in fade-in duration-500">
          <div className="flex flex-col items-center justify-center scale-110">
            <span className="text-7xl md:text-9xl text-[#22ff55] font-bold mb-6 animate-pulse drop-shadow-[0_0_30px_rgba(34,255,85,0.8)]">CLEAR!</span>
            <span className="text-white text-xl md:text-2xl border-t border-[#22ff55] pt-6 tracking-widest text-center font-bold">
              SYSTEM RESOURCE SECURED<br />
              <span className="text-[#22ff55] text-sm opacity-70 mt-2 block">(FRAGMENT 1 ACQUIRED)</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
