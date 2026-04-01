import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { BaseCard } from '../common/BaseCard';
import type { CartItem } from '../../api/cart';
import { useLanguage } from '../../contexts/LanguageContext';

interface CartProductCardProps {
  item: CartItem;
  quantity: number;
  canEditQuantity: boolean;
  canDelete: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onDelete: () => void;
  className?: string;
}

export const CartProductCard: React.FC<CartProductCardProps> = ({
  item,
  quantity,
  canEditQuantity,
  canDelete,
  onIncrement,
  onDecrement,
  onDelete,
  className = '',
}) => {
  const { t } = useLanguage();

  const cardActions = (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-1.5 py-1 text-white shadow-sm">
        <button
          type="button"
          onClick={onDecrement}
          disabled={!canEditQuantity}
          className="rounded-full bg-white/15 p-1 transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
          title={t('cart.decreaseQuantity')}
        >
          <Minus size={12} />
        </button>
        <span className="px-1 text-xs font-bold leading-none">{quantity}x</span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={!canEditQuantity}
          className="rounded-full bg-white/15 p-1 transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-50"
          title={t('cart.increaseQuantity')}
        >
          <Plus size={12} />
        </button>
      </div>

      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        className="rounded-full border border-gray-200 bg-white p-2 text-red-500 shadow-sm transition hover:border-red-100 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        title={t('cart.remove')}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <BaseCard className={`h-full ${className}`} variant="default" actions={cardActions}>
      <h3 className="font-semibold text-gray-900 text-lg leading-snug line-clamp-3">
        {item.name || t('common.unknownProduct')}
      </h3>
    </BaseCard>
  );
};