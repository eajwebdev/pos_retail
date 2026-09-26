import { useState } from 'react';
import { ShoppingCart, X, ChevronDown, Package, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtMoney, fmtQty } from '../ReceiptTemplate';
import type { Product, CartItem } from '../posTypes';
import ProductThumbnail from '@/components/ProductThumbnail';

export default function MobileLayout({ filtered, cart, currency, onProductClick, onCharge, subtotal, itemCount, onClear, onUpdateQty, onSetExactQty, onRemove }: {
    filtered: Product[];
    cart: CartItem[];
    currency: string;
    onProductClick: (p: Product) => void;
    onCharge: () => void;
    subtotal: number;
    itemCount: number;
    onClear: () => void;
    onUpdateQty: (key: string, delta: number) => void;
    onSetExactQty?: (key: string, qty: number) => void;
    onRemove: (key: string) => void;
}) {
    const [cartOpen, setCartOpen] = useState(false);

    return (
        // min-h-0 is critical: flex children default to min-height:auto which lets
        // the products list grow past the container instead of scrolling within it.
        <div className="flex flex-col h-full min-h-0 overflow-hidden">

            {/* ── Product list — scrolls independently ── */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                        <Package className="h-8 w-8 opacity-20" />
                        <p className="text-sm">No products found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filtered.map(p => {
                            const inCart      = cart.find(i => i.product_id === p.id);
                            const isBundleMTO = p.product_type === 'bundle' || p.product_type === 'made_to_order';
                            const outStock    = !isBundleMTO && p.stock <= 0;
                            return (
                                <button key={p.id} onClick={() => onProductClick(p)} disabled={outStock}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors active:scale-[0.99]",
                                        outStock ? "opacity-40 cursor-not-allowed bg-transparent"
                                            : inCart ? "bg-primary/5 border-l-2 border-l-primary"
                                            : "hover:bg-muted/30",
                                    )}>
                                    <ProductThumbnail
                                        src={p.product_img}
                                        name={p.name}
                                        categoryName={p.category?.name}
                                        unit={p.unit}
                                        aspect="aspect-square"
                                        className="h-11 w-11 rounded-xl shrink-0"
                                        padding="p-1"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                                        {p.category && <p className="text-[11px] text-muted-foreground mt-0.5">{p.category.name}</p>}
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-base font-black text-primary tabular-nums">{fmtMoney(p.price, currency)}</p>
                                        {inCart ? (
                                            <span className="text-[10px] font-bold text-emerald-500">×{inCart.qty} added</span>
                                        ) : outStock ? (
                                            <span className="text-[10px] text-destructive font-semibold">Out</span>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground tabular-nums">
                                                {isBundleMTO ? (p.product_type === 'made_to_order' ? 'MTO' : 'Bundle') : p.stock}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Cart drawer + pay bar — always visible at bottom ── */}
            <div className="shrink-0 border-t border-border bg-card shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
                {/* Expandable cart items */}
                {cartOpen && (
                    <div className="max-h-[40vh] overflow-y-auto overscroll-contain border-b border-border divide-y divide-border">
                        {cart.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                <ShoppingCart className="h-8 w-8 mx-auto opacity-20 mb-2" />
                                <p className="text-sm">Cart is empty</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.key} className="flex items-center gap-3 px-4 py-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                                        {item.variant_name && <p className="text-xs text-muted-foreground">{item.variant_name}</p>}
                                        <p className="text-xs font-bold text-primary tabular-nums mt-0.5">
                                            {fmtMoney(item.price, currency)} × {fmtQty(item.qty)} = {fmtMoney(item.price * item.qty, currency)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => onUpdateQty(item.key, (item.unit || '').toLowerCase() === 'kg' ? -0.25 : -1)}
                                            className="h-8 w-8 flex items-center justify-center rounded-xl border border-border text-lg font-bold hover:bg-muted transition-colors">−</button>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0.001"
                                            value={item.qty}
                                            onChange={e => onSetExactQty?.(item.key, parseFloat(e.target.value) || 0)}
                                            className="w-14 h-8 text-center text-xs font-mono font-bold bg-background border border-border rounded-lg"
                                        />
                                        <button onClick={() => onUpdateQty(item.key, (item.unit || '').toLowerCase() === 'kg' ? 0.25 : 1)} disabled={item.qty >= item.stock}
                                            className="h-8 w-8 flex items-center justify-center rounded-xl border border-border text-lg font-bold hover:bg-muted transition-colors disabled:opacity-30">+</button>
                                        <button onClick={() => onRemove(item.key)}
                                            className="h-8 w-8 ml-1 flex items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-colors">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Cart toggle + Pay button row */}
                <div className="flex items-center gap-2 px-3 py-3"
                    style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
                    <button onClick={() => setCartOpen(o => !o)}
                        className={cn(
                            "flex items-center gap-2 flex-1 h-12 px-4 rounded-2xl border text-sm font-semibold transition-all",
                            itemCount > 0 ? "border-primary/30 bg-primary/8 text-foreground" : "border-border text-muted-foreground",
                        )}>
                        <ShoppingCart className="h-4 w-4 shrink-0" />
                        <span className="flex-1 text-left truncate">
                            {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? "s" : ""} · ${fmtMoney(subtotal, currency)}` : "Cart empty"}
                        </span>
                        {itemCount > 0 && <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", cartOpen && "rotate-180")} />}
                    </button>
                    <button onClick={onCharge} disabled={itemCount === 0}
                        className="h-12 px-6 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center gap-1.5 disabled:opacity-40 active:scale-95 transition-all">
                        <Zap className="h-4 w-4" />Pay
                    </button>
                </div>
            </div>
        </div>
    );
}
