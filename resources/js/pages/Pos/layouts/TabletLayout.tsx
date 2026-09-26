import { Package, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtMoney } from '../ReceiptTemplate';
import ProductThumbnail from '@/components/ProductThumbnail';
import type { Product, CartItem } from '../posTypes';

export default function TabletLayout({ filtered, cart, currency, onProductClick }: {
    filtered: Product[];
    cart: CartItem[];
    currency: string;
    onProductClick: (p: Product) => void;
}) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(p => {
                const inCart      = cart.find(i => i.product_id === p.id);
                const isBundleMTO = p.product_type === 'bundle' || p.product_type === 'made_to_order';
                const outStock    = !isBundleMTO && p.stock <= 0;
                const lowStock    = !isBundleMTO && p.stock > 0 && p.stock <= 5;
                return (
                    <button key={p.id} onClick={() => onProductClick(p)} disabled={outStock}
                        className={cn(
                            "relative flex flex-col rounded-2xl border text-left transition-all duration-150 overflow-hidden active:scale-[0.97] select-none",
                            outStock ? "opacity-40 cursor-not-allowed border-border bg-card"
                                : inCart ? "border-primary/60 bg-primary/5 shadow-md"
                                : "border-border bg-card hover:border-primary/40 hover:shadow-md",
                        )}>
                        <ProductThumbnail
                            src={p.product_img}
                            name={p.name}
                            categoryName={p.category?.name}
                            unit={p.unit}
                            aspect="aspect-[4/3]"
                        />
                        {inCart && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-black rounded-full h-6 min-w-[24px] flex items-center justify-center px-1.5 shadow-lg">
                                ×{inCart.qty}
                            </div>
                        )}
                        {outStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                                <span className="text-[10px] font-black text-destructive uppercase tracking-widest bg-background/90 px-3 py-1 rounded-full">Out of stock</span>
                            </div>
                        )}
                        <div className="p-3 flex-1 flex flex-col">
                            <p title={p.name} className="text-sm font-bold text-foreground leading-snug line-clamp-3 flex-1">{p.name}</p>
                            <div className="mt-2 flex items-center justify-between gap-1">
                                <span className="text-base font-black text-primary tabular-nums">{fmtMoney(p.price, currency)}</span>
                                <span className={cn("text-xs font-semibold shrink-0", lowStock ? "text-amber-500" : "text-muted-foreground")}>
                                    {p.product_type === 'made_to_order' ? 'MTO' : p.product_type === 'bundle' ? '📦' : lowStock ? `⚠ ${p.stock}` : `${p.stock}`}
                                </span>
                            </div>
                            {p.has_variants && <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1"><ChevronDown className="h-2.5 w-2.5" />{p.variants.length} variants</p>}
                            {p.product_type === 'bundle' && p.bundle_items && (
                                <p className="text-[10px] text-purple-400 mt-0.5 font-semibold">📦 {p.bundle_items.length} items in bundle</p>
                            )}
                            {p.product_type === 'made_to_order' && (
                                <p className="text-[10px] text-cyan-400 mt-0.5 font-semibold">🍳 Made to order</p>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
