import { useEffect, useState } from 'react';
import { getCoinConfig } from '../../services/coin.service';
import type { Difficulty, CoinConfig } from '../../types';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DifficultySelectorProps {
  value: Difficulty;
  onChange: (difficulty: Difficulty) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_COIN_VALUES: CoinConfig = {
  easy_coins: 1,
  medium_coins: 3,
  hard_coins: 5,
} as const;

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export function DifficultySelector({ value, onChange }: DifficultySelectorProps) {
  const [coinConfig, setCoinConfig] = useState<CoinConfig>(DEFAULT_COIN_VALUES);

  useEffect(() => {
    let cancelled = false;

    async function fetchConfig() {
      try {
        const config = await getCoinConfig();
        if (!cancelled) {
          setCoinConfig(config);
        }
      } catch {
        if (!cancelled) {
          setCoinConfig(DEFAULT_COIN_VALUES);
        }
      }
    }

    void fetchConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  function getCoinsForDifficulty(difficulty: Difficulty): number {
    switch (difficulty) {
      case 'easy':
        return coinConfig.easy_coins;
      case 'medium':
        return coinConfig.medium_coins;
      case 'hard':
        return coinConfig.hard_coins;
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-[#bbc9cf]">Difficulty</legend>
      <div className="flex flex-col gap-2">
        {DIFFICULTY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-3 rounded-lg border px-4 py-2 cursor-pointer transition-colors ${value === option.value
                ? 'border-[#00d4ff] bg-[rgba(0,212,255,0.05)] shadow-[0_0_8px_rgba(0,212,255,0.15)]'
                : 'border-[#3c494e] hover:border-[#859398] bg-[#201f21]'
              }`}
          >
            <input
              type="radio"
              name="difficulty"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 text-[#00d4ff] focus:ring-[#00d4ff]"
            />
            <span className="text-sm font-medium text-[#e5e1e4]">
              {option.label}
            </span>
            <span className="ml-auto text-sm text-[#3cd7ff]">
              🪙 {getCoinsForDifficulty(option.value)} coins
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
