"use client";

import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Calculator, CheckCircle2, AlertTriangle, Banknote,
    Smartphone, CreditCard, CalendarClock, Minus, Plus,
    TrendingUp, Building2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OpenSession {
    id: number;
    session_number: string;
    cashier_name: string;
    is_mine: boolean;
    opened_at: string;
    opening_cash: number;
    pure_cash_sales: number;
    installment_dp: number;
    petty_cash_paid: number;
    expected_cash: number;
    gcash_system: number;
    card_system: number;
    bank_system: number;
}

interface Branch {
    id: number;
    name: string;
}

interface CashCount {
    id: number;
    count_type: string;
    system_total: number;
    expected_cash: number;
    counted_total: number;
    over_short: number;
    gcash_system: number | null;
    gcash_counted: number | null;
    gcash_over_short: number | null;
    card_system: number | null;
    card_counted: number | null;
    card_over_short: number | null;
    notes: string | null;
    created_at: string;
    cashSession?: { session_number: string; opened_at: string };
}

interface Denomination {
    denomination: number;
    quantity: number;
    subtotal: number;
    type: "bill" | "coin";
}

interface MissedCount {
    id: number;
    session_number: string;
    date: string;
    status: "open" | "closed";
    sale_count: number;
}

interface PageProps {
    open_sessions: OpenSession[];
    cash_counts: { data: CashCount[] };
    branches: Branch[];
    selected_branch_id: number;
    is_admin: boolean;
    missed_counts: MissedCount[];
    app?: { currency: string };
    [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BILLS = [1000, 500, 200, 100, 50, 20];
const COINS = [20, 10, 5, 1, 0.25, 0.10, 0.05];

const fmt = (n: number, c = "₱") =>
    c + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const overShortColor = (n: number) =>
    n === 0 ? "text-emerald-600 dark:text-emerald-400"
    : n > 0  ? "text-amber-500"
    : "text-destructive";

const overShortLabel = (n: number) =>
    n === 0 ? "Balanced" : n > 0 ? `Over ${fmt(Math.abs(n))}` : `Short ${fmt(Math.abs(n))}`;

function OverShortChip({ amount }: { amount: number }) {
    const cls = overShortColor(amount);
    const Icon = amount === 0 ? CheckCircle2 : AlertTriangle;
    return (
        <span className={cn("inline-flex items-center gap-1 text-xs font-bold", cls)}>
            <Icon className="h-3.5 w-3.5" />{overShortLabel(amount)}
        </span>
    );
}

// ─── Denomination Row ─────────────────────────────────────────────────────────

function DenomRow({ denom, onInc, onDec, onSet }: {
    denom: Denomination;
    onInc: () => void; onDec: () => void;
    onSet: (q: number) => void;
}) {
    return (
        <div className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 transition-colors",
            denom.quantity > 0 ? "bg-primary/5 border border-primary/20" : "bg-muted/40 border border-transparent"
        )}>
            {/* Denomination label */}
            <div className="w-20 shrink-0">
                <p className="text-lg font-black tabular-nums text-foreground">₱{denom.denomination}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{denom.type}</p>
            </div>

            {/* −  quantity  + */}
            <div className="flex items-center gap-2 flex-1">
                <button onClick={onDec} disabled={denom.quantity === 0}
                    className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors shrink-0">
                    <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                    type="number" min="0" value={denom.quantity || ""}
                    placeholder="0"
                    onChange={e => onSet(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 h-9 text-center text-lg font-bold tabular-nums bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
                <button onClick={onInc}
                    className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Subtotal */}
            <div className="w-28 text-right shrink-0">
                <p className={cn("font-mono text-sm font-bold tabular-nums",
                    denom.quantity > 0 ? "text-primary" : "text-muted-foreground/40")}>
                    {fmt(denom.subtotal)}
                </p>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CashCountsIndex() {
    const { open_sessions, cash_counts, branches, selected_branch_id, is_admin, missed_counts, app } = usePage<PageProps>().props;
    const currency = app?.currency ?? "₱";

    const handleBranchChange = (branchId: number) => {
        router.get("/cash-counts", { branch: branchId }, { preserveScroll: false, replace: true });
    };

    // Pre-select the first missed session if any are open and need counting
    const firstMissedOpen = missed_counts.find(m => m.status === "open");
    const initialSession = firstMissedOpen
        ? (open_sessions.find(s => s.id === firstMissedOpen.id) ?? open_sessions[0] ?? null)
        : (open_sessions[0] ?? null);
    const [sessionId, setSessionId]     = useState<number | null>(initialSession?.id ?? null);
    const [countType, setCountType]     = useState<"closing" | "midshift">(
        initialSession?.is_mine !== false ? "closing" : "midshift"
    );
    const [gcashCounted, setGcashCounted] = useState("");
    const [cardCounted, setCardCounted]   = useState("");
    const [notes, setNotes]             = useState("");
    const [loading, setLoading]         = useState(false);

    const [denoms, setDenoms] = useState<Denomination[]>([
        ...BILLS.map(d => ({ denomination: d, quantity: 0, subtotal: 0, type: "bill" as const })),
        ...COINS.map(d => ({ denomination: d, quantity: 0, subtotal: 0, type: "coin" as const })),
    ]);

    const session = open_sessions.find(s => s.id === sessionId) ?? null;

    // If selected session is not mine, force countType to midshift
    const effectiveCountType: "closing" | "midshift" =
        session && !session.is_mine ? "midshift" : countType;

    const updateDenom = (i: number, qty: number) => {
        setDenoms(prev => prev.map((d, idx) =>
            idx === i ? { ...d, quantity: qty, subtotal: Math.round(d.denomination * qty * 100) / 100 } : d
        ));
    };

    const reset = () => {
        setDenoms(prev => prev.map(d => ({ ...d, quantity: 0, subtotal: 0 })));
        setGcashCounted("");
        setCardCounted("");
        setNotes("");
    };

    // Totals
    const cashCounted    = denoms.reduce((s, d) => s + d.subtotal, 0);
    const expectedCash   = session?.expected_cash ?? 0;
    const cashOverShort  = cashCounted - expectedCash;

    const gcashSystem    = session?.gcash_system ?? 0;
    const cardSystem     = session?.card_system  ?? 0;
    const gcashCountedN  = parseFloat(gcashCounted)  || 0;
    const cardCountedN   = parseFloat(cardCounted)   || 0;
    const gcashOverShort = gcashCounted ? gcashCountedN - gcashSystem : null;
    const cardOverShort  = cardCounted  ? cardCountedN  - cardSystem  : null;

    const bills = denoms.filter(d => d.type === "bill");
    const coins = denoms.filter(d => d.type === "coin");
    const billsTotal = bills.reduce((s, d) => s + d.subtotal, 0);
    const coinsTotal = coins.reduce((s, d) => s + d.subtotal, 0);

    const canSubmit = !!sessionId && open_sessions.length > 0;

    const handleSubmit = () => {
        if (!sessionId) return;
        setLoading(true);
        router.post("/cash-counts", {
            cash_session_id: sessionId,
            count_type:      effectiveCountType,
            denominations:   denoms.filter(d => d.quantity > 0).map(d => ({ denomination: d.denomination, quantity: d.quantity })),
            gcash_counted:   gcashCounted ? gcashCountedN : null,
            card_counted:    cardCounted  ? cardCountedN  : null,
            notes:           notes || null,
        }, {
            preserveScroll: true,
            onSuccess: () => { reset(); setLoading(false); },
            onError:   () => setLoading(false),
        });
    };

    return (
        <AdminLayout>
            <Head title="Cash Counts" />

            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-primary" /> Cash Counts
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Count cash denominations and reconcile GCash / Card before closing the session.
                        </p>
                    </div>
                    {is_admin && branches.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <select
                                value={selected_branch_id}
                                onChange={e => handleBranchChange(Number(e.target.value))}
                                className="h-9 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                            >
                                {branches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* ── Missed cash count warning ── */}
                {missed_counts.length > 0 && (
                    <div className="bg-destructive/8 border border-destructive/30 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <p className="text-sm font-bold">
                                {missed_counts.length === 1
                                    ? "1 day missing a cash count"
                                    : `${missed_counts.length} days missing cash counts`}
                            </p>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                            The following sessions had transactions but no closing count was recorded.
                            A daily cash count is required for days with transactions.
                        </p>
                        <div className="pl-6 space-y-1.5 pt-1">
                            {missed_counts.map(m => (
                                <div key={m.id} className="flex items-center justify-between text-xs bg-background border border-destructive/20 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-foreground">{m.session_number}</span>
                                        <span className="text-muted-foreground">
                                            {new Date(m.date).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" })}
                                        </span>
                                        <span className="text-muted-foreground">· {m.sale_count} transaction{m.sale_count !== 1 ? "s" : ""}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                            m.status === "open"
                                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                : "bg-muted text-muted-foreground"
                                        )}>
                                            {m.status === "open" ? "● Open" : "Closed"}
                                        </span>
                                        {m.status === "open" && open_sessions.find(s => s.id === m.id) && (
                                            <button
                                                onClick={() => setSessionId(m.id)}
                                                className="text-[10px] font-bold text-primary hover:underline"
                                            >
                                                Count now →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid lg:grid-cols-5 gap-6">

                    {/* ── LEFT: Form ── */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* Session + type selectors */}
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Session</label>
                                    <select value={sessionId ?? ""} onChange={e => {
                                        const id = Number(e.target.value);
                                        setSessionId(id);
                                        const sel = open_sessions.find(s => s.id === id);
                                        if (sel && !sel.is_mine && countType === "closing") setCountType("midshift");
                                    }}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                                        {open_sessions.length === 0
                                            ? <option value="">No open sessions</option>
                                            : open_sessions.map(s => {
                                                const isMissed = missed_counts.some(m => m.id === s.id);
                                                return (
                                                    <option key={s.id} value={s.id}>
                                                        {isMissed ? "⚠ " : ""}{s.session_number} — {s.cashier_name}{s.is_mine ? " (you)" : ""}
                                                        {isMissed ? " (count required)" : ""}
                                                    </option>
                                                );
                                            })
                                        }
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Count Type</label>
                                    <select value={countType} onChange={e => setCountType(e.target.value as any)}
                                        className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                                        {open_sessions.find(s => s.id === sessionId)?.is_mine === true && (
                                            <option value="closing">Closing Count (closes session)</option>
                                        )}
                                        <option value="midshift">Mid-shift Count</option>
                                    </select>
                                </div>
                            </div>

                            {/* Expected cash breakdown */}
                            {session && (
                                <div className="bg-muted/30 rounded-xl p-3.5 space-y-1.5 text-sm">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Expected Cash in Drawer</p>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><Banknote className="h-3 w-3" />Opening cash</span>
                                        <span className="tabular-nums font-medium text-foreground">{fmt(session.opening_cash, currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3" />Cash sales</span>
                                        <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">+{fmt(session.pure_cash_sales, currency)}</span>
                                    </div>
                                    {session.installment_dp > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                                <CalendarClock className="h-3 w-3" />Installment DP
                                                <span className="text-[10px] bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full">DP only</span>
                                            </span>
                                            <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">+{fmt(session.installment_dp, currency)}</span>
                                        </div>
                                    )}
                                    {session.petty_cash_paid > 0 && (
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Petty cash paid out</span>
                                            <span className="tabular-nums font-medium text-destructive">−{fmt(session.petty_cash_paid, currency)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t border-border pt-2 mt-1">
                                        <span className="font-bold text-foreground">Expected in drawer</span>
                                        <span className="tabular-nums font-black text-primary">{fmt(expectedCash, currency)}</span>
                                    </div>

                                    {/* Non-cash payments — for reference only */}
                                    {(gcashSystem > 0 || cardSystem > 0 || session.bank_system > 0 || (session.remittance_bank ?? 0) > 0) && (
                                        <>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pt-3 mb-1 border-t border-border">Not in drawer (reconcile separately)</p>
                                            {gcashSystem > 0 && (
                                                <div className="flex justify-between text-muted-foreground/70">
                                                    <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
                                                        <Smartphone className="h-3 w-3" />GCash
                                                    </span>
                                                    <span className="tabular-nums text-blue-500 dark:text-blue-400">{fmt(gcashSystem, currency)}</span>
                                                </div>
                                            )}
                                            {cardSystem > 0 && (
                                                <div className="flex justify-between text-muted-foreground/70">
                                                    <span className="flex items-center gap-1.5 text-purple-500 dark:text-purple-400">
                                                        <CreditCard className="h-3 w-3" />Card
                                                    </span>
                                                    <span className="tabular-nums text-purple-500 dark:text-purple-400">{fmt(cardSystem, currency)}</span>
                                                </div>
                                            )}
                                            {session.bank_system > 0 && (
                                                <div className="flex justify-between text-muted-foreground/70">
                                                    <span className="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400">
                                                        <Building2 className="h-3 w-3" />Bank / Check
                                                    </span>
                                                    <span className="tabular-nums text-indigo-500 dark:text-indigo-400">{fmt(session.bank_system, currency)}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Cash denominations ── */}
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                                <Banknote className="h-3.5 w-3.5" /> Bills
                            </p>
                            <div className="space-y-1.5">
                                {bills.map((d, i) => (
                                    <DenomRow key={d.denomination} denom={d}
                                        onInc={() => updateDenom(i, d.quantity + 1)}
                                        onDec={() => updateDenom(i, d.quantity - 1)}
                                        onSet={q  => updateDenom(i, q)} />
                                ))}
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-2">
                                <span>Bills subtotal</span>
                                <span className="font-bold tabular-nums text-foreground">{fmt(billsTotal, currency)}</span>
                            </div>

                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 pt-2">
                                <Banknote className="h-3.5 w-3.5" /> Coins
                            </p>
                            <div className="space-y-1.5">
                                {coins.map((d, i) => (
                                    <DenomRow key={d.denomination} denom={d}
                                        onInc={() => updateDenom(bills.length + i, d.quantity + 1)}
                                        onDec={() => updateDenom(bills.length + i, d.quantity - 1)}
                                        onSet={q  => updateDenom(bills.length + i, q)} />
                                ))}
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-2">
                                <span>Coins subtotal</span>
                                <span className="font-bold tabular-nums text-foreground">{fmt(coinsTotal, currency)}</span>
                            </div>

                            {/* Cash total vs expected */}
                            <div className={cn(
                                "rounded-2xl p-4 border-2 transition-all",
                                cashCounted === 0             ? "border-border bg-muted/20"
                                : cashOverShort === 0         ? "border-emerald-500/40 bg-emerald-500/5"
                                : Math.abs(cashOverShort) > 100 ? "border-destructive/40 bg-destructive/5"
                                : "border-amber-500/40 bg-amber-500/5"
                            )}>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Total Counted</p>
                                        <p className={cn("text-4xl font-black tabular-nums",
                                            cashCounted === 0 ? "text-muted-foreground"
                                            : cashOverShort === 0 ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-foreground")}>
                                            {fmt(cashCounted, currency)}
                                        </p>
                                    </div>
                                    {session && (
                                        <div className="text-right">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Expected</p>
                                            <p className="text-xl font-bold tabular-nums text-foreground">{fmt(expectedCash, currency)}</p>
                                            {cashCounted > 0 && (
                                                <p className={cn("text-sm font-bold tabular-nums mt-0.5", overShortColor(cashOverShort))}>
                                                    {overShortLabel(cashOverShort)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── GCash reconciliation ── */}
                        {gcashSystem > 0 && (
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 space-y-3">
                                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Smartphone className="h-3.5 w-3.5" /> GCash Reconciliation
                                </p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        System GCash total
                                        {(session?.remittance_gcash ?? 0) > 0 && <span className="ml-1.5 text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full">POS + remittance</span>}
                                    </span>
                                    <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">{fmt(gcashSystem, currency)}</span>
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                                        Enter GCash Merchant App Total
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currency}</span>
                                        <input type="number" min="0" step="0.01"
                                            value={gcashCounted}
                                            onChange={e => setGcashCounted(e.target.value)}
                                            placeholder={gcashSystem.toFixed(2)}
                                            className="w-full h-10 pl-8 pr-3 text-sm bg-background border border-blue-500/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-foreground placeholder:text-muted-foreground/50"
                                        />
                                    </div>
                                </div>
                                {gcashOverShort !== null && (
                                    <div className={cn("flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-lg",
                                        gcashOverShort === 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-amber-500/10 text-amber-500")}>
                                        {gcashOverShort === 0
                                            ? <><CheckCircle2 className="h-4 w-4" />GCash balanced</>
                                            : <><AlertTriangle className="h-4 w-4" />{overShortLabel(gcashOverShort)}</>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Card / Bank reconciliation ── */}
                        {cardSystem > 0 && (
                            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5 space-y-3">
                                <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <CreditCard className="h-3.5 w-3.5" /> Card / Bank Reconciliation
                                </p>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        System card total
                                        {(session?.remittance_card ?? 0) > 0 && <span className="ml-1.5 text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full">POS + remittance</span>}
                                    </span>
                                    <span className="font-bold tabular-nums text-purple-600 dark:text-purple-400">{fmt(cardSystem, currency)}</span>
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                                        Enter Terminal / Bank Batch Total
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currency}</span>
                                        <input type="number" min="0" step="0.01"
                                            value={cardCounted}
                                            onChange={e => setCardCounted(e.target.value)}
                                            placeholder={cardSystem.toFixed(2)}
                                            className="w-full h-10 pl-8 pr-3 text-sm bg-background border border-purple-500/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500 text-foreground placeholder:text-muted-foreground/50"
                                        />
                                    </div>
                                </div>
                                {cardOverShort !== null && (
                                    <div className={cn("flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-lg",
                                        cardOverShort === 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-amber-500/10 text-amber-500")}>
                                        {cardOverShort === 0
                                            ? <><CheckCircle2 className="h-4 w-4" />Card balanced</>
                                            : <><AlertTriangle className="h-4 w-4" />{overShortLabel(cardOverShort)}</>}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes + Submit */}
                        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Notes (optional)</label>
                                <input value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder="Discrepancies, remarks…"
                                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground" />
                            </div>
                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1 h-11" onClick={reset}>Clear All</Button>
                                <Button className="flex-1 h-11 gap-2 font-bold text-base" disabled={!canSubmit || loading} onClick={handleSubmit}>
                                    {loading
                                        ? <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                                        : <Calculator className="h-4 w-4" />}
                                    {effectiveCountType === "closing" ? "Count & Close Session" : "Save Count"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: History ── */}
                    <div className="lg:col-span-2">
                        <div className="bg-card border border-border rounded-2xl overflow-hidden sticky top-4">
                            <div className="px-5 py-4 border-b border-border">
                                <p className="font-bold text-foreground text-sm">Recent Counts</p>
                            </div>
                            <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
                                {cash_counts.data.length === 0 ? (
                                    <div className="py-12 text-center text-muted-foreground text-sm">No counts yet</div>
                                ) : cash_counts.data.map(c => (
                                    <Link key={c.id} href={`/cash-counts/${c.id}`} className="block px-5 py-4 space-y-2 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-mono text-xs font-bold text-foreground">{c.cashSession?.session_number}</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                                                    {c.count_type} · {new Date(c.created_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-mono font-bold text-sm text-foreground">{fmt(c.counted_total)}</p>
                                                <OverShortChip amount={c.over_short} />
                                            </div>
                                        </div>

                                        {/* GCash row */}
                                        {c.gcash_counted !== null && c.gcash_system !== null && (
                                            <div className="flex items-center justify-between text-xs bg-blue-500/5 px-2.5 py-1.5 rounded-lg">
                                                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                                    <Smartphone className="h-3 w-3" />GCash
                                                </span>
                                                <span className="tabular-nums text-muted-foreground">
                                                    {fmt(c.gcash_counted)} / {fmt(c.gcash_system)}
                                                    {c.gcash_over_short !== null && Math.abs(c.gcash_over_short) >= 0.005 && (
                                                        <span className={cn("ml-1.5 font-bold", overShortColor(c.gcash_over_short))}>
                                                            ({overShortLabel(c.gcash_over_short)})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        {/* Card row */}
                                        {c.card_counted !== null && c.card_system !== null && (
                                            <div className="flex items-center justify-between text-xs bg-purple-500/5 px-2.5 py-1.5 rounded-lg">
                                                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                                                    <CreditCard className="h-3 w-3" />Card
                                                </span>
                                                <span className="tabular-nums text-muted-foreground">
                                                    {fmt(c.card_counted)} / {fmt(c.card_system)}
                                                    {c.card_over_short !== null && Math.abs(c.card_over_short) >= 0.005 && (
                                                        <span className={cn("ml-1.5 font-bold", overShortColor(c.card_over_short))}>
                                                            ({overShortLabel(c.card_over_short)})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}
