import React, { useMemo, useState, useEffect } from 'react';
import { DesktopIcon } from '../../shared/ui/DesktopIcon';
import { Taskbar } from '../Taskbar';
import { TerminalScene } from '../../features/command-input/TerminalScene';
import { useClientStore } from '../../app/store/clientStore';
import { useWindowStore } from '../../app/store/windowStore';
import { Window } from '../../shared/ui/Window';
import { Browser } from '../../features/Browser';
import { MessengerNotificationCard, MessengerWindow } from '../../features/messenger';
import { useMessengerStore } from '../../app/store/messengerStore';
import { normalizeMessengerBundle } from '../../features/messenger/messenger.adapters';
import { Lucas } from '../../features/Lucas/Lucas';

export const Desktop: React.FC = () => {
  const { openTerminal } = useClientStore();
  const { windows, openWindow } = useWindowStore();
  const { receiveConversation } = useMessengerStore();
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  React.useEffect(() => {
    // Initial initialization of global triggers if needed
  }, []);

  // ── Demo: simulate a messenger notification arriving after 2s ──
  // TODO: Replace with real story node response integration
  useEffect(() => {
    const timer = setTimeout(() => {
      const demoBundle = {
        messenger: {
          conversationId: "conv-chingu-001",
          title: "친구 (Chingu)",
          online: true,
          senderAvatar: undefined,
          messages: [
            {
              id: "msg-1",
              senderId: "chingu",
              senderName: "친구",
              text: "야! 들었어? 대박... 그 네온 시티 레벨 4 차원 포털이 방금 열렸대! 전설의 홀로그램 DJ가 거기서 연주 한다는데 완전 난리. 지금 당장 가야 해!",
              timestamp: "1분 전",
            },
            {
              id: "msg-2",
              senderId: "chingu",
              senderName: "친구",
              text: "아니 대박이다 진짜! 갈 거야?",
              timestamp: "3분 전",
            },
            {
              id: "msg-3",
              senderId: "chingu",
              senderName: "친구",
              text: "당연하지! 지금 준비 중이야. 너도 와!",
              timestamp: "3분 전",
            },
            {
              id: "msg-4",
              senderId: "user",
              senderName: "나",
              text: "그래! 30분 뒤에 센트럴 시티 포털 앞에서 만나자.",
              timestamp: "5분 전",
            },
            {
              id: "msg-5",
              senderId: "user",
              senderName: "나",
              text: "확인! <승인>",
              timestamp: "6분 전",
            },
          ],
          actions: [
            { label: "답장하기", actionType: "reply" },
            { label: "나중에 보기", actionType: "dismiss" },
            { label: "지도 보기", actionType: "map" },
          ],
        },
      };
      const conv = normalizeMessengerBundle(demoBundle);
      if (conv) receiveConversation(conv);
    }, 2000);
    return () => clearTimeout(timer);
  }, [receiveConversation]);

  // Generate rain drops
  const rainDrops = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${0.5 + Math.random() * 0.5}s`,
      opacity: 0.1 + Math.random() * 0.3,
    }));
  }, []);

  const icons = [
    { id: 'terminal', label: 'Terminal', icon: '/pixel_terminal_icon.svg' },
    { id: 'trash', label: 'Recycle Bin', icon: '/pixel_trash_icon.svg' },
    { id: 'chrome', label: 'Browser', icon: '/pixel_chrome_icon.svg' },
    { id: 'notepad', label: 'Notebook', icon: '/pixel_notepad_icon.svg' },
  ];

  const handleIconDoubleClick = (id: string) => {
    if (id === 'terminal') {
      openTerminal();
    } else if (id === 'chrome') {
      openWindow('browser', 'Web Browser', id);
    } else {
      console.log(`Opening ${id}`);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectionBox({
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (selectionBox) {
      setSelectionBox({ ...selectionBox, currentX: e.clientX, currentY: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (selectionBox) {
      setSelectionBox(null);
    }
  };

  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-cover bg-center select-none"
      style={{ backgroundImage: 'url("/display_background.png")' }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Rain Effect */}
      <div className="rain-container">
        {rainDrops.map((drop) => (
          <div
            key={drop.id}
            className="rain-drop"
            style={{
              left: drop.left,
              animationDelay: drop.delay,
              animationDuration: drop.duration,
              opacity: drop.opacity
            }}
          />
        ))}
      </div>

      {/* Drag Selection Box */}
      {selectionBox && (
        <div
          className="absolute border border-[#0ff] bg-[#0ff]/20 pointer-events-none z-0"
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
          }}
        />
      )}

      {/* Retro Overlay for atmosphere */}
      <div className="absolute inset-0 bg-indigo-900/10 pointer-events-none mix-blend-overlay" />

      {/* Desktop Icons */}
      <div className="absolute left-4 top-4 flex flex-col gap-2 z-10 w-24">
        {icons.map((icon) => (
          <DesktopIcon
            key={icon.id}
            label={icon.label}
            iconPath={icon.icon}
            onDoubleClick={() => handleIconDoubleClick(icon.id)}
          />
        ))}
      </div>

      {/* Terminal Modals/Scenes on top of Desktop */}
      <TerminalScene />

      {/* Windows Manager */}
      {windows.map((win) => (
        <Window
          key={win.id}
          id={win.id}
          title={win.title}
          icon={icons.find(i => i.id === win.id)?.icon}
        >
          {win.type === 'browser' && <Browser windowId={win.id} />}
        </Window>
      ))}


      {/* Messenger System */}
      <MessengerNotificationCard />
      <MessengerWindow />

      {/* Lucas Character and Hint System */}
      <Lucas />

      {/* Taskbar */}
      <Taskbar />
    </div>
  );
};

