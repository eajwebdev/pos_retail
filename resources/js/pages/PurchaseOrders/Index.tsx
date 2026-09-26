"use client";

import { useState, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { routes } from "@/routes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    Plus,
    Search,
    ChevronDown,
    ChevronRight,
    PackageCheck,
    AlertCircle,
    CheckCircle2,
    Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PurchaseItem {
    product_name: string;
    quantity: number;
    unit_cost: number;
    line_total: number;
}

interface Purchase {
    id: number;
    grn_number: string;
    supplier: { id: number; name: string; phone: string | null; contact_person: string | null } | null;
    or_number: string | null;
    payment_method: string | null;
    check_date: string | null;
    check_number: string | null;
    paid_at: string | null;
    is_paid: boolean;
    total: number;
    items_count: number;
    items: PurchaseItem[];
    received_date: string | null;
    created_at: string;
}

interface Payable {
    supplier_id: number;
    supplier_name: string;
    total_owed: number;
    purchase_count: number;
}

interface PageProps {
    purchases: Purchase[];
    payables: Payable[];
    message?: { type: string; text: string };
    errors?: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const paymentBadge = (method: string | null, isPaid: boolean) => {
    if (isPaid && method !== "cash") return <Badge variant="outline" className="text-green-600 border-green-300">Paid</Badge>;
    if (method === "cash")           return <Badge variant="outline" className="text-blue-600 border-blue-300">Cash</Badge>;
    if (method === "credit")         return <Badge variant="outline" className="text-orange-600 border-orange-300">Credit</Badge>;
    if (method === "postdated_check")return <Badge variant="outline" className="text-purple-600 border-purple-300">PDC</Badge>;
    return <Badge variant="outline">—</Badge>;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PurchaseOrdersIndex() {
    const { props } = usePage<PageProps>();
    const { purchases, payables, message, errors } = props;

    const [search, setSearch] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [markPaidId, setMarkPaidId] = useState<number | null>(null);
    const [markPaidName, setMarkPaidName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (message?.type === "success") toast.success(message.text);
        if (message?.type === "error")   toast.error(message.text);
        if (errors?.error)               toast.error(errors.error);
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return purchases;
        return purchases.filter(
            (p) =>
                p.grn_number.toLowerCase().includes(q) ||
                (p.or_number?.toLowerCase().includes(q)) ||
                (p.supplier?.name.toLowerCase().includes(q))
        );
    }, [search, purchases]);

    const toggleRow = (id: number) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const confirmMarkPaid = () => {
        if (!markPaidId) return;
        setSubmitting(true);
        router.post(
            routes.purchaseOrders.markPaid(markPaidId),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setSubmitting(false);
                    setMarkPaidId(null);
                },
            }
        );
    };

    const totalPayables = payables.reduce((s, p) => s + p.total_owed, 0);

    return (
        <AdminLayout>
            <Head title="Purchase Orders" />
            <div className="p-6 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Purchase Orders</h1>
                        <p className="text-sm text-muted-foreground">
                            Track purchases from suppliers and payables.
                        </p>
                    </div>
                    <Button onClick={() => router.visit(routes.purchaseOrders.create())}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Purchase
                    </Button>
                </div>

                {/* Payables summary */}
                {payables.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="border-orange-200 dark:border-orange-900">
                            <CardContent className="pt-4 pb-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                                        Outstanding Payables
                                    </span>
                                </div>
                                <p className="text-2xl font-bold">
                                    ₱{totalPayables.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Across {payables.length} supplier{payables.length !== 1 ? "s" : ""}
                                </p>
                            </CardContent>
                        </Card>

                        {payables.map((payable) => (
                            <Card key={payable.supplier_id}>
                                <CardContent className="pt-4 pb-3">
                                    <p className="text-sm font-medium truncate">{payable.supplier_name}</p>
                                    <p className="text-xl font-bold mt-1">
                                        ₱{payable.total_owed.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {payable.purchase_count} unpaid purchase{payable.purchase_count !== 1 ? "s" : ""}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Search + Table */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by GRN, OR number, or supplier..."
                                    className="pl-9"
                                />
                            </div>
                            <span className="text-sm text-muted-foreground">
                                {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <PackageCheck className="h-10 w-10 mb-3 opacity-30" />
                                <p className="text-sm">No purchases found.</p>
                                {purchases.length === 0 && (
                                    <Button
                                        variant="outline"
                                        className="mt-4"
                                        onClick={() => router.visit(routes.purchaseOrders.create())}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Record First Purchase
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="w-8" />
                                        <TableHead>GRN #</TableHead>
                                        <TableHead>Supplier</TableHead>
                                        <TableHead>OR #</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="w-10" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((purchase) => (
                                        <>
                                            <TableRow
                                                key={purchase.id}
                                                className="cursor-pointer hover:bg-muted/30"
                                                onClick={() => toggleRow(purchase.id)}
                                            >
                                                <TableCell>
                                                    {expandedRows.has(purchase.id)
                                                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    }
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-medium">
                                                    {purchase.grn_number}
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-medium text-sm">
                                                        {purchase.supplier?.name ?? "—"}
                                                    </p>
                                                    {purchase.supplier?.contact_person && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {purchase.supplier.contact_person}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {purchase.or_number ?? "—"}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {purchase.received_date ?? purchase.created_at}
                                                </TableCell>
                                                <TableCell>
                                                    {paymentBadge(purchase.payment_method, purchase.is_paid)}
                                                    {purchase.payment_method === "postdated_check" && purchase.check_date && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {purchase.check_number} · {purchase.check_date}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-sm">
                                                    ₱{purchase.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {purchase.is_paid ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-orange-500 mx-auto" />
                                                    )}
                                                </TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => router.visit(routes.purchaseOrders.show(purchase.id))}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Expanded items */}
                                            {expandedRows.has(purchase.id) && (
                                                <TableRow key={`${purchase.id}-items`} className="bg-muted/20">
                                                    <TableCell colSpan={9} className="pt-0 pb-3 px-6">
                                                        <div className="rounded-md border border-border overflow-hidden mt-2">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="bg-muted/60">
                                                                        <TableHead className="h-8 text-xs">Product</TableHead>
                                                                        <TableHead className="h-8 text-xs text-right w-24">Qty</TableHead>
                                                                        <TableHead className="h-8 text-xs text-right w-32">Unit Cost</TableHead>
                                                                        <TableHead className="h-8 text-xs text-right w-28">Total</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {purchase.items.map((item, idx) => (
                                                                        <TableRow key={idx}>
                                                                            <TableCell className="text-sm py-2">{item.product_name}</TableCell>
                                                                            <TableCell className="text-sm text-right py-2">{item.quantity}</TableCell>
                                                                            <TableCell className="text-sm text-right py-2">
                                                                                ₱{item.unit_cost.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                                            </TableCell>
                                                                            <TableCell className="text-sm text-right py-2 font-medium">
                                                                                ₱{item.line_total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>

                                                        {/* Mark as paid button */}
                                                        {!purchase.is_paid && purchase.payment_method !== "cash" && (
                                                            <div className="flex justify-end mt-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                                                    onClick={() => {
                                                                        setMarkPaidId(purchase.id);
                                                                        setMarkPaidName(purchase.grn_number);
                                                                    }}
                                                                >
                                                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                                                    Mark as Paid
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Confirm Mark Paid Dialog */}
            <Dialog open={markPaidId !== null} onOpenChange={(open) => !open && setMarkPaidId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mark as Paid</DialogTitle>
                        <DialogDescription>
                            Confirm that <strong>{markPaidName}</strong> has been settled. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMarkPaidId(null)}>Cancel</Button>
                        <Button onClick={confirmMarkPaid} disabled={submitting}>
                            {submitting ? "Saving..." : "Confirm Payment"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
