import { useState } from "react";
import type React from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { routes } from "@/routes";
import { cn } from "@/lib/utils";
import { ArrowLeft, Calendar, CreditCard, History, Receipt, User, Wallet } from "lucide-react";

interface Customer {
    id: number;
    name: string;
    contact_number: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
    is_active: boolean;
    total_purchases: number;
    credit_balance: number;
    payments_total: number;
}
interface SaleRow {
    id: number;
    receipt_number: string;
    created_at: string;
    total: number;
    amount_paid: number;
    balance_due: number;
    payment_method: string;
    payment_status: string;
    due_date: string | null;
    notes: string | null;
    cashier: string | null;
    items: { name: string; variant_name: string | null; qty: number; total: number }[];
}
interface PaymentRow {
    id: number;
    sale_id: number | null;
    receipt_number: string | null;
    payment_date: string;
    amount: number;
    payment_method: string;
    notes: string | null;
    received_by: string | null;
}
interface CreditRow {
    id: number;
    receipt_number: string;
    total: number;
    amount_paid: number;
    balance_due: number;
    payment_status: string;
    due_date: string | null;
}
interface LedgerRow {
    date: string;
    type: "credit" | "payment";
    reference: string | null;
    debit: number;
    credit: number;
    balance: number | null;
    notes: string | null;
}
interface PageProps {
    customer: Customer;
    sales: { data: SaleRow[] };
    payments: PaymentRow[];
    openCredits: CreditRow[];
    ledger: LedgerRow[];
    currency: string;
    [key: string]: unknown;
}

