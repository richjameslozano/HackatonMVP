import { useState } from 'react';
import { ProjectList } from '../components/admin/ProjectList';
import { ProjectDetail } from '../components/admin/ProjectDetail';
import { AdminTaskForm } from '../components/admin/AdminTaskForm';
import { CoinConfigPanel } from '../components/admin/CoinConfigPanel';
import { RewardAdminPanel } from '../components/admin/RewardAdminPanel';

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'projects' | 'create-task' | 'coin-settings' | 'rewards';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'projects', label: 'Projects', icon: 'folder_open' },
  { id: 'create-task', label: 'Create Task', icon: 'add_task' },
  { id: 'coin-settings', label: 'Coin Settings', icon: 'monetization_on' },
  { id: 'rewards', label: 'Rewards', icon: 'redeem' },
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
    if (tab !== 'projects') {
      setSelectedProjectId(null);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <p className="label-mono text-[#859398] tracking-widest">
          MADRID_HQ // ADMIN
        </p>
        <h1 className="mt-1 text-[48px] font-bold text-gradient leading-tight font-headline">
          Admin Panel
        </h1>
        <p className="mt-1 text-sm text-[#bbc9cf] font-mono">
          Manage projects, create tasks, and configure coin rewards.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[#3c494e]">
        <nav className="-mb-px flex gap-1" aria-label="Admin tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-mono uppercase tracking-wider transition-colors ${activeTab === tab.id
                  ? 'border-[#00d4ff] text-[#00d4ff]'
                  : 'border-transparent text-[#859398] hover:border-[#3c494e] hover:text-[#bbc9cf]'
                }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
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
