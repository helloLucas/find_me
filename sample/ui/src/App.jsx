import React, { useState } from 'react';
import Window from './components/Window';
import Browser from './apps/Browser';
import Terminal from './apps/Terminal';
import Notepad from './apps/Notepad';
import './index.css';

const MAX_Z_INDEX = 1000;

function App() {
  const [windows, setWindows] = useState([]);
  const [topZIndex, setTopZIndex] = useState(1);

  const openWindow = (appProps) => {
    const exists = windows.find(w => w.id === appProps.id);
    if (exists) {
      bringToFront(appProps.id);
      return;
    }

    const newZIndex = topZIndex + 1;
    setTopZIndex(newZIndex);
    
    setWindows([
      ...windows, 
      { 
        ...appProps, 
        zIndex: newZIndex 
      }
    ]);
  };

  const closeWindow = (id) => {
    setWindows(windows.filter(w => w.id !== id));
  };

  const bringToFront = (id) => {
    const newZIndex = topZIndex + 1;
    setTopZIndex(newZIndex);
    setWindows(windows.map(w => 
      w.id === id ? { ...w, zIndex: newZIndex } : w
    ));
  };

  return (
    <div 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#008080',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', top: '20px', left: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        
        <div className="desktop-icon" onDoubleClick={() => openWindow({ 
          id: 'browser', 
          title: 'Internet Browser', 
          icon: '/win95_browser_1776140937015.png',
          component: <Browser />,
          defaultPosition: { x: 50, y: 50 },
          defaultSize: { width: 800, height: 600 }
        })}>
          <img src="/win95_browser_1776140937015.png" alt="Browser" />
          <span>Internet</span>
        </div>

        <div className="desktop-icon" onDoubleClick={() => openWindow({ 
          id: 'terminal', 
          title: 'MS-DOS Prompt', 
          icon: '/win95_terminal_1776140950505.png',
          component: <Terminal />,
          defaultPosition: { x: 150, y: 150 },
          defaultSize: { width: 600, height: 400 }
        })}>
          <img src="/win95_terminal_1776140950505.png" alt="Terminal" />
          <span>MS-DOS</span>
        </div>

        <div className="desktop-icon" onDoubleClick={() => openWindow({ 
          id: 'notepad', 
          title: 'Notepad', 
          icon: '/win95_notepad_1776140967165.png',
          component: <Notepad />,
          defaultPosition: { x: 250, y: 100 },
          defaultSize: { width: 500, height: 500 }
        })}>
          <img src="/win95_notepad_1776140967165.png" alt="Notepad" />
          <span>Notepad</span>
        </div>

        <div className="desktop-icon" onDoubleClick={() => {
            alert('Recycle Bin is empty!');
        }}>
          <img src="/win95_trash_1776140986135.png" alt="Trash" />
          <span>Recycle Bin</span>
        </div>

      </div>

      {windows.map(app => (
        <Window 
          key={app.id}
          title={app.title}
          icon={app.icon}
          zIndex={app.zIndex}
          onClose={() => closeWindow(app.id)}
          onFocus={() => bringToFront(app.id)}
          defaultPosition={app.defaultPosition}
          defaultSize={app.defaultSize}
        >
          {app.component}
        </Window>
      ))}

      <div className="retro-taskbar">
        <button className="retro-btn retro-taskbar-start" onClick={() => alert('Start menu clicked!')}>
          <img src="/favicon.svg" alt="Start" style={{ width: 16, height: 16 }} />
          <span>Start</span>
        </button>
        <div className="retro-taskbar-windows">
          {windows.map(app => (
            <button 
              key={app.id} 
              className={`retro-btn retro-taskbar-window-btn ${topZIndex === app.zIndex ? 'active' : ''}`}
              onClick={() => bringToFront(app.id)}
            >
              <img src={app.icon} alt={app.title} style={{ width: 16, height: 16, imageRendering: 'pixelated' }} />
              {app.title}
            </button>
          ))}
        </div>
        <div className="retro-taskbar-tray">
          <span className="retro-taskbar-time">2088-04-14</span>
        </div>
      </div>

    </div>
  );
}

export default App;
