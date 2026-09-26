import { Scissors, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtMoney } from '../ReceiptTemplate';
import type { Product, CartItem } from '../posTypes';

export default function SalonLayout({ filtered, cart, currency, onProductClick }: {
    filtered: Product[];
    cart: CartItem[];
    currency: string;
    onProductClick: (p: Product) => void;
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {filtered.map(p => {
                const inCart      = cart.find(i => i.product_id === p.id);
                const isBundleMTO = p.product_type === 'bundle' || p.product_type === 'made_to_order';
                const outStock    = !isBundleMTO && p.stock <= 0;
                const durationMatch = p.name.match(/(\d+\s*(?:min|hr|hour|mins|hours))/i);
                const duration      = durationMatch?.[1];
                return (
                    <button key={p.id} onClick={() => onProductClick(p)} disabled={outStock}
                        className={cn(
                            "relative flex flex-col gap-2 p-5 rounded-2xl border text-left transition-all active:scale-[0.98]",
                            outStock ? "opacity-40 cursor-not-allowed border-border bg-card"
                                : inCart ? "border-primary bg-primary/8 shadow-lg"
                                : "border-border bg-card hover:border-primary/50 hover:shadow-md",
                        )}>
                        {inCart && (
                            <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                                {inCart.qty}
                            </div>
                        )}
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", inCart ? "bg-primary/20" : "bg-muted")}>
                            <Scissors className={cn("h-5 w-5", inCart ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-foreground leading-snug">{p.name}</p>
                            {p.category && <p className="text-[11px] text-muted-foreground mt-0.5">{p.category.name}</p>}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-lg font-black text-primary tabular-nums">{fmtMoney(p.price, currency)}</span>
                            {duration && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />{duration}
                                </span>
                            )}
                        </div>
                        {p.has_variants && (
                            <div className="flex gap-1 flex-wrap">
                                {p.variants.slice(0, 3).map(v => (
                                    <span key={v.id} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{v.name}</span>
                                ))}
                                {p.variants.length > 3 && <span className="text-[10px] text-muted-foreground">+{p.variants.length - 3}</span>}
                            </div>
                        )}
                        {outStock && <p className="text-[10px] text-destructive font-bold">Not available</p>}
                    </button>
                );
            })}
        </div>
    );
}
