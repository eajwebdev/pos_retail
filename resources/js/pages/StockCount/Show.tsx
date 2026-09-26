"use client";

import { useState, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { routes } from "@/routes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    ArrowLeft,
    Search,
    CheckCircle2,
    AlertTriangle,
    Save,
    XCircle,
    Clock,
    TrendingDown,
    TrendingUp,
    Minus,
    Eye,
    EyeOff,
    ChevronLeft,
    ChevronRight,
    Package,
    FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Session {
    id: number;
    name: string;
    type: "full" | "partial";
    status: "draft" | "committed" | "cancelled";
    note: string | null;
    counted_by: string;
    committed_by: string | null;
    items_total: number;
    items_counted: number;
    items_adjusted: number;
    progress: number;
    committed_at: string | null;
    created_at: string;
}

interface CountItem {
    id: number;
    product_id: number;
    product_name: string;
    category_name: string | null;
    item_type: "product" | "ingredient";
    snapshot_qty: number;
    unit_cost: number;
    counted_qty: number | null;
    delta: number | null;
    cost_impact: number | null;
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface PageProps {
    session: Session;
    items: CountItem[];
    pagination: Pagination;
    categories: string[];
    type_counts: Record<string, number>;
    filters: {
        search: string;
        category: string;
        item_type: string;
        view: string;
    };
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StockCountShow() {
    const { props } = usePage<PageProps>();
    const { session, items: serverItems, pagination, categories, type_counts, filters } = props;

    const isDraft     = session.status === "draft";

    // Local edits — track per item.id (only items on current page)
    const [counts, setCounts] = useState<Record<number, string>>(() => {
        const m: Record<number, string> = {};
        serverItems.forEach(item => {
            m[item.id] = item.counted_qty !== null && item.counted_qty !== undefined
                ? String(item.counted_qty) : "";
        });
        return m;
    });

    const [dirty,       setDirty]       = useState(false);
    const [saving,      setSaving]      = useState(false);
    const [commitOpen,  setCommitOpen]  = useState(false);
    const [cancelOpen,  setCancelOpen]  = useState(false);
    const [commitNote,  setCommitNote]  = useState(session.note ?? "");
    const [committing,  setCommitting]  = useState(false);
    const [cancelling,  setCancelling]  = useState(false);
    const [hideSnapshot,setHideSnapshot]= useState(false);

    // Filter state (mirrors URL — changes trigger Inertia visit)
    const [searchInput, setSearchInput] = useState(filters.search);

    // Compute derived items for the current page
    const derivedItems = useMemo(() => {
        return serverItems.map(item => {
            const raw     = counts[item.id];
            const counted = raw !== "" && raw !== undefined ? parseInt(raw, 10) : null;
            const delta   = counted !== null && !isNaN(counted) ? counted - item.snapshot_qty : null;
            const costImpact = delta !== null
                ? Math.round(delta * item.unit_cost * 100) / 100 : null;
            return { ...item, counted_qty: counted, delta, cost_impact: costImpact };
        });
    }, [serverItems, counts]);

    // Current-page stats
    const pageCounted   = derivedItems.filter(i => i.counted_qty !== null && !isNaN(i.counted_qty as number)).length;
    const pageVariance  = derivedItems.filter(i => i.delta !== null && i.delta !== 0).length;
    const pageShortages = derivedItems.filter(i => i.delta !== null && i.delta < 0).length;
    const pageSurpluses = derivedItems.filter(i => i.delta !== null && i.delta > 0).length;
    const pageCostAdj   = derivedItems.reduce((s, i) => s + (i.cost_impact ?? 0), 0);

    function handleInput(itemId: number, val: string) {
        setCounts(prev => ({ ...prev, [itemId]: val }));
        setDirty(true);
    }

    // Navigate with filters — saves dirty changes first if needed
    function navigate(params: Record<string, string>, saveFirst = false) {
        const merged = {
            search:    filters.search,
            category:  filters.category,
            item_type: filters.item_type,
            view:      filters.view,
            page:      String(pagination.current_page),
            ...params,
        };
        // Strip empty
        Object.keys(merged).forEach(k => { if (!merged[k] || merged[k] === "all") delete merged[k]; });

        if (saveFirst && dirty) {
            doSave(() => router.get(routes.stockCount.show(session.id), merged, { preserveScroll: false }));
        } else {
            router.get(routes.stockCount.show(session.id), merged, { preserveScroll: false });
        }
    }

    function handleSearchSubmit(e: React.FormEvent) {
        e.preventDefault();
        navigate({ search: searchInput, page: "1" }, true);
    }

    function doSave(onSuccess?: () => void) {
        setSaving(true);
        const payload = serverItems.map(item => ({
            item_id:     item.id,
            counted_qty: counts[item.id] !== "" ? counts[item.id] : null,
        }));
        router.patch(
            routes.stockCount.save(session.id),
            { counts: payload },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setDirty(false);
                    setSaving(false);
                    onSuccess?.();
                },
                onError: () => setSaving(false),
            }
        );
    }

    function handleCommit() {
        setCommitting(true);
        const payload = serverItems.map(item => ({
            item_id:     item.id,
            counted_qty: counts[item.id] !== "" ? counts[item.id] : null,
        }));
        router.patch(
            routes.stockCount.save(session.id),
            { counts: payload },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    router.post(
                        routes.stockCount.commit(session.id),
                        { note: commitNote },
                        {
                            onSuccess: () => setCommitting(false),
                            onError:   () => setCommitting(false),
                        }
                    );
                },
                onError: () => setCommitting(false),
            }
        );
    }

    function handleCancel() {
        setCancelling(true);
        router.delete(routes.stockCount.cancel(session.id), {
            onSuccess: () => setCancelling(false),
            onError:   () => setCancelling(false),
        });
    }

    const productCount    = type_counts["product"]    ?? 0;
    const ingredientCount = type_counts["ingredient"] ?? 0;
    const hasIngredients  = ingredientCount > 0;

    const statusBadge = () => {
        if (session.status === "committed") return (
            <Badge variant="outline" className="text-green-600 border-green-300 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Committed
            </Badge>
        );
        if (session.status === "cancelled") return (
            <Badge variant="outline" className="text-muted-foreground gap-1">
                <XCircle className="h-3 w-3" /> Cancelled
            </Badge>
        );
        return (
            <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1">
                <Clock className="h-3 w-3" /> In Progress
            </Badge>
        );
    };

    return (
        <AdminLayout>
            <Head title={session.name} />
            <div className="p-6 max-w-5xl mx-auto space-y-5">

                {/* Header */}
                <div className="flex items-start gap-3 flex-wrap">
                    <Button variant="ghost" size="icon"
                        onClick={() => {
                            if (dirty) doSave(() => router.visit(routes.stockCount.index()));
                            else router.visit(routes.stockCount.index());
                        }}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-semibold truncate">{session.name}</h1>
                            {statusBadge()}
                            <Badge variant="secondary" className="capitalize text-xs">{session.type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Started {session.created_at} by {session.counted_by}
                            {session.committed_at && ` · Committed ${session.committed_at} by ${session.committed_by}`}
                        </p>
                    </div>

                    {isDraft && (
                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                            <Button variant="outline" size="sm" className="gap-1 text-muted-foreground"
                                onClick={() => setHideSnapshot(v => !v)}
                            >
                                {hideSnapshot ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                {hideSnapshot ? "Show qty" : "Blind"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => doSave()}
                                disabled={saving || !dirty} className="gap-1"
                            >
                                <Save className="h-4 w-4" />
                                {saving ? "Saving…" : dirty ? "Save*" : "Saved"}
                            </Button>
                            <Button variant="outline" size="sm"
                                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                onClick={() => setCancelOpen(true)}
                            >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                            </Button>
                            <Button size="sm" onClick={() => setCommitOpen(true)} className="gap-1">
                                <CheckCircle2 className="h-4 w-4" />
                                Commit
                            </Button>
                        </div>
                    )}
                </div>

                {/* Progress + stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <Card className="sm:col-span-2">
                        <CardContent className="pt-3 pb-3">
                            <div className="flex justify-between items-center mb-1.5">
                                <p className="text-xs text-muted-foreground">Overall progress</p>
                                <p className="text-xs font-semibold">{session.items_counted}/{session.items_total}</p>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${session.progress}%` }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    {hasIngredients && (
                        <>
                            <Card>
                                <CardContent className="pt-3 pb-3 text-center">
                                    <p className="text-xl font-bold text-blue-600 flex items-center justify-center gap-1">
                                        <Package className="h-4 w-4" />{productCount}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Products</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-3 pb-3 text-center">
                                    <p className="text-xl font-bold text-purple-600 flex items-center justify-center gap-1">
                                        <FlaskConical className="h-4 w-4" />{ingredientCount}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Ingredients</p>
                                </CardContent>
                            </Card>
                        </>
                    )}
                    <Card>
                        <CardContent className="pt-3 pb-3 text-center">
                            <p className={cn("text-xl font-bold", pageVariance > 0 ? "text-orange-600" : "text-green-600")}>
                                {pageVariance}
                            </p>
                            <p className="text-xs text-muted-foreground">Variance (page)</p>
                        </CardContent>
                    </Card>
                    {!hasIngredients && (
                        <>
                            <Card>
                                <CardContent className="pt-3 pb-3 text-center">
                                    <p className="text-xl font-bold text-red-600">{pageShortages}</p>
                                    <p className="text-xs text-muted-foreground">Short</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-3 pb-3 text-center">
                                    <p className="text-xl font-bold text-green-600">{pageSurpluses}</p>
                                    <p className="text-xs text-muted-foreground">Surplus</p>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* Cost impact bar */}
                {pageVariance > 0 && (
                    <div className={cn(
                        "text-sm rounded-md px-3 py-2 border flex items-center gap-2",
                        pageCostAdj < 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
                    )}>
                        {pageCostAdj < 0 ? <TrendingDown className="h-4 w-4 shrink-0" /> : <TrendingUp className="h-4 w-4 shrink-0" />}
                        <span>
                            Page value adjustment: <strong>
                                {pageCostAdj >= 0 ? "+" : ""}
                                ₱{Math.abs(pageCostAdj).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </strong>
                        </span>
                    </div>
                )}

                {/* Filters row */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Search */}
                    <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-48 flex gap-1">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search product…"
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                className="pl-8 h-8 text-sm"
                            />
                        </div>
                        <Button type="submit" size="sm" variant="outline" className="h-8 shrink-0">Go</Button>
                    </form>

                    {/* Category */}
                    {categories.length > 0 && (
                        <Select
                            value={filters.category || "all"}
                            onValueChange={v => navigate({ category: v === "all" ? "" : v, page: "1" }, true)}
                        >
                            <SelectTrigger className="w-40 h-8 text-sm">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All categories</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* Item type tab filter */}
                    {hasIngredients && (
                        <div className="flex rounded-md border border-border overflow-hidden text-xs">
                            {([
                                { key: "all",        label: `All (${productCount + ingredientCount})`,   icon: null },
                                { key: "product",    label: `Products (${productCount})`,  icon: Package },
                                { key: "ingredient", label: `Ingredients (${ingredientCount})`, icon: FlaskConical },
                            ] as const).map(({ key, label, icon: Icon }) => (
                                <button key={key} type="button"
                                    onClick={() => navigate({ item_type: key, page: "1" }, true)}
                                    className={cn(
                                        "flex items-center gap-1 px-3 py-1.5 font-medium transition-colors",
                                        filters.item_type === key || (key === "all" && !filters.item_type)
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-muted/40 text-muted-foreground"
                                    )}
                                >
                                    {Icon && <Icon className="h-3 w-3" />}
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* View filter */}
                    <div className="flex rounded-md border border-border overflow-hidden text-xs">
                        {([
                            { key: "all",       label: "All" },
                            { key: "uncounted", label: "Uncounted" },
                            { key: "variance",  label: "Variance" },
                        ] as const).map(({ key, label }) => (
                            <button key={key} type="button"
                                onClick={() => navigate({ view: key, page: "1" }, true)}
                                className={cn(
                                    "px-3 py-1.5 font-medium transition-colors",
                                    filters.view === key || (key === "all" && !filters.view)
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted/40 text-muted-foreground"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Count sheet table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead>Product</TableHead>
                                    {!hideSnapshot && (
                                        <TableHead className="text-right w-28">
                                            System Qty
                                            <span className="block text-[10px] font-normal text-muted-foreground">at snapshot</span>
                                        </TableHead>
                                    )}
                                    <TableHead className="text-right w-32">
                                        Counted Qty
                                        {isDraft && <span className="block text-[10px] font-normal text-muted-foreground">type here</span>}
                                    </TableHead>
                                    <TableHead className="text-right w-28">Variance</TableHead>
                                    <TableHead className="text-right w-32 hidden sm:table-cell">Cost Impact</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {derivedItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={hideSnapshot ? 4 : 5} className="text-center py-10 text-muted-foreground text-sm">
                                            No items match your filter.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {derivedItems.map(item => {
                                    const isShortage = item.delta !== null && item.delta < 0;
                                    const isSurplus  = item.delta !== null && item.delta > 0;
                                    const notCounted = item.counted_qty === null || isNaN(item.counted_qty as number);

                                    return (
                                        <TableRow key={item.id} className={cn(
                                            isShortage ? "bg-red-50/40" :
                                            isSurplus  ? "bg-green-50/40" :
                                            notCounted && isDraft ? "bg-yellow-50/20" : ""
                                        )}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {item.item_type === "ingredient" ? (
                                                        <FlaskConical className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                                                    ) : (
                                                        <Package className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-sm">{item.product_name}</p>
                                                        {item.category_name && (
                                                            <p className="text-xs text-muted-foreground">{item.category_name}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            {!hideSnapshot && (
                                                <TableCell className="text-right text-sm text-muted-foreground">
                                                    {item.snapshot_qty}
                                                </TableCell>
                                            )}

                                            <TableCell className="text-right">
                                                {isDraft ? (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        placeholder="—"
                                                        value={counts[item.id] ?? ""}
                                                        onChange={e => handleInput(item.id, e.target.value)}
                                                        className={cn(
                                                            "h-7 w-20 text-right text-sm ml-auto",
                                                            notCounted && "border-dashed text-muted-foreground"
                                                        )}
                                                    />
                                                ) : (
                                                    <span className="text-sm">
                                                        {item.counted_qty !== null ? item.counted_qty : "—"}
                                                    </span>
                                                )}
                                            </TableCell>

                                            <TableCell className="text-right">
                                                {item.delta === null ? (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                ) : item.delta === 0 ? (
                                                    <Minus className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
                                                ) : (
                                                    <span className={cn("text-sm font-semibold",
                                                        isShortage ? "text-red-600" : "text-green-600"
                                                    )}>
                                                        {isSurplus ? "+" : ""}{item.delta}
                                                    </span>
                                                )}
                                            </TableCell>

                                            <TableCell className="text-right text-sm hidden sm:table-cell">
                                                {item.cost_impact === null ? (
                                                    <span className="text-muted-foreground">—</span>
                                                ) : item.cost_impact === 0 ? (
                                                    <span className="text-muted-foreground">₱0.00</span>
                                                ) : (
                                                    <span className={cn("font-medium",
                                                        item.cost_impact < 0 ? "text-red-600" : "text-green-600"
                                                    )}>
                                                        {item.cost_impact > 0 ? "+" : ""}
                                                        ₱{item.cost_impact.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        {pagination.last_page > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                                <p className="text-xs text-muted-foreground">
                                    {pagination.from ?? 0}–{pagination.to ?? 0} of {pagination.total} items
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={pagination.current_page <= 1}
                                        onClick={() => navigate({ page: String(pagination.current_page - 1) }, true)}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    {/* Page number pills */}
                                    {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                                        .filter(p =>
                                            p === 1 ||
                                            p === pagination.last_page ||
                                            Math.abs(p - pagination.current_page) <= 1
                                        )
                                        .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                                            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                                            acc.push(p);
                                            return acc;
                                        }, [])
                                        .map((p, i) =>
                                            p === "…" ? (
                                                <span key={`e${i}`} className="px-1.5 text-xs text-muted-foreground">…</span>
                                            ) : (
                                                <Button
                                                    key={p}
                                                    variant={p === pagination.current_page ? "default" : "outline"}
                                                    size="icon"
                                                    className="h-7 w-7 text-xs"
                                                    onClick={() => navigate({ page: String(p) }, true)}
                                                >
                                                    {p}
                                                </Button>
                                            )
                                        )
                                    }

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={pagination.current_page >= pagination.last_page}
                                        onClick={() => navigate({ page: String(pagination.current_page + 1) }, true)}
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Commit dialog */}
            <Dialog open={commitOpen} onOpenChange={setCommitOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Commit Stock Count</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-md bg-muted/30 px-3 py-2.5">
                                <p className="text-muted-foreground text-xs">Items counted</p>
                                <p className="font-bold text-base mt-0.5">{session.items_counted} / {session.items_total}</p>
                            </div>
                            <div className="rounded-md bg-muted/30 px-3 py-2.5">
                                <p className="text-muted-foreground text-xs">Items adjusted</p>
                                <p className={cn("font-bold text-base mt-0.5", session.items_adjusted > 0 ? "text-orange-600" : "text-green-600")}>
                                    {session.items_adjusted}
                                </p>
                            </div>
                        </div>

                        {session.items_counted < session.items_total && (
                            <div className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">
                                <strong>{session.items_total - session.items_counted}</strong> item(s) not yet counted will be skipped — their stock won't change.
                            </div>
                        )}

                        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
                            Formula: <strong>new qty = live qty + (counted − snapshot)</strong>.
                            Sales during the count are automatically accounted for.
                        </div>

                        <div className="space-y-1.5">
                            <Label>Note <span className="font-normal text-muted-foreground">(optional)</span></Label>
                            <Textarea value={commitNote} onChange={e => setCommitNote(e.target.value)}
                                placeholder="e.g. Monthly full count after closing" rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCommitOpen(false)} disabled={committing}>Cancel</Button>
                        <Button onClick={handleCommit} disabled={committing}>
                            {committing ? "Committing…" : "Commit Count"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel dialog */}
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Cancel Count Session?</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground py-2">
                        This will discard all counts for <strong>{session.name}</strong>. Stock won't change. Cannot be undone.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>Keep</Button>
                        <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                            {cancelling ? "Cancelling…" : "Cancel Session"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
