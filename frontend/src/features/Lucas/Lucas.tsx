import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useCallOverlayStore } from '../../app/store/callOverlayStore';
import { useLucasStore } from '../../app/store/lucasStore';
import type { LucasMessage } from '../../app/store/lucasStore';
import { DESKTOP_LAYER } from '../../shared/config/desktopWindows';
import { hintApi } from '../../shared/api/hintApi';
import { useStoryRuntimeStore } from '../story-runtime/storyRuntime.store';
import { canSubmitStoryAction } from '../story-runtime/storyActionGuards';
import './Lucas.css';

const PENDING_FRAMES = ['.', '..', '...'];
const ENABLE_INTERFERENCE_FX = true;
const INTERFERENCE_DURATION_MS = 1700;
const HINT_PANEL_EXIT_ANIMATION_MS = 275;
const INTERFERENCE_TEXT_PATTERN =
  /(시스템\s*간섭|신호가\s*불안정|연결\s*상태|채널|노이즈|잠깐\s*뒤에\s*다시|재시도)/i;
const HINT_ERROR_MESSAGES = [
  '지금 신호가 불안정해서 너의 채팅을 못봤어. 잠시 후 다시 말을 걸어줘.',
  '연결 상태가 불안정해. 잠깐 뒤에 다시 말해줘.',
  '시스템 간섭으로 우리의 연결 상태가 좋지 못해. 잠시 후 다시 말을 걸어줘.',
];
const HINT_EMPTY_MESSAGES = [
  '지금 신호가 불안정해서 너의 채팅을 못봤어. 잠시 후 다시 말을 걸어줘.',
  '연결 상태가 불안정해. 잠깐 뒤에 다시 말해줘.',
  '시스템 간섭으로 우리의 연결 상태가 좋지 못해. 잠시 후 다시 말을 걸어줘.',
];
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
    setGlitchLevel,
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
  const [isInterferenceFxActive, setIsInterferenceFxActive] = useState(false);
  const [isHintPanelRendered, setIsHintPanelRendered] = useState(false);
  const [isEntranceActive, setIsEntranceActive] = useState(true);
  const [entranceKey, setEntranceKey] = useState(0);
  const hintMessagesRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastReadIndicesRef = useRef<Record<string, number>>({});
  const savedScrollTopRef = useRef<Record<string, number>>({});
  const wasHintPanelVisibleRef = useRef(false);
  const isRestoringScrollRef = useRef(false);
  const interferenceTimerRef = useRef<number | null>(null);
  const baseGlitchLevelRef = useRef(0);
  const hasEnteredRef = useRef(false);
  const isHintPanelVisible = isHintMode && !isDialogueActive;
  const shouldRenderHintPanel = isHintPanelVisible || isHintPanelRendered;
  const isHintPanelClosing = !isHintPanelVisible && isHintPanelRendered;

  const isLastMessage = currentScene
    ? currentMessageIndex >= currentScene.messages.length - 1
    : false;

  const currentMessage: LucasMessage | undefined = currentScene?.messages[currentMessageIndex];
  const promptButtons = Array.isArray(currentNode?.promptMeta?.buttons)
    ? currentNode.promptMeta.buttons
    : [];
  const hasPromptButtons =
    currentNode?.promptType === 'click' && promptButtons.length > 0 && !isCallOverlayPromptOwner;
  const pickRandom = (messages: string[]) =>
    messages[Math.floor(Math.random() * messages.length)] ?? messages[0];

  const persistHintScrollTop = () => {
    const container = hintMessagesRef.current;
    if (!container) return;
    savedScrollTopRef.current[chatScopeKey] = container.scrollTop;
  };

  const shouldTriggerInterferenceFx = (
    hintText: string,
    routeDecision?: string,
    lowConfidence?: boolean,
  ) => {
    if (!ENABLE_INTERFERENCE_FX) return false;
    if (routeDecision === 'BLOCKED_NON_HINT' && lowConfidence) return true;
    return INTERFERENCE_TEXT_PATTERN.test(hintText);
  };

  const triggerInterferenceFx = (durationMs = INTERFERENCE_DURATION_MS) => {
    if (!ENABLE_INTERFERENCE_FX) return;

    if (interferenceTimerRef.current !== null) {
      window.clearTimeout(interferenceTimerRef.current);
      interferenceTimerRef.current = null;
    }

    if (!isInterferenceFxActive) {
      baseGlitchLevelRef.current = glitchLevel;
    }

    setIsInterferenceFxActive(true);
    setGlitchLevel(Math.max(glitchLevel, 10));

    interferenceTimerRef.current = window.setTimeout(() => {
      setIsInterferenceFxActive(false);
      setGlitchLevel(baseGlitchLevelRef.current);
      interferenceTimerRef.current = null;
    }, durationMs);
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

  // 채팅창이 열릴 때 또는 새로운 메시지가 추가될 때 무조건 맨 아래로 스크롤
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
        isRestoringScrollRef.current = true;

        window.requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
          if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
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
    if (isHintPanelVisible) {
      const timer = window.setTimeout(() => {
        setIsHintPanelRendered(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (!isHintPanelRendered) return;

    const timer = window.setTimeout(() => {
      setIsHintPanelRendered(false);
    }, HINT_PANEL_EXIT_ANIMATION_MS);

    return () => window.clearTimeout(timer);
  }, [isHintPanelRendered, isHintPanelVisible]);

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

  useEffect(() => {
    return () => {
      if (interferenceTimerRef.current !== null) {
        window.clearTimeout(interferenceTimerRef.current);
      }
    };
  }, []);

  // Glitch entrance animation on every hidden→visible transition
  const wasVisibleRef = useRef(false);
  useLayoutEffect(() => {
    const shouldShow = isVisible || isDialogueActive || isHintMode || shouldRenderHintPanel || hasPromptButtons;
    if (shouldShow && !wasVisibleRef.current) {
      wasVisibleRef.current = true;
      setIsEntranceActive(true);
      setEntranceKey((k) => k + 1);
      const timer = window.setTimeout(() => {
        setIsEntranceActive(false);
      }, 1200);
      return () => window.clearTimeout(timer);
    }
    if (!shouldShow) {
      wasVisibleRef.current = false;
    }
  }, [isVisible, isDialogueActive, isHintMode, shouldRenderHintPanel, hasPromptButtons]);

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
        if (shouldTriggerInterferenceFx(hintText, result.routeDecision, result.lowConfidence)) {
          triggerInterferenceFx();
        }
      } else {
        const fallbackText = pickRandom(HINT_EMPTY_MESSAGES);
        addChatMessage('LUCAS', fallbackText);
        if (shouldTriggerInterferenceFx(fallbackText)) {
          triggerInterferenceFx();
        }
      }
    } catch (error) {
      console.error('[Lucas] hint request failed', error);
      const errorText = pickRandom(HINT_ERROR_MESSAGES);
      addChatMessage('LUCAS', errorText);
      if (shouldTriggerInterferenceFx(errorText)) {
        triggerInterferenceFx();
      }
    } finally {
      setIsHintRequesting(false);
    }
  };

  const handlePromptActionClick = (value: unknown) => {
    const inputValue = String(value ?? '');
    if (!inputValue) return;

    void submitStoryClick(inputValue);
  };

  if (!isVisible && !isDialogueActive && !isHintMode && !shouldRenderHintPanel && !hasPromptButtons) return null;

  return (
    <div
      className={`lucas-container ${isDialogueActive ? 'dialogue-mode' : ''} ${shouldRenderHintPanel ? 'hint-mode' : ''} ${isEntranceActive ? 'lucas-entrance' : ''}`}
      style={{ zIndex: DESKTOP_LAYER.assistant }}
    >
      {isDialogueActive && currentMessage && (
        <div className="lucas-bubble-container" onClick={handleBubbleClick}>
          <div className="lucas-speaker-label">{currentMessage.speaker}</div>
          <div className={`lucas-bubble ${isInterferenceFxActive ? 'interference-fx' : ''}`}>
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

      {shouldRenderHintPanel && !isDialogueActive && (
        <div
          className={`lucas-hint-ui ${isHintPanelClosing ? 'hint-exit' : 'hint-enter'} ${
            isInterferenceFxActive ? 'interference-fx' : ''
          }`}
        >
          <div className="hint-header">LUCAS SYSTEM INTERFACE</div>
          <div className="hint-messages" ref={hintMessagesRef} onScroll={persistHintScrollTop}>
            {chatHistory.map((chat, index) => {
              const previousChat = chatHistory[index - 1];
              const isFirstInGroup = !previousChat || previousChat.speaker !== chat.speaker;

              return (
                <div id={`lucas-msg-${chat.id}`} key={chat.id} className={`chat-msg ${chat.speaker.toLowerCase()}`}>
                  {isFirstInGroup && <span className="chat-speaker">{chat.speaker}</span>}
                  <div className="chat-text">{chat.text}</div>
                </div>
              );
            })}
            {isHintRequesting && (
              <div className="chat-msg lucas pending">
                {chatHistory.at(-1)?.speaker !== 'LUCAS' && <span className="chat-speaker">LUCAS</span>}
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
              placeholder={isHintRequesting ? '생각 중...' : '루카스에게 질문하기'}
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
        <img key={entranceKey} src="/lucas.svg" alt="Lucas" className="lucas-avatar" />
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
