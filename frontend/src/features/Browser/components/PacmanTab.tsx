import React, { useState, useEffect, useRef } from 'react';

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
}

export const PacmanTab: React.FC = () => {
  const [grid, setGrid] = useState<number[][]>(INITIAL_GRID.map(row => [...row]));
  const [pacman, setPacman] = useState<Entity>({ x: 7, y: 10 });
  const [ghosts, setGhosts] = useState<Ghost[]>([
    { x: 7, y: 6, color: '#f00' },
    { x: 8, y: 6, color: '#ffb8ff' },
    { x: 6, y: 6, color: '#00ffff' },
  ]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  
  const directionRef = useRef<Direction>(null);
  
  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser scrolling and capture game keys
      if (['ArrowUp', 'w', 'W'].includes(e.key)) directionRef.current = 'UP';
      if (['ArrowDown', 's', 'S'].includes(e.key)) directionRef.current = 'DOWN';
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) directionRef.current = 'LEFT';
      if (['ArrowRight', 'd', 'D'].includes(e.key)) directionRef.current = 'RIGHT';
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameOver || won) return;

    const moveEntity = (ent: Entity, dir: Direction): Entity => {
      let nx = ent.x;
      let ny = ent.y;
      if (dir === 'UP') ny -= 1;
      if (dir === 'DOWN') ny += 1;
      if (dir === 'LEFT') nx -= 1;
      if (dir === 'RIGHT') nx += 1;

      // Wrap around tunnel
      if (ny === 8 && nx < 0) nx = 14;
      if (ny === 8 && nx > 14) nx = 0;
      if (ny === 6 && nx < 0) nx = 14; // the tunnel logic fallback based on map row 6,8 usually.
      
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
        const next = moveEntity(prev, directionRef.current);
        
        // Eat dot
        if (grid[next.y][next.x] === 2) {
          const newGrid = [...grid];
          newGrid[next.y][next.x] = 0;
          setGrid(newGrid);
          setScore(s => s + 10);
        }
        
        return next;
      });

      setGhosts(prevGhosts => prevGhosts.map(ghost => {
        const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        // very basic random AI that doesn't just jitter in place (mostly)
        const validDirs = dirs.filter(d => {
          const np = moveEntity(ghost, d);
          return np.x !== ghost.x || np.y !== ghost.y; // means it moved
        });
        const randomDir = validDirs[Math.floor(Math.random() * validDirs.length)] || null;
        return { ...ghost, ...moveEntity(ghost, randomDir) };
      }));
    }, 200);

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
    if (!hasDots) setWon(true);
  }, [pacman, ghosts, grid]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-black font-pixel">
      <div className="text-white text-lg mb-4 flex justify-between w-[300px]">
        <span>SCORE: {score}</span>
        {gameOver && <span className="text-red-500">GAME OVER</span>}
        {won && <span className="text-green-500">YOU WIN!</span>}
      </div>
      
      <div 
        className="grid gap-[1px] bg-[#111] border-4 border-[#2255ff]"
        style={{ gridTemplateColumns: `repeat(${grid[0].length}, 20px)` }}
      >
        {grid.map((row, y) => row.map((cell, x) => {
          const isPacman = pacman.x === x && pacman.y === y;
          const ghostHere = ghosts.find(g => g.x === x && g.y === y);

          return (
            <div 
              key={`${x}-${y}`} 
              className={`w-[20px] h-[20px] flex items-center justify-center
                ${cell === 1 ? 'bg-[#2255ff]' : 'bg-black'}
              `}
            >
              {isPacman && !gameOver && (
                <div className="w-3.5 h-3.5 bg-yellow-400 rounded-full animate-pulse" />
              )}
              {!isPacman && ghostHere && (
                <div 
                  className="w-3.5 h-3.5 rounded-t-full rounded-b-sm" 
                  style={{ backgroundColor: ghostHere.color }} 
                />
              )}
              {!isPacman && !ghostHere && cell === 2 && (
                <div className="w-1 h-1 bg-white rounded-full" />
              )}
            </div>
          );
        }))}
      </div>
      
      <div className="text-[#a48cff] text-xs mt-6 text-center max-w-[300px] leading-relaxed">
        Use W A S D or Arrow Keys to move.<br/>
        Eat all the dots to win. Avoid ghosts!
      </div>
    </div>
  );
};
