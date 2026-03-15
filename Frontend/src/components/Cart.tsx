import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCartItems } from '../api/cart';

interface CartItem {
    id: number;
    product_id: number;
    name: string;
    price: number;
    quantity: number;
}

const Cart: React.FC = () => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCart = async () => {
        try {
            const data = await getCartItems(supabase);
            setItems(data);
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
                        <li key={item.id} style={{ marginBottom: '10px', borderBottom: '1px solid #eee' }}>
                            <strong>{item.name}</strong> - {item.quantity} kom - {item.price * item.quantity} €
                        </li>
                    ))}
                </ul>
            )}
            <div style={{ marginTop: '20px', fontWeight: 'bold' }}>
                Ukupno: {items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)} €
            </div>
        </div>
    );
};

export default Cart;