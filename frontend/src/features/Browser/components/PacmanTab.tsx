import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fragmentApi } from '../../../shared/api/fragmentApi';

// 0: empty, 1: wall, 2: dot, 3: power pellet (optional, acting as dot for now)
const INITIAL_GRID = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,2,1,2,1,1,2,1],
  [1,2,1,1,2,1,2,2,2,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],
  [1,1,1,2,1,1,0,1,0,1,1,2,1,1,1],
  [0,0,1,2,1,0,0,0,0,0,1,2,1,0,0],
  [1,1,1,2,1,0,1,1,1,0,1,2,1,1,1],
  [2,2,2,2,2,0,1,1,1,0,2,2,2,2,2],
  [1,1,1,2,1,0,1,1,1,0,1,2,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,1,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,2,1,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
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

export const PacmanTab: React.FC = () => {
  const [grid, setGrid] = useState<number[][]>(INITIAL_GRID.map(row => [...row]));
  const [pacman, setPacman] = useState<Entity>({ x: 7, y: 10 });
  const [ghosts, setGhosts] = useState<Ghost[]>([
    { x: 7, y: 6, color: '#f00', dir: 'LEFT' },
    { x: 8, y: 6, color: '#ffb8ff', dir: 'RIGHT' },
    { x: 6, y: 6, color: '#00ffff', dir: 'UP' },
  ]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const queryClient = useQueryClient();

  // 1. Fragment Check
  const { data: isCleared, isLoading: isCheckLoading } = useQuery({
    queryKey: ['fragment', '1'],
    queryFn: () => fragmentApi.checkFragment('1'),
    retry: false
  });

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

    return () => {
      audio.pause();
      bgmRef.current = null;
    };
  }, []);

  const playBgm = () => {
    if (bgmRef.current && bgmRef.current.paused && !gameOver && !won && !isCleared) {
      bgmRef.current.play().catch(e => console.warn('Autoplay blocked:', e));
    }
  };
  
  const handleRetry = () => {
    setGrid(INITIAL_GRID.map(row => [...row]));
    setPacman({ x: 7, y: 10 });
    setGhosts([
      { x: 7, y: 6, color: '#f00', dir: 'LEFT' },
      { x: 8, y: 6, color: '#ffb8ff', dir: 'RIGHT' },
      { x: 6, y: 6, color: '#00ffff', dir: 'UP' },
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
  const [cellSize, setCellSize] = useState(20);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const padding = 20;
        const availableW = width - padding;
        const availableH = height - padding - 120; // Account for UI bars and score
        const sizeW = availableW / grid[0].length;
        const sizeH = availableH / grid.length;
        setCellSize(Math.min(sizeW, sizeH, 60)); // Max size 60px
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [grid]);
  
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
    if (gameOver || won) return;

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
  }, [grid, gameOver, won]);

  // Check collisions and win state
  useEffect(() => {
    // Collision
    for (const g of ghosts) {
      if (g.x === pacman.x && g.y === pacman.y) {
        setGameOver(true);
      }
    }
    // Win (no more dots: 2)
    const hasDots = grid.some(row => row.includes(2));
    if (!hasDots) {
      setWon(true);
      if (!isCleared) {
        acquireMutation.mutate();
      }
    }
  }, [pacman, ghosts, grid, isCleared]);

  if (isCheckLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-[#2255ff] font-pixel">
        <div className="animate-pulse">LOADING SYSTEM...</div>
      </div>
    );
  }

  if (isCleared) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black text-[#ff2255] font-pixel p-10 text-center">
        <div className="text-6xl mb-4">404</div>
        <div className="text-xl mb-8 border-b-2 border-[#ff2255] pb-2">PAGE NOT FOUND</div>
        <div className="text-xs text-white/50 max-w-[400px] leading-loose">
          The requested system resource is no longer available.<br/>
          Minigame protocol has been executed and secured.<br/>
          (FRAGMENT_CODE: 1 ACQUIRED)
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center bg-black font-pixel p-1">
      <div className="text-white text-lg mb-2 flex justify-between w-full max-w-[800px] items-center">
        <span>SCORE: {score}</span>
        <div className="flex items-center gap-4">
          {gameOver && <span className="text-red-500 font-bold animate-bounce">GAME OVER</span>}
          {won && <span className="text-green-500 font-bold animate-bounce">YOU WIN!</span>}
          {(gameOver || won) && (
            <button 
              onClick={handleRetry}
              className="px-4 py-1 bg-[#2255ff] hover:bg-[#3366ff] text-white rounded border-2 border-white/20 transition-all active:scale-95 text-sm"
            >
              RETRY
            </button>
          )}
        </div>
      </div>
      
      <div 
        className="grid gap-[1px] bg-[#000d33] border-4 border-[#2255ff] shadow-[0_0_20px_rgba(34,85,255,0.3)]"
        style={{ 
          gridTemplateColumns: `repeat(${grid[0].length}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${grid.length}, ${cellSize}px)`
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
                    width: cellSize * 0.4, 
                    height: cellSize * 0.4,
                    imageRendering: 'pixelated'
                  }} 
                  alt="bone" 
                />
              )}
            </div>
          );
        }))}
      </div>
      
      <div className="text-[#a48cff] text-xs mt-6 text-center max-w-[300px] leading-relaxed">
        Use W A S D or Arrow Keys to move the dog.<br/>
        Eat all the bones to win. Avoid the people!
      </div>
    </div>
  );
};
