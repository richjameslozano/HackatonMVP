import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/app.store';
import { LoadingIndicator } from './components/shared/LoadingIndicator';
import { AppShell } from './components/layout/AppShell';
import { QuestBoardPage } from './pages/QuestBoardPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { BadgeCollectionPage } from './pages/BadgeCollectionPage';

function App() {
  const currentMember = useAppStore((s) => s.currentMember);
  const initializeApp = useAppStore((s) => s.initializeApp);

  useEffect(() => {
    void initializeApp('ou_diana101');
  }, [initializeApp]);

  if (!currentMember) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingIndicator size="lg" message="Loading application..." />
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/quests" element={<QuestBoardPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/badges" element={<BadgeCollectionPage />} />
        <Route path="/" element={<Navigate to="/quests" replace />} />
        <Route path="*" element={<Navigate to="/quests" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
