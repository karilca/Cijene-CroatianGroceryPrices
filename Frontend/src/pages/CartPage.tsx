import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCartItems, removeFromCart, type CartItem } from '../api/cart';
import { ProductCard } from '../components/product/ProductCard';
import { Trash2 } from 'lucide-react';

export const CartPage = () => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCart = async () => {
        try {
            setLoading(true);
            const data = await getCartItems(supabase);
            // Osiguravamo da uzimamo 'items' iz odgovora
            setCartItems(data.items || []);
        } catch (error) {
            console.error("Greška pri učitavanju košarice:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (productId: string) => {
        if (window.confirm("Želiš li ukloniti ovaj proizvod iz košarice?")) {
            try {
                const result = await removeFromCart(supabase, productId);
                if (result.success || result.status === "success") {
                    // Odmah osvježi listu
                    await loadCart();
                } else {
                    alert(result.message || "Greška pri brisanju");
                }
            } catch (err) {
                console.error("Delete error:", err);
            }
        }
    };

    useEffect(() => {
        loadCart();
        window.addEventListener('cart-updated', loadCart);
        return () => window.removeEventListener('cart-updated', loadCart);
    }, []);

    if (loading) return <div className="p-10 text-center text-gray-500">Učitavam košaricu...</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8">Moja košarica</h1>
            
            {cartItems.length === 0 ? (
                <div className="bg-gray-50 p-20 rounded-2xl text-center border-2 border-dashed border-gray-200">
                    <p className="text-xl text-gray-500">Košarica je prazna. Vrijeme je za shopping!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {cartItems.map((item) => {
                        // FIX: Generiramo ključ koji sigurno postoji (ean ili id)
                        const key = item.ean || item.product_id || item.id;
                        const deleteId = item.ean || item.product_id;
                        
                        return (
                            <div key={key} className="relative group">
                                {/* Prikaz količine iznad kartice */}
                                <div className="absolute -top-3 -left-3 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-black z-30 shadow-xl border-2 border-white">
                                    {item.cart_quantity || item.quantity}x
                                </div>

                                {/* Gumb za brisanje */}
                                <button 
                                    onClick={() => deleteId && handleDelete(deleteId)}
                                    disabled={!deleteId}
                                    className="absolute -top-3 -right-3 bg-white text-red-500 p-2 rounded-full shadow-lg z-30 hover:bg-red-50 transition-all border border-gray-100 hover:scale-110 active:scale-90"
                                    title="Ukloni iz košarice"
                                >
                                    <Trash2 size={20} />
                                </button>
                                
                                {/* VAŽNO: ProductCard očekuje 'product' objekt. 
                                   Ako backend šalje 'name', 'brand' direktno u itemu, ovo će raditi.
                                */}
                                <div className="h-full">
                                    <ProductCard product={item} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};