import { cn } from '@/lib/utils';
import { fmtMoney, fmtQty } from '../ReceiptTemplate';
import type { Product, CartItem } from '../posTypes';
import ProductThumbnail from '@/components/ProductThumbnail';

export default function GridLayout({ filtered, cart, currency, onProductClick }: {
    filtered: Product[];
    cart: CartItem[];
    currency: string;
    onProductClick: (p: Product) => void;
}) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {filtered.map(p => {
                const inCart      = cart.find(i => i.product_id === p.id);
                const isBundleMTO = p.product_type === 'bundle' || p.product_type === 'made_to_order';
                const outStock    = !isBundleMTO && p.stock <= 0;
                const lowStock    = !isBundleMTO && p.stock > 0 && p.stock <= 5;
                const unit        = p.unit || (p.name.toLowerCase().includes('rice') || p.name.toLowerCase().includes('feed') ? 'kg' : 'pc');

                return (
                    <button key={p.id} onClick={() => onProductClick(p)} disabled={outStock}
                        className={cn(
                            "relative flex flex-col rounded-2xl border p-3 text-left transition-all duration-150 overflow-hidden shadow-xs hover:shadow-md select-none group",
                            outStock ? "opacity-40 cursor-not-allowed border-border bg-card/60"
                                : inCart ? "border-primary/70 bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                                : "border-border bg-card hover:border-primary/50 hover:bg-card"
                        )}>

                        {/* Top badges: Unit Pill & Category */}
                        <div className="flex items-center justify-between gap-1 mb-2 w-full">
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 shadow-xs",
                                unit === 'kg' ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : unit === 'sack' || unit === 'bag' ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : "bg-muted text-muted-foreground"
                            )}>
                                {unit.toUpperCase()}
                            </span>

                            {p.barcode && (
                                <span className="text-[9px] font-mono text-muted-foreground/70 truncate max-w-[90px]">
                                    {p.barcode}
                                </span>
                            )}
                        </div>

                        {/* Product Image */}
                        <ProductThumbnail
                            src={p.product_img}
                            name={p.name}
                            categoryName={p.category?.name}
                            unit={p.unit}
                            aspect="aspect-square"
                            className="rounded-xl mb-2.5 group-hover:scale-[1.02] transition-transform"
                            padding="p-2"
                        />

                        {/* In-cart counter */}
                        {inCart && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[11px] font-black rounded-full h-6 min-w-[24px] flex items-center justify-center px-1.5 shadow-md ring-2 ring-background">
                                {fmtQty(inCart.qty)} {inCart.unit ?? unit}
                            </div>
                        )}

                        {outStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-xs rounded-2xl z-10">
                                <span className="text-[10px] font-black text-destructive uppercase tracking-widest bg-background/90 border border-destructive/30 px-3 py-1 rounded-full shadow-sm">
                                    Out of Stock
                                </span>
                            </div>
                        )}

                        {/* Product Title */}
                        <p title={p.name} className="text-xs font-bold text-foreground leading-snug line-clamp-2 flex-1 min-h-[2rem]">
                            {p.name}
                        </p>

                        {/* Price & Stock */}
                        <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-border/40 gap-1 shrink-0 w-full">
                            <div>
                                <span className="text-sm font-black text-primary tabular-nums">
                                    {fmtMoney(p.price, currency)}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground ml-0.5">
                                    /{unit}
                                </span>
                            </div>
                            <span className={cn(
                                "text-[10px] font-semibold shrink-0 tabular-nums",
                                outStock ? "text-destructive" : lowStock ? "text-amber-500" : "text-muted-foreground"
                            )}>
                                {isBundleMTO ? '∞' : `${fmtQty(p.stock)} ${unit}`}
                            </span>
                        </div>

                        {p.has_variants && (
                            <p className="text-[9px] text-muted-foreground mt-1">
                                {p.variants.length} variant{p.variants.length !== 1 ? 's' : ''} available
                            </p>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
