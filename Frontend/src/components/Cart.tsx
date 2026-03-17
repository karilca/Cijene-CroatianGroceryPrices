import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCartItems, type CartItem } from '../api/cart';

const Cart: React.FC = () => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCart = async () => {
        try {
            const data = await getCartItems(supabase);
            setItems(data.items || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCart();
    }, []);

    if (loading) return <p>Učitavam košaricu...</p>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>Moja Košarica 🛒</h2>
            {items.length === 0 ? (
                <p>Košarica je prazna.</p>
            ) : (
                <ul>
                    {items.map((item) => (
                        <li key={item.id || item.ean || item.product_id} style={{ marginBottom: '10px', borderBottom: '1px solid #eee' }}>
                            <strong>{item.name}</strong> - {item.quantity ?? 1} kom
                        </li>
                    ))}
                </ul>
            )}
            <div style={{ marginTop: '20px', fontWeight: 'bold' }}>
                Ukupno stavki: {items.reduce((sum, item) => sum + (item.quantity ?? 1), 0)}
            </div>
        </div>
    );
};

export default Cart;