import React, { useState, useEffect, useRef } from 'react';
import { useLucasStore } from '../../app/store/lucasStore';
import type { LucasMessage } from '../../app/store/lucasStore';
import './Lucas.css';

export const Lucas: React.FC = () => {
  const { 
    isVisible, 
    currentScene, 
    currentMessageIndex, 
    isDialogueActive, 
    nextMessage,
    isHintMode,
    chatHistory,
    addChatMessage,
    toggleHintMode
  } = useLucasStore();

  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hintInput, setHintInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentMessage: LucasMessage | undefined = currentScene?.messages[currentMessageIndex];

  // Typewriter effect logic
  useEffect(() => {
    if (isDialogueActive && currentMessage) {
      setDisplayText('');
      setIsTyping(true);
      let i = 0;
      const text = currentMessage.text;
      const interval = setInterval(() => {
        setDisplayText(() => text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [isDialogueActive, currentMessageIndex, currentMessage]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isHintMode]);

  const handleBubbleClick = () => {
    if (isTyping) {
      // Speed up or skip typing
      setDisplayText(currentMessage?.text || '');
      setIsTyping(false);
    } else {
      nextMessage();
    }
  };

  const handleHintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hintInput.trim()) return;

    const userText = hintInput.trim();
    addChatMessage('PLAYER', userText);
    setHintInput('');

    // Mock response logic
    setTimeout(() => {
      const responses = [
        "분석 중... 시스템의 관측 기록에 의하면 해당 경로에는 암호화된 파일이 숨겨져 있어.",
        "기록을 다시 봐. 너만 볼 수 있는 신호가 섞여 있을 거야.",
        "연결 상태가 불안정해. 하지만 한 가지는 확실해, 관리자 권한이 필요할 거야.",
        "이미 답은 네 눈앞에 있을지도 몰라. 터미널의 history를 확인해 봐."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addChatMessage('LUCAS', randomResponse);
    }, 1000);
  };

  if (!isVisible && !isDialogueActive && !isHintMode) return null;

  return (
    <div className={`lucas-container ${isDialogueActive ? 'dialogue-mode' : ''} ${isHintMode ? 'hint-mode' : ''}`}>
      {/* Dialogue Bubble */}
      {isDialogueActive && currentMessage && (
        <div className="lucas-bubble-container" onClick={handleBubbleClick}>
          <div className="lucas-speaker-label">{currentMessage.speaker}</div>
          <div className="lucas-bubble">
            <p>{displayText}</p>
            {!isTyping && currentMessage.blocking && (
              <span className="bubble-arrow">▼</span>
            )}
          </div>
        </div>
      )}

      {/* Hint Chat UI */}
      {isHintMode && !isDialogueActive && (
        <div className="lucas-hint-ui">
          <div className="hint-header">LUCAS SYSTEM INTERFACE</div>
          <div className="hint-messages">
            {chatHistory.map((chat) => (
              <div key={chat.id} className={`chat-msg ${chat.speaker.toLowerCase()}`}>
                <span className="chat-speaker">{chat.speaker}</span>
                <div className="chat-text">{chat.text}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form className="hint-input-form" onSubmit={handleHintSubmit}>
            <input 
              type="text" 
              value={hintInput}
              onChange={(e) => setHintInput(e.target.value)}
              placeholder="Query the core..."
              autoFocus
            />
            <button type="submit">QUERY</button>
          </form>
        </div>
      )}

      {/* Lucas Character Avatar */}
      <div 
        className="lucas-avatar-container" 
        onClick={() => {
          if (!isDialogueActive) {
            toggleHintMode(!isHintMode);
          }
        }}
        style={{ cursor: isDialogueActive ? 'default' : 'pointer' }}
      >
        <img 
          src="/lucas.svg" 
          alt="Lucas" 
          className="lucas-avatar"
        />
        <div className="lucas-glow" />
      </div>
    </div>
  );
};
