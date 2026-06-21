import { useState, useEffect } from 'react';
import { useRewardStore } from '../../store/reward.store';
import { RewardItemForm } from './RewardItemForm';
import { createRewardItem, updateRewardItem, deactivateRewardItem } from '../../services/store.service';
import type { RewardItem } from '../../types';
import type { RewardItemFormValues } from './RewardItemForm';

// ─── Types ──────────────────────────────────────────────────────────────────

type Mode = 'list' | 'create' | 'edit';

// ─── Component ──────────────────────────────────────────────────────────────

export function RewardAdminPanel() {
  const { rewardItems, itemsLoading, itemsError, fetchAllRewardItems } = useRewardStore();

  const [mode, setMode] = useState<Mode>('list');
  const [editingItem, setEditingItem] = useState<RewardItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ─── Fetch all items on mount ───────────────────────────────────────────

  useEffect(() => {
    void fetchAllRewardItems();
  }, [fetchAllRewardItems]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handleCreate() {
    setFormError(null);
    setEditingItem(null);
    setMode('create');
  }

  function handleEdit(item: RewardItem) {
    setFormError(null);
    setEditingItem(item);
    setMode('edit');
  }

  function handleCancel() {
    setFormError(null);
    setEditingItem(null);
    setMode('list');
  }

  async function handleDeactivate(itemId: string) {
    try {
      await deactivateRewardItem(itemId);
      await fetchAllRewardItems();
    } catch (err) {
      // Show a brief error — could be improved with toast
      console.error('Failed to deactivate item:', err);
    }
  }

  async function handleCreateSubmit(values: RewardItemFormValues) {
    setFormLoading(true);
    setFormError(null);
    try {
      await createRewardItem({
        title: values.title,
        description: values.description,
        cost: values.cost,
        imageUrl: values.imageUrl || null,
        stockQuantity: values.stockQuantity,
        isActive: true,
      });
      setMode('list');
      setEditingItem(null);
      await fetchAllRewardItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create reward item';
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleEditSubmit(values: RewardItemFormValues) {
    if (!editingItem) return;
    setFormLoading(true);
    setFormError(null);
    try {
      await updateRewardItem(editingItem.itemId, {
        title: values.title,
        description: values.description,
        cost: values.cost,
        imageUrl: values.imageUrl || null,
        stockQuantity: values.stockQuantity,
      });
      setMode('list');
      setEditingItem(null);
      await fetchAllRewardItems();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update reward item';
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  }

  // ─── Create / Edit Mode ─────────────────────────────────────────────────

  if (mode === 'create') {
    return (
      <RewardItemForm
        mode="create"
        onSubmit={handleCreateSubmit}
        onCancel={handleCancel}
        isLoading={formLoading}
        error={formError}
      />
    );
  }

  if (mode === 'edit' && editingItem) {
    const initialValues: RewardItemFormValues = {
      title: editingItem.title,
      description: editingItem.description,
      cost: editingItem.cost,
      imageUrl: editingItem.imageUrl ?? '',
      stockQuantity: editingItem.stockQuantity,
    };

    return (
      <RewardItemForm
        mode="edit"
        initialValues={initialValues}
        onSubmit={handleEditSubmit}
        onCancel={handleCancel}
        isLoading={formLoading}
        error={formError}
      />
    );
  }

  // ─── List Mode ──────────────────────────────────────────────────────────

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-madrid-200 border-t-madrid-600" />
      </div>
    );
  }

  if (itemsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3" role="alert">
        <p className="text-sm text-red-700">{itemsError}</p>
        <button
          type="button"
          onClick={() => void fetchAllRewardItems()}
          className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-surface-900">Reward Items</h2>
        <button
          type="button"
          onClick={handleCreate}
          className="rounded-lg bg-madrid-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-madrid-700 focus:outline-none focus:ring-2 focus:ring-madrid-500 focus:ring-offset-2"
        >
          Create New
        </button>
      </div>

      {/* Items Table */}
      {rewardItems.length === 0 ? (
        <div className="py-12 text-center text-sm text-surface-500">
          No reward items yet. Create one to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-surface-200">
          <table className="min-w-full divide-y divide-surface-200">
            <thead className="bg-surface-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                  Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-surface-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-surface-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 bg-white">
              {rewardItems.map((item) => (
                <tr key={item.itemId}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-surface-900">
                    {item.title}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-surface-600">
                    {item.cost} coins
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-surface-600">
                    {item.stockQuantity === -1 ? 'Unlimited' : item.stockQuantity}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {item.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="mr-2 font-medium text-madrid-600 hover:text-madrid-800"
                    >
                      Edit
                    </button>
                    {item.isActive && (
                      <button
                        type="button"
                        onClick={() => void handleDeactivate(item.itemId)}
                        className="font-medium text-red-600 hover:text-red-800"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
