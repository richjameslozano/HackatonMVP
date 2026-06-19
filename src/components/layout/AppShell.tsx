import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../store/app.store';
import { NavigationBar } from './NavigationBar';
import { RoleSwitcher } from './RoleSwitcher';
import { ConfirmationToast } from '../shared/ConfirmationToast';

export function AppShell() {
  const notificationWarning = useAppStore((s) => s.notificationWarning);
  const clearNotificationWarning = useAppStore((s) => s.clearNotificationWarning);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top navigation */}
      <NavigationBar />

      {/* Role switcher bar */}
      <div className="border-b border-gray-100 bg-white px-4 py-2 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-end">
          <RoleSwitcher />
        </div>
      </div>

      {/* Page content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

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
