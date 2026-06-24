import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../../store/app.store';
import { useAuthStore } from '../../store/auth.store';
import { isAdmin } from '../../utils/permissions';
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
    const logout = useAuthStore((s) => s.logout);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col glass-panel rounded-none border-r border-[rgba(0,212,255,0.1)] transition-transform duration-200 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            aria-label="Main navigation"
        >
            {/* Big QUESTS title */}
            <div className="px-5 pt-6 pb-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-[38px] font-bold text-[#3cd7ff] tracking-tighter uppercase leading-none font-headline">
                        SPMadrid QuestHub
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
                {currentMember && isAdmin(currentMember) && (
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

            {/* Logout */}
            <div className="border-t border-[rgba(0,212,255,0.1)] px-3 py-3">
                <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#bbc9cf] transition-all hover:bg-[rgba(147,0,10,0.15)] hover:text-[#ffb4ab]"
                    aria-label="Log out"
                >
                    <span className="material-symbols-outlined text-xl">logout</span>
                    Log Out
                </button>
            </div>

            {/* Logout confirmation modal — rendered via portal so it centers on
                the viewport instead of the transformed sidebar */}
            {showLogoutConfirm &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-dialog-title"
                        onClick={() => setShowLogoutConfirm(false)}
                    >
                        <div
                            className="glass-panel w-full max-w-sm rounded-xl border border-[rgba(0,212,255,0.2)] p-6 shadow-[0_0_30px_rgba(0,212,255,0.2)]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(147,0,10,0.15)] text-[#ffb4ab]">
                                    <span className="material-symbols-outlined text-xl">logout</span>
                                </div>
                                <h2
                                    id="logout-dialog-title"
                                    className="text-lg font-bold text-[#3cd7ff] uppercase tracking-wide font-headline"
                                >
                                    Log Out
                                </h2>
                            </div>
                            <p className="mt-4 text-sm text-[#bbc9cf]">
                                Are you sure you want to log out? You'll need to sign in again to continue.
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-[#bbc9cf] transition-all hover:bg-[#2a2a2c] hover:text-[#3cd7ff]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLogoutConfirm(false);
                                        onClose();
                                        logout();
                                    }}
                                    className="rounded-lg bg-[#93000a] px-4 py-2 text-sm font-bold text-white uppercase tracking-wide transition-all hover:bg-[#b3151f] hover:shadow-[0_0_15px_rgba(147,0,10,0.5)]"
                                >
                                    Log Out
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
        </aside>
    );
}
