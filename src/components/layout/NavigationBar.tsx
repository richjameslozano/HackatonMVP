import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/quests', label: 'Quest Board' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/badges', label: 'Badges' },
] as const;

export function NavigationBar() {
  return (
    <nav className="border-b border-gray-200 bg-white" aria-label="Main navigation">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* App logo / name */}
        <NavLink to="/" className="text-lg font-bold text-indigo-600 whitespace-nowrap">
          SP Madrid Tracker
        </NavLink>

        {/* Navigation links */}
        <ul className="flex items-center gap-1 sm:gap-4" role="list">
          {navItems.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
