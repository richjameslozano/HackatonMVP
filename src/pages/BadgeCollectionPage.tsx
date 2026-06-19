import { useEffect } from 'react';
import { useAppStore } from '../store/app.store';
import { BadgeGrid, ProgressBar } from '../components/badge';
import { LoadingIndicator } from '../components/shared';

export function BadgeCollectionPage() {
  const selectedRole = useAppStore((s) => s.selectedRole);
  const badgeCollection = useAppStore((s) => s.badgeCollection);
  const badgesLoading = useAppStore((s) => s.badgesLoading);
  const fetchBadgeCollection = useAppStore((s) => s.fetchBadgeCollection);

  useEffect(() => {
    fetchBadgeCollection();
  }, [fetchBadgeCollection, selectedRole]);

  if (badgesLoading) {
    return <LoadingIndicator size="lg" message="Loading badges..." />;
  }

  if (!badgeCollection) {
    return null;
  }

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold text-gray-800">Badge Collection</h2>

      <ProgressBar earned={badgeCollection.earnedCount} total={badgeCollection.totalCount} />

      {badgeCollection.earnedCount === 0 && (
        <p className="text-sm text-indigo-600 font-medium">
          Start completing quests to earn your first badge!
        </p>
      )}

      <BadgeGrid badges={badgeCollection.badges} />
    </div>
  );
}
