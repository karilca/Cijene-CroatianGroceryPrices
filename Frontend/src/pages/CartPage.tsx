import { useCallback, useEffect, useState } from 'react';
import { CartProductCard } from '../components/cart/CartProductCard';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useCartStore } from '../stores/cartStore';
import { useAppStore } from '../stores/appStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useNotifications } from '../components/common/NotificationContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { resolveApiErrorMessage } from '../utils/apiErrors';
import type { OptimizationMode } from '../types';
import { useGeolocation } from '../hooks/useGeolocation';

export const CartPage = () => {
    const { t } = useLanguage();
    const { notifyError, notifySuccess, notifyWarning } = useNotifications();
    const cartItems = useCartStore((state) => state.items);
    const loading = useCartStore((state) => state.isLoading);
    const error = useCartStore((state) => state.error);
    const loadCart = useCartStore((state) => state.loadCart);
    const incrementItem = useCartStore((state) => state.incrementItem);
    const decrementItem = useCartStore((state) => state.decrementItem);
    const removeItem = useCartStore((state) => state.removeItem);
    const optimizeCart = useCartStore((state) => state.optimizeCart);
    const optimization = useCartStore((state) => state.optimization);
    const isOptimizing = useCartStore((state) => state.isOptimizing);
    const optimizationError = useCartStore((state) => state.optimizationError);
    const submitOptimizationFeedback = useCartStore((state) => state.submitOptimizationFeedback);
    const isSubmittingOptimizationFeedback = useCartStore((state) => state.isSubmittingOptimizationFeedback);
    const clearError = useCartStore((state) => state.clearError);

    const optimizationMode = useAppStore((state) => state.optimizationMode);
    const setOptimizationMode = useAppStore((state) => state.setOptimizationMode);
    const defaultLocation = useAppStore((state) => state.defaultLocation);
    const searchRadius = useAppStore((state) => state.searchRadius);
    const { supported: isGeolocationSupported, getCurrentPosition } = useGeolocation();

    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);
    const [updatingQuantityId, setUpdatingQuantityId] = useState<string | null>(null);
    const [lastOptimizationFeedback, setLastOptimizationFeedback] = useState<null | boolean>(null);
    const [locationCheckFinished, setLocationCheckFinished] = useState(false);

    const reloadCart = useCallback(async () => {
        clearError();
        await loadCart();
    }, [clearError, loadCart]);

    const handleDelete = (productId: string) => {
        setPendingDeleteId(productId);
    };

    const changeMode = (mode: OptimizationMode) => {
        setOptimizationMode(mode);
    };

    const handleIncrement = async (productId: string) => {
        try {
            setUpdatingQuantityId(productId);
            await incrementItem(productId);
        } catch {
            notifyError(t('cart.quantityUpdateFailed'), t('common.error'));
        } finally {
            setUpdatingQuantityId(null);
        }
    };

    const handleDecrement = async (productId: string) => {
        try {
            setUpdatingQuantityId(productId);
            await decrementItem(productId);
        } catch {
            notifyError(t('cart.quantityUpdateFailed'), t('common.error'));
        } finally {
            setUpdatingQuantityId(null);
        }
    };

    const handleOptimizationFeedback = async (accepted: boolean) => {
        try {
            await submitOptimizationFeedback(accepted);
            setLastOptimizationFeedback(accepted);
            notifySuccess(
                accepted ? t('cart.feedbackAcceptedSuccess') : t('cart.feedbackRejectedSuccess'),
            );
        } catch {
            notifyError(t('cart.feedbackFailed'), t('common.error'));
        }
    };

    const confirmDelete = async () => {
        if (!pendingDeleteId) return;

        try {
            setIsRemoving(true);
            await removeItem(pendingDeleteId);
            notifySuccess(t('cart.itemRemoved'));
        } catch {
            notifyError(t('cart.removeFailed'), t('common.error'));
        } finally {
            setIsRemoving(false);
            setPendingDeleteId(null);
        }
    };

    useEffect(() => {
        void loadCart();
    }, [loadCart]);

    useEffect(() => {
        if (error) {
            notifyError(resolveApiErrorMessage(error, t, 'cart.loadFailed'), t('common.error'));
        }
    }, [error, notifyError, t]);

    useEffect(() => {
        if (optimizationError) {
            notifyError(resolveApiErrorMessage(optimizationError, t, 'cart.optimizationFailed'), t('common.error'));
        }
    }, [optimizationError, notifyError, t]);

    useEffect(() => {
        if (cartItems.length === 0) {
            setLocationCheckFinished(false);
            return;
        }

        const hasLocation = defaultLocation.latitude !== null && defaultLocation.longitude !== null;
        if (hasLocation || !isGeolocationSupported || locationCheckFinished) {
            return;
        }

        let isActive = true;

        void getCurrentPosition()
            .catch(() => {
                notifyWarning(t('cart.locationPermissionNotice'));
            })
            .finally(() => {
                if (isActive) {
                    setLocationCheckFinished(true);
                }
            });

        return () => {
            isActive = false;
        };
    }, [
        cartItems.length,
        defaultLocation.latitude,
        defaultLocation.longitude,
        isGeolocationSupported,
        locationCheckFinished,
        getCurrentPosition,
        notifyWarning,
        t,
    ]);

    useEffect(() => {
        if (cartItems.length === 0) {
            return;
        }

        const hasLocation = defaultLocation.latitude !== null && defaultLocation.longitude !== null;
        if (!hasLocation && isGeolocationSupported && !locationCheckFinished) {
            return;
        }

        void optimizeCart({
            mode: optimizationMode,
            userLocation: hasLocation
                ? {
                    latitude: defaultLocation.latitude as number,
                    longitude: defaultLocation.longitude as number,
                }
                : undefined,
            options: {
                maxDistanceKm: Math.max(1, searchRadius / 1000),
            },
        });
        setLastOptimizationFeedback(null);
    }, [
        cartItems,
        optimizationMode,
        defaultLocation.latitude,
        defaultLocation.longitude,
        searchRadius,
        isGeolocationSupported,
        locationCheckFinished,
        optimizeCart,
    ]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <span className="ml-3 text-gray-600">{t('cart.loading')}</span>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold mb-8">{t('cart.title')}</h1>

            {cartItems.length > 0 && (
                <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center">
                            <h2 className="text-lg font-semibold text-gray-900">{t('cart.optimizationTitle')}</h2>
                        </div>
                        <div className="flex gap-2">
                            {(['greedy', 'balanced', 'conservative'] as OptimizationMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => changeMode(mode)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                                        optimizationMode === mode
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {t(`cart.mode.${mode}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isOptimizing && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <LoadingSpinner size="sm" />
                            <span>{t('cart.optimizing')}</span>
                        </div>
                    )}

                    {optimization?.recommendation && (
                        <div className="space-y-3">
                            {(() => {
                                const recommendation = optimization.recommendation;
                                const assignments = recommendation.assignments || [];
                                const storePlan = recommendation.stores.map((store) => ({
                                    store,
                                    items: assignments.filter((assignment) => assignment.store.id === store.id),
                                }));

                                return (
                                    <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="rounded-xl bg-white p-3 border border-primary-100">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t('cart.recommendedTotal')}</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        €{Number(recommendation.totalCost || 0).toFixed(2)}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-white p-3 border border-primary-100">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t('cart.recommendedStores')}</p>
                                    <p className="text-2xl font-bold text-gray-900">{recommendation.storesVisited}</p>
                                </div>
                                <div className="rounded-xl bg-white p-3 border border-primary-100">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">{t('cart.recommendedDistance')}</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {Number(recommendation.averageDistanceKm || 0).toFixed(1)} km
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl bg-white p-3 border border-primary-100">
                                <p className="text-sm font-semibold text-gray-900">{t('cart.recommendedPlanTitle')}</p>

                                {storePlan.length > 0 ? (
                                    <div className="mt-3 space-y-3">
                                        {storePlan.map(({ store, items }) => {
                                            const rawChainName = String(store.chain || '').trim();
                                            const chainName = !rawChainName
                                                ? t('cart.chainFallback')
                                                : rawChainName === rawChainName.toUpperCase()
                                                    ? rawChainName
                                                    : `${rawChainName.charAt(0).toUpperCase()}${rawChainName.slice(1).toLowerCase()}`;

                                            return (
                                            <div key={store.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                                <p className="text-sm font-semibold text-gray-900">{chainName}</p>
                                                <p className="text-xs text-gray-600">
                                                    {t('cart.addressLabel')} {store.address || t('cart.addressUnavailable')}
                                                </p>
                                                <p className="text-xs text-gray-600">
                                                    {t('cart.cityLabel')} {store.city || t('cart.cityUnavailable')}
                                                </p>

                                                {items.length > 0 ? (
                                                    <>
                                                        <p className="mt-2 text-xs font-semibold text-gray-600">{t('cart.buyInThisStore')}</p>
                                                        <ul className="mt-1 list-disc list-inside space-y-1 text-sm text-gray-700">
                                                            {items.map((assignment) => (
                                                                <li key={`${store.id}-${assignment.productId}`}>
                                                                    {(assignment.productName || assignment.productId)} · {t('cart.quantity').replace('{count}', String(assignment.quantity))}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </>
                                                ) : (
                                                    <p className="mt-2 text-sm text-gray-500">{t('cart.noAssignedProducts')}</p>
                                                )}
                                            </div>
                                        );
                                        })}
                                    </div>
                                ) : (
                                    <div className="mt-2 text-sm text-gray-700">
                                        <span className="font-semibold">{t('cart.recommendedStoresList')} </span>
                                        {(recommendation.storeNames || []).join(', ')}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-gray-600">{t('cart.feedbackPrompt')}</span>
                                <button
                                    type="button"
                                    onClick={() => void handleOptimizationFeedback(true)}
                                    disabled={isSubmittingOptimizationFeedback}
                                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold border transition ${
                                        lastOptimizationFeedback === true
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                    }`}
                                >
                                    <ThumbsUp size={14} />
                                    {t('cart.feedbackAccept')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleOptimizationFeedback(false)}
                                    disabled={isSubmittingOptimizationFeedback}
                                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold border transition ${
                                        lastOptimizationFeedback === false
                                            ? 'bg-rose-600 text-white border-rose-600'
                                            : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                                    }`}
                                >
                                    <ThumbsDown size={14} />
                                    {t('cart.feedbackReject')}
                                </button>
                            </div>

                            {(optimization.recommendation.unavailableProducts || []).length > 0 && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                                    <p className="font-semibold mb-1">{t('cart.unavailableTitle')}</p>
                                    <p>
                                        {optimization.recommendation.unavailableProducts
                                            .map((item) => item.productName || item.productId)
                                            .join(', ')}
                                    </p>
                                </div>
                            )}

                            {Object.values(optimization.alternatives || {}).length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.values(optimization.alternatives || {}).map((alternative) => (
                                        <div key={alternative.mode} className="rounded-xl bg-white p-3 border border-gray-200">
                                            <p className="text-sm font-semibold text-gray-900">{t(`cart.mode.${alternative.mode}`)}</p>
                                            <p className="text-sm text-gray-600">
                                                €{Number(alternative.totalCost || 0).toFixed(2)} · {alternative.storesVisited} {t('common.stores').toLowerCase()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}

            {!!error && (
                <ErrorMessage
                    title={t('common.error')}
                    message={resolveApiErrorMessage(error, t, 'cart.loadFailed')}
                    onRetry={() => void reloadCart()}
                />
            )}
            
            {cartItems.length === 0 ? (
                <div className="bg-gray-50 p-20 rounded-2xl text-center border-2 border-dashed border-gray-200">
                    <p className="text-xl text-gray-500">{t('cart.empty')}</p>
                    <div className="mt-6">
                        <Link to="/products">
                            <Button variant="primary">{t('cart.browseProducts')}</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {cartItems.map((item) => {
                        const key = item.ean || item.product_id || item.id;
                        const deleteId = item.ean || item.product_id;
                        const quantity = Number(item.cart_quantity || item.quantity || 1);
                        const isQuantityUpdating = updatingQuantityId === deleteId;
                        
                        return (
                            <CartProductCard
                                key={key}
                                item={item}
                                quantity={quantity}
                                canEditQuantity={Boolean(deleteId) && !isQuantityUpdating}
                                canDelete={Boolean(deleteId)}
                                onDecrement={() => deleteId && void handleDecrement(deleteId)}
                                onIncrement={() => deleteId && void handleIncrement(deleteId)}
                                onDelete={() => deleteId && handleDelete(deleteId)}
                                className="h-full"
                            />
                        );
                    })}
                </div>
            )}

            <ConfirmDialog
                isOpen={pendingDeleteId !== null}
                title={t('cart.confirmTitle')}
                message={t('cart.confirmRemove')}
                confirmLabel={t('common.confirm')}
                cancelLabel={t('common.cancel')}
                onConfirm={() => void confirmDelete()}
                onCancel={() => setPendingDeleteId(null)}
                isLoading={isRemoving}
            />
        </div>
    );
};