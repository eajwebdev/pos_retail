"use client";

import { useState } from "react";
import { usePage, router, Link } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import ReceiptTemplate, { fmtMoney, ReceiptData } from "./ReceiptTemplate";
import { routes } from "@/routes";
import { cn } from "@/lib/utils";
import {
    Search, X, Filter, ChevronRight, Eye, Receipt, TrendingUp,
    Banknote, Smartphone, CreditCard, Tag, ArrowLeft, Table2, Calendar, CalendarClock, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtDate, manilaNow, toDateStr, manilaRange } from "@/lib/date";
import { type DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SaleRow extends ReceiptData {
    id: number;
    item_count: number;
    table_label?: string | null;
    amount_paid: number;
    balance_due: number;
    payment_status: string;
    due_date?: string | null;
    customer?: { id: number; name: string } | null;
}
interface PaginatedSales {
    data: SaleRow[]; current_page: number; last_page: number;
    per_page: number; total: number; from: number; to: number;
    links: { url: string | null; label: string; active: boolean }[];
}
interface Summary {
    total_sales: number; total_count: number;
    cash_total: number; gcash_total: number; card_total: number;
    installment_dp: number; remittance_total: number; discount_total: number;
    credit_paid: number; credit_balance: number;
}
interface Branch { id: number; name: string; business_type: string; }
interface PageProps {
    sales: PaginatedSales; summary: Summary;
    filters: { search?: string; status?: string; payment_method?: string; from?: string; to?: string };
    app: { currency: string };
    branch: Branch | null;
    is_admin: boolean;
    [key: string]: unknown;
}

// ─── Date preset helpers ──────────────────────────────────────────────────────
const presets = [
    { label: "Today",      ...{ from: toDateStr(manilaRange.today().from),      to: toDateStr(manilaRange.today().to)      } },
    { label: "Yesterday",  ...{ from: toDateStr(manilaRange.yesterday().from),  to: toDateStr(manilaRange.yesterday().to)  } },
    { label: "This Week",  ...{ from: toDateStr(manilaRange.thisWeek().from),   to: toDateStr(manilaRange.thisWeek().to)   } },
    { label: "Last Week",  ...{ from: toDateStr(manilaRange.lastWeek().from),   to: toDateStr(manilaRange.lastWeek().to)   } },
    { label: "This Month", ...{ from: toDateStr(manilaRange.thisMonth().from),  to: toDateStr(manilaRange.thisMonth().to)  } },
    { label: "Last Month", ...{ from: toDateStr(manilaRange.lastMonth().from),  to: toDateStr(manilaRange.lastMonth().to)  } },
];

// Business types that use dine-in / table ordering
const TABLE_TYPES = ["restaurant", "bar", "mixed"];
const SALON_TYPES = ["salon"];

// ─── Method chip ──────────────────────────────────────────────────────────────
function MethodChip({ method }: { method: string }) {
    const map: Record<string, { label: string; color: string; icon: React.ElementType }> = {
        cash:   { label: "Cash",   color: "bg-green-50  text-green-700  dark:bg-green-900/20  dark:text-green-400",  icon: Banknote   },
        gcash:  { label: "GCash",  color: "bg-blue-50   text-blue-700   dark:bg-blue-900/20   dark:text-blue-400",   icon: Smartphone },
        card:   { label: "Card",   color: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400", icon: CreditCard },
        credit: { label: "Credit", color: "bg-amber-50  text-amber-700  dark:bg-amber-900/20  dark:text-amber-400",  icon: Wallet },
        mixed:  { label: "Partial",color: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400", icon: Banknote },
        others: { label: "Others", color: "bg-muted     text-muted-foreground",                                       icon: Tag        },
    };
    const m = map[method] ?? map.others;
    const Icon = m.icon;
    return (
        <span className={cn("flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit", m.color)}>
            <Icon className="h-2.5 w-2.5" />{m.label}
        </span>
    );
}

// ─── Receipt drawer ───────────────────────────────────────────────────────────
function ReceiptDrawer({ sale, currency, businessType, onClose }: {
    sale: SaleRow; currency: string; businessType?: string; onClose: () => void;
}) {
    // Augment with business_type for the receipt template
    const saleWithMeta = { ...sale, business_type: businessType };
    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:w-96 bg-card border-l border-border flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-border shrink-0">
                    <div>
                        <p className="font-bold text-foreground font-mono text-sm">{sale.receipt_number}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {fmtDate(sale.created_at, "MMMM d, yyyy · h:mm a")}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Link href={routes.pos.show(sale.id)}>
                            <button className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="View full page">
                                <Eye className="h-3.5 w-3.5" />
                            </button>
                        </Link>
                        <button onClick={onClose}
                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Status + chips */}
                <div className="px-5 py-3 flex items-center gap-2 flex-wrap border-b border-border shrink-0">
                    <span className={cn("badge text-[10px] font-bold capitalize",
                        sale.status === "completed" ? "badge-completed" : "badge-voided")}>
                        {sale.status}
                    </span>
                    <MethodChip method={sale.payment_method} />
                    {sale.customer_name && (
                        <span className="text-xs text-muted-foreground">👤 {sale.customer_name}</span>
                    )}
                    {sale.table_label && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                            <Table2 className="h-3 w-3" />{sale.table_label}
                        </span>
                    )}
                </div>

                {/* Receipt */}
                <div className="flex-1 overflow-y-auto p-5">
                    <ReceiptTemplate sale={saleWithMeta} currency={currency} showActions={true} />
                </div>
            </div>
        </div>
    );
}