export default function CustomerShow() {
    const { props } = usePage<PageProps>();
    const { customer, sales, payments, openCredits, ledger, currency } = props;
    const [saleId, setSaleId] = useState("");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("cash");
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const fmt = (n: number) => `${currency}${Number(n ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const selectedCredit = openCredits.find(c => String(c.id) === saleId);

    function submitPayment(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setErrors({});
        router.post(routes.customers.pay(customer.id), {
            sale_id: saleId || null,
            amount,
            payment_method: method,
            payment_date: paymentDate,
            notes: notes || null,
        }, {
            preserveScroll: true,
            onSuccess: () => { setAmount(""); setNotes(""); setSaleId(""); setSaving(false); },
            onError: err => { setErrors(err); setSaving(false); },
        });
    }

    return (
        <AdminLayout>
            <Head title={customer.name} />
            <div className="space-y-5 max-w-[1400px] mx-auto">
                <div className="flex items-center gap-3">
                    <Link href={routes.customers.index()}>
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted">
                            <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">{customer.name}</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">{customer.contact_number || customer.email || "Registered customer"}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { label: "Total purchases", value: fmt(customer.total_purchases), icon: Receipt },
                        { label: "Credit balance", value: fmt(customer.credit_balance), icon: Wallet, warn: customer.credit_balance > 0 },
                        { label: "Payments made", value: fmt(customer.payments_total), icon: CreditCard },
                        { label: "Open credits", value: String(openCredits.length), icon: History },
                    ].map(card => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                                <Icon className={cn("h-4 w-4 mb-2", card.warn ? "text-amber-600" : "text-primary")} />
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{card.label}</p>
                                <p className="text-lg font-bold tabular-nums text-foreground mt-0.5">{card.value}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="grid lg:grid-cols-[360px_1fr] gap-5">
                    <form onSubmit={submitPayment} className="bg-card border border-border rounded-xl p-4 h-fit space-y-3">
                        <div>
                            <h2 className="font-semibold text-foreground">Record Payment</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Apply full or partial payment to one receipt, or oldest balances first.</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Credit transaction</label>
                            <select value={saleId} onChange={e => setSaleId(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                                <option value="">Oldest open balances</option>
                                {openCredits.map(c => (
                                    <option key={c.id} value={c.id}>{c.receipt_number} - {fmt(c.balance_due)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</label>
                                <Input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
                                {errors.amount && <p className="text-[11px] text-destructive">{errors.amount}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</label>
                                <select value={method} onChange={e => setMethod(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm">
                                    <option value="cash">Cash</option>
                                    <option value="gcash">GCash</option>
                                    <option value="card">Card</option>
                                    <option value="bank">Bank</option>
                                    <option value="others">Others</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment date</label>
                            <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full min-h-20 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                        </div>
                        {selectedCredit && (
                            <button type="button" onClick={() => setAmount(String(selectedCredit.balance_due))} className="text-xs text-primary hover:underline">
                                Fill full balance: {fmt(selectedCredit.balance_due)}
                            </button>
                        )}
                        {(errors.sale_id || errors.error) && <p className="text-xs text-destructive">{errors.sale_id || errors.error}</p>}
                        <Button className="w-full" disabled={saving || openCredits.length === 0}>{saving ? "Recording..." : "Record Payment"}</Button>
                    </form>

                    <div className="space-y-5">
                        <section className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-amber-600" />
                                <h2 className="font-semibold text-sm">Remaining Balances</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/30">
                                        <tr>
                                            {["Receipt", "Due", "Paid", "Balance", "Status"].map(h => <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {openCredits.length === 0 ? (
                                            <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No open balances.</td></tr>
                                        ) : openCredits.map(c => (
                                            <tr key={c.id}>
                                                <td className="px-4 py-3 font-mono font-semibold">{c.receipt_number}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{c.due_date ?? "-"}</td>
                                                <td className="px-4 py-3 tabular-nums">{fmt(c.amount_paid)}</td>
                                                <td className="px-4 py-3 font-bold text-amber-700 dark:text-amber-400 tabular-nums">{fmt(c.balance_due)}</td>
                                                <td className="px-4 py-3 capitalize">{c.payment_status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-primary" />
                                <h2 className="font-semibold text-sm">Transaction History</h2>
                            </div>
                            <div className="divide-y divide-border">
                                {sales.data.map(sale => (
                                    <div key={sale.id} className="px-4 py-3 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-mono font-semibold text-sm">{sale.receipt_number}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleString()} {sale.due_date ? `, due ${sale.due_date}` : ""}</p>
                                            {sale.notes && <p className="text-xs text-muted-foreground mt-1">{sale.notes}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold tabular-nums">{fmt(sale.total)}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{sale.payment_status} - balance {fmt(sale.balance_due)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                <h2 className="font-semibold text-sm">Customer Ledger</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/30">
                                        <tr>
                                            {["Date", "Type", "Reference", "Debit", "Credit", "Balance", "Notes"].map(h => <th key={h} className="px-4 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {ledger.map((row, i) => (
                                            <tr key={`${row.type}-${row.reference}-${i}`}>
                                                <td className="px-4 py-2 text-muted-foreground">{row.date}</td>
                                                <td className="px-4 py-2 capitalize">{row.type}</td>
                                                <td className="px-4 py-2 font-mono">{row.reference ?? "-"}</td>
                                                <td className="px-4 py-2 tabular-nums">{row.debit ? fmt(row.debit) : "-"}</td>
                                                <td className="px-4 py-2 tabular-nums">{row.credit ? fmt(row.credit) : "-"}</td>
                                                <td className="px-4 py-2 tabular-nums">{row.balance !== null ? fmt(row.balance) : "-"}</td>
                                                <td className="px-4 py-2 text-muted-foreground">{row.notes ?? "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="px-4 py-3 border-b border-border">
                                <h2 className="font-semibold text-sm">Payment History</h2>
                            </div>
                            <div className="divide-y divide-border">
                                {payments.length === 0 ? (
                                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">No payments yet.</p>
                                ) : payments.map(payment => (
                                    <div key={payment.id} className="px-4 py-3 flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-sm">{payment.receipt_number ?? "Customer payment"}</p>
                                            <p className="text-xs text-muted-foreground">{payment.payment_date} - {payment.payment_method}</p>
                                            {payment.notes && <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>}
                                        </div>
                                        <p className="font-bold text-green-700 dark:text-green-400 tabular-nums">{fmt(payment.amount)}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
