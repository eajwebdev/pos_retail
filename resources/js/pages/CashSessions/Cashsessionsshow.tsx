import { Head, usePage, Link } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { routes } from "@/routes";
import { cn } from "@/lib/utils";
import {
    ArrowLeft, Banknote, Smartphone, CreditCard, Tag,
    CheckCircle2, XCircle, AlertTriangle, Clock, Receipt,
    CalendarClock, TrendingUp, Building2,
} from "lucide-react";
import { formatDistanceStrict } from "date-fns";
import { fmtDate } from "@/lib/date";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
    id: number;
    session_number: string;
    status: "open" | "closed";
    opening_cash: number;
    expected_cash: number | null;
    counted_cash: number | null;
    over_short: number | null;
    over_short_status: "pending" | "balanced" | "over" | "short";
    cashier: string;
    notes: string | null;
    opened_at: string;
    closed_at: string | null;
    formatted_opening_cash: string;
    formatted_expected_cash: string;
    formatted_counted_cash: string;
    formatted_over_short: string;
}

interface Summary {
    total_sales: number;
    total_count: number;
    cash_total: number;
    gcash_total: number;
    card_total: number;
    installment_dp: number;
    remittance_total: number;
    remittance_gcash: number;
    remittance_card: number;
    remittance_bank: number;
    others_total: number;
    discount_total: number;
    voided_count: number;
    // GCash reconciliation
    gcash_system: number;
    gcash_counted: number | null;
    gcash_over_short: number | null;
    // Card reconciliation
    card_system: number;
    card_counted: number | null;
    card_over_short: number | null;
}

interface SaleRow {
    id: number;
    receipt_number: string;
    total: number;       // collected amount (DP for installment)
    sale_total: number;  // full sale value
    payment_method: string;
    customer_name: string | null;
    status: string;
    created_at: string;
}

