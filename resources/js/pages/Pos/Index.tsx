"use client";
import { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePage, router } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import ReceiptTemplate, { fmtMoney, fmtQty, ReceiptData } from "./ReceiptTemplate";
import { routes } from "@/routes";
import { cn } from "@/lib/utils";
import {
    Search, X, Plus, Minus, Trash2, ShoppingCart, Tag,
    CreditCard, Banknote, Smartphone, CheckCircle2,
    AlertTriangle, Package, History, ScanLine,
    RefreshCw, Zap, User, ChevronDown, Wallet, Rows3,
    Calendar, Check, Scale, LayoutGrid, Clock, Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product, CartItem, Category, ActivePromo, CustomerOption } from "./posTypes";
import ProductThumbnail, { getDefaultProductIcon } from "@/components/ProductThumbnail";
import WeightAmountModal from "./WeightAmountModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Session  { id: number; opening_cash: number; opened_at: string; status: string; }
interface Branch   { id: number; name: string; business_type: string; feature_flags: Record<string, boolean>; }
interface PageProps {
    auth: { user: { fname: string; lname: string; role_label: string; is_cashier: boolean } | null };
    settings: {
        allow_discount: boolean; max_discount_percent: number;
        default_payment: string; vat_enabled: boolean;
        vat_rate: number; vat_inclusive: boolean; require_cash_session: boolean;
        item_mode: "products_and_services" | "products_only" | "services_only";
        laundry_mode: "auto" | "enabled" | "disabled";
        require_customer_name: boolean;
        default_due_days: number;
        service_charge_enabled: boolean;
        service_charge_rate: number;
    } | null;
    app: { currency: string };
    products: Product[];
    customers: CustomerOption[];
    categories: Category[];
    session: Session | null;
    branch: Branch | null;
    preferred_layout: string;
    promos: ActivePromo[];
    [key: string]: unknown;
}
type PayMethod   = "cash" | "gcash" | "card" | "others" | "credit" | "mixed";
type LayoutMode  = "grid" | "tablet" | "grocery" | "cafe" | "salon" | "kiosk" | "mobile";

const METHODS: { value: PayMethod; label: string; icon: React.ElementType; desc: string }[] = [
    { value: "cash",   label: "Cash",           icon: Banknote,   desc: "Standard cash tender" },
    { value: "gcash",  label: "GCash",          icon: Smartphone, desc: "E-wallet QR payment" },
    { value: "credit", label: "Credit (Utang)", icon: Wallet,     desc: "Charge 100% to customer" },
    { value: "mixed",  label: "Partial Pay",    icon: Banknote,   desc: "Downpayment + credit" },
    { value: "card",   label: "Card / Debit",   icon: CreditCard, desc: "Terminal card swipe" },
    { value: "others", label: "Others",         icon: Tag,        desc: "Vouchers & others" },
];

// Helper to determine image for retail items (Rice, Feeds, Groceries)
const getProductImage = (p: { product_img?: string | null; unit?: string | null; name: string; category?: { name: string } | null }) => {
    return p.product_img || getDefaultProductIcon(p.name, p.category?.name ?? '', p.unit ?? '');
};

// Helper to identify weighted / per-kg products (Rice, Feeds, Grains, etc.)
export const isWeightedKgItem = (unit?: string | null, name?: string | null): boolean => {
    const u = (unit || '').trim().toLowerCase();
    if (u === 'kg' || u === 'kilo' || u === 'kilogram') return true;
    if (u === 'sack' || u === 'bag' || u === 'pc' || u === 'pack' || u === 'can' || u === 'bottle' || u === 'box') return false;
    const n = (name || '').toLowerCase();
    if (n.includes('sack') || n.includes('bag') || n.includes('pack') || n.includes('can') || n.includes('bottle')) return false;
    return n.includes('rice') || n.includes('feed') || n.includes('palay') || n.includes('corn') || n.includes('grain');
};

// ─── Lazy-loaded layout chunks ────────────────────────────────────────────────
const GridLayout       = lazy(() => import("./layouts/GridLayout"));
const TabletLayout     = lazy(() => import("./layouts/TabletLayout"));
const GroceryLayout    = lazy(() => import("./layouts/GroceryLayout"));
const CafeLayout       = lazy(() => import("./layouts/CafeLayout"));
const SalonLayout      = lazy(() => import("./layouts/SalonLayout"));
const KioskLayout      = lazy(() => import("./layouts/KioskLayout"));
const MobileLayout     = lazy(() => import("./layouts/MobileLayout"));

function LayoutSpinner() {
    return (
        <div className="flex items-center justify-center h-full">
            <span className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
    );
}

