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

  return (
    <div
      className={`relative flex flex-col rounded-xl border bg-white overflow-hidden transition-all ${
        outOfStock
          ? 'border-surface-200 opacity-60 cursor-not-allowed'
          : insufficientCoins
            ? 'border-surface-200 opacity-70'
            : 'border-surface-200 hover:border-madrid-200 hover:shadow-card-hover cursor-pointer'
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
      {/* Image or Placeholder */}
      <div className="relative h-40 w-full bg-surface-100 flex items-center justify-center">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full w-full text-surface-400">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
        )}

        {/* Out of Stock Badge */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <h3 className={`text-sm font-semibold ${outOfStock || insufficientCoins ? 'text-surface-500' : 'text-surface-900'}`}>
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p className={`mt-1 text-xs leading-relaxed ${outOfStock || insufficientCoins ? 'text-surface-400' : 'text-surface-500'}`}>
            {truncateDescription(item.description, 150)}
          </p>
        )}

        {/* Footer: Cost + Stock */}
        <div className="mt-auto flex items-center justify-between pt-3">
          {/* Cost */}
          <div className={`flex items-center gap-1 text-sm font-medium ${insufficientCoins ? 'text-red-500' : 'text-madrid-600'}`}>
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.736 6.979C9.208 6.193 9.696 6 10 6c.304 0 .792.193 1.264.979a1 1 0 001.715-1.029C12.279 4.784 11.232 4 10 4s-2.279.784-2.979 1.95c-.285.475-.507 1-.67 1.55H6a1 1 0 000 2h.013a9.358 9.358 0 000 1H6a1 1 0 100 2h.351c.163.55.385 1.075.67 1.55C7.721 15.216 8.768 16 10 16s2.279-.784 2.979-1.95a1 1 0 10-1.715-1.029c-.472.786-.96.979-1.264.979-.304 0-.792-.193-1.264-.979a5.389 5.389 0 01-.421-.821h2.382a1 1 0 000-2H7.653a7.642 7.642 0 010-1h3.044a1 1 0 000-2H8.315c.129-.292.278-.57.421-.821z" />
            </svg>
            <span>{item.cost}</span>
          </div>

          {/* Stock count (only for positive finite stock) */}
          {item.stockQuantity > 0 && (
            <span className="text-xs text-surface-500">
              {item.stockQuantity} left
            </span>
          )}
        </div>

        {/* Buy Button */}
        <button
          type="button"
          disabled={!purchasable}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          className={`mt-3 w-full rounded-lg py-2 text-sm font-medium transition-colors ${
            purchasable
              ? 'bg-madrid-600 text-white hover:bg-madrid-700'
              : 'bg-surface-200 text-surface-400 cursor-not-allowed'
          }`}
        >
          {outOfStock ? 'Out of Stock' : insufficientCoins ? 'Insufficient Coins' : 'Buy'}
        </button>
      </div>
    </div>
  );
}
