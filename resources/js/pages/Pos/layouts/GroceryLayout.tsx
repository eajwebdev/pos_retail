import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtMoney, fmtQty } from '../ReceiptTemplate';
import type { Product, CartItem } from '../posTypes';
import ProductThumbnail from '@/components/ProductThumbnail';

export default function GroceryLayout({ filtered, cart, currency, onProductClick }: {
    filtered: Product[];
    cart: CartItem[];
    currency: string;
    onProductClick: (p: Product) => void;
}) {
    return (
        <div className="divide-y divide-border/60 bg-card rounded-2xl border border-border overflow-hidden">
            {filtered.map(p => {
                const inCart      = cart.find(i => i.product_id === p.id);
                const isBundleMTO = p.product_type === 'bundle' || p.product_type === 'made_to_order';
                const outStock    = !isBundleMTO && p.stock <= 0;
                const lowStock    = !isBundleMTO && p.stock > 0 && p.stock <= 5;
                const unit        = p.unit || (p.name.toLowerCase().includes('rice') || p.name.toLowerCase().includes('feed') ? 'kg' : 'pc');

                return (
                    <button key={p.id} onClick={() => onProductClick(p)} disabled={outStock}
                        className={cn(
                            "w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors select-none",
                            outStock ? "opacity-40 cursor-not-allowed bg-muted/20"
                                : inCart ? "bg-primary/5 hover:bg-primary/10"
                                : "hover:bg-accent/60"
                        )}>

                        {/* Thumbnail / In-cart badge */}
                        <div className={cn(
                            "h-11 w-11 rounded-xl overflow-hidden shrink-0 flex items-center justify-center border",
                            inCart ? "border-primary bg-primary/10" : "border-border bg-muted/30"
                        )}>
                            <ProductThumbnail
                                src={p.product_img}
                                name={p.name}
                                categoryName={p.category?.name}
                                unit={p.unit}
                                aspect="aspect-square"
                                className="w-full h-full bg-transparent dark:bg-transparent"
                                padding="p-1"
                            />
                        </div>

                        {/* Title & Barcode */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className={cn("text-sm font-bold leading-snug truncate", outStock ? "text-muted-foreground" : "text-foreground")}>
                                    {p.name}
                                </p>
                                <span className={cn(
                                    "text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0",
                                    unit === 'kg' ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                    : unit === 'sack' || unit === 'bag' ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                    {unit.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                {p.barcode && <span className="text-[11px] font-mono text-muted-foreground">{p.barcode}</span>}
                                {p.category && <span className="text-[10px] text-muted-foreground/80">• {p.category.name}</span>}
                                {p.has_variants && <span className="text-[10px] text-primary">({p.variants.length} var.)</span>}
                            </div>
                        </div>

                        {/* Stock count */}
                        <div className="text-right shrink-0">
                            <span className={cn(
                                "text-xs font-semibold tabular-nums block",
                                outStock ? "text-destructive font-bold" : lowStock ? "text-amber-500" : "text-muted-foreground"
                            )}>
                                {outStock ? "Out" : isBundleMTO ? "∞" : `${fmtQty(p.stock)} ${unit}`}
                            </span>
                            <span className="text-[10px] text-muted-foreground">In stock</span>
                        </div>

                        {/* Price */}
                        <div className="text-right shrink-0 min-w-[70px]">
                            <span className="text-sm font-black text-primary tabular-nums block">
                                {fmtMoney(p.price, currency)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">/{unit}</span>
                        </div>

                        {/* Quick Add Button / Count */}
                        <div className={cn(
                            "h-8 min-w-[32px] px-2 rounded-lg flex items-center justify-center gap-1 shrink-0 font-bold text-xs transition-colors",
                            outStock ? "bg-muted text-muted-foreground/30"
                                : inCart ? "bg-primary text-primary-foreground shadow-xs"
                                : "bg-muted text-foreground hover:bg-primary hover:text-primary-foreground"
                        )}>
                            {inCart ? `${fmtQty(inCart.qty)}` : <Plus className="h-4 w-4" />}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
