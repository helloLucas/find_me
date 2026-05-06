import React, { useEffect, useRef, useState } from 'react';
import { useCallOverlayStore } from '../../app/store/callOverlayStore';
import { useLucasStore } from '../../app/store/lucasStore';
import type { LucasMessage } from '../../app/store/lucasStore';
import { DESKTOP_LAYER } from '../../shared/config/desktopWindows';
import { hintApi } from '../../shared/api/hintApi';
import { useStoryRuntimeStore } from '../story-runtime/storyRuntime.store';
import { canSubmitStoryAction } from '../story-runtime/storyActionGuards';
import './Lucas.css';

const PENDING_FRAMES = ['.', '..', '...'];

export const Lucas: React.FC = () => {
  const {
    isVisible,
    currentScene,
    currentMessageIndex,
    isDialogueActive,
    nextMessage,
    isHintMode,
    chatHistory,
    chatScopeKey,
    addChatMessage,
    toggleHintMode,
    glitchLevel,
  } = useLucasStore();

  const { currentNode, submitStoryClick } = useStoryRuntimeStore();
  const isCallOverlayPromptOwner = useCallOverlayStore(
    (state) => state.isVisible && state.nodeCode === currentNode?.code
  );

  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hintInput, setHintInput] = useState('');
  const [isHintRequesting, setIsHintRequesting] = useState(false);
  const [pendingFrame, setPendingFrame] = useState(0);
  const hintMessagesRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastReadIndicesRef = useRef<Record<string, number>>({});
  const savedScrollTopRef = useRef<Record<string, number>>({});
  const wasHintPanelVisibleRef = useRef(false);
  const isRestoringScrollRef = useRef(false);
  const isHintPanelVisible = isHintMode && !isDialogueActive;

  const isLastMessage = currentScene
    ? currentMessageIndex >= currentScene.messages.length - 1
    : false;

  const currentMessage: LucasMessage | undefined = currentScene?.messages[currentMessageIndex];
  const promptButtons = Array.isArray(currentNode?.promptMeta?.buttons)
    ? currentNode.promptMeta.buttons
    : [];
  const hasPromptButtons =
    currentNode?.promptType === 'click' && promptButtons.length > 0 && !isCallOverlayPromptOwner;

  const persistHintScrollTop = () => {
    const container = hintMessagesRef.current;
    if (!container) return;
    savedScrollTopRef.current[chatScopeKey] = container.scrollTop;
  };

  useEffect(() => {
    if (!isDialogueActive || !currentMessage) return;

    setDisplayText('');
    setIsTyping(true);

    let cursor = 0;
    const text = currentMessage.text;
    const interval = window.setInterval(() => {
      setDisplayText(text.slice(0, cursor + 1));
      cursor += 1;
      if (cursor >= text.length) {
        window.clearInterval(interval);
        setIsTyping(false);
      }
    }, 30);

    return () => window.clearInterval(interval);
  }, [isDialogueActive, currentMessage]);

  useEffect(() => {
    const wasVisible = wasHintPanelVisibleRef.current;
    const isVisible = isHintPanelVisible;

    if (wasVisible && !isVisible) {
      persistHintScrollTop();
      lastReadIndicesRef.current[chatScopeKey] = chatHistory.length;
    }

    if (!wasVisible && isVisible) {
      const container = hintMessagesRef.current;
      if (container) {
        const currentLen = chatHistory.length;
        const lastRead = lastReadIndicesRef.current[chatScopeKey] ?? currentLen;
        isRestoringScrollRef.current = true;

        window.requestAnimationFrame(() => {
          const savedScrollTop = savedScrollTopRef.current[chatScopeKey];

          if (typeof savedScrollTop === 'number' && Number.isFinite(savedScrollTop)) {
            container.scrollTop = savedScrollTop;
          } else if (currentLen > lastRead) {
            const scrollTargetIdx = Math.max(0, lastRead - 1);
            const msgToScroll = chatHistory[scrollTargetIdx];

            if (msgToScroll) {
              const element = document.getElementById(`lucas-msg-${msgToScroll.id}`);
              if (element) {
                element.scrollIntoView({ behavior: 'auto', block: 'start' });
              } else {
                container.scrollTop = container.scrollHeight;
              }
            } else {
              container.scrollTop = container.scrollHeight;
            }
          } else {
            container.scrollTop = container.scrollHeight;
          }

          savedScrollTopRef.current[chatScopeKey] = container.scrollTop;
          lastReadIndicesRef.current[chatScopeKey] = currentLen;
          isRestoringScrollRef.current = false;
        });
      }
    }

    wasHintPanelVisibleRef.current = isVisible;
  }, [isHintPanelVisible, chatScopeKey, chatHistory]);

  useEffect(() => {
    const container = hintMessagesRef.current;
    if (!container || !isHintPanelVisible || isRestoringScrollRef.current) return;

    window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
      savedScrollTopRef.current[chatScopeKey] = container.scrollTop;
      lastReadIndicesRef.current[chatScopeKey] = chatHistory.length;
    });
  }, [chatHistory, isHintPanelVisible, isHintRequesting, chatScopeKey]);

  useEffect(() => {
    if (!isHintRequesting) {
      setPendingFrame(0);
      return;
    }
    const interval = window.setInterval(() => {
      setPendingFrame((prev) => (prev + 1) % PENDING_FRAMES.length);
    }, 330);
    return () => window.clearInterval(interval);
  }, [isHintRequesting]);

  const handleBubbleClick = () => {
    if (isTyping) {
      setDisplayText(currentMessage?.text ?? '');
      setIsTyping(false);
      return;
    }

    if (isLastMessage && hasPromptButtons) {
      return;
    }

    nextMessage();

    if (isLastMessage) {
      const storyRuntime = useStoryRuntimeStore.getState();
      const node = storyRuntime.currentNode;
      if (canSubmitStoryAction(node, 'click', 'reopen_network_clue')) {
        void storyRuntime.submitStoryClick('reopen_network_clue');
      }
    }
  };

  const handleHintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHintRequesting) return;

    const userText = hintInput.trim();
    if (!userText) return;

    addChatMessage('PLAYER', userText);
    setHintInput('');
    setIsHintRequesting(true);

    try {
      const result = await hintApi.getLiveHint({ userMessage: userText });
      const hintText = result.hint?.trim();
      if (hintText) {
        addChatMessage('LUCAS', hintText);
      } else {
        addChatMessage(
          'LUCAS',
          '연결 상태가 좋지 못해서 채팅을 읽지 못했어. 같은 질문을 한 번 더 보내줘.',
        );
      }
    } catch (error) {
      console.error('[Lucas] hint request failed', error);
      addChatMessage('LUCAS', '지금 신호가 불안정해. 잠깐 뒤에 다시 말해줘.');
    } finally {
      setIsHintRequesting(false);
    }
  };

  const handlePromptActionClick = (value: unknown) => {
    const inputValue = String(value ?? '');
    if (!inputValue) return;

    void submitStoryClick(inputValue);
  };

  if (!isVisible && !isDialogueActive && !isHintMode && !hasPromptButtons) return null;

  return (
    <div
      className={`lucas-container ${isDialogueActive ? 'dialogue-mode' : ''} ${isHintMode ? 'hint-mode' : ''}`}
      style={{ zIndex: DESKTOP_LAYER.assistant }}
    >
      {isDialogueActive && currentMessage && (
        <div className="lucas-bubble-container" onClick={handleBubbleClick}>
          <div className="lucas-speaker-label">{currentMessage.speaker}</div>
          <div className="lucas-bubble">
            <p>{displayText}</p>
            {!isTyping &&
              isLastMessage &&
              hasPromptButtons && (
                <div className="lucas-buttons-container">
                  {promptButtons.map((btn: any) => (
                    <button
                      key={btn.value}
                      className="lucas-action-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handlePromptActionClick(btn.value);
                      }}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}
            {!isTyping &&
              (currentMessage.blocking ||
                (isLastMessage && currentNode?.promptType === 'command')) &&
              !currentNode?.promptMeta?.buttons && <span className="bubble-arrow">▼</span>}
          </div>
        </div>
      )}

      {isHintMode && !isDialogueActive && (
        <div className="lucas-hint-ui">
          <div className="hint-header">LUCAS SYSTEM INTERFACE</div>
          <div className="hint-messages" ref={hintMessagesRef} onScroll={persistHintScrollTop}>
            {chatHistory.map((chat) => (
              <div id={`lucas-msg-${chat.id}`} key={chat.id} className={`chat-msg ${chat.speaker.toLowerCase()}`}>
                <span className="chat-speaker">{chat.speaker}</span>
                <div className="chat-text">{chat.text}</div>
              </div>
            ))}
            {isHintRequesting && (
              <div className="chat-msg lucas pending">
                <span className="chat-speaker">LUCAS</span>
                <div className="chat-text pending-typing">{PENDING_FRAMES[pendingFrame]}</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          {hasPromptButtons && (
            <div className="lucas-hint-actions">
              {promptButtons.map((btn: any) => (
                <button
                  key={btn.value}
                  className="lucas-action-button"
                  onClick={() => handlePromptActionClick(btn.value)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
          <form className="hint-input-form" onSubmit={handleHintSubmit}>
            <input
              type="text"
              value={hintInput}
              onChange={(event) => setHintInput(event.target.value)}
              placeholder={isHintRequesting ? '응답 생성 중...' : '루카스에게 메시지를 보내세요'}
              autoFocus
              disabled={isHintRequesting}
            />
            <button type="submit" disabled={isHintRequesting || !hintInput.trim()}>
              {isHintRequesting ? 'WAIT' : 'SEND'}
            </button>
          </form>
        </div>
      )}

      {!isDialogueActive && !isHintMode && hasPromptButtons && (
        <div className="lucas-prompt-actions">
          {promptButtons.map((btn: any) => (
            <button
              key={btn.value}
              className="lucas-action-button"
              onClick={() => handlePromptActionClick(btn.value)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}

      <div
        className="lucas-avatar-container"
        onClick={() => {
          if (!isDialogueActive) {
            toggleHintMode(!isHintMode);
          }
        }}
        style={{ cursor: isDialogueActive ? 'default' : 'pointer' }}
      >
        <img src="/lucas.svg" alt="Lucas" className="lucas-avatar" />
        {glitchLevel > 0 && (
          <div className={`glitch-avatar-layer intensity-${Math.min(10, Math.max(0, glitchLevel))}`}>
            <img src="/lucas.svg" alt="" className="glitch-copy" />
            <img src="/lucas.svg" alt="" className="glitch-copy" />
            <img src="/lucas.svg" alt="" className="glitch-copy" />
          </div>
        )}
        <div className="lucas-glow" />
      </div>
    </div>
  );
};
