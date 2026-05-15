import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBrowserContentStore } from '../../../app/store/browserContentStore';
import { fragmentApi } from '../../../shared/api/fragmentApi';
import type { DesktopWindowId } from '../../../shared/config/desktopWindows';
import { LucasRouteGame } from '../../minigames/lucas-route';
import { useStoryRuntimeStore } from '../../story-runtime/storyRuntime.store';

interface LucasRouteTabProps {
  storyLinked?: boolean;
  windowId: DesktopWindowId;
}

const STORY_ROUTE_NODE_CODE = 'CH4_MINIGAME_NOT_CLEARED';

export const LucasRouteTab: React.FC<LucasRouteTabProps> = ({ storyLinked = false, windowId }) => {
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const sessionStartedRef = useRef(false);

  useEffect(() => {
    if (!storyLinked || sessionStartedRef.current) return;

    const runtime = useStoryRuntimeStore.getState();
    if (runtime.currentNode?.code !== STORY_ROUTE_NODE_CODE) return;

    sessionStartedRef.current = true;
    void fragmentApi.startMinigame('4')
      .then(setGameSessionId)
      .catch((error) => {
        sessionStartedRef.current = false;
        console.error('Failed to start Lucas Route session:', error);
      });
  }, [storyLinked]);

  const handleStoryClear = useCallback(async () => {
    if (!storyLinked) return;

    const runtime = useStoryRuntimeStore.getState();
    if (runtime.currentNode?.code !== STORY_ROUTE_NODE_CODE) return;

    try {
      const sessionId = gameSessionId ?? await fragmentApi.startMinigame('4');
      setGameSessionId(sessionId);
      await fragmentApi.acquireFragment('4', sessionId);

      const latestRuntime = useStoryRuntimeStore.getState();
      if (latestRuntime.currentNode?.code !== STORY_ROUTE_NODE_CODE) return;

      await latestRuntime.submitStoryClick('lucas_route_clear');
      useBrowserContentStore.getState().setLucasRouteStoryLinked(false);
    } catch (error) {
      console.error('Failed to sync Lucas Route story clear:', error);
      throw error;
    }
  }, [gameSessionId, storyLinked]);

  return (
    <div className="w-full h-full bg-black overflow-auto">
      <LucasRouteGame storyLinked={storyLinked} windowId={windowId} onStoryClear={handleStoryClear} />
    </div>
  );
};