interface PageProps {
    session: Session;
    summary: Summary;
    sales: SaleRow[];
    app: { currency: string };
    [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, currency = "₱") =>
    `${currency}${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const methodMeta: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    cash:        { icon: Banknote,      color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", label: "Cash"        },
    gcash:       { icon: Smartphone,    color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/10",    label: "GCash"       },
    card:        { icon: CreditCard,    color: "text-purple-600 dark:text-purple-400",   bg: "bg-purple-500/10",  label: "Card"        },
    installment: { icon: CalendarClock, color: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-500/10",  label: "Installment" },
    remit_gcash: { icon: Smartphone,    color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/10",    label: "GCash Remit" },
    remit_card:  { icon: CreditCard,    color: "text-purple-600 dark:text-purple-400",   bg: "bg-purple-500/10",  label: "Card Remit"  },
    remit_bank:  { icon: Building2,     color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/10",   label: "Bank Remit"  },
    others:      { icon: Tag,           color: "text-muted-foreground",                  bg: "bg-muted/30",       label: "Others"      },
};

const overShortCls = (s: string) => ({
    balanced: "text-emerald-600 dark:text-emerald-400",
    over:     "text-amber-500",
    short:    "text-destructive",
    pending:  "text-muted-foreground",
}[s] ?? "text-muted-foreground");

function OverShortBadge({ amount, label }: { amount: number; label: string }) {
    if (amount === 0) return (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> {label} balanced
        </span>
    );
    if (amount > 0) return (
        <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> {label} over {fmt(Math.abs(amount))}
        </span>
    );
    return (
        <span className="text-xs font-bold text-destructive flex items-center gap-1">
            <XCircle className="h-3 w-3" /> {label} short {fmt(Math.abs(amount))}
        </span>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CashSessionsShow() {
    const { session, summary, sales, app } = usePage<PageProps>().props;
    const currency  = app?.currency ?? "₱";
    const isOpen    = session.status === "open";
    const duration  = session.closed_at
        ? formatDistanceStrict(new Date(session.closed_at), new Date(session.opened_at))
        : null;

    const payBreakdown = [
        { key: "cash",        label: "Cash",            val: summary.cash_total,            sub: "In drawer"              },
        { key: "gcash",       label: "GCash (POS)",     val: summary.gcash_total,           sub: "Digital wallet"         },
        { key: "card",        label: "Card / Bank (POS)",val: summary.card_total,           sub: "Terminal batch"         },
        { key: "installment", label: "Financing DP",    val: summary.installment_dp,        sub: "Collected at POS"       },
        { key: "remit_gcash", label: "GCash Remit",     val: summary.remittance_gcash ?? 0, sub: "Installment remittance" },
        { key: "remit_card",  label: "Card Remit",      val: summary.remittance_card  ?? 0, sub: "Installment remittance" },
        { key: "remit_bank",  label: "Bank / Check Remit", val: summary.remittance_bank ?? 0, sub: "Installment remittance" },
        { key: "others",      label: "Others",          val: summary.others_total,          sub: ""                       },
    ].filter(p => p.val > 0);

    const hasGcashReconcile = summary.gcash_total > 0;
    const hasCardReconcile  = summary.card_total > 0;

    return (
        <AdminLayout>
            <Head title={`Session ${session.session_number}`} />

            <div className="space-y-6 max-w-[1000px] mx-auto">

                {/* Back + header */}
                <div className="flex items-start gap-4">
                    <Link href={routes.cashSessions.index()}
                        className="mt-0.5 h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-xl font-bold text-foreground font-mono">{session.session_number}</h1>
                            <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full",
                                isOpen ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                       : "bg-muted text-muted-foreground")}>
                                {isOpen ? "● Open" : "Closed"}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {session.cashier} · {fmtDate(session.opened_at, "MMMM d, yyyy")}
                            {duration && <span className="ml-1 opacity-60">· {duration}</span>}
                        </p>
                    </div>
                </div>

                {/* ── Cash drawer reconciliation ── */}
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Cash Drawer</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: "Opening Cash",
                              val: session.formatted_opening_cash,
                              sub: `Opened ${fmtDate(session.opened_at, "h:mm a")}`,
                              color: "text-foreground" },
                            { label: "Cash Collected",
                              val: fmt(summary.cash_total + (summary.installment_dp ?? 0), currency),
                              sub: summary.installment_dp > 0
                                    ? `Cash ${fmt(summary.cash_total, currency)} + DP ${fmt(summary.installment_dp, currency)}`
                                    : `${summary.total_count} transactions`,
                              color: "text-emerald-600 dark:text-emerald-400" },
                            { label: "Expected Cash",
                              val: session.expected_cash !== null
                                    ? session.formatted_expected_cash
                                    : fmt(summary.cash_total + (summary.installment_dp ?? 0) + session.opening_cash, currency),
                              sub: "Opening + cash collected",
                              color: "text-primary" },
                            { label: "Counted Cash",
                              val: session.counted_cash !== null ? session.formatted_counted_cash : "—",
                              sub: session.over_short !== null
                                    ? (session.over_short === 0 ? "✓ Balanced"
                                      : session.over_short > 0  ? `Over ${session.formatted_over_short}`
                                                                 : `Short ${session.formatted_over_short}`)
                                    : "Not yet counted",
                              color: session.over_short !== null ? overShortCls(session.over_short_status) : "text-muted-foreground" },
                        ].map(c => (
                            <div key={c.label} className="bg-card border border-border rounded-2xl p-5">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">{c.label}</p>
                                <p className={cn("text-2xl font-black tabular-nums", c.color)}>{c.val}</p>
                                <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cash over/short alert */}
                {session.over_short !== null && session.over_short !== 0 && (
                    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium",
                        session.over_short_status === "over"
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                            : "bg-destructive/10 border-destructive/30 text-destructive")}>
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        Cash drawer is {session.over_short_status === "over" ? "over" : "short"} by {session.formatted_over_short}
                        {session.notes && <span className="ml-2 opacity-70 font-normal">· {session.notes}</span>}
                    </div>
                )}

                {/* ── GCash reconciliation (shown when session has GCash sales) ── */}
                {hasGcashReconcile && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 space-y-3">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <Smartphone className="h-3.5 w-3.5" /> GCash Reconciliation
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">System Total</p>
                                <p className="text-xl font-black tabular-nums text-blue-600 dark:text-blue-400">{fmt(summary.gcash_system, currency)}</p>
                                <p className="text-xs text-muted-foreground">From sales records</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">GCash App Total</p>
                                <p className="text-xl font-black tabular-nums text-foreground">
                                    {summary.gcash_counted !== null ? fmt(summary.gcash_counted, currency) : "—"}
                                </p>
                                <p className="text-xs text-muted-foreground">Entered at close</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Difference</p>
                                {summary.gcash_over_short !== null
                                    ? <OverShortBadge amount={summary.gcash_over_short} label="GCash" />
                                    : <p className="text-sm text-muted-foreground">Not reconciled</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Card / Bank reconciliation ── */}
                {hasCardReconcile && (
                    <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5 space-y-3">
                        <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                            <CreditCard className="h-3.5 w-3.5" /> Card / Bank Reconciliation
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">System Total</p>
                                <p className="text-xl font-black tabular-nums text-purple-600 dark:text-purple-400">{fmt(summary.card_system, currency)}</p>
                                <p className="text-xs text-muted-foreground">From sales records</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Terminal / Bank Total</p>
                                <p className="text-xl font-black tabular-nums text-foreground">
                                    {summary.card_counted !== null ? fmt(summary.card_counted, currency) : "—"}
                                </p>
                                <p className="text-xs text-muted-foreground">Entered at close</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Difference</p>
                                {summary.card_over_short !== null
                                    ? <OverShortBadge amount={summary.card_over_short} label="Card" />
                                    : <p className="text-sm text-muted-foreground">Not reconciled</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Payment breakdown ── */}
                {payBreakdown.length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Payment Breakdown</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {payBreakdown.map(p => {
                                const meta = methodMeta[p.key] ?? methodMeta.others;
                                const Icon = meta.icon;
                                return (
                                    <div key={p.key} className={cn("rounded-2xl p-4 flex items-center gap-3", meta.bg)}>
                                        <Icon className={cn("h-5 w-5 shrink-0", meta.color)} />
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-muted-foreground">{p.label}</p>
                                            <p className={cn("text-base font-black tabular-nums", meta.color)}>{fmt(p.val, currency)}</p>
                                            {p.sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{p.sub}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {(summary.discount_total > 0 || summary.voided_count > 0) && (
                            <p className="text-xs text-muted-foreground mt-2">
                                {summary.discount_total > 0 && <>Total discounts: <span className="font-medium text-foreground">{fmt(summary.discount_total, currency)}</span></>}
                                {summary.voided_count > 0 && <span className="ml-3">{summary.voided_count} voided transaction{summary.voided_count > 1 ? "s" : ""}</span>}
                            </p>
                        )}
                    </div>
                )}

                {/* ── Transactions list ── */}
                <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                        Transactions ({summary.total_count})
                    </p>
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        {sales.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No transactions in this session</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Receipt</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:table-cell">Customer</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden md:table-cell">Time</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Method</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Collected</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:table-cell">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {sales.map(s => {
                                            const meta     = methodMeta[s.payment_method] ?? methodMeta.others;
                                            const Icon     = meta.icon;
                                            const isVoided = s.status === "voided";
                                            const isInst   = s.payment_method === "installment";
                                            return (
                                                <tr key={s.id} className={cn("hover:bg-muted/20 transition-colors", isVoided && "opacity-50")}>
                                                    <td className="px-4 py-3">
                                                        <p className="font-mono text-xs font-semibold text-foreground">{s.receipt_number}</p>
                                                    </td>
                                                    <td className="px-4 py-3 hidden sm:table-cell text-sm text-muted-foreground">
                                                        {s.customer_name ?? "Walk-in"}
                                                    </td>
                                                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                                                        {fmtDate(s.created_at, "h:mm a")}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <div className="flex items-center gap-1">
                                                                <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                                                                <span className={cn("text-xs font-medium capitalize", meta.color)}>
                                                                    {isInst ? "Financing" : s.payment_method}
                                                                </span>
                                                            </div>
                                                            {isInst && (
                                                                <span className="text-[10px] text-muted-foreground/70">DP only</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className={cn("px-4 py-3 text-right tabular-nums font-bold", isVoided ? "line-through text-muted-foreground" : "text-foreground")}>
                                                        {fmt(s.total, currency)}
                                                        {isInst && !isVoided && (
                                                            <p className="text-[10px] font-normal text-muted-foreground line-through">
                                                                {fmt(s.sale_total, currency)}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                            isVoided ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")}>
                                                            {isVoided ? "Voided" : "Paid"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="border-t-2 border-border">
                                        <tr className="bg-primary/5">
                                            <td colSpan={4} className="px-4 py-3 font-bold text-sm text-foreground">
                                                Total Collected
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-primary text-base tabular-nums">
                                                {fmt(summary.total_sales, currency)}
                                            </td>
                                            <td className="hidden sm:table-cell" />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Session notes */}
                {session.notes && (
                    <div className="bg-muted/20 border border-border rounded-xl px-4 py-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Notes</p>
                        <p className="text-sm text-foreground">{session.notes}</p>
                    </div>
                )}

            </div>
        </AdminLayout>
    );
}