// ─── CategoryDropdown ─────────────────────────────────────────────────────────
function CategoryDropdown({ categories, activeCat, onChange }: {
    categories: Category[]; activeCat: number | null; onChange: (id: number | null) => void;
}) {
    if (!categories.length) return null;
    return (
        <div className="relative shrink-0">
            <select
                value={activeCat ?? ""}
                onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
                className={cn(
                    "h-9 pl-3 pr-7 text-xs sm:text-sm bg-background border rounded-xl appearance-none focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer min-w-[120px] max-w-[160px] truncate transition-colors",
                    activeCat !== null
                        ? "border-primary/60 text-foreground font-semibold"
                        : "border-border text-muted-foreground",
                )}
            >
                <option value="">All Categories</option>
                {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            {activeCat !== null && (
                <button
                    onClick={() => onChange(null)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-primary hover:text-foreground transition-colors"
                    title="Clear filter"
                >
                    <X className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

// ─── VariantPicker ────────────────────────────────────────────────────────────
function VariantPicker({ product, currency, onSelect, onClose }: {
    product: Product; currency: string;
    onSelect: (id: number | null, name: string | null) => void;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-border bg-muted/20">
                    <div className="min-w-0 flex-1 pr-3">
                        <p className="font-bold text-foreground leading-snug">{product.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Select product variant</p>
                    </div>
                    <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                    {product.variants.filter(v => v.is_available).map(v => (
                        <button key={v.id} onClick={() => onSelect(v.id, v.name)} disabled={v.stock <= 0}
                            className="flex flex-col items-start gap-1 p-3 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed">
                            <span className="text-sm font-semibold text-foreground">{v.name}</span>
                            <span className="text-xs font-bold text-primary">
                                {v.extra_price > 0 ? `+${fmtMoney(v.extra_price, currency)}` : fmtMoney(product.price, currency)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{v.stock > 0 ? `${fmtQty(v.stock)} in stock` : "Out of stock"}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── PaymentModal (SimSoft Cashier Tender & Customer Credit) ──────────────────
function PaymentModal({ subtotal, settings, currency, customers, customerNameRequired, promos, cart, onConfirm, onClose, loading, serverError, initialMethod = "cash", preselectedCustomerId = null }: {
    subtotal: number; settings: PageProps["settings"]; currency: string;
    customers: CustomerOption[];
    customerNameRequired?: boolean; promos: ActivePromo[]; cart: CartItem[];
    onConfirm: (d: {
        payment_method: PayMethod; payment_amount: number; customer_name: string;
        customer_id: number | null; due_date?: string | null; credit_notes?: string | null;
        discount_percent: number; promo_id: number | null;
    }) => void;
    onClose: () => void; loading: boolean; serverError?: string | null;
    initialMethod?: PayMethod; preselectedCustomerId?: number | null;
}) {
    const defaultMethod = initialMethod || (METHODS.some(m => m.value === settings?.default_payment) ? settings?.default_payment : "cash") as PayMethod;
    const [method,       setMethod]       = useState<PayMethod>(defaultMethod);
    const [tender,       setTender]       = useState("");
    const [customer,     setCustomer]     = useState("");
    const [customerId,   setCustomerId]   = useState(preselectedCustomerId ? String(preselectedCustomerId) : "");
    const [dueDate,      setDueDate]      = useState("");
    const [creditNotes,  setCreditNotes]  = useState("");
    const [discPct,      setDiscPct]      = useState("");
    const [promoCode,    setPromoCode]    = useState("");
    const [appliedPromo, setAppliedPromo] = useState<ActivePromo | null>(null);
    const [promoError,   setPromoError]   = useState("");
    const [showPromos,   setShowPromos]   = useState(false);

    const isCredit = method === "credit";
    const isMixed  = method === "mixed";
    const isCash   = method === "cash";
    const needsRegisteredCustomer = isCredit || isMixed;

    const r2 = (v: number) => Math.round(v * 100) / 100;

    const disc      = Math.min(parseFloat(discPct) || 0, settings?.max_discount_percent ?? 100);
    const discAmt   = r2(subtotal * disc / 100);
    const afterDisc = r2(subtotal - discAmt);

    const promoAppliesToCart = (p: ActivePromo) => {
        if (p.applies_to === 'all') return true;
        if (p.applies_to === 'specific_products') return cart.some(i => p.product_ids.includes(i.product_id));
        return p.category_ids.length > 0;
    };
    const computePromoAmt = (p: ActivePromo | null) => {
        if (!p) return 0;
        if (p.minimum_purchase && afterDisc < p.minimum_purchase) return 0;
        return p.discount_type === 'percent'
            ? r2(afterDisc * p.discount_value / 100)
            : Math.min(r2(p.discount_value), afterDisc);
    };
    const promoAmt   = computePromoAmt(appliedPromo);
    const afterPromo = r2(afterDisc - promoAmt);

    const vatRate    = (settings?.vat_enabled && !settings?.vat_inclusive) ? (settings.vat_rate ?? 0) : 0;
    const vatAmt     = r2(afterPromo * vatRate / 100);
    const svcRate    = settings?.service_charge_enabled ? (settings.service_charge_rate ?? 0) : 0;
    const svcAmt     = r2(afterPromo * svcRate / 100);
    const total      = r2(afterPromo + vatAmt + svcAmt);

    const tenderN    = parseFloat(tender) || 0;
    const change     = Math.max(0, tenderN - total);

    const creditPaid = isCredit ? 0 : (isMixed ? tenderN : total);
    const creditBalance = Math.max(0, r2(total - Math.min(total, creditPaid)));

    const canPay = total > 0
        && (!isCash || tenderN >= total)
        && (!isMixed || (tenderN > 0 && tenderN < total))
        && (!needsRegisteredCustomer || !!customerId)
        && (!customerNameRequired || customer.trim().length > 0);

    const append     = (v: string) => setTender(p => (p === "0" || p === "") ? v : p + v);
    const backspace  = () => setTender(p => p.slice(0, -1));

    const eligiblePromos = promos.filter(promoAppliesToCart);

    const applyPromoCode = () => {
        setPromoError("");
        const code = promoCode.trim().toUpperCase();
        if (!code) return;
        const found = promos.find(p => p.code?.toUpperCase() === code);
        if (!found) { setPromoError("Promo code not found or expired."); return; }
        if (!promoAppliesToCart(found)) { setPromoError("This promo does not apply to any item in the cart."); return; }
        if (found.minimum_purchase && afterDisc < found.minimum_purchase) {
            setPromoError("Minimum purchase of " + fmtMoney(found.minimum_purchase, currency) + " required."); return;
        }
        if (computePromoAmt(found) <= 0) { setPromoError("This promo gives no discount on the current cart total."); return; }
        setAppliedPromo(found); setPromoError(""); setShowPromos(false);
    };

    const selectedCustomer = customers.find(c => String(c.id) === customerId) ?? null;
    useEffect(() => {
        if (selectedCustomer) setCustomer(selectedCustomer.name);
    }, [selectedCustomer]);

    // Quick due date presets
    const setDueDateDays = (days: number) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        setDueDate(d.toISOString().slice(0, 10));
    };

    useEffect(() => {
        if (!dueDate && (isCredit || isMixed)) {
            const days = (settings?.default_due_days ?? 0) > 0 ? settings!.default_due_days : 30;
            setDueDateDays(days);
        }
    }, [dueDate, isCredit, isMixed, settings?.default_due_days]);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0 bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-black text-foreground text-base tracking-tight">SimSoft Cashier Tender</p>
                            <p className="text-[11px] text-muted-foreground">Select payment method or charge to credit</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Big Digital Total Due Banner */}
                    <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between shadow-inner border border-slate-800">
                        <div>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">Total Amount Due</span>
                            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                                {fmtMoney(total, currency)}
                            </span>
                        </div>
                        <div className="text-right text-xs space-y-1 text-slate-300 font-mono">
                            <div>Subtotal: {fmtMoney(subtotal, currency)}</div>
                            {disc > 0 && <div className="text-emerald-400">Discount: −{fmtMoney(discAmt, currency)}</div>}
                            {promoAmt > 0 && <div className="text-emerald-400">Promo: −{fmtMoney(promoAmt, currency)}</div>}
                            {vatAmt > 0 && <div>VAT: +{fmtMoney(vatAmt, currency)}</div>}
                        </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Payment Method</label>
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                            {METHODS.map(m => {
                                const Icon = m.icon;
                                const isSel = method === m.value;
                                return (
                                    <button key={m.value} onClick={() => setMethod(m.value)}
                                        className={cn("flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl border text-center transition-all select-none",
                                            isSel
                                                ? "bg-primary text-primary-foreground border-primary shadow-sm font-bold ring-2 ring-primary/20"
                                                : "border-border hover:border-primary/40 hover:bg-accent text-foreground font-medium")}>
                                        <Icon className="h-4 w-4" />
                                        <span className="text-[11px] leading-tight">{m.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Customer Selection (Always available, required for credit/mixed) */}
                    <div className={cn("p-3 rounded-xl border transition-all",
                        needsRegisteredCustomer ? "bg-amber-500/5 border-amber-500/40" : "bg-muted/20 border-border")}>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-foreground">
                                <User className="h-3.5 w-3.5 text-primary" />
                                Customer {needsRegisteredCustomer ? <span className="text-destructive font-black">* Required for Credit</span> : "(Optional)"}
                            </label>
                            {selectedCustomer && (
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                                    selectedCustomer.credit_balance > 0 ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400")}>
                                    Existing Balance: {fmtMoney(selectedCustomer.credit_balance, currency)}
                                </span>
                            )}
                        </div>

                        <div className="space-y-2">
                            <select value={customerId}
                                onChange={e => {
                                    setCustomerId(e.target.value);
                                    const c = customers.find(x => String(x.id) === e.target.value);
                                    if (c) setCustomer(c.name);
                                }}
                                className="w-full h-10 px-3 text-sm font-medium bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground">
                                <option value="">-- Choose Registered Customer --</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.contact_number ? `(${c.contact_number})` : ''} {c.credit_balance > 0 ? `· Bal: ${fmtMoney(c.credit_balance, currency)}` : '· Clean Bal'}
                                    </option>
                                ))}
                            </select>

                            {!needsRegisteredCustomer && (
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <input value={customer} onChange={e => { setCustomer(e.target.value); if (customerId) setCustomerId(""); }}
                                        placeholder="Or type walk-in customer name…"
                                        className="w-full h-9 pl-9 pr-3 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Customer Credit / Utang Details Panel */}
                    {(isCredit || isMixed) && (
                        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Wallet className="h-4 w-4" /> {isMixed ? "Partial Payment with Credit" : "Charge to Customer Account (Full Credit)"}
                                </p>
                                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded font-bold">
                                    AR CREDIT
                                </span>
                            </div>

                            {/* Downpayment for Mixed */}
                            {isMixed && (
                                <div>
                                    <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                                        Cash Downpayment Collected Now <span className="text-destructive">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">{currency}</span>
                                        <input value={tender} onChange={e => setTender(e.target.value)}
                                            type="number" min="0.01" max={total - 0.01} step="any"
                                            placeholder="Enter cash downpayment amount…"
                                            className="w-full h-10 pl-8 pr-3 text-base font-bold bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-mono" />
                                    </div>
                                    <div className="flex gap-1.5 mt-2 flex-wrap">
                                        {[100, 200, 500, 1000].filter(v => v < total).map(v => (
                                            <button key={v} type="button" onClick={() => setTender(String(v))}
                                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted">
                                                {currency}{v}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Breakdown of Credit Balances */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-xl bg-background border border-border p-2.5">
                                    <p className="text-muted-foreground text-[10px] uppercase font-bold">Collected Now</p>
                                    <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                        {fmtMoney(Math.min(total, creditPaid), currency)}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-background border border-amber-500/30 p-2.5">
                                    <p className="text-amber-700 dark:text-amber-400 text-[10px] uppercase font-bold">New Credit Balance</p>
                                    <p className="text-base font-black text-amber-700 dark:text-amber-400 font-mono">
                                        {fmtMoney(creditBalance, currency)}
                                    </p>
                                </div>
                            </div>

                            {/* Due Date with Quick Presets */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                        Promised Due Date
                                    </label>
                                    <div className="flex gap-1">
                                        {[7, 15, 30].map(days => (
                                            <button key={days} type="button" onClick={() => setDueDateDays(days)}
                                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-background border border-border hover:border-primary/50 text-foreground transition-colors">
                                                +{days}d
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <input value={dueDate} onChange={e => setDueDate(e.target.value)}
                                    type="date"
                                    className="w-full h-9 px-3 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground" />
                            </div>

                            {/* Credit Notes */}
                            <div>
                                <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                                    Credit Notes / Terms (Optional)
                                </label>
                                <input value={creditNotes} onChange={e => setCreditNotes(e.target.value)}
                                    placeholder="e.g. Pay after palay harvest / salary payday…"
                                    className="w-full h-9 px-3 text-xs sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground" />
                            </div>
                        </div>
                    )}

                    {/* Cash Tender Panel & Quick Presets */}
                    {isCash && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Cash Tendered</label>
                                <div className="bg-background border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xl font-bold text-muted-foreground">{currency}</span>
                                        <span className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-foreground">
                                            {(parseFloat(tender || "0")).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {tenderN >= total && total > 0 && (
                                        <div className="text-right shrink-0 bg-green-500/10 border border-green-500/30 px-3 py-1.5 rounded-xl">
                                            <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase">Change</p>
                                            <p className="text-xl font-black tabular-nums font-mono text-green-600 dark:text-green-400">{fmtMoney(change, currency)}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Tender Bills */}
                            <div className="flex gap-1.5 flex-wrap">
                                {[total, 50, 100, 200, 500, 1000, 2000].filter((v, i) => i === 0 || v >= total).slice(0, 6).map((v, i) => (
                                    <button key={i} type="button" onClick={() => setTender(v.toFixed(2))}
                                        className={cn("px-3 py-1.5 rounded-xl border text-xs font-bold transition-all",
                                            i === 0 ? "bg-primary text-primary-foreground border-primary shadow-xs" : "border-border hover:border-primary/40 hover:bg-accent text-foreground")}>
                                        {i === 0 ? "Exact Amount" : fmtMoney(v, currency)}
                                    </button>
                                ))}
                            </div>

                            {/* Cash Numpad */}
                            <div className="grid grid-cols-3 gap-2">
                                {["7","8","9","4","5","6","1","2","3","00","0","⌫"].map(k => (
                                    <button key={k} type="button" onClick={() => k === "⌫" ? backspace() : append(k)}
                                        className="rounded-xl border h-11 text-base font-bold transition-all active:scale-95 border-border bg-background hover:border-primary/30 hover:bg-accent">
                                        {k}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Discounts & Promos Dropdown/Accordions */}
                    {settings?.allow_discount && (
                        <div className="pt-2 border-t border-border/60">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Senior / PWD / Promo Discount</label>
                            <div className="flex gap-1.5 flex-wrap">
                                <input value={discPct} onChange={e => setDiscPct(e.target.value)} placeholder="0%" type="number" min="0" max={settings.max_discount_percent}
                                    className="h-8 w-20 px-2.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground" />
                                {[5, 10, 20].filter(v => v <= (settings.max_discount_percent ?? 100)).map(v => (
                                    <button key={v} type="button" onClick={() => setDiscPct(String(v))}
                                        className={cn("h-8 px-2.5 rounded-lg border text-xs font-semibold transition-all", disc === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40")}>
                                        {v}%
                                    </button>
                                ))}
                                {disc > 0 && <button type="button" onClick={() => setDiscPct("")} className="h-8 px-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted">Clear</button>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Confirm Action Button */}
                <div className="px-4 pb-5 pt-3 border-t border-border shrink-0 bg-muted/10">
                    {serverError && (
                        <div className="mb-3 flex items-start gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{serverError}</span>
                        </div>
                    )}

                    {needsRegisteredCustomer && !customerId && (
                        <p className="text-xs text-destructive mb-2 font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />Please select a registered customer to record credit ledger.
                        </p>
                    )}

                    <Button className="w-full h-12 text-base font-black tracking-tight gap-2 shadow-md" disabled={!canPay || loading}
                        onClick={() => onConfirm({
                            payment_method:   method,
                            payment_amount:   isCash ? tenderN : (isCredit ? 0 : (isMixed ? tenderN : total)),
                            customer_name:    customer,
                            customer_id:      customerId ? Number(customerId) : null,
                            due_date:         dueDate || null,
                            credit_notes:     creditNotes || null,
                            discount_percent: disc,
                            promo_id:         appliedPromo?.id ?? null,
                        })}>
                        {loading ? (
                            <span className="h-5 w-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                        ) : isCredit ? (
                            <><Wallet className="h-4 w-4" />Charge {fmtMoney(total, currency)} to Customer Account</>
                        ) : isMixed ? (
                            <><Banknote className="h-4 w-4" />Collect {fmtMoney(tenderN, currency)} & Credit {fmtMoney(creditBalance, currency)}</>
                        ) : (
                            <><Zap className="h-4 w-4" />Complete Sale · {fmtMoney(total, currency)}</>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── SaleSuccessModal ─────────────────────────────────────────────────────────
function SaleSuccessModal({ receipt, currency, onNewSale }: {
    receipt: ReceiptData; currency: string;
    onNewSale: () => void;
}) {
    const isCredit = receipt.payment_method === "credit" || receipt.payment_method === "mixed";
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0 bg-muted/20">
                    <div className={cn("p-2 rounded-full", isCredit ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300" : "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400")}>
                        {isCredit ? <Wallet className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                    </div>
                    <div>
                        <p className="font-black text-foreground text-base">
                            {isCredit ? "Customer Credit Recorded" : "Transaction Completed"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono font-semibold">{receipt.receipt_number}</p>
                    </div>
                </div>

                {/* Credit Summary Card */}
                {isCredit && (
                    <div className="mx-4 mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-xs">
                        <div className="flex justify-between font-bold text-amber-800 dark:text-amber-300">
                            <span>Customer: {receipt.customer_name}</span>
                            <span className="uppercase">{receipt.payment_status}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Amount Paid Now:</span>
                            <span className="font-semibold text-foreground">{fmtMoney(receipt.amount_paid ?? 0, currency)}</span>
                        </div>
                        <div className="flex justify-between font-black text-sm text-amber-700 dark:text-amber-400 pt-1 border-t border-amber-500/20">
                            <span>Balance Due (Utang):</span>
                            <span>{fmtMoney(receipt.balance_due ?? 0, currency)}</span>
                        </div>
                        {receipt.due_date && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Due Date: {receipt.due_date}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4">
                    <ReceiptTemplate sale={receipt} currency={currency} showActions={true} />
                </div>
                <div className="px-4 pb-5 pt-3 border-t border-border shrink-0">
                    <Button className="w-full h-11 font-black gap-2 shadow-md" onClick={onNewSale}>
                        <ShoppingCart className="h-4 w-4" />New Transaction [Enter]
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── VoidCartModal ────────────────────────────────────────────────────────────
function VoidCartModal({ cart, subtotal, itemCount, currency, onConfirm, onClose }: {
    cart: CartItem[];
    subtotal: number;
    itemCount: number;
    currency: string;
    onConfirm: () => void;
    onClose: () => void;
}) {
    // Keyboard listener: Escape to cancel, Enter to confirm void
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            } else if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                onConfirm();
            }
        };
        window.addEventListener("keydown", handleKeyDown, { capture: true });
        return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
    }, [onClose, onConfirm]);

    const uniqueCount = cart.length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground text-base tracking-tight">Void Active Transaction</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Clear all items in current register sale</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Cancel (Esc)"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4">
                    {/* Cart Summary Card */}
                    <div className="bg-muted/40 border border-border rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Items</span>
                            <span className="text-xs font-bold text-foreground bg-background px-2 py-0.5 rounded-md border border-border">
                                {uniqueCount} item{uniqueCount > 1 ? "s" : ""} ({itemCount} pcs)
                            </span>
                        </div>

                        {/* Item preview list */}
                        <div className="max-h-36 overflow-y-auto divide-y divide-border/50 rounded-lg bg-background/50 border border-border/60 px-3">
                            {cart.map(item => (
                                <div key={item.key} className="flex items-center justify-between py-2 text-xs">
                                    <div className="min-w-0 flex-1 pr-3">
                                        <p className="font-semibold text-foreground truncate">{item.name}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {item.qty} {item.unit} × {fmtMoney(item.price, currency)}
                                            {item.variant_name ? ` · ${item.variant_name}` : ""}
                                        </p>
                                    </div>
                                    <span className="font-mono font-bold text-foreground shrink-0">
                                        {fmtMoney(item.price * item.qty, currency)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Total Due Row */}
                        <div className="flex items-center justify-between pt-1 border-t border-border/80">
                            <span className="text-xs font-bold text-foreground">Transaction Total</span>
                            <span className="text-base font-black font-mono text-destructive">
                                {fmtMoney(subtotal, currency)}
                            </span>
                        </div>
                    </div>

                    {/* Warning Callout */}
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div>
                            <span className="font-bold">Are you sure?</span> This will clear all scanned products from the register and reset the active cart. This action cannot be undone.
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-t border-border shrink-0 bg-muted/10">
                    <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-10 font-semibold text-xs gap-1.5 cursor-pointer"
                        onClick={onClose}
                    >
                        <span>Keep Transaction</span>
                        <kbd className="hidden sm:inline text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded border border-border">Esc</kbd>
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        className="flex-1 h-10 font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
                        onClick={onConfirm}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Yes, Void Transaction</span>
                        <kbd className="hidden sm:inline text-[10px] text-destructive-foreground/80 font-mono bg-destructive-foreground/20 px-1.5 py-0.5 rounded">Enter</kbd>
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── SimSoft Cashier Table View (Fast Cashiering Mode) ────────────────────────
function SimSoftCashierTable({
    cart, currency, onUpdateQty, onSetExactQty, onOpenCalc, onRemove, onClear, onCharge, onCustomerCredit,
    lastScanned,
}: {
    cart: CartItem[];
    currency: string;
    onUpdateQty: (key: string, delta: number) => void;
    onSetExactQty: (key: string, qty: number) => void;
    onOpenCalc?: (item: CartItem) => void;
    onRemove: (key: string) => void;
    onClear: () => void;
    onCharge: () => void;
    onCustomerCredit: () => void;
    lastScanned: { name: string; qty: number; unit: string; price: number; total: number; targetAmount?: number } | null;
}) {
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const totalQty = cart.reduce((s, i) => s + i.qty, 0);

    return (
        <div className="flex flex-col h-full bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
            {/* ── SimSoft Digital LED Total Board ───────────────────────────── */}
            <div className="shrink-0 bg-slate-950 text-white px-4 py-3 border-b border-slate-800 shadow-inner flex flex-row items-center justify-between gap-3 select-none">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                            SimSoft Register Display
                        </span>
                    </div>
                    <div className="text-4xl lg:text-5xl font-black font-mono tracking-tight text-white mt-0.5 truncate">
                        {fmtMoney(subtotal, currency)}
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-right shrink-0">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Total Items / Weight</div>
                        <div className="text-lg font-black font-mono text-emerald-300 whitespace-nowrap">
                            {cart.length} lines · {fmtQty(totalQty)} units
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button onClick={onCharge} disabled={cart.length === 0}
                            className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm tracking-wide gap-2 shadow-lg whitespace-nowrap">
                            <Zap className="h-4 w-4" /> Tender [F9]
                        </Button>
                    </div>
                </div>
            </div>

            {/* Last Scanned Item Banner */}
            {lastScanned && (
                <div className="shrink-0 bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                    <span className="flex items-center gap-1.5 font-bold">
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Last scanned: {lastScanned.name}
                        {lastScanned.targetAmount && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded font-bold ml-1 border border-amber-500/30">
                                Auto-detected from ₱{lastScanned.targetAmount.toFixed(2)}
                            </span>
                        )}
                    </span>
                    <span className="font-mono">
                        {fmtQty(lastScanned.qty)} {lastScanned.unit} @ {fmtMoney(lastScanned.price, currency)} = <strong>{fmtMoney(lastScanned.total, currency)}</strong>
                    </span>
                </div>
            )}

            {/* ── Transaction Table ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground gap-3">
                        <Scale className="h-14 w-14 opacity-20 text-primary" />
                        <div>
                            <p className="text-base font-bold text-foreground">Transaction Register Ready</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                Scan barcodes or enter multiplier <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono font-bold">1.4*BARCODE</code> or amount <code className="bg-muted px-1.5 py-0.5 rounded text-amber-600 font-mono font-bold">50p*BARCODE</code> for weighted Rice & Feeds.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[11px] bg-muted/60 px-2 py-1 rounded-md font-mono">F1 Scan</span>
                            <span className="text-[11px] bg-muted/60 px-2 py-1 rounded-md font-mono">F3 Credit</span>
                            <span className="text-[11px] bg-muted/60 px-2 py-1 rounded-md font-mono">F4 Visual</span>
                            <span className="text-[11px] bg-muted/60 px-2 py-1 rounded-md font-mono">F9 Pay</span>
                        </div>
                    </div>
                ) : (
                    <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-xs text-muted-foreground uppercase text-[10px] font-bold tracking-wider border-b border-border z-10">
                            <tr>
                                <th className="py-2.5 px-3 w-10 text-center">#</th>
                                <th className="py-2.5 px-3 min-w-[180px]">Item Description</th>
                                <th className="py-2.5 px-3 w-20 text-center">Unit</th>
                                <th className="py-2.5 px-3 w-24 text-right">Price</th>
                                <th className="py-2.5 px-3 w-56 text-center whitespace-nowrap">Quantity & Presyo</th>
                                <th className="py-2.5 px-3 w-28 text-right">Total</th>
                                <th className="py-2.5 px-3 w-12 text-center">Del</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                            {cart.map((item, idx) => {
                                const rawUnit = item.unit || '';
                                const isKg = isWeightedKgItem(rawUnit, item.name);
                                const unit = rawUnit || (isKg ? 'kg' : 'pc');
                                return (
                                    <tr key={item.key} className="hover:bg-muted/40 transition-colors group">
                                        <td className="py-2.5 px-3 text-center font-mono text-muted-foreground font-semibold">
                                            {idx + 1}
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <div className="flex items-center gap-2.5">
                                                <ProductThumbnail
                                                    src={item.product_img}
                                                    name={item.name}
                                                    unit={item.unit}
                                                    className="h-8 w-8 rounded-lg shrink-0 border border-border"
                                                    padding="p-0.5"
                                                    aspect="aspect-square"
                                                />
                                                <div className="min-w-0">
                                                    <p className="font-bold text-sm text-foreground leading-snug truncate">
                                                        {item.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-mono">
                                                        {item.barcode && <span>{item.barcode}</span>}
                                                        {item.variant_name && <span className="text-primary font-semibold">[{item.variant_name}]</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                            <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                                                isKg ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                                    : unit === 'sack' || unit === 'bag' ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                                    : "bg-muted text-muted-foreground")}>
                                                {unit.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                                            {fmtMoney(item.price, currency)}
                                        </td>
                                        <td className="py-2.5 px-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => onUpdateQty(item.key, isKg ? -0.25 : -1)}
                                                    title={isKg ? "-0.25 kg" : "-1"}
                                                    className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center font-bold">
                                                    <Minus className="h-3 w-3" />
                                                </button>

                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0.001"
                                                    value={item.qty}
                                                    onChange={e => onSetExactQty(item.key, parseFloat(e.target.value) || 0)}
                                                    className="w-16 h-7 text-center font-mono font-black text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                                                />

                                                <button onClick={() => onUpdateQty(item.key, isKg ? 0.25 : 1)}
                                                    title={isKg ? "+0.25 kg" : "+1"}
                                                    className="h-7 w-7 rounded-lg border border-border bg-background hover:bg-muted flex items-center justify-center font-bold">
                                                    <Plus className="h-3 w-3" />
                                                </button>

                                                {onOpenCalc && isKg && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenCalc(item)}
                                                        title="Timbang & Presyo Calculator (₱ / kg)"
                                                        className="h-7 px-2 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 font-bold text-xs shadow-xs"
                                                    >
                                                        <Calculator className="h-3.5 w-3.5" />
                                                        <span>Calc</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-primary">
                                            {fmtMoney(item.price * item.qty, currency)}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                            <button onClick={() => onRemove(item.key)}
                                                className="h-7 w-7 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Table Footer & Fast Action Bar ─────────────────────────────── */}
            <div className="shrink-0 border-t border-border bg-muted/20 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    {cart.length > 0 && (
                        <button onClick={onClear}
                            className="h-9 px-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold transition-colors flex items-center gap-1.5">
                            <Trash2 className="h-3.5 w-3.5" /> Clear All [F8]
                        </button>
                    )}
                    <button onClick={onCustomerCredit} disabled={cart.length === 0}
                        className="h-9 px-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-30">
                        <Wallet className="h-3.5 w-3.5" /> Credit / Utang [F3]
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Subtotal</span>
                        <span className="text-xl font-black font-mono text-foreground">{fmtMoney(subtotal, currency)}</span>
                    </div>

                    <Button onClick={onCharge} disabled={cart.length === 0}
                        className="h-10 px-5 text-sm font-black gap-2 shadow-sm">
                        <Zap className="h-4 w-4" /> Charge [F9]
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Standard Cart Panel (Used in Visual Grid Mode) ───────────────────────────
function CartPanel({ cart, subtotal, itemCount, currency, error, onUpdateQty, onSetExactQty, onOpenCalc, onRemove, onClear, onCharge }: {
    cart: CartItem[]; subtotal: number; itemCount: number; currency: string;
    error: string | null; onUpdateQty: (key: string, d: number) => void;
    onSetExactQty: (key: string, qty: number) => void;
    onOpenCalc?: (item: CartItem) => void;
    onRemove: (key: string) => void; onClear: () => void; onCharge: () => void;
}) {
    return (
        <div className="flex flex-col bg-card h-full">
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">Active Cart</span>
                    {itemCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                            {fmtQty(itemCount)}
                        </span>
                    )}
                </div>
                {cart.length > 0 && (
                    <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1 font-medium">
                        <Trash2 className="h-3 w-3" />Clear
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground px-4 text-center">
                        <ShoppingCart className="h-10 w-10 opacity-15" />
                        <div>
                            <p className="text-sm font-bold text-foreground">Cart is empty</p>
                            <p className="text-xs opacity-60 mt-1">Select a product or scan barcode<br />Press F9 to tender</p>
                        </div>
                    </div>
                ) : (
                    <div className="px-3 py-2 divide-y divide-border/50">
                        {cart.map(item => {
                            const rawUnit = item.unit || '';
                            const isKg = isWeightedKgItem(rawUnit, item.name);
                            const unit = rawUnit || (isKg ? 'kg' : 'pc');
                            return (
                                <div key={item.key} className="group py-2.5 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-foreground leading-snug break-words">{item.name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.2 rounded",
                                                    isKg ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                                                    {unit.toUpperCase()}
                                                </span>
                                                <span className="text-xs font-bold text-primary tabular-nums">
                                                    {fmtMoney(item.price, currency)}/{unit}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => onRemove(item.key)}
                                            className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* Quantity editor row */}
                                    <div className="flex flex-col gap-1 pt-0.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => onUpdateQty(item.key, isKg ? -0.25 : -1)}
                                                    title={isKg ? "-0.25 kg" : "-1"}
                                                    className="h-6 w-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted font-bold">
                                                    <Minus className="h-2.5 w-2.5" />
                                                </button>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0.001"
                                                    value={item.qty}
                                                    onChange={e => onSetExactQty(item.key, parseFloat(e.target.value) || 0)}
                                                    className="w-14 h-6 text-center text-xs font-mono font-bold bg-background border border-border rounded-md"
                                                />
                                                <button onClick={() => onUpdateQty(item.key, isKg ? 0.25 : 1)}
                                                    title={isKg ? "+0.25 kg" : "+1"}
                                                    className="h-6 w-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted font-bold">
                                                    <Plus className="h-2.5 w-2.5" />
                                                </button>

                                                {onOpenCalc && isKg && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenCalc(item)}
                                                        title="Timbang & Presyo Calculator (₱ / kg)"
                                                        className="h-6 px-1.5 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-0.5 text-[9px] font-bold"
                                                    >
                                                        <Calculator className="h-2.5 w-2.5" />
                                                    </button>
                                                )}
                                            </div>

                                            <span className="text-xs font-black font-mono tabular-nums text-foreground">
                                                {fmtMoney(item.price * item.qty, currency)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {cart.length > 0 && (
                <div className="shrink-0 border-t border-border p-4 space-y-3 bg-muted/10">
                    <div className="flex items-end justify-between">
                        <span className="text-xs text-muted-foreground">{fmtQty(itemCount)} unit(s)</span>
                        <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Subtotal</p>
                            <p className="text-2xl font-black font-mono tabular-nums text-foreground">{fmtMoney(subtotal, currency)}</p>
                        </div>
                    </div>
                    <Button className="w-full h-12 text-base font-black gap-2 shadow-sm" onClick={onCharge}>
                        <Zap className="h-4 w-4" />Charge [F9]
                    </Button>
                    {error && (
                        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main POS Component ───────────────────────────────────────────────────────
export default function PosIndex() {
    const { props }   = usePage<PageProps>();
    const { products, customers = [], categories, session, branch, settings, app } = props;
    const promos      = (props.promos as ActivePromo[]) ?? [];
    const user        = props.auth?.user;
    const currency    = app?.currency ?? "₱";
    const layout      = (props.preferred_layout ?? "grid") as LayoutMode;

    const [cart,               setCart]               = useState<CartItem[]>([]);
    const [search,             setSearch]             = useState("");
    const [activeCat,          setActiveCat]          = useState<number | null>(null);
    const [showPayment,        setShowPayment]        = useState(false);
    const [paymentMethodPreset,setPaymentMethodPreset]= useState<PayMethod>("cash");
    const [receipt,            setReceipt]            = useState<ReceiptData | null>(null);
    const [fastMode,           setFastMode]           = useState(true); // Default to SimSoft Fast Cashiering table!
    const [loading,            setLoading]            = useState(false);
    const [error,              setError]              = useState<string | null>(null);
    const [variantFor,         setVariantFor]         = useState<Product | null>(null);
    const [lastScanned,        setLastScanned]        = useState<{ name: string; qty: number; unit: string; price: number; total: number; targetAmount?: number } | null>(null);
    const [calcItem,           setCalcItem]           = useState<CartItem | null>(null);
    const [showVoidConfirm,    setShowVoidConfirm]    = useState(false);

    const visualLayout = layout === "grocery" ? "grid" : layout;
    const searchRef = useRef<HTMLInputElement>(null);

    // Auto-focus barcode scanner on mount
    useEffect(() => { searchRef.current?.focus(); }, []);

    const refocus = useCallback((delay = 0) => {
        setTimeout(() => searchRef.current?.focus(), delay);
    }, []);

    const filtered = useMemo(() => {
        let list = products.filter(p => p.product_type !== 'ingredient');
        if (activeCat) list = list.filter(p => p.category?.id === activeCat);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q));
        }
        return list;
    }, [products, activeCat, search]);

    const quickPickProducts = useMemo(() => {
        let list = products.filter(p => p.product_type !== 'ingredient');
        if (activeCat) {
            list = list.filter(p => p.category?.id === activeCat);
        } else if (search.trim() && filtered.length > 0) {
            return filtered;
        }
        return list;
    }, [products, activeCat, search, filtered]);

    const subtotal  = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
    const itemCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

    const laundryMode = settings?.laundry_mode ?? "auto";
    const isLaundryMode = laundryMode === "enabled" || (laundryMode === "auto" && branch?.business_type === "laundry");
    const requireCustomerName = !!settings?.require_customer_name || branch?.business_type === "salon" || isLaundryMode;

    // Helper to parse multiplier or peso amount:
    // "1.4*4806511010012" -> qty: 1.4, term: "4806511010012"
    // "50p*4806511010012" -> targetAmount: 50, term: "4806511010012" (Auto-detects kg from ₱50)
    // "p50*DINORADO"      -> targetAmount: 50, term: "DINORADO"
    // "500g*4806511010012"-> qty: 0.5, term: "4806511010012"
    const parseBarcodeMultiplier = (input: string): { qty: number; targetAmount?: number; term: string } => {
        let trimmed = input.trim();
        // If QR code scanned was a URL (e.g. http://localhost:8000/products/76 or .../15545992), extract last segment
        if (trimmed.includes("http://") || trimmed.includes("https://")) {
            const urlParts = trimmed.split("/").filter(Boolean);
            trimmed = urlParts[urlParts.length - 1] || trimmed;
        }

        if (trimmed.includes("*")) {
            const parts = trimmed.split("*");
            const prefix = parts[0].trim().toLowerCase();
            const term = parts.slice(1).join("*").trim();

            // Check for peso amount prefix: "50p", "p50", "₱50", "50php"
            if (prefix.startsWith("p") || prefix.startsWith("₱") || prefix.endsWith("p") || prefix.endsWith("php")) {
                const cleanAmt = parseFloat(prefix.replace(/[p₱php]/gi, ""));
                if (!isNaN(cleanAmt) && cleanAmt > 0) {
                    return { qty: 1, targetAmount: cleanAmt, term };
                }
            }

            // Check for grams prefix: "500g", "250g"
            if (prefix.endsWith("g") && !prefix.endsWith("kg")) {
                const grams = parseFloat(prefix.replace(/g/gi, ""));
                if (!isNaN(grams) && grams > 0) {
                    return { qty: Math.round((grams / 1000) * 1000) / 1000, term };
                }
            }

            // Weight prefix: e.g. "1.4", "1.5k", "0.75"
            const cleanWeight = parseFloat(prefix.replace(/k|kg/gi, ""));
            return {
                qty: !isNaN(cleanWeight) && cleanWeight > 0 ? cleanWeight : 1,
                term,
            };
        }

        // Space separated syntax: e.g. "50p dinorado", "p50 feeds", "1.5k dinorado"
        const spaceMatch = trimmed.match(/^([p₱]?\d+(\.\d+)?[p]?|(\d+(\.\d+)?)k?g?)\s+(.+)$/i);
        if (spaceMatch) {
            const prefix = spaceMatch[1].toLowerCase();
            const term = spaceMatch[5].trim();

            if (prefix.startsWith("p") || prefix.startsWith("₱") || prefix.endsWith("p")) {
                const cleanAmt = parseFloat(prefix.replace(/[p₱]/gi, ""));
                if (!isNaN(cleanAmt) && cleanAmt > 0) {
                    return { qty: 1, targetAmount: cleanAmt, term };
                }
            }

            if (prefix.endsWith("g") && !prefix.endsWith("kg")) {
                const grams = parseFloat(prefix.replace(/g/gi, ""));
                if (!isNaN(grams) && grams > 0) {
                    return { qty: Math.round((grams / 1000) * 1000) / 1000, term };
                }
            }

            const cleanWeight = parseFloat(prefix.replace(/k|kg/gi, ""));
            if (!isNaN(cleanWeight) && cleanWeight > 0 && (prefix.includes(".") || prefix.includes("k"))) {
                return { qty: cleanWeight, term };
            }
        }

        return { qty: 1, term: trimmed };
    };

    // Add item with fractional quantity support (e.g. 1.4 kg Rice, 0.5 kg Feeds, or auto-calculated from ₱50)
    const addItem = useCallback((
        product: Product,
        qtyToAdd: number = 1,
        variantId: number | null = null,
        variantName: string | null = null,
        targetAmount: number | null = null
    ) => {
        const selectedVariant = variantId ? product.variants.find(v => v.id === variantId) : null;
        const extra     = selectedVariant?.extra_price ?? 0;
        const price     = product.price + extra;
        const key       = `${product.id}-${variantId ?? "base"}`;
        const rawStock  = selectedVariant?.stock ?? product.stock;
        const stockLim  = (product.product_type === 'bundle' || product.product_type === 'made_to_order') ? 999999 : (rawStock > 0 ? rawStock : 999999);
        const isKg      = isWeightedKgItem(product.unit, product.name);
        const unit      = product.unit || (isKg ? 'kg' : 'pc');

        setCart(prev => {
            const ex = prev.find(i => i.key === key);
            if (ex) {
                const nextQty = Math.round((ex.qty + qtyToAdd) * 1000) / 1000;
                return prev.map(i => i.key === key ? { ...i, qty: nextQty } : i);
            }
            const initialQty = Math.max(0.001, qtyToAdd);
            return [...prev, {
                key,
                product_id: product.id,
                variant_id: variantId,
                name: product.name,
                unit,
                barcode: product.barcode,
                product_img: getProductImage(product),
                variant_name: variantName,
                price,
                qty: initialQty,
                stock: stockLim,
                product_type: product.product_type,
                bundle_items: product.bundle_items ?? null,
                recipe_items: product.recipe_items ?? null,
            }];
        });

        setLastScanned({
            name: product.name,
            qty: qtyToAdd,
            unit,
            price,
            total: price * qtyToAdd,
            targetAmount: targetAmount ?? undefined,
        });
    }, []);

    const handleProductClick = useCallback((p: Product, qty: number = 1, targetAmount: number | null = null) => {
        if (p.has_variants && p.variants.filter(v => v.is_available).length > 0) {
            setVariantFor(p);
            return;
        }

        // If targetAmount is provided (e.g. ₱50), compute exact kg from product price
        let effectiveQty = qty;
        if (targetAmount && targetAmount > 0 && p.price > 0) {
            effectiveQty = Math.round((targetAmount / p.price) * 1000) / 1000;
        }

        addItem(p, effectiveQty, null, null, targetAmount);
        setSearch("");
        refocus();
    }, [addItem, refocus]);

    // Enter key: Exact barcode or product ID or name or multiplier
    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const parsed = parseBarcodeMultiplier(search);
        if (!parsed.term) return;

        const term = parsed.term.trim().toLowerCase();

        const executeMatch = (matchedProduct: Product) => {
            setError(null);
            const finalQty = parsed.targetAmount && matchedProduct.price > 0
                ? Math.round((parsed.targetAmount / matchedProduct.price) * 1000) / 1000
                : parsed.qty;
            handleProductClick(matchedProduct, finalQty, parsed.targetAmount ?? null);
            setSearch("");
        };

        // Priority 1: Exact barcode (case-insensitive)
        const byBarcode = products.find(p => (p.barcode ?? "").trim().toLowerCase() === term);
        if (byBarcode) { executeMatch(byBarcode); return; }

        // Priority 2: Product ID
        const byId = products.find(p => String(p.id) === term);
        if (byId) { executeMatch(byId); return; }

        // Priority 3: Exact name match
        const byName = products.find(p => p.name.trim().toLowerCase() === term);
        if (byName) { executeMatch(byName); return; }

        // Priority 4: Only 1 matching filtered item
        const matches = products.filter(p => 
            p.name.toLowerCase().includes(term) || 
            (p.barcode ?? "").toLowerCase().includes(term)
        );
        if (matches.length === 1) {
            executeMatch(matches[0]);
            return;
        }

        if (matches.length === 0) {
            setError(`Barcode or product "${parsed.term}" not found.`);
        }
    }, [search, products, handleProductClick]);

    const updateQty = (key: string, delta: number) => {
        setCart(prev => prev.flatMap(i => {
            if (i.key !== key) return [i];
            const nq = Math.round((i.qty + delta) * 1000) / 1000;
            if (nq <= 0) return [];
            return [{ ...i, qty: nq }];
        }));
    };

    const setExactQty = (key: string, newQty: number) => {
        setCart(prev => prev.flatMap(i => {
            if (i.key !== key) return [i];
            if (newQty <= 0) return [];
            const safeQty = Math.round(newQty * 1000) / 1000;
            return [{ ...i, qty: safeQty }];
        }));
    };

    const removeItem = (key: string) => setCart(prev => prev.filter(i => i.key !== key));
    const clearCart  = () => {
        if (cart.length === 0) return;
        setShowVoidConfirm(true);
    };

    const confirmVoidCart = () => {
        setCart([]);
        setLastScanned(null);
        setShowVoidConfirm(false);
        refocus();
    };

    // Checkout Confirmation
    const handleConfirm = (payData: {
        payment_method: PayMethod; payment_amount: number; customer_name: string;
        customer_id: number | null; due_date?: string | null; credit_notes?: string | null;
        discount_percent: number; promo_id: number | null;
    }) => {
        if (!cart.length) return;
        setLoading(true); setError(null);
        router.post(routes.pos.store(), {
            items:            cart.map(i => ({ id: i.product_id, qty: i.qty, variant_id: i.variant_id })),
            payment_method:   payData.payment_method,
            payment_amount:   payData.payment_amount,
            customer_name:    payData.customer_name || null,
            customer_id:      payData.customer_id,
            due_date:         payData.due_date ?? null,
            credit_notes:     payData.credit_notes ?? null,
            discount_percent: payData.discount_percent,
            promo_id:         payData.promo_id ?? null,
            cash_session_id:  session?.id ?? null,
        }, {
            preserveScroll: true,
            onSuccess: page => {
                const flash = (page.props as any).flash ?? {};
                if (!flash.pos_result) {
                    setError(flash.errors?.error ?? "Checkout failed — please verify customer or items.");
                    setLoading(false);
                    return;
                }
                const r    = flash.pos_result;
                const disc = r.discount_amount ?? 0;
                const pd   = r.promo_discount   ?? 0;
                setReceipt({
                    receipt_number:  r.receipt_number ?? "—",
                    status:          "completed",
                    payment_method:  payData.payment_method,
                    payment_amount:  payData.payment_amount,
                    amount_paid:     r.amount_paid ?? payData.payment_amount,
                    balance_due:     r.balance_due ?? 0,
                    payment_status:  r.payment_status ?? "paid",
                    due_date:        r.due_date ?? payData.due_date ?? null,
                    change_amount:   r.change ?? 0,
                    discount_amount: disc + pd,
                    total:           r.total,
                    customer_name:   r.customer_name ?? (payData.customer_name || null),
                    notes: [
                        payData.discount_percent > 0 ? `Discount ${payData.discount_percent}%` : null,
                        r.promo_name ? `Promo: ${r.promo_name}` : null,
                        r.service_charge_amount > 0 ? `Service charge ${fmtMoney(r.service_charge_amount, currency)}` : null,
                    ].filter(Boolean).join(' | ') || null,
                    created_at:      new Date().toISOString(),
                    cashier:         user ? `${user.fname} ${user.lname}` : "—",
                    branch_name:     branch?.name,
                    table_label:     null,
                    business_type:   branch?.business_type,
                    items:           cart.map(i => ({
                        product_name: i.name,
                        variant_name: i.variant_name,
                        quantity: i.qty,
                        price: i.price,
                        unit: i.unit,
                        total: i.price * i.qty,
                    })),
                });
                setShowPayment(false);
                setCart([]);
                setLastScanned(null);
                setLoading(false);
            },
            onError: errors => {
                setError(Object.values(errors)[0] as string ?? "Transaction failed.");
                setLoading(false);
            },
        });
    };

    // Global Hardware Scanner Listener: Catches barcode & QR scanner bursts even if search input lost focus
    const scannerBufferRef = useRef<string>("");
    const lastKeyTimeRef = useRef<number>(0);

    useEffect(() => {
        const handleGlobalScan = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            if (["F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12","Tab","Escape"].includes(e.key)) return;

            const now = Date.now();
            const diff = now - lastKeyTimeRef.current;
            lastKeyTimeRef.current = now;

            const activeTag = document.activeElement?.tagName?.toLowerCase();
            const isInsideInput = activeTag === "input" || activeTag === "textarea" || activeTag === "select";

            // If user is already focused inside an input (like search input), let the input handle it
            if (isInsideInput) {
                scannerBufferRef.current = "";
                return;
            }

            if (e.key === "Enter") {
                const scannedBuffer = scannerBufferRef.current.trim();
                scannerBufferRef.current = "";

                if (scannedBuffer.length >= 2) {
                    const parsed = parseBarcodeMultiplier(scannedBuffer);
                    const term = parsed.term.trim().toLowerCase();
                    const matched = products.find(p => 
                        (p.barcode ?? "").trim().toLowerCase() === term ||
                        String(p.id) === term
                    );
                    if (matched) {
                        e.preventDefault();
                        e.stopPropagation();
                        const finalQty = parsed.targetAmount && matched.price > 0
                            ? Math.round((parsed.targetAmount / matched.price) * 1000) / 1000
                            : parsed.qty;
                        handleProductClick(matched, finalQty, parsed.targetAmount ?? null);
                        setSearch("");
                        refocus();
                        return;
                    }
                }
            } else if (e.key.length === 1) {
                // If keys arrive in fast sequence (<100ms), it's a scanner typing burst
                if (diff > 100) {
                    scannerBufferRef.current = e.key;
                } else {
                    scannerBufferRef.current += e.key;
                }
            }
        };

        window.addEventListener("keydown", handleGlobalScan);
        return () => window.removeEventListener("keydown", handleGlobalScan);
    }, [products, handleProductClick, refocus]);

    // Hotkey bindings: F1/F2 (Scan), F3 (Credit), F4 (Toggle Mode), F8 (Void), F9 (Tender), Esc (Close)
    useEffect(() => {
        const fn = (e: KeyboardEvent) => {
            // Function keys intercept: prevent browser default actions in CAPTURE phase!
            if (["F1", "F2", "F3", "F4", "F8", "F9"].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
            }

            if (e.key === "F1" || e.key === "F2") {
                searchRef.current?.focus();
                searchRef.current?.select();
            } else if (e.key === "F3") {
                if (cart.length > 0) {
                    setError(null);
                    setPaymentMethodPreset("credit");
                    setShowPayment(true);
                } else {
                    searchRef.current?.focus();
                }
            } else if (e.key === "F4") {
                setFastMode(v => !v);
            } else if (e.key === "F8") {
                if (cart.length > 0) {
                    clearCart();
                }
            } else if (e.key === "F9") {
                if (cart.length > 0) {
                    setError(null);
                    setPaymentMethodPreset("cash");
                    setShowPayment(true);
                }
            } else if (e.key === "Escape") {
                setShowPayment(false);
                setShowVoidConfirm(false);
                setVariantFor(null);
                setCalcItem(null);
                setSearch("");
                refocus();
            }
        };

        window.addEventListener("keydown", fn, { capture: true });
        return () => window.removeEventListener("keydown", fn, { capture: true });
    }, [cart, clearCart, refocus]);

    // Combined search input
    const searchInput = (
        <div className="relative flex-1 max-w-sm sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
                ref={searchRef}
                value={search}
                onChange={e => { setError(null); setSearch(e.target.value); }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Scan or type 1.4*BARCODE… (F1/F2)"
                className="w-full h-9 pl-9 pr-8 text-xs sm:text-sm font-mono bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground placeholder:font-sans"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-gramm="false"
            />
            {search ? (
                <button onClick={() => { setSearch(""); refocus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                </button>
            ) : (
                <ScanLine className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
            )}
        </div>
    );

    const sessionRequired = settings?.require_cash_session ?? false;
    const noSessionOverlay = null;

    // ── Kiosk Layout ─────────────────────────────────────────────────────────
    if (layout === "kiosk") {
        return (
            <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground relative">
                <div className="shrink-0 flex items-center gap-3 bg-primary px-5 py-3.5">
                    <span className="font-black text-primary-foreground text-xl tracking-tight shrink-0">
                        {branch?.name ?? "POS"}
                    </span>
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={e => { setError(null); setSearch(e.target.value); }}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Search or scan… (F1)"
                            className="w-full h-10 pl-9 pr-8 text-sm bg-white dark:bg-background border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-muted-foreground shadow-sm"
                        />
                    </div>
                    <CategoryDropdown categories={categories} activeCat={activeCat} onChange={setActiveCat} />
                    <button onClick={() => window.location.reload()}
                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-primary-foreground transition-colors shrink-0">
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                    <Suspense fallback={<LayoutSpinner />}>
                        <KioskLayout filtered={filtered} cart={cart} currency={currency} onProductClick={handleProductClick}
                            onCharge={() => { setError(null); setShowPayment(true); }}
                            subtotal={subtotal} itemCount={itemCount} onClear={clearCart} />
                    </Suspense>
                </div>

                {variantFor && (
                    <VariantPicker product={variantFor} currency={currency}
                        onSelect={(vid, vname) => { addItem(variantFor, 1, vid, vname); setVariantFor(null); refocus(50); }}
                        onClose={() => { setVariantFor(null); refocus(50); }} />
                )}
                {showPayment && (
                    <PaymentModal subtotal={subtotal} settings={settings} currency={currency} customers={customers}
                        customerNameRequired={requireCustomerName} promos={promos} cart={cart}
                        onConfirm={handleConfirm}
                        onClose={() => { setShowPayment(false); setError(null); refocus(50); }}
                        loading={loading} serverError={error} initialMethod={paymentMethodPreset} />
                )}
                {receipt && <SaleSuccessModal receipt={receipt} currency={currency} onNewSale={() => { setReceipt(null); refocus(100); }} />}
            </div>
        );
    }

    // ── Standard & SimSoft Fast Cashier POS Layout ─────────────────────────────
    return (
        <AdminLayout defaultSidebarOpen={false}>
            <div className="relative flex flex-col overflow-hidden h-[calc(100vh-4rem)] min-w-[850px] w-full">
                {/* ── Top Bar ─────────────────────────────────────────────── */}
                <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border bg-card whitespace-nowrap overflow-x-auto">
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0",
                        session ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", session ? "bg-green-500" : "bg-emerald-500")} />
                        <span>{session ? "Register Open" : "Register Ready"}</span>
                    </div>

                    <span className="text-sm font-black text-foreground block truncate max-w-[150px] shrink-0">
                        {branch?.name ?? "Retail POS"}
                    </span>

                    {/* Combined Search & Barcode Input */}
                    {searchInput}

                    {/* Category Filter */}
                    <CategoryDropdown categories={categories} activeCat={activeCat} onChange={setActiveCat} />

                    <div className="flex-1 min-w-[8px]" />

                    {/* SimSoft Fast Mode vs Visual Toggle */}
                    <button onClick={() => setFastMode(v => !v)}
                        className={cn("flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-bold transition-all shadow-xs shrink-0 whitespace-nowrap",
                            fastMode
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-foreground hover:bg-muted")}
                        title="Toggle Fast Cashiering Mode (F4)">
                        {fastMode ? <Rows3 className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                        <span className="inline">{fastMode ? "Fast Cashiering" : "Visual Catalog"}</span>
                        <span className="text-[10px] opacity-70 ml-1 font-mono">F4</span>
                    </button>

                    <a href={routes.sales.history()}
                        className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 whitespace-nowrap">
                        <History className="h-3.5 w-3.5" /><span className="inline">History</span>
                    </a>

                    <button onClick={() => window.location.reload()}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* ── Main Workspace ───────────────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden">
                    {fastMode ? (
                        /* Fast Cashiering Workspace: Main Table + Quick Catalog */
                        <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
                            <div className="flex-1 overflow-hidden">
                                <SimSoftCashierTable
                                    cart={cart}
                                    currency={currency}
                                    onUpdateQty={updateQty}
                                    onSetExactQty={setExactQty}
                                    onOpenCalc={setCalcItem}
                                    onRemove={removeItem}
                                    onClear={clearCart}
                                    onCharge={() => { setError(null); setPaymentMethodPreset("cash"); setShowPayment(true); }}
                                    onCustomerCredit={() => { setError(null); setPaymentMethodPreset("credit"); setShowPayment(true); }}
                                    lastScanned={lastScanned}
                                />
                            </div>

                            {/* Quick Tap Catalog Drawer for fast cashiering without barcode scanner */}
                            <div className="shrink-0 h-40 min-h-[140px] border border-border rounded-xl bg-card p-2.5 overflow-hidden flex flex-col shadow-xs">
                                <div className="shrink-0 flex items-center justify-between pb-1.5 px-1 border-b border-border/50 text-[11px] font-bold text-muted-foreground">
                                    <span>Quick Pick Retail Products ({quickPickProducts.length})</span>
                                    <span>Click to add · Auto ₱ amount & kg for Rice & Feeds</span>
                                </div>
                                <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-stretch gap-2 pt-2">
                                    {quickPickProducts.map(p => {
                                        const rawUnit = p.unit || '';
                                        const isKg = isWeightedKgItem(rawUnit, p.name);
                                        const unit = rawUnit || (isKg ? 'kg' : 'pc');
                                        const inCart = cart.find(i => i.product_id === p.id);
                                        return (
                                            <button key={p.id} onClick={() => handleProductClick(p, 1)}
                                                className={cn("h-full w-32 shrink-0 rounded-xl border p-2 flex flex-col justify-between text-left transition-all hover:scale-[1.02] active:scale-95 shadow-xs relative cursor-pointer",
                                                    inCart ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-background hover:border-primary/50")}>
                                                <div className="flex items-center justify-between w-full">
                                                    <span className={cn("text-[9px] font-black uppercase px-1 rounded",
                                                        isKg ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
                                                        {unit}
                                                    </span>
                                                    {isKg && (
                                                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 rounded" title="₱50 purchase equivalent">
                                                            ₱50={Math.round((50 / p.price) * 1000) / 1000}k
                                                        </span>
                                                    )}
                                                    {inCart && (
                                                        <span className="text-[10px] font-mono font-bold bg-primary text-primary-foreground px-1 rounded-full">
                                                            {fmtQty(inCart.qty)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="h-10 w-full flex items-center justify-center my-0.5">
                                                    <ProductThumbnail
                                                        src={p.product_img}
                                                        name={p.name}
                                                        categoryName={p.category?.name}
                                                        unit={p.unit}
                                                        aspect="aspect-auto"
                                                        className="h-full w-full bg-transparent dark:bg-transparent"
                                                        padding="p-0.5"
                                                    />
                                                </div>
                                                <div className="w-full">
                                                    <p className="text-[11px] font-bold text-foreground truncate leading-tight">{p.name}</p>
                                                    <p className="text-xs font-black text-primary font-mono mt-0.5">{fmtMoney(p.price, currency)}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Visual Grid Workspace + Cart Panel */
                        <div className="flex flex-1 overflow-hidden">
                            <div className="flex-1 flex flex-col overflow-hidden border-r border-border">
                                <div className="flex-1 overflow-y-auto p-3">
                                    <Suspense fallback={<LayoutSpinner />}>
                                        {visualLayout === "grid"    && <GridLayout    filtered={filtered} cart={cart} currency={currency} onProductClick={handleProductClick} />}
                                        {visualLayout === "tablet"  && <TabletLayout  filtered={filtered} cart={cart} currency={currency} onProductClick={handleProductClick} />}
                                        {visualLayout === "cafe"    && <CafeLayout    filtered={filtered} allProducts={products} categories={categories} activeCat={activeCat} onCatChange={setActiveCat} cart={cart} currency={currency} onProductClick={handleProductClick} />}
                                        {visualLayout === "salon"   && <SalonLayout   filtered={filtered} cart={cart} currency={currency} onProductClick={handleProductClick} />}
                                        {visualLayout === "mobile"  && <MobileLayout  filtered={filtered} cart={cart} currency={currency} onProductClick={handleProductClick} onCharge={() => { setError(null); setPaymentMethodPreset("cash"); setShowPayment(true); }} subtotal={subtotal} itemCount={itemCount} onClear={clearCart} onUpdateQty={updateQty} onSetExactQty={setExactQty} onRemove={removeItem} />}
                                    </Suspense>
                                </div>
                            </div>

                            {/* Cart Sidebar */}
                            <div className="shrink-0 flex flex-col border-l border-border w-72 lg:w-80 xl:w-96">
                                <CartPanel cart={cart} subtotal={subtotal} itemCount={itemCount} currency={currency} error={error}
                                    onUpdateQty={updateQty} onSetExactQty={setExactQty} onOpenCalc={setCalcItem} onRemove={removeItem} onClear={clearCart}
                                    onCharge={() => { setError(null); setPaymentMethodPreset("cash"); setShowPayment(true); }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── SimSoft Cashier Hotkeys Strip ────────────────────────── */}
                <div className="shrink-0 bg-muted/70 border-t border-border px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-muted-foreground select-none overflow-x-auto whitespace-nowrap">
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => { searchRef.current?.focus(); searchRef.current?.select(); }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-background hover:text-foreground transition-colors cursor-pointer border border-transparent hover:border-border"
                            title="Focus Barcode/Search Input (F1/F2)"
                        >
                            <kbd className="text-foreground bg-background px-1.5 py-0.2 rounded border border-border font-bold">F1/F2</kbd>
                            <span>Search/Scan</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (cart.length > 0) {
                                    setError(null);
                                    setPaymentMethodPreset("credit");
                                    setShowPayment(true);
                                } else {
                                    searchRef.current?.focus();
                                }
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-background hover:text-foreground transition-colors cursor-pointer border border-transparent hover:border-border"
                            title="Customer Credit / Utang (F3)"
                        >
                            <kbd className="text-foreground bg-background px-1.5 py-0.2 rounded border border-border font-bold">F3</kbd>
                            <span>Credit</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setFastMode(v => !v)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-background hover:text-foreground transition-colors cursor-pointer border border-transparent hover:border-border"
                            title="Toggle Fast Cashiering / Visual Catalog (F4)"
                        >
                            <kbd className="text-foreground bg-background px-1.5 py-0.2 rounded border border-border font-bold">F4</kbd>
                            <span>Fast/Visual</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => { if (cart.length > 0) clearCart(); }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-background hover:text-foreground transition-colors cursor-pointer border border-transparent hover:border-border"
                            title="Void / Clear Active Transaction (F8)"
                        >
                            <kbd className="text-foreground bg-background px-1.5 py-0.2 rounded border border-border font-bold">F8</kbd>
                            <span>Void/Clear</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (cart.length > 0) {
                                    setError(null);
                                    setPaymentMethodPreset("cash");
                                    setShowPayment(true);
                                }
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-background hover:text-foreground transition-colors cursor-pointer border border-transparent hover:border-border"
                            title="Tender Cash / Pay (F9)"
                        >
                            <kbd className="text-foreground bg-background px-1.5 py-0.2 rounded border border-border font-bold">F9</kbd>
                            <span>Tender/Pay</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setShowPayment(false);
                                setShowVoidConfirm(false);
                                setVariantFor(null);
                                setCalcItem(null);
                                setSearch("");
                                refocus();
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-background hover:text-foreground transition-colors cursor-pointer border border-transparent hover:border-border"
                            title="Close / Cancel (Esc)"
                        >
                            <kbd className="text-foreground bg-background px-1.5 py-0.2 rounded border border-border font-bold">Esc</kbd>
                            <span>Close</span>
                        </button>
                    </div>
                    <div className="text-[10px] text-muted-foreground/80 block shrink-0 ml-4">
                        SimSoft Retail POS · Multiplier: <code className="text-primary font-bold">1.4*BARCODE</code> or Amount: <code className="text-amber-600 font-bold">50p*BARCODE</code> · <kbd className="bg-background px-1 py-0.5 rounded border border-border">Ctrl+B</kbd> Toggle Sidebar
                    </div>
                </div>
            </div>

            {variantFor && (
                <VariantPicker product={variantFor} currency={currency}
                    onSelect={(vid, vname) => { addItem(variantFor, 1, vid, vname); setVariantFor(null); refocus(50); }}
                    onClose={() => { setVariantFor(null); refocus(50); }} />
            )}

            {calcItem && (
                <WeightAmountModal
                    item={calcItem}
                    currency={currency}
                    onApply={(newQty) => {
                        setExactQty(calcItem.key, newQty);
                        setCalcItem(null);
                        refocus(50);
                    }}
                    onClose={() => {
                        setCalcItem(null);
                        refocus(50);
                    }}
                />
            )}

            {showPayment && (
                <PaymentModal subtotal={subtotal} settings={settings} currency={currency} customers={customers}
                    customerNameRequired={requireCustomerName} promos={promos} cart={cart}
                    onConfirm={handleConfirm}
                    onClose={() => { setShowPayment(false); setError(null); refocus(50); }}
                    loading={loading} serverError={error} initialMethod={paymentMethodPreset} />
            )}

            {showVoidConfirm && (
                <VoidCartModal
                    cart={cart}
                    subtotal={subtotal}
                    itemCount={itemCount}
                    currency={currency}
                    onConfirm={confirmVoidCart}
                    onClose={() => {
                        setShowVoidConfirm(false);
                        refocus(50);
                    }}
                />
            )}

            {receipt && <SaleSuccessModal receipt={receipt} currency={currency} onNewSale={() => { setReceipt(null); refocus(100); }} />}
        </AdminLayout>
    );
}
