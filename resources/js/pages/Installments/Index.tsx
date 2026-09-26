import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { cn } from "@/lib/utils";
import {
    CalendarClock, Phone, CheckCircle2, AlertTriangle,
    XCircle, ChevronRight, Clock, Hash,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Provider = "home_credit" | "skyro" | "other";

interface Sale {
    id: number;
    receipt_number: string;
    created_at: string;
}

interface Plan {
    id: number;
    sale: Sale;
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
}

interface PageProps {
    plans: {
        data: Plan[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    counts: { active: number; completed: number; cancelled: number; overdue: number };
    filters: { status: string };
    app: { currency: string };
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

function ProviderBadge({ provider }: { provider: Provider }) {
    return (
        <span className={cn("inline-flex items-center text-[10px] font-bold uppercase tracking-wide border px-2 py-0.5 rounded-full", PROVIDER_COLOR[provider])}>
            {PROVIDER_LABEL[provider]}
        </span>
    );
}

function StatusBadge({ status }: { status: Plan["status"] }) {
    if (status === "completed") return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> Remitted
        </span>
    );
    if (status === "cancelled") return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
            <XCircle className="h-3 w-3" /> Cancelled
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <Clock className="h-3 w-3" /> Pending
        </span>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InstallmentsIndex() {
    const { plans, counts, filters, app } = usePage<PageProps>().props;
    const [statusFilter, setStatusFilter] = useState(filters.status ?? "active");
    const currency = app.currency ?? "₱";

    const applyFilter = (s: string) => {
        setStatusFilter(s);
        router.get("/installments", { status: s }, { preserveState: true, replace: true });
    };

    const tabs = [
        { value: "active",    label: "Pending",   count: counts.active    },
        { value: "completed", label: "Remitted",  count: counts.completed },
        { value: "cancelled", label: "Cancelled", count: counts.cancelled },
        { value: "all",       label: "All",       count: counts.active + counts.completed + counts.cancelled },
    ];

    return (
        <AdminLayout>
            <Head title="Financing Records" />
            <div className="space-y-5">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-primary" /> Financing Records
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Home Credit and Skyro financed sales — track remittances from the provider.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-border">
                    {tabs.map(t => (
                        <button key={t.value} onClick={() => applyFilter(t.value)}
                            className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                statusFilter === t.value
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground")}>
                            {t.label}
                            <span className={cn("ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                statusFilter === t.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                {t.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Plans list */}
                {plans.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <CalendarClock className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground font-medium">No financing records found</p>
                        <p className="text-sm text-muted-foreground/60 mt-1">
                            Records are created at checkout when payment method is set to Installment (Home Credit / Skyro).
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {plans.data.map(plan => {
                            const dp         = parseFloat(plan.down_payment);
                            const financed   = parseFloat(plan.balance);
                            const remitted   = parseFloat(plan.total_paid);
                            const remaining  = Math.max(0, financed - remitted);
                            const paidPct    = financed > 0
                                ? Math.min(100, (remitted / financed) * 100)
                                : 100;

                            return (
                                <Link key={plan.id} href={`/installments/${plan.id}`}
                                    className="block bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:bg-accent/30 transition-all group">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {/* Name + badges */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-foreground">{plan.customer_name}</span>
                                                <ProviderBadge provider={plan.provider} />
                                                <StatusBadge status={plan.status} />
                                            </div>

                                            {/* Meta row */}
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                                {plan.customer_phone && (
                                                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{plan.customer_phone}</span>
                                                )}
                                                {plan.reference_number && (
                                                    <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{plan.reference_number}</span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    {plan.installments_count} months
                                                </span>
                                                <span className="font-mono text-[10px] opacity-60">#{plan.sale?.receipt_number}</span>
                                                <span>{fmtDate(plan.created_at)}</span>
                                            </div>

                                            {/* Progress bar — remittance from provider */}
                                            {financed > 0 && (
                                                <div className="mt-2.5">
                                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div className={cn("h-full rounded-full transition-all",
                                                            plan.status === "completed" ? "bg-green-500" : "bg-primary")}
                                                            style={{ width: `${paidPct}%` }} />
                                                    </div>
                                                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                                        <span>Remitted {fmtMoney(remitted, currency)}</span>
                                                        <span>Pending {fmtMoney(remaining, currency)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <p className="text-base font-bold text-foreground">{fmtMoney(plan.total_amount, currency)}</p>
                                            {dp > 0 && <p className="text-xs text-muted-foreground">DP {fmtMoney(dp, currency)}</p>}
                                            <p className="text-xs text-muted-foreground">
                                                Financed {fmtMoney(financed, currency)}
                                            </p>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary mt-1 transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {plans.last_page > 1 && (
                    <div className="flex justify-center gap-1 pt-2">
                        {plans.links.map((link, i) => (
                            <button key={i} disabled={!link.url || link.active}
                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true })}
                                className={cn("px-3 py-1.5 text-sm rounded-lg transition-colors",
                                    link.active ? "bg-primary text-primary-foreground font-semibold"
                                        : link.url ? "hover:bg-accent text-foreground" : "text-muted-foreground cursor-default")}
                                dangerouslySetInnerHTML={{ __html: link.label }} />
                        ))}
                    </div>
                )}

            </div>
        </AdminLayout>
    );
}
