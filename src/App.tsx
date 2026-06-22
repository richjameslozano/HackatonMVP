import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/app.store';
import { useAuthStore } from './store/auth.store';
import { websocketService } from './services/websocket.service';
import { routeMessage } from './services/message-router';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/auth/AuthGuard';
import { AdminGuard } from './components/auth/AdminGuard';
import { QuestBoardPage } from './pages/QuestBoardPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { BadgeCollectionPage } from './pages/BadgeCollectionPage';
import { ScrumMasterPage } from './pages/ScrumMasterPage';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AdminPage } from './pages/AdminPage';
import { StorePage } from './pages/StorePage';

function App() {
  const authMember = useAuthStore((s) => s.currentMember);
  const initializeApp = useAppStore((s) => s.initializeApp);
  const setConnectionState = useAppStore((s) => s.setConnectionState);

  // When the auth store resolves a member, initialize the app store with their openId
  useEffect(() => {
    if (authMember?.openId) {
      void initializeApp(authMember.openId);
    }
  }, [authMember, initializeApp]);

  // WebSocket lifecycle: connect after authentication, disconnect on logout/unmount
  useEffect(() => {
    if (!authMember?.openId) return;

    // Connect WebSocket (uses VITE_WS_URL by default)
    websocketService.connect();

    // Subscribe to connection state changes and update Zustand store
    const unsubState = websocketService.onStateChange(setConnectionState);

    // Subscribe to incoming messages and route them through message-router
    const unsubMessage = websocketService.onMessage(routeMessage);

    return () => {
      unsubState();
      unsubMessage();
      websocketService.disconnect();
    };
  }, [authMember?.openId, setConnectionState]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Protected routes wrapped with AuthGuard */}
      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          <Route path="/quests" element={<QuestBoardPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/badges" element={<BadgeCollectionPage />} />
          <Route path="/command-center" element={<ScrumMasterPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
          <Route path="/" element={<Navigate to="/quests" replace />} />
          <Route path="*" element={<Navigate to="/quests" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
