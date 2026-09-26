import { useMemo, useState } from 'react';
import { Table2, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmtMoney } from '../ReceiptTemplate';
import type { Product, CartItem, TableOrder, DiningTable } from '../posTypes';
import TabletLayout from './TabletLayout';

function tableStatusColor(status: string) {
    if (status === 'available') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (status === 'occupied')  return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
    if (status === 'reserved')  return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    return 'bg-muted text-muted-foreground border-border';
}

// ── Start-order dialog ────────────────────────────────────────────────────────

function StartOrderDialog({ table, onConfirm, onClose }: {
    table: DiningTable;
    onConfirm: (tableId: number, covers: number) => void;
    onClose: () => void;
}) {
    const [covers, setCovers] = useState(2);
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-card border border-border rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden">
                <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-border">
                    <div>
                        <p className="font-semibold">{table.label ?? `Table ${table.table_number}`}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Start a new dine-in order</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                            Number of covers
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCovers(c => Math.max(1, c - 1))}
                                className="w-9 h-9 rounded-xl border border-border bg-muted hover:bg-muted/80 flex items-center justify-center text-lg font-bold transition-colors"
                            >−</button>
                            <span className="flex-1 text-center text-xl font-black tabular-nums">{covers}</span>
                            <button
                                onClick={() => setCovers(c => Math.min(20, c + 1))}
                                className="w-9 h-9 rounded-xl border border-border bg-muted hover:bg-muted/80 flex items-center justify-center text-lg font-bold transition-colors"
                            >+</button>
                        </div>
                    </div>
                    <button
                        onClick={() => onConfirm(table.id, covers)}
                        className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                    >
                        Start Order
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RestaurantLayout({ filtered, cart, currency, onProductClick, openTableOrders, diningTables, activeTableOrderId, onSelectTable, onStartTableOrder }: {
    filtered: Product[];
    cart: CartItem[];
    currency: string;
    onProductClick: (p: Product) => void;
    openTableOrders: TableOrder[];
    diningTables: DiningTable[];
    activeTableOrderId: number | null;
    onSelectTable: (id: number | null) => void;
    onStartTableOrder: (tableId: number, covers: number) => void;
}) {
    const [tab,            setTab]            = useState<'tables' | 'takeout'>('tables');
    const [pendingTable,   setPendingTable]   = useState<DiningTable | null>(null);

    const sections = useMemo(() => {
        const map: Record<string, DiningTable[]> = {};
        diningTables.forEach(t => {
            const s = t.section ?? 'Main';
            if (!map[s]) map[s] = [];
            map[s].push(t);
        });
        return map;
    }, [diningTables]);

    const activeOrder = openTableOrders.find(o => o.id === activeTableOrderId);

    const handleTableClick = (t: DiningTable) => {
        const order = openTableOrders.find(o => o.table_id === t.id);
        if (order) {
            onSelectTable(order.id);
        } else {
            setPendingTable(t);
        }
    };

    const handleConfirmStart = (tableId: number, covers: number) => {
        setPendingTable(null);
        onStartTableOrder(tableId, covers);
    };

    return (
        <div className="flex h-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 xl:w-72 shrink-0 border-r border-border flex flex-col bg-card overflow-hidden">
                <div className="flex border-b border-border shrink-0">
                    {(['tables', 'takeout'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={cn(
                                "flex-1 py-2.5 text-xs font-bold transition-colors",
                                tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground",
                            )}>
                            {t === 'tables' ? `Tables (${diningTables.length})` : 'Takeout'}
                        </button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                    {tab === 'tables' ? (
                        <>
                            {Object.keys(sections).length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-8">No tables configured</p>
                            ) : Object.entries(sections).map(([section, tables]) => (
                                <div key={section}>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{section}</p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {tables.map(t => {
                                            const order    = openTableOrders.find(o => o.table_id === t.id);
                                            const isActive = order && order.id === activeTableOrderId;
                                            return (
                                                <button key={t.id}
                                                    onClick={() => handleTableClick(t)}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center rounded-xl border p-2 transition-all text-center",
                                                        isActive ? "border-primary bg-primary/15 shadow-sm"
                                                            : order ? "border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/15"
                                                            : "border-border hover:border-primary/40 hover:bg-accent",
                                                    )}>
                                                    <span className="text-xs font-black">{t.table_number}</span>
                                                    <span className={cn("text-[9px] font-medium mt-0.5", order ? "text-amber-500" : "text-emerald-500")}>
                                                        {order ? 'Occupied' : 'Free'}
                                                    </span>
                                                    {order && <span className="text-[9px] text-muted-foreground tabular-nums">{fmtMoney(order.total, currency)}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-xs text-muted-foreground mb-3">Add items to cart for takeout — no table needed</p>
                            <button onClick={() => onSelectTable(null)}
                                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold">
                                New Takeout Order
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Product area */}
            <div className="flex-1 overflow-y-auto p-3">
                {activeOrder && (
                    <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                        <Table2 className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-sm font-bold text-amber-500">{activeOrder.label}</span>
                        {activeOrder.customer_name && <span className="text-xs text-muted-foreground">· {activeOrder.customer_name}</span>}
                        <span className="ml-auto text-sm font-bold text-foreground tabular-nums">{fmtMoney(activeOrder.total, currency)}</span>
                        <button onClick={() => onSelectTable(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                    </div>
                )}
                <TabletLayout filtered={filtered} cart={cart} currency={currency} onProductClick={onProductClick} />
            </div>

            {/* Start-order dialog */}
            {pendingTable && (
                <StartOrderDialog
                    table={pendingTable}
                    onConfirm={handleConfirmStart}
                    onClose={() => setPendingTable(null)}
                />
            )}
        </div>
    );
}
