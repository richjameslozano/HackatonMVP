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
      <div className="flex min-h-screen items-center justify-center bg-surface-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-madrid-700 mb-4">
            <span className="text-lg font-bold text-white">SP</span>
          </div>
          <LoadingIndicator size="lg" message="Loading SP Madrid Tracker..." />
        </div>
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
