import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/app.store';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ConfirmationToast } from '../shared/ConfirmationToast';

export function AppShell() {
  const notificationWarning = useAppStore((s) => s.notificationWarning);
  const clearNotificationWarning = useAppStore((s) => s.clearNotificationWarning);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl animate-fade-slide-up">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Notification warning toast */}
      {notificationWarning && (
        <ConfirmationToast
          message={notificationWarning}
          type="warning"
          onDismiss={clearNotificationWarning}
        />
      )}
    </div>
  );
}
