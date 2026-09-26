import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { cn } from "@/lib/utils";
import {
    CalendarClock, Phone, User, CheckCircle2, AlertTriangle,
    XCircle, Clock, ArrowLeft, Banknote, Smartphone, CreditCard,
    Plus, RefreshCw, Receipt, Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

type Provider = "home_credit" | "skyro" | "other";

interface Remittance {
    id: number;
    sequence: number;
    amount: string;
    payment_date: string;
    payment_method: string;
    notes: string | null;
    receiver: { id: number; fname: string; lname: string } | null;
    created_at: string;
}

interface Plan {
    id: number;
    sale: { id: number; receipt_number: string; created_at: string; total: string; payment_method: string };
    user: { id: number; fname: string; lname: string };
    provider: Provider;
    reference_number: string | null;
    customer_name: string;
    customer_phone: string | null;
    total_amount: string;
    down_payment: string;
    balance: string;
    installment_amount: string;
    total_paid: string;
    installments_count: number;
    paid_count: number;
    status: "active" | "completed" | "cancelled";
    notes: string | null;
    created_at: string;
    payments: Remittance[];
}

interface PageProps {
    plan: Plan;
    app: { currency: string };
    flash?: { message?: { type: string; text: string } | null };
    [key: string]: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtMoney(v: number | string, currency = "₱") {
    return currency + Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

function fmtDate(s: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

const PROVIDER_LABEL: Record<Provider, string> = {
    home_credit: "Home Credit",
    skyro:       "Skyro",
    other:       "Other",
};

const PROVIDER_COLOR: Record<Provider, string> = {
    home_credit: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    skyro:       "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    other:       "bg-muted text-muted-foreground border-border",
};

function PayMethodIcon({ method }: { method: string }) {
    if (method === "gcash") return <Smartphone className="h-3.5 w-3.5" />;
    if (method === "card")  return <CreditCard className="h-3.5 w-3.5" />;
    return <Banknote className="h-3.5 w-3.5" />;
}

// ── Record Remittance Modal ───────────────────────────────────────────────────

function RecordRemittanceModal({ plan, currency, onClose }: { plan: Plan; currency: string; onClose: () => void }) {
    const remaining = Math.max(0, parseFloat(plan.balance) - parseFloat(plan.total_paid));
    const [amount,  setAmount]  = useState(remaining.toFixed(2));
    const [date,    setDate]    = useState(new Date().toISOString().slice(0, 10));
    const [method,  setMethod]  = useState<"gcash" | "card" | "bank">("bank");
    const [notes,   setNotes]   = useState("");
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState("");

    const amtN = parseFloat(amount) || 0;
    const canSubmit = amtN > 0 && amtN <= remaining + 0.01 && date;

    const submit = () => {
        if (!canSubmit) return;
        setLoading(true); setError("");
        router.post(`/installments/${plan.id}/pay`, {
            amount, payment_date: date, payment_method: method, notes: notes || null,
        }, {
            preserveScroll: true,
            onSuccess: () => { setLoading(false); onClose(); },
            onError: (errs) => { setError(Object.values(errs)[0] as string ?? "Failed to record remittance."); setLoading(false); },
        });
    };

    const PMETHODS = [
        { value: "gcash" as const, label: "GCash",      icon: Smartphone },
        { value: "card"  as const, label: "Card",       icon: CreditCard },
        { value: "bank"  as const, label: "Bank/Check", icon: CreditCard },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div>
                        <p className="font-bold">Record Remittance</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Payment from {PROVIDER_LABEL[plan.provider]} to your store
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground">✕</button>
                </div>
                <div className="p-5 space-y-4">

                    {/* Pending amount */}
                    <div className="bg-muted/30 rounded-xl p-3 text-center">
                        <p className="text-xs text-muted-foreground">Pending from {PROVIDER_LABEL[plan.provider]}</p>
                        <p className="text-2xl font-black text-foreground">{fmtMoney(remaining, currency)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {plan.installments_count} month terms · ≈ {fmtMoney(parseFloat(plan.installment_amount), currency)}/month
                        </p>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Amount Received</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{currency}</span>
                            <input value={amount} onChange={e => setAmount(e.target.value)}
                                type="number" min="0.01" step="0.01"
                                className="w-full h-11 pl-8 pr-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground" />
                        </div>
                        <div className="flex gap-2 mt-1.5">
                            <button onClick={() => setAmount(remaining.toFixed(2))}
                                className="text-[10px] text-primary hover:underline">Full balance</button>
                            <button onClick={() => setAmount(parseFloat(plan.installment_amount).toFixed(2))}
                                className="text-[10px] text-primary hover:underline">Monthly amount</button>
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Date Received</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full h-11 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-foreground" />
                    </div>

                    {/* How provider paid */}
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">How Received</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {PMETHODS.map(m => { const Icon = m.icon; return (
                                <button key={m.value} onClick={() => setMethod(m.value as any)}
                                    className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                                        method === m.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40 hover:bg-accent text-foreground")}>
                                    <Icon className="h-4 w-4" />{m.label}
                                </button>
                            ); })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Notes (optional)</label>
                        <input value={notes} onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. partial remittance, batch no…"
                            className="w-full h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground" />
                    </div>

                    {error && <p className="text-xs text-destructive flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" />{error}</p>}
                </div>
                <div className="px-5 pb-5">
                    <Button className="w-full h-11 font-bold gap-2" disabled={!canSubmit || loading} onClick={submit}>
                        {loading
                            ? <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                            : <><Plus className="h-4 w-4" />Record {fmtMoney(amtN, currency)} Remittance</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InstallmentsShow() {
    const { plan, app } = usePage<PageProps>().props;
    const currency  = app.currency ?? "₱";
    const [showPay, setShowPay] = useState(false);

    const dp        = parseFloat(plan.down_payment);
    const financed  = parseFloat(plan.balance);
    const remitted  = parseFloat(plan.total_paid);
    const remaining = Math.max(0, financed - remitted);
    const paidPct   = financed > 0 ? Math.min(100, (remitted / financed) * 100) : 100;

    const handleCancel = () => {
        if (!confirm("Cancel this financing record? This cannot be undone.")) return;
        router.post(`/installments/${plan.id}/cancel`, {}, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title={`${PROVIDER_LABEL[plan.provider]} — ${plan.customer_name}`} />
            <div className="max-w-2xl mx-auto space-y-5">

                {/* Back */}
                <Link href="/installments" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Financing Records
                </Link>

                {/* Summary card */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden">

                    {/* Header */}
                    <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={cn("inline-flex items-center text-xs font-bold uppercase tracking-wide border px-2.5 py-1 rounded-full", PROVIDER_COLOR[plan.provider])}>
                                    {PROVIDER_LABEL[plan.provider]}
                                </span>
                                {plan.status === "completed" && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Fully Remitted
                                    </span>
                                )}
                                {plan.status === "cancelled" && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground bg-muted border border-border px-2.5 py-1 rounded-full">
                                        <XCircle className="h-3.5 w-3.5" /> Cancelled
                                    </span>
                                )}
                                {plan.status === "active" && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                                        <Clock className="h-3.5 w-3.5" /> Pending Remittance
                                    </span>
                                )}
                            </div>
                            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {plan.customer_name}
                            </h1>
                            {plan.customer_phone && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <Phone className="h-3.5 w-3.5" />{plan.customer_phone}
                                </p>
                            )}
                            {plan.reference_number && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <Hash className="h-3.5 w-3.5" />Ref: {plan.reference_number}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-border">
                        {[
                            { label: "Sale Total",        value: fmtMoney(plan.total_amount, currency) },
                            { label: "Down Payment",      value: dp > 0 ? fmtMoney(dp, currency) : "No DP" },
                            { label: "Financed Amount",   value: fmtMoney(financed, currency) },
                            { label: "Monthly Remittance",value: fmtMoney(plan.installment_amount, currency) },
                            { label: "Terms",             value: `${plan.installments_count} months` },
                            { label: "Remittances",       value: `${plan.paid_count} of ${plan.installments_count}` },
                        ].map(d => (
                            <div key={d.label} className="bg-card px-4 py-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{d.label}</p>
                                <p className="text-sm font-bold text-foreground mt-0.5">{d.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Progress */}
                    {financed > 0 && (
                        <div className="px-5 py-4 border-t border-border">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-muted-foreground">Remitted by {PROVIDER_LABEL[plan.provider]}</span>
                                <span className="font-bold text-foreground">{fmtMoney(remitted, currency)} / {fmtMoney(financed, currency)}</span>
                            </div>
                            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all",
                                    plan.status === "completed" ? "bg-green-500" : "bg-primary")}
                                    style={{ width: `${paidPct}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
                                <span>{Math.round(paidPct)}% remitted</span>
                                <span>Pending {fmtMoney(remaining, currency)}</span>
                            </div>
                        </div>
                    )}

                    {/* Sale reference + notes */}
                    <div className="px-5 pb-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                        <Link href={`/pos/${plan.sale?.id}`}
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                            <Receipt className="h-3.5 w-3.5" />
                            Receipt #{plan.sale?.receipt_number}
                        </Link>
                        {plan.notes && (
                            <p className="text-xs text-muted-foreground italic truncate max-w-[60%]">"{plan.notes}"</p>
                        )}
                    </div>
                </div>

                {/* Action buttons */}
                {plan.status === "active" && (
                    <div className="flex gap-2">
                        <Button className="flex-1 h-11 gap-2 font-semibold" onClick={() => setShowPay(true)}>
                            <Plus className="h-4 w-4" /> Record Remittance
                        </Button>
                        <Button variant="outline" size="default" className="h-11 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleCancel}>
                            Cancel
                        </Button>
                    </div>
                )}

                {/* Remittance history */}
                <div className="space-y-2">
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" /> Remittance History
                    </h2>

                    {/* Down payment row (if any) */}
                    {dp > 0 && (
                        <div className="bg-card border border-border rounded-xl p-3.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-primary/10">
                                        <Banknote className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Down Payment</p>
                                        <p className="text-xs text-muted-foreground">{fmtDate(plan.created_at)} · Collected at POS</p>
                                    </div>
                                </div>
                                <p className="font-bold text-foreground">{fmtMoney(dp, currency)}</p>
                            </div>
                        </div>
                    )}

                    {plan.payments.length === 0 && dp === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm bg-card border border-border rounded-xl">
                            No remittances recorded yet.
                        </div>
                    )}

                    {plan.payments.map(r => (
                        <div key={r.id} className="bg-card border border-border rounded-xl p-3.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-muted">
                                        <PayMethodIcon method={r.payment_method} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">
                                            Remittance #{r.sequence}
                                            <span className="text-xs font-normal text-muted-foreground ml-1.5 capitalize">{r.payment_method}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {fmtDate(r.payment_date)}
                                            {r.receiver && ` · Recorded by ${r.receiver.fname} ${r.receiver.lname}`}
                                        </p>
                                        {r.notes && <p className="text-xs text-muted-foreground/70 italic mt-0.5">"{r.notes}"</p>}
                                    </div>
                                </div>
                                <p className="font-bold text-foreground">{fmtMoney(r.amount, currency)}</p>
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            {showPay && <RecordRemittanceModal plan={plan} currency={currency} onClose={() => setShowPay(false)} />}
        </AdminLayout>
    );
}
