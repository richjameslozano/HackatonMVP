import type { RewardItem } from '../../types';
import { truncateDescription } from '../../utils/formatting';
import { isPurchasable } from '../../utils/store-helpers';

// ─── Props ──────────────────────────────────────────────────────────────────

interface RewardItemCardProps {
  item: RewardItem;
  balance: number;
  onPurchaseClick: (item: RewardItem) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RewardItemCard({ item, balance, onPurchaseClick }: RewardItemCardProps) {
  const purchasable = isPurchasable(balance, item.cost, item.stockQuantity);
  const outOfStock = item.stockQuantity === 0;
  const insufficientCoins = balance < item.cost && !outOfStock;

  function handleClick() {
    if (purchasable) {
      onPurchaseClick(item);
    }
  }

  // Stock label
  const stockLabel = outOfStock
    ? 'Out of Stock'
    : item.stockQuantity === -1
      ? 'Unlimited'
      : `${item.stockQuantity} Left in Stock`;

  return (
    <div
      className={`group relative flex flex-col glass-panel p-6 transition-all duration-300 ${outOfStock
        ? 'opacity-50 cursor-not-allowed border-[#3c494e]/30'
        : insufficientCoins
          ? 'opacity-70 border-[#3c494e]/30'
          : 'border-[#3c494e]/20 hover:border-[rgba(0,212,255,0.5)] cursor-pointer'
        }`}
      onClick={handleClick}
      role="button"
      tabIndex={purchasable ? 0 : -1}
      aria-disabled={!purchasable}
      aria-label={`${item.title}, costs ${item.cost} coins${outOfStock ? ', out of stock' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Image area */}
      <div className="w-full h-48 rounded bg-[#2a2a2c] mb-6 overflow-hidden flex items-center justify-center relative">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-60"
          />
        ) : (
          <span
            className="material-symbols-outlined text-5xl text-[#00d4ff]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            redeem
          </span>
        )}

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="font-mono text-sm uppercase tracking-wider text-red-400 border border-red-800/50 bg-red-900/30 px-3 py-1 rounded">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-headline text-xl font-bold text-[#e5e1e4] mb-2">
        {item.title}
      </h3>

      {/* Description */}
      {item.description && (
        <p className="text-sm text-[#bbc9cf] mb-6 line-clamp-2">
          {truncateDescription(item.description, 120)}
        </p>
      )}

      {/* Footer: Price + Stock + Purchase button */}
      <div className="mt-auto flex items-center justify-between pt-4 border-t border-[#3c494e]/20">
        <div>
          <div className="font-mono text-[10px] text-[#859398] uppercase">Price</div>
          <div className={`font-mono text-lg font-bold ${insufficientCoins ? 'text-red-400' : 'text-[#00d4ff]'}`}>
            {item.cost} <span className="text-xs">COINS</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] text-[#3cd7ff] uppercase mb-2">
            {stockLabel}
          </div>
          <button
            type="button"
            disabled={!purchasable}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
            className={`px-6 py-2 font-mono font-bold text-xs uppercase tracking-wider transition-all active:scale-95 ${purchasable
              ? 'bg-[#00d4ff] text-[#003642] hover:shadow-[0_0_25px_rgba(0,212,255,0.5)]'
              : 'bg-[#2a2a2c] text-[#859398] cursor-not-allowed'
              }`}
          >
            {outOfStock ? 'Sold Out' : 'Purchase'}
          </button>
        </div>
      </div>
    </div>
  );
}
