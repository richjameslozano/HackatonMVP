import { useState } from 'react';
import { ProjectList } from '../components/admin/ProjectList';
import { ProjectDetail } from '../components/admin/ProjectDetail';
import { AdminTaskForm } from '../components/admin/AdminTaskForm';
import { CoinConfigPanel } from '../components/admin/CoinConfigPanel';
import { RewardAdminPanel } from '../components/admin/RewardAdminPanel';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'projects' | 'create-task' | 'coin-settings' | 'rewards';

const TABS: { id: Tab; label: string }[] = [
  { id: 'projects', label: 'Projects' },
  { id: 'create-task', label: 'Create Task' },
  { id: 'coin-settings', label: 'Coin Settings' },
  { id: 'rewards', label: 'Rewards' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // ─── Tab Content Rendering ────────────────────────────────────────────

  function renderTabContent() {
    switch (activeTab) {
      case 'projects':
        if (selectedProjectId) {
          return (
            <ProjectDetail
              projectId={selectedProjectId}
              onBack={() => setSelectedProjectId(null)}
            />
          );
        }
        return <ProjectList onSelectProject={(id) => setSelectedProjectId(id)} />;

      case 'create-task':
        return <AdminTaskForm />;

      case 'coin-settings':
        return <CoinConfigPanel />;

      case 'rewards':
        return <RewardAdminPanel />;
    }
  }

  // ─── Tab Change Handler ───────────────────────────────────────────────

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    // Reset project selection when switching tabs
    if (tab !== 'projects') {
      setSelectedProjectId(null);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-madrid-600">
          MADRID_HQ // ADMIN
        </p>
        <h1 className="mt-1 text-2xl font-bold text-surface-900">Admin View</h1>
        <p className="mt-1 text-sm text-surface-500">
          Manage projects, create tasks, and configure coin rewards.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-surface-200">
        <nav className="-mb-px flex gap-6" aria-label="Admin tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-madrid-600 text-madrid-600'
                  : 'border-transparent text-surface-500 hover:border-surface-300 hover:text-surface-700'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>
    </div>
  );
}
