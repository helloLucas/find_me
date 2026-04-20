import React, { useState, useEffect, useRef } from 'react';
import { useWindowStore } from '../../app/store/windowStore';
import { NewsTab } from './components/NewsTab';
import { HomeTab } from './components/HomeTab';
import { PacmanTab } from './components/PacmanTab';
import { NetworkDevTools } from './components/NetworkDevTools';
import { ContextMenu } from '../../shared/ui/ContextMenu';

interface Tab {
  id: string;
  title: string;
  url: string;
  component: 'news' | 'home' | 'pacman';
}

interface BrowserProps {
  windowId: string;
}

export const Browser: React.FC<BrowserProps> = ({ windowId }) => {
  const { closeWindow, focusWindow } = useWindowStore();
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'tab1', title: 'Home', url: 'http://voidcity-news/recent/1', component: 'news' }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab1');
  const [showDevTools, setShowDevTools] = useState(false);
  const [devToolsWidth, setDevToolsWidth] = useState(320);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId);

  const handleNewTab = () => {
    const newId = `tab_${Date.now()}`;
    setTabs(prev => [...prev, { id: newId, title: 'New Tab', url: '', component: 'home' }]);
    setActiveTabId(newId);
  };

  const navigateTab = (id: string, url: string, component: Tab['component'], title: string) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, url, component, title } : t));
  };

  const handleCloseTab = (id: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (filtered.length === 0) {
        closeWindow(windowId);
        return [];
      }
      if (activeTabId === id) {
        setActiveTabId(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  };

  useEffect(() => {
    // Attempt to lock keyboard (works in fullscreen environments)
    if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
      (navigator as any).keyboard.lock(['ControlLeft', 'KeyW', 'ControlRight', 'KeyW']).catch(() => {});
    }

    const handleCaptureKeyDown = (e: KeyboardEvent) => {
      // Global override for Ctrl+W if this browser is active
      const activeWindowId = useWindowStore.getState().activeWindowId;
      if (activeWindowId === windowId && e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        e.stopPropagation();
        handleCloseTab(activeTabId);
      }
    };
    window.addEventListener('keydown', handleCaptureKeyDown, { capture: true });
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        setShowDevTools(prev => !prev);
      }
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        handleNewTab();
      }
    };

    const el = containerRef.current;
    if (el) {
      el.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleCaptureKeyDown, { capture: true });
      if (el) {
        el.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [activeTabId, windowId]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    focusWindow(windowId);
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col w-full h-full bg-[#0a0514] font-pixel outline-none" 
      tabIndex={-1}
      onContextMenu={handleContextMenu}
      onClick={() => focusWindow(windowId)}
    >
      {/* Browser Chrome (Tabs) */}
      <div className="flex bg-[#110a26] border-b-2 border-[#543ab7] pt-1 px-1 h-8">
        {tabs.map((tab) => (
          <div 
            key={tab.id}
            className={`
              flex items-center gap-2 px-3 py-1 text-xs rounded-t border-2 border-b-0 max-w-[150px]
              ${activeTabId === tab.id 
                ? 'bg-[#0a0514] border-[#543ab7] text-[#0ff] z-10 translate-y-[2px]' 
                : 'bg-[#1a1130] border-transparent text-[#a48cff] hover:bg-[#241a4a] cursor-pointer'}
            `}
            onClick={() => setActiveTabId(tab.id)}
          >
            <span className="truncate flex-1">{tab.title}</span>
            <button 
              className="w-4 h-4 flex items-center justify-center hover:bg-white/10 rounded-full"
              onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.id); }}
            >
              ×
            </button>
          </div>
        ))}
        <button 
          className="w-6 h-6 flex items-center justify-center text-[#a48cff] hover:bg-white/10 rounded ml-1"
          onClick={handleNewTab}
        >
          +
        </button>
      </div>

      {/* URL Bar */}
      <div className="flex bg-[#0f0c29] p-1.5 border-b-2 border-[#543ab7]">
        <div className="flex-1 bg-[#0a0514] border-2 border-[#543ab7] rounded px-2 py-1 text-[#c7b3ff] text-sm flex items-center shadow-[inset_0_0_10px_rgba(84,58,183,0.3)]">
          <span className="opacity-50 mr-2">➜</span>
          <span>{activeTab?.url || 'about:blank'}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-row">
        <div className="flex-1 relative z-0 h-full overflow-hidden">
          {activeTab?.component === 'news' && <NewsTab />}
          {activeTab?.component === 'home' && (
            <HomeTab onNavigate={(url, comp, title) => navigateTab(activeTabId, url, comp, title)} />
          )}
          {activeTab?.component === 'pacman' && <PacmanTab />}
        </div>
        
        {/* DevTools Pane */}
        {showDevTools && (
          <div 
            className="h-full flex-shrink-0 animate-in slide-in-from-right-4 relative"
            style={{ width: devToolsWidth }}
          >
            {/* Resizer Handle */}
            <div 
              className="absolute top-0 left-0 w-2 h-full cursor-col-resize z-[1001] hover:bg-white/10 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const startX = e.clientX;
                const startW = devToolsWidth;
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const newWidth = Math.max(200, Math.min(800, startW - (moveEvent.clientX - startX)));
                  setDevToolsWidth(newWidth);
                };
                
                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            />
            <NetworkDevTools />
          </div>
        )}
      </div>

      {/* Context Menu Portal */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'New Tab', onClick: handleNewTab },
            { label: showDevTools ? 'Close DevTools' : 'Open DevTools', onClick: () => setShowDevTools(prev => !prev) },
            { label: 'Close Tab', onClick: () => handleCloseTab(activeTabId) },
          ]}
        />
      )}
    </div>
  );
};
