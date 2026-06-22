import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../store/app.store';
import { RoleSwitcher } from './RoleSwitcher';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const navItems = [
    {
        to: '/quests',
        label: 'Quest Board',
        icon: 'assignment',
    },
    {
        to: '/leaderboard',
        label: 'Leaderboard',
        icon: 'emoji_events',
    },
    {
        to: '/badges',
        label: 'Badges',
        icon: 'verified',
    },
    {
        to: '/store',
        label: 'Store',
        icon: 'storefront',
    },
] as const;

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const currentMember = useAppStore((s) => s.currentMember);
    const selectedRole = useAppStore((s) => s.selectedRole);
    const isScrumMaster = useAppStore((s) => s.isScrumMaster);
    const badgeCollection = useAppStore((s) => s.badgeCollection);

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col glass-panel rounded-none border-r border-[rgba(0,212,255,0.1)] transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            aria-label="Main navigation"
        >
            {/* Big QUESTS title */}
            <div className="px-5 pt-6 pb-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-[48px] font-bold text-[#3cd7ff] tracking-tighter uppercase leading-none font-headline">
                        SP QuestHub
                    </h1>
                    {/* Mobile close */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md p-1 text-[#859398] hover:text-[#3cd7ff] lg:hidden"
                        aria-label="Close sidebar"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>
            </div>

            {/* Player card */}
            <div className="mx-4 mb-6 mt-10 glass-panel p-4 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#003642] border border-[rgba(0,212,255,0.3)] text-[#3cd7ff]">
                        <span className="material-symbols-outlined text-xl">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-bold text-[#3cd7ff] uppercase tracking-wide">
                            {currentMember?.displayName ?? 'PLAYER ONE'}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-[#859398]">
                            🏅 {badgeCollection?.earnedCount ?? 0} Badges · {selectedRole ?? 'Archmage'}
                        </p>
                    </div>
                </div>
                <div className="mt-3">
                    <RoleSwitcher />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 px-3 py-2">
                {navItems.map(({ to, label, icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={onClose}
                        className={({ isActive }) =>
                            isActive
                                ? 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold bg-[#00d4ff] text-[#003642] border border-[rgba(0,212,255,0.6)] shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                                : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#bbc9cf] transition-all hover:bg-[#2a2a2c] hover:text-[#3cd7ff]'
                        }
                    >
                        <span className="material-symbols-outlined text-xl">{icon}</span>
                        {label}
                    </NavLink>
                ))}
                {isScrumMaster && (
                    <NavLink
                        to="/command-center"
                        onClick={onClose}
                        className={({ isActive }) =>
                            isActive
                                ? 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold bg-[#00d4ff] text-[#003642] border border-[rgba(0,212,255,0.6)] shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                                : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#bbc9cf] transition-all hover:bg-[#2a2a2c] hover:text-[#3cd7ff]'
                        }
                    >
                        <span className="material-symbols-outlined text-xl">monitoring</span>
                        Scrum Master
                    </NavLink>
                )}
                {currentMember && (currentMember.roles as string[]).includes('admin') && (
                    <NavLink
                        to="/admin"
                        onClick={onClose}
                        className={({ isActive }) =>
                            isActive
                                ? 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold bg-[#00d4ff] text-[#003642] border border-[rgba(0,212,255,0.6)] shadow-[0_0_15px_rgba(0,212,255,0.4)]'
                                : 'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#bbc9cf] transition-all hover:bg-[#2a2a2c] hover:text-[#3cd7ff]'
                        }
                    >
                        <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                        Admin
                    </NavLink>
                )}
            </nav>
        </aside>
    );
}
