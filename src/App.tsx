import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/app.store';
import { useAuthStore } from './store/auth.store';
import { AppShell } from './components/layout/AppShell';
import { AuthGuard } from './components/auth/AuthGuard';
import { QuestBoardPage } from './pages/QuestBoardPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { BadgeCollectionPage } from './pages/BadgeCollectionPage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { OnboardingPage } from './pages/OnboardingPage';

function App() {
  const authMember = useAuthStore((s) => s.currentMember);
  const initializeApp = useAppStore((s) => s.initializeApp);

  // When the auth store resolves a member, initialize the app store with their openId
  useEffect(() => {
    if (authMember?.openId) {
      void initializeApp(authMember.openId);
    }
  }, [authMember, initializeApp]);

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
          <Route path="/command-center" element={<CommandCenterPage />} />
          <Route path="/" element={<Navigate to="/quests" replace />} />
          <Route path="*" element={<Navigate to="/quests" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
