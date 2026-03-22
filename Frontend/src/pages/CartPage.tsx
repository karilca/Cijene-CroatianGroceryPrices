import { useCallback, useEffect, useState } from 'react';
import { ProductCard } from '../components/product/ProductCard';
import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useCartStore } from '../stores/cartStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useNotifications } from '../components/common/NotificationContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Button } from '../components/ui/Button';

export const CartPage = () => {
    const { t } = useLanguage();
    const { notifyError, notifySuccess } = useNotifications();
    const cartItems = useCartStore((state) => state.items);
    const loading = useCartStore((state) => state.isLoading);
    const error = useCartStore((state) => state.error);
    const loadCart = useCartStore((state) => state.loadCart);
    const removeItem = useCartStore((state) => state.removeItem);
    const clearError = useCartStore((state) => state.clearError);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const reloadCart = useCallback(async () => {
        clearError();
        await loadCart();
    }, [clearError, loadCart]);

    const handleDelete = (productId: string) => {
        setPendingDeleteId(productId);
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
            notifyError(t('cart.loadFailed'), t('common.error'));
        }
    }, [error, notifyError, t]);

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

            {error && (
                <ErrorMessage
                    title={t('common.error')}
                    message={error || t('cart.loadFailed')}
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
                        
                        return (
                            <div key={key} className="relative group">
                                <div className="absolute -top-3 -left-3 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-black z-30 shadow-xl border-2 border-white">
                                    {t('cart.quantity').replace('{count}', String(item.cart_quantity || item.quantity))}
                                </div>

                                <button 
                                    onClick={() => deleteId && handleDelete(deleteId)}
                                    disabled={!deleteId}
                                    className="absolute -top-3 -right-3 bg-white text-red-500 p-2 rounded-full shadow-lg z-30 hover:bg-red-50 transition-all border border-gray-100 hover:scale-110 active:scale-90"
                                    title={t('cart.remove')}
                                >
                                    <Trash2 size={20} />
                                </button>
                                
                                <div className="h-full">
                                    <ProductCard product={item} />
                                </div>
                            </div>
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