// ─── History page ─────────────────────────────────────────────────────────────
export default function PosHistory() {
    const { props }  = usePage<PageProps>();
    const { sales, summary, filters, app, branch, is_admin } = props;
    const currency   = app?.currency ?? "₱";
    const bizType    = branch?.business_type ?? "";

    const showTableCol   = TABLE_TYPES.includes(bizType);
    const showCustomerCol = !SALON_TYPES.includes(bizType); // salon always has customer; others = walk-in

    const [search,    setSearch]    = useState(filters.search ?? "");
    const [status,    setStatus]    = useState(filters.status ?? "");
    const [method,    setMethod]    = useState(filters.payment_method ?? "");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(
        filters.from ? {
            from: new Date(filters.from + "T00:00:00+08:00"),
            to:   filters.to ? new Date(filters.to + "T00:00:00+08:00") : new Date(filters.from + "T00:00:00+08:00"),
        } : undefined
    );
    const [selected,  setSelected]  = useState<SaleRow | null>(null);

    const applyFilters = (overrideRange?: DateRange) => {
        const range = overrideRange ?? dateRange;
        router.get(routes.sales.history(), {
            search: search || undefined,
            status: status || undefined,
            payment_method: method || undefined,
            from: range?.from ? toDateStr(range.from) : undefined,
            to:   range?.to   ? toDateStr(range.to)   : undefined,
        }, { preserveState: true, replace: true });
    };

    const applyPreset = (p: { from: string; to: string }) => {
        const range: DateRange = {
            from: new Date(p.from + "T00:00:00+08:00"),
            to:   new Date(p.to   + "T00:00:00+08:00"),
        };
        setDateRange(range);
        applyFilters(range);
    };

    const todayRange: DateRange = {
        from: new Date(toDateStr(manilaRange.today().from) + "T00:00:00+08:00"),
        to:   new Date(toDateStr(manilaRange.today().to)   + "T00:00:00+08:00"),
    };

    const clearFilters = () => {
        setSearch(""); setStatus(""); setMethod("");
        setDateRange(is_admin ? todayRange : dateRange);
        router.get(routes.sales.history(), {
            from: toDateStr(manilaRange.today().from),
            to:   toDateStr(manilaRange.today().to),
        }, { preserveState: true, replace: true });
    };

    const hasFilters = !!(filters.search || filters.status || filters.payment_method || filters.from || filters.to);
    const activePreset = presets.find(p => p.from === (filters.from ?? "") && p.to === (filters.to ?? ""));

    const summaryCards = [
        { label: "Revenue",        value: fmtMoney(summary.total_sales, currency),    icon: TrendingUp,     color: "bg-indigo-50  text-indigo-600  dark:bg-indigo-950/30  dark:text-indigo-400"  },
        { label: "Cash",           value: fmtMoney(summary.cash_total, currency),      icon: Banknote,       color: "bg-green-50   text-green-600   dark:bg-green-950/30   dark:text-green-400"   },
        { label: "GCash",          value: fmtMoney(summary.gcash_total, currency),     icon: Smartphone,     color: "bg-blue-50    text-blue-600    dark:bg-blue-950/30    dark:text-blue-400"    },
        { label: "Card",           value: fmtMoney(summary.card_total, currency),      icon: CreditCard,     color: "bg-purple-50  text-purple-600  dark:bg-purple-950/30  dark:text-purple-400"  },
        ...((summary.credit_paid ?? 0) > 0 || (summary.credit_balance ?? 0) > 0 ? [
        { label: "Credit Collected", value: fmtMoney(summary.credit_paid ?? 0, currency), icon: Banknote, color: "bg-emerald-50  text-emerald-600  dark:bg-emerald-950/30  dark:text-emerald-400" },
        { label: "Credit Balance", value: fmtMoney(summary.credit_balance ?? 0, currency), icon: Wallet, color: "bg-amber-50  text-amber-600  dark:bg-amber-950/30  dark:text-amber-400" },
        ] : []),
        { label: "Discounts",      value: fmtMoney(summary.discount_total, currency),  icon: Tag,            color: "bg-amber-50   text-amber-600   dark:bg-amber-950/30   dark:text-amber-400"   },
    ];

    // Build table columns
    const baseCols = ["Receipt", "Date"];
    if (showTableCol)    baseCols.push("Table");
    if (showCustomerCol) baseCols.push("Customer");
    baseCols.push("Method", "Items", "Total", "Collected", "Balance", "Status", "");

    return (
        <AdminLayout>
            <div className="space-y-5 max-w-[1400px] mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href={routes.pos.index()}>
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Sales History</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">{sales.total.toLocaleString()} total transactions</p>
                    </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {summaryCards.map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="bg-card border border-border rounded-xl p-3.5">
                            <div className={cn("inline-flex p-1.5 rounded-lg mb-2", color.split(" ").slice(1).join(" "))}>
                                <Icon className={cn("h-3.5 w-3.5", color.split(" ")[0])} />
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                            <p className="text-base font-bold tabular-nums text-foreground mt-0.5">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    {/* Quick date presets — admin only */}
                    {is_admin && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
                                <Calendar className="h-3.5 w-3.5" />Quick range:
                            </span>
                            {presets.map(p => (
                                <button key={p.label}
                                    onClick={() => applyPreset(p)}
                                    className={cn(
                                        "h-7 px-3 text-xs font-medium rounded-lg border transition-colors",
                                        activePreset?.label === p.label
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                                    )}>
                                    {p.label}
                                </button>
                            ))}
                            {hasFilters && (
                                <button onClick={clearFilters}
                                    className="h-7 px-3 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-auto flex items-center gap-1.5">
                                    <X className="h-3 w-3" />Clear all
                                </button>
                            )}
                        </div>
                    )}

                    {/* Filter inputs */}
                    <div className="flex flex-wrap gap-2 items-end">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") applyFilters(); }}
                                placeholder="Receipt no. or customer…"
                                className="w-full h-9 pl-9 pr-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
                        </div>
                        <select value={status} onChange={e => setStatus(e.target.value)}
                            className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                            <option value="">All status</option>
                            <option value="completed">Completed</option>
                            <option value="voided">Voided</option>
                        </select>
                        <select value={method} onChange={e => setMethod(e.target.value)}
                            className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                            <option value="">All methods</option>
                            <option value="cash">Cash</option>
                            <option value="gcash">GCash</option>
                            <option value="card">Card</option>
                            <option value="others">Others</option>
                            <option value="credit">Credit</option>
                            <option value="mixed">Partial</option>
                        </select>
                        {is_admin ? (
                            <div className="min-w-[240px]">
                                <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
                            </div>
                        ) : (
                            <div className="h-9 px-3 flex items-center text-xs font-medium bg-muted border border-border rounded-lg text-muted-foreground gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />Today only
                            </div>
                        )}
                        <Button size="sm" className="h-9 gap-2" onClick={() => applyFilters()}>
                            <Filter className="h-3.5 w-3.5" />Apply
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    {baseCols.map(h => (
                                        <th key={h} className={cn(
                                            "px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest",
                                            h === "Total" || h === "Collected" || h === "Balance" || h === "" ? "text-right" : "text-left",
                                            h === "Date"     ? "hidden sm:table-cell" : "",
                                            h === "Customer" ? "hidden md:table-cell" : "",
                                            h === "Items"    ? "hidden lg:table-cell" : "",
                                            h === "Table"    ? "hidden sm:table-cell" : "",
                                        )}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sales.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={baseCols.length} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                            No sales found
                                        </td>
                                    </tr>
                                ) : sales.data.map(sale => (
                                    <tr key={sale.id}
                                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                                        onClick={() => setSelected(sale)}>
                                        <td className="px-4 py-3">
                                            <p className="font-mono text-xs font-bold text-foreground">{sale.receipt_number}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 sm:hidden">
                                                {fmtDate(sale.created_at, "MMM d, h:mm a")}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell">
                                            <p className="text-sm text-foreground">{fmtDate(sale.created_at, "MMM d, yyyy")}</p>
                                            <p className="text-[11px] text-muted-foreground">{fmtDate(sale.created_at, "h:mm a")}</p>
                                        </td>
                                        {showTableCol && (
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                {sale.table_label ? (
                                                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                                                        <Table2 className="h-3 w-3 shrink-0" />{sale.table_label}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Takeout</span>
                                                )}
                                            </td>
                                        )}
                                        {showCustomerCol && (
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <p className="text-sm text-foreground">{sale.customer?.name ?? sale.customer_name ?? "Walk-in"}</p>
                                            </td>
                                        )}
                                        <td className="px-4 py-3">
                                            <MethodChip method={sale.payment_method} />
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <p className="text-sm text-muted-foreground">{sale.item_count} item{sale.item_count !== 1 ? "s" : ""}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="font-bold tabular-nums text-foreground">{fmtMoney(sale.total, currency)}</p>
                                            {sale.discount_amount > 0 && (
                                                <p className="text-[10px] text-green-600 dark:text-green-400 tabular-nums">
                                                    −{fmtMoney(sale.discount_amount, currency)}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="font-semibold tabular-nums text-foreground">{fmtMoney(sale.amount_paid ?? sale.payment_amount, currency)}</p>
                                            {sale.payment_status && sale.payment_status !== "paid" && (
                                                <p className="text-[10px] text-muted-foreground capitalize">{sale.payment_status}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <p className={cn("font-semibold tabular-nums", (sale.balance_due ?? 0) > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}>
                                                {fmtMoney(sale.balance_due ?? 0, currency)}
                                            </p>
                                            {sale.due_date && <p className="text-[10px] text-muted-foreground">Due {sale.due_date}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={cn("badge text-[10px] font-bold capitalize",
                                                sale.status === "completed" ? "badge-completed" : "badge-voided")}>
                                                {sale.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {sales.last_page > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
                            <p className="text-xs text-muted-foreground">
                                {sales.from}–{sales.to} of {sales.total.toLocaleString()}
                            </p>
                            <div className="flex items-center gap-1">
                                {sales.links.map((link, i) => (
                                    <button key={i} disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                        className={cn(
                                            "h-7 min-w-[28px] px-2 text-xs rounded-md border font-medium transition-all",
                                            link.active
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
                                        )}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selected && (
                <ReceiptDrawer sale={selected} currency={currency} businessType={bizType} onClose={() => setSelected(null)} />
            )}
        </AdminLayout>
    );
}
