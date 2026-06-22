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
        <header className="sticky top-0 z-30 flex items-center gap-4 glass-panel rounded-none border-x-0 border-t-0 border-b border-[rgba(0,212,255,0.1)] px-4 py-3 sm:px-6">
            {/* Hamburger (mobile) */}
            <button
                type="button"
                onClick={onMenuClick}
                className="rounded-md p-1.5 text-[#859398] hover:text-[#3cd7ff] lg:hidden"
                aria-label="Open menu"
            >
                <span className="material-symbols-outlined text-xl">menu</span>
            </button>

            {/* Search — pill shape with darker bg */}
            <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#859398] text-lg">
                    search
                </span>
                <input
                    type="text"
                    placeholder="Filter Quests..."
                    className="w-full rounded-full bg-[#1c1b1d] border border-[#3c494e] py-2 pl-10 pr-4 text-sm text-[#e5e1e4] placeholder-[#859398] focus:border-[#3cd7ff] focus:outline-none transition-colors"
                    aria-label="Filter quests"
                />
            </div>

            {/* Connection status indicator */}
            <ConnectionIndicator state={connectionState} onRetry={handleRetry} />

            {/* Right side icons */}
            <div className="flex items-center gap-2">
                {/* Coin balance */}
                <CoinBalance />

                {/* Notifications */}
                <button
                    type="button"
                    className="relative rounded-md p-2 text-[#3cd7ff] hover:text-[#00d4ff] transition-colors"
                    aria-label="Notifications"
                >
                    <span className="material-symbols-outlined text-xl">notifications</span>
                </button>

                {/* Settings */}
                <button
                    type="button"
                    className="relative rounded-md p-2 text-[#3cd7ff] hover:text-[#00d4ff] transition-colors"
                    aria-label="Settings"
                >
                    <span className="material-symbols-outlined text-xl">settings</span>
                </button>

                {/* Account */}
                <button
                    type="button"
                    className="relative rounded-md p-2 text-[#3cd7ff] hover:text-[#00d4ff] transition-colors"
                    aria-label="Account"
                >
                    <span className="material-symbols-outlined text-xl">account_circle</span>
                </button>
            </div>
        </header>
    );
}
