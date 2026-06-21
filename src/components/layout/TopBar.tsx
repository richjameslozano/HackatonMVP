import { useEffect } from 'react';
import { useAppStore } from '../../store/app.store';
import { useCoinStore } from '../../store/coin.store';
import { ConnectionIndicator } from '../shared/ConnectionIndicator';
import { CoinBalance } from './CoinBalance';
import { websocketService } from '../../services/websocket.service';

interface TopBarProps {
    onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
    const currentMember = useAppStore((s) => s.currentMember);
    const connectionState = useAppStore((s) => s.connectionState);

    // Fetch coin balance on mount when member is available
    useEffect(() => {
        if (currentMember?.memberId) {
            useCoinStore.getState().fetchBalance(currentMember.memberId);
        }
    }, [currentMember?.memberId]);

    const handleRetry = () => {
        websocketService.connect();
    };

    return (
        <header className="flex items-center gap-4 border-b border-surface-200 bg-white px-4 py-3 sm:px-6">
            {/* Hamburger (mobile) */}
            <button
                type="button"
                onClick={onMenuClick}
                className="rounded-md p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-700 lg:hidden"
                aria-label="Open menu"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                    type="text"
                    placeholder="Search quests..."
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 py-2 pl-9 pr-4 text-sm text-surface-700 placeholder-surface-400 focus:border-madrid-500 focus:outline-none focus:ring-1 focus:ring-madrid-500"
                    aria-label="Search quests"
                />
            </div>

            {/* Connection status indicator */}
            <ConnectionIndicator state={connectionState} onRetry={handleRetry} />

            {/* Right side icons */}
            <div className="flex items-center gap-2">
                {/* Coin balance */}
                <CoinBalance />

                {/* Notifications bell */}
                <button
                    type="button"
                    className="relative rounded-md p-2 text-surface-500 hover:bg-surface-100 hover:text-surface-700"
                    aria-label="Notifications"
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                </button>

                {/* Avatar */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-madrid-600 text-xs font-bold text-white ring-2 ring-madrid-200">
                    {currentMember?.displayName?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
            </div>
        </header>
    );
}
