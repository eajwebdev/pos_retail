"use client";

import { useState, useMemo, useEffect } from "react";
import { usePage, router } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { routes } from "@/routes";
import { cn } from "@/lib/utils";
import {
    Plus, Search, X, Edit2, Trash2, AlertTriangle,
    Building2, CircleDot, Users, Phone, MapPin, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Supplier { id: number; name: string; }

interface Branch {
    id: number;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    contact_person: string | null;
    is_active: boolean;
    business_type: string;
    business_type_label: string;
    supplier_id: number | null;
    supplier: { id: number; name: string } | null;
    feature_flags: Record<string, boolean>;
    use_table_ordering: boolean;
    use_variants: boolean;
    use_expiry_tracking: boolean;
    use_recipe_system: boolean;
    use_bundles: boolean;
    users_count: number;
    product_stocks_count: number;
    created_at: string;
}

interface PageProps {
    branches:      Branch[];
    suppliers:     Supplier[];
    businessTypes: Record<string, string>;
    auth:          { user: { is_super_admin: boolean; is_administrator: boolean } | null };
    flash:         { message?: { type: string; text: string } };
    [key: string]: unknown;
}

type FormMode = "create" | "edit";

interface BranchForm {
    name: string; code: string; address: string; phone: string;
    contact_person: string; supplier_id: string; business_type: string;
    use_table_ordering: boolean; use_variants: boolean;
    use_expiry_tracking: boolean; use_recipe_system: boolean;
    use_bundles: boolean; is_active: boolean;
}

const EMPTY_FORM: BranchForm = {
    name: "", code: "", address: "", phone: "", contact_person: "",
    supplier_id: "", business_type: "retail",
    use_table_ordering: false, use_variants: false,
    use_expiry_tracking: false, use_recipe_system: false,
    use_bundles: false, is_active: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const typeBadge: Record<string, string> = {
    cafe:       "bg-purple-500/15 text-purple-400 border border-purple-500/20",
    restaurant: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
    food_stall: "bg-yellow-500/15 text-yellow-500 border border-yellow-500/20",
    bakery:     "bg-pink-500/15 text-pink-400 border border-pink-500/20",
    bar:        "bg-rose-500/15 text-rose-400 border border-rose-500/20",
    retail:     "bg-blue-500/15 text-blue-400 border border-blue-500/20",
    pharmacy:   "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    hardware:   "bg-stone-500/15 text-stone-400 border border-stone-500/20",
    salon:      "bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/20",
    laundry:    "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20",
    school:     "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20",
    warehouse:  "bg-slate-500/15 text-slate-400 border border-slate-500/20",
    mixed:      "bg-teal-500/15 text-teal-400 border border-teal-500/20",
};

const typeIcon: Record<string, string> = {
    cafe:       "☕",
    restaurant: "🍽",
    food_stall: "🥘",
    bakery:     "🥐",
    bar:        "🍺",
    retail:     "🛒",
    pharmacy:   "💊",
    hardware:   "🔧",
    salon:      "✂️",
    laundry:    "👕",
    school:     "🎓",
    warehouse:  "🏭",
    mixed:      "🏪",
};

const defaultFlags: Record<string, Partial<BranchForm>> = {
    cafe:       { use_table_ordering: false, use_variants: true,  use_expiry_tracking: false, use_recipe_system: true,  use_bundles: false },
    restaurant: { use_table_ordering: true,  use_variants: false, use_expiry_tracking: false, use_recipe_system: true,  use_bundles: false },
    food_stall: { use_table_ordering: false, use_variants: false, use_expiry_tracking: false, use_recipe_system: true,  use_bundles: false },
    bakery:     { use_table_ordering: false, use_variants: true,  use_expiry_tracking: true,  use_recipe_system: true,  use_bundles: true  },
    bar:        { use_table_ordering: true,  use_variants: true,  use_expiry_tracking: false, use_recipe_system: true,  use_bundles: true  },
    retail:     { use_table_ordering: false, use_variants: true,  use_expiry_tracking: true,  use_recipe_system: false, use_bundles: true  },
    pharmacy:   { use_table_ordering: false, use_variants: false, use_expiry_tracking: true,  use_recipe_system: false, use_bundles: false },
    hardware:   { use_table_ordering: false, use_variants: true,  use_expiry_tracking: false, use_recipe_system: false, use_bundles: true  },
    salon:      { use_table_ordering: false, use_variants: true,  use_expiry_tracking: false, use_recipe_system: false, use_bundles: true  },
    laundry:    { use_table_ordering: false, use_variants: true,  use_expiry_tracking: false, use_recipe_system: false, use_bundles: true  },
    school:     { use_table_ordering: false, use_variants: false, use_expiry_tracking: false, use_recipe_system: false, use_bundles: true  },
    warehouse:  { use_table_ordering: false, use_variants: true,  use_expiry_tracking: true,  use_recipe_system: false, use_bundles: false },
    mixed:      { use_table_ordering: true,  use_variants: true,  use_expiry_tracking: true,  use_recipe_system: true,  use_bundles: true  },
};

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, description }: {
    checked: boolean; onChange: (v: boolean) => void;
    label: string; description?: string;
}) {
    return (
        <label className={cn(
            "flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none",
            checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-accent/50"
        )}>
            <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            <div onClick={() => onChange(!checked)}
                className={cn("w-10 h-5 rounded-full transition-colors relative shrink-0",
                    checked ? "bg-primary" : "bg-muted")}>
                <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    checked ? "translate-x-5" : "translate-x-0.5")} />
            </div>
        </label>
    );
}

// ─── Branch Drawer ────────────────────────────────────────────────────────────

function BranchDrawer({ mode, branch, suppliers, businessTypes, onClose }: {
    mode: FormMode; branch: Branch | null;
    suppliers: Supplier[]; businessTypes: Record<string, string>;
    onClose: () => void;
}) {
    const [form,     setForm]     = useState<BranchForm>(EMPTY_FORM);
    const [tab,      setTab]      = useState<"info" | "flags">("info");
    const [loading,  setLoading]  = useState(false);
    const [errors,   setErrors]   = useState<Record<string, string>>({});

    useEffect(() => {
        if (mode === "edit" && branch) {
            setForm({
                name:                branch.name,
                code:                branch.code,
                address:             branch.address          ?? "",
                phone:               branch.phone            ?? "",
                contact_person:      branch.contact_person   ?? "",
                supplier_id:         branch.supplier_id?.toString() ?? "",
                business_type:       branch.business_type,
                use_table_ordering:  branch.use_table_ordering,
                use_variants:        branch.use_variants,
                use_expiry_tracking: branch.use_expiry_tracking,
                use_recipe_system:   branch.use_recipe_system,
                use_bundles:         branch.use_bundles,
                is_active:           branch.is_active,
            });
        } else {
            setForm(EMPTY_FORM);
        }
        setTab("info");
        setErrors({});
    }, [mode, branch]);

    const set = (k: keyof BranchForm, v: any) => {
        setForm(f => {
            const next = { ...f, [k]: v };
            if (k === "business_type" && defaultFlags[v]) {
                return { ...next, ...defaultFlags[v] };
            }
            return next;
        });
        setErrors(e => ({ ...e, [k]: "" }));
    };

    const handleSubmit = () => {
        setLoading(true); setErrors({});
        const payload = { ...form, supplier_id: form.supplier_id || null };
        const isCreate = mode === "create";
        const url = isCreate ? routes.branches.store() : routes.branches.update(branch!.id);

        if (isCreate) {
            router.post(url, payload, {
                preserveScroll: true,
                onSuccess: () => { setLoading(false); onClose(); },
                onError: (e: any) => { setErrors(e); setLoading(false); setTab("info"); },
            });
        } else {
            router.patch(url, payload, {
                preserveScroll: true,
                onSuccess: () => { setLoading(false); onClose(); },
                onError: (e: any) => { setErrors(e); setLoading(false); setTab("info"); },
            });
        }
    };

    const flagCount = [
        form.use_table_ordering, form.use_variants,
        form.use_expiry_tracking, form.use_recipe_system, form.use_bundles,
    ].filter(Boolean).length;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:w-[540px] bg-card border-l border-border flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div>
                        <p className="font-bold text-foreground">
                            {mode === "create" ? "Create Branch" : `Edit — ${branch?.name}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {mode === "create" ? "Add a new branch location" : "Update branch details and settings"}
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border shrink-0">
                    {(["info", "flags"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={cn("flex-1 py-2.5 text-sm font-semibold transition-colors",
                                tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
                            {t === "info" ? "Branch Info" : (
                                <span className="inline-flex items-center justify-center gap-1.5">
                                    Feature Flags
                                    {flagCount > 0 && (
                                        <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                                            {flagCount}
                                        </span>
                                    )}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {tab === "info" ? (
                        <div className="space-y-4">

                            {/* Name + Code */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="field-label">Branch Name <span className="text-destructive">*</span></label>
                                    <Input value={form.name} onChange={e => set("name", e.target.value)}
                                        placeholder="e.g. Main Branch"
                                        className={cn("h-9 mt-1", errors.name && "border-destructive")} />
                                    {errors.name && <p className="field-error">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="field-label">Code <span className="text-destructive">*</span></label>
                                    <Input value={form.code}
                                        onChange={e => set("code", e.target.value.toUpperCase())}
                                        placeholder="ABC1" maxLength={20}
                                        className={cn("h-9 mt-1 font-mono uppercase tracking-widest", errors.code && "border-destructive")} />
                                    {errors.code && <p className="field-error">{errors.code}</p>}
                                </div>
                            </div>

                            {/* Business Type */}
                            <div>
                                <label className="field-label">Business Type <span className="text-destructive">*</span></label>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                    {Object.entries(businessTypes).map(([val, label]) => (
                                        <button key={val} type="button" onClick={() => set("business_type", val)}
                                            className={cn(
                                                "flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                                                form.business_type === val
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border hover:border-primary/30 hover:bg-accent"
                                            )}>
                                            <span className="text-xl">{typeIcon[val]}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className={cn("text-xs font-semibold",
                                                    form.business_type === val ? "text-primary" : "text-foreground"
                                                )}>{label}</p>
                                            </div>
                                            {form.business_type === val && (
                                                <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {errors.business_type && <p className="field-error">{errors.business_type}</p>}
                            </div>

                            {/* Supplier */}
                            <div>
                                <label className="field-label">Linked Supplier</label>
                                <select value={form.supplier_id} onChange={e => set("supplier_id", e.target.value)}
                                    className="w-full h-9 mt-1 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                                    <option value="">No supplier linked</option>
                                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            {/* Phone + Contact */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="field-label">Phone</label>
                                    <Input value={form.phone} onChange={e => set("phone", e.target.value)}
                                        placeholder="+63 912 345 6789" className="h-9 mt-1" />
                                </div>
                                <div>
                                    <label className="field-label">Contact Person</label>
                                    <Input value={form.contact_person} onChange={e => set("contact_person", e.target.value)}
                                        placeholder="Juan Dela Cruz" className="h-9 mt-1" />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="field-label">Address</label>
                                <textarea value={form.address} onChange={e => set("address", e.target.value)}
                                    rows={2} placeholder="Street, City, Province"
                                    className="w-full mt-1 text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground text-foreground" />
                            </div>

                            {/* Active */}
                            <Toggle checked={form.is_active} onChange={v => set("is_active", v)}
                                label="Active" description="Inactive branches are hidden from operations" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground pb-1">
                                Flags are auto-set when you pick a business type but can be customized here.
                            </p>
                            <Toggle checked={form.use_table_ordering}  onChange={v => set("use_table_ordering", v)}
                                label="Table Ordering"     description="Dine-in table management and kitchen orders" />
                            <Toggle checked={form.use_variants}        onChange={v => set("use_variants", v)}
                                label="Product Variants"   description="Size / color / flavor variant support" />
                            <Toggle checked={form.use_expiry_tracking} onChange={v => set("use_expiry_tracking", v)}
                                label="Expiry Tracking"    description="Track batch numbers and expiry dates on stock" />
                            <Toggle checked={form.use_recipe_system}   onChange={v => set("use_recipe_system", v)}
                                label="Recipe / BOM"       description="Made-to-order products with ingredient recipes" />
                            <Toggle checked={form.use_bundles}         onChange={v => set("use_bundles", v)}
                                label="Product Bundles"    description="Bundle multiple products into one sellable item" />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-border p-4 flex gap-3">
                    <Button variant="outline" className="flex-1 h-10" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button className="flex-1 h-10 gap-2 font-semibold" onClick={handleSubmit} disabled={loading}>
                        {loading && <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />}
                        {mode === "create" ? "Create Branch" : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteDialog({ branch, onClose }: { branch: Branch; onClose: () => void }) {
    const [reason,  setReason]  = useState("");
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState("");

    const handleDelete = () => {
        setLoading(true); setError("");
        router.delete(routes.branches.destroy(branch.id), {
            data: { reason },
            preserveScroll: true,
            onSuccess: () => { setLoading(false); onClose(); },
            onError: e => { setError(Object.values(e)[0] as string); setLoading(false); },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-destructive/10 shrink-0">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                        <p className="font-bold text-foreground">Delete branch?</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-semibold">{branch.name}</span>
                            <span className="font-mono ml-1.5 opacity-60">({branch.code})</span>
                        </p>
                    </div>
                </div>

                {/* Warnings if branch has dependents */}
                {(branch.users_count > 0 || branch.product_stocks_count > 0) && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400 space-y-1">
                        {branch.users_count > 0 && (
                            <p>⚠ {branch.users_count} user{branch.users_count !== 1 ? "s" : ""} assigned to this branch</p>
                        )}
                        {branch.product_stocks_count > 0 && (
                            <p>⚠ {branch.product_stocks_count.toLocaleString()} stock record{branch.product_stocks_count !== 1 ? "s" : ""} attached</p>
                        )}
                    </div>
                )}

                <div>
                    <label className="field-label">Reason (optional)</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                        placeholder="e.g. Branch closed permanently…"
                        className="w-full mt-1 text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground text-foreground" />
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-9" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button variant="destructive" className="flex-1 h-9 gap-2" onClick={handleDelete} disabled={loading}>
                        {loading && <span className="h-3.5 w-3.5 rounded-full border-2 border-destructive-foreground/30 border-t-destructive-foreground animate-spin" />}
                        Delete
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BranchesIndex() {
    const { branches, suppliers, businessTypes, auth, flash } = usePage<PageProps>().props;

    const [search,       setSearch]       = useState("");
    const [typeFilter,   setTypeFilter]   = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [drawer,       setDrawer]       = useState<{ mode: FormMode; branch: Branch | null } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
    const [toast,        setToast]        = useState<{ type: string; text: string } | null>(flash?.message ?? null);

    const filtered = useMemo(() => {
        let list = branches;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(b =>
                b.name.toLowerCase().includes(q) ||
                b.code.toLowerCase().includes(q) ||
                (b.address ?? "").toLowerCase().includes(q)
            );
        }
        if (typeFilter)   list = list.filter(b => b.business_type === typeFilter);
        if (statusFilter) list = list.filter(b => statusFilter === "active" ? b.is_active : !b.is_active);
        return list;
    }, [branches, search, typeFilter, statusFilter]);

    const canManage = auth?.user?.is_super_admin || auth?.user?.is_administrator;
    const activeCount = branches.filter(b => b.is_active).length;

    const handleToggle = (b: Branch) => {
        router.patch(routes.branches.toggle(b.id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            {toast && (
                <div className={cn(
                    "fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium",
                    toast.type === "success"
                        ? "bg-[#0b1a10] border-emerald-500/40 text-emerald-300"
                        : "bg-[#1a0b0b] border-red-500/40 text-red-300"
                )}>
                    <span>{toast.type === "success" ? "✓" : "✕"}</span>
                    <span>{toast.text}</span>
                    <button onClick={() => setToast(null)} className="ml-1 opacity-50 hover:opacity-100">✕</button>
                </div>
            )}

            <div className="space-y-5 max-w-[1400px] mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Branches</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {branches.length} branch{branches.length !== 1 ? "es" : ""} · {activeCount} active
                        </p>
                    </div>
                    {canManage && (
                        <Button className="gap-2 h-9 font-semibold"
                            onClick={() => setDrawer({ mode: "create", branch: null })}>
                            <Plus className="h-4 w-4" /> Add Branch
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name, code, or address…"
                                className="w-full h-9 pl-9 pr-9 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-foreground" />
                            {search && (
                                <button onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                            className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground min-w-[160px]">
                            <option value="">All types</option>
                            {Object.entries(businessTypes).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground min-w-[130px]">
                            <option value="">All status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        {(search || typeFilter || statusFilter) && (
                            <button onClick={() => { setSearch(""); setTypeFilter(""); setStatusFilter(""); }}
                                className="h-9 px-3 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted flex items-center gap-1.5 transition-colors">
                                <X className="h-3.5 w-3.5" /> Clear
                            </button>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                {/* Summary cards — clickable to filter by type */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {Object.entries(businessTypes).map(([type, label]) => {
                        const count = branches.filter(b => b.business_type === type).length;
                        return (
                            <button key={type}
                                onClick={() => setTypeFilter(typeFilter === type ? "" : type)}
                                className={cn("bg-card border rounded-xl p-4 text-left transition-all hover:shadow-sm",
                                    typeFilter === type ? "border-primary bg-primary/5" : "border-border")}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-lg">{typeIcon[type]}</span>
                                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize", typeBadge[type])}>
                                        {type}
                                    </span>
                                </div>
                                <p className="text-2xl font-bold tabular-nums text-foreground">{count}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{label}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    {["Branch", "Type", "Contact", "Features", "Users", "Status", ""].map((h, i) => (
                                        <th key={i} className={cn(
                                            "px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest",
                                            i === 0 ? "text-left" : i === 6 ? "text-right w-10" : "text-left",
                                            i === 2 ? "hidden md:table-cell" : "",
                                            i === 3 ? "hidden lg:table-cell" : "",
                                            i === 4 ? "hidden sm:table-cell" : "",
                                        )}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                            No branches found
                                        </td>
                                    </tr>
                                ) : filtered.map(b => {
                                    const activeFlags = Object.values(b.feature_flags).filter(Boolean).length;
                                    return (
                                        <tr key={b.id} className="hover:bg-muted/20 transition-colors group">

                                            {/* Name + Code */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-9 w-9 rounded-xl flex items-center justify-center text-base shrink-0",
                                                        b.is_active ? "bg-primary/10" : "bg-muted"
                                                    )}>
                                                        {typeIcon[b.business_type]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-semibold text-foreground truncate">{b.name}</p>
                                                            {!b.is_active && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                                                                    inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground font-mono tracking-wider">{b.code}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Business type */}
                                            <td className="px-4 py-3">
                                                <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full capitalize", typeBadge[b.business_type])}>
                                                    {b.business_type}
                                                </span>
                                            </td>

                                            {/* Contact */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <div className="space-y-0.5 min-w-0">
                                                    {b.contact_person && (
                                                        <p className="text-xs text-foreground font-medium flex items-center gap-1.5 truncate">
                                                            <User className="h-3 w-3 text-muted-foreground shrink-0" />{b.contact_person}
                                                        </p>
                                                    )}
                                                    {b.phone && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                            <Phone className="h-3 w-3 shrink-0" />{b.phone}
                                                        </p>
                                                    )}
                                                    {b.address && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 max-w-[200px] truncate">
                                                            <MapPin className="h-3 w-3 shrink-0" />{b.address}
                                                        </p>
                                                    )}
                                                    {!b.contact_person && !b.phone && !b.address && (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Feature flags */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden w-16">
                                                        <div className="bg-primary h-full rounded-full transition-all"
                                                            style={{ width: `${(activeFlags / 5) * 100}%` }} />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{activeFlags}/5</span>
                                                </div>
                                                <div className="flex gap-1 flex-wrap">
                                                    {b.use_table_ordering  && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">tables</span>}
                                                    {b.use_variants        && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">variants</span>}
                                                    {b.use_expiry_tracking && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">expiry</span>}
                                                    {b.use_recipe_system   && <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400">recipes</span>}
                                                    {b.use_bundles         && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400">bundles</span>}
                                                </div>
                                            </td>

                                            {/* Users */}
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Users className="h-3.5 w-3.5" />
                                                    <span className="text-sm tabular-nums">{b.users_count}</span>
                                                </div>
                                            </td>

                                            {/* Status — clickable toggle */}
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => canManage && handleToggle(b)}
                                                    disabled={!canManage}
                                                    title={b.is_active ? "Click to deactivate" : "Click to activate"}
                                                    className={cn(
                                                        "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all",
                                                        b.is_active
                                                            ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                                                            : "bg-muted text-muted-foreground hover:bg-muted/80",
                                                        !canManage && "cursor-default"
                                                    )}>
                                                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0",
                                                        b.is_active ? "bg-emerald-400" : "bg-muted-foreground/50")} />
                                                    {b.is_active ? "Active" : "Inactive"}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-right">
                                                {canManage && (
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setDrawer({ mode: "edit", branch: b })}
                                                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                                            title="Edit">
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button onClick={() => setDeleteTarget(b)}
                                                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                                                            title="Delete">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {drawer && (
                <BranchDrawer
                    mode={drawer.mode}
                    branch={drawer.branch}
                    suppliers={suppliers}
                    businessTypes={businessTypes}
                    onClose={() => setDrawer(null)}
                />
            )}

            {deleteTarget && (
                <DeleteDialog branch={deleteTarget} onClose={() => setDeleteTarget(null)} />
            )}
        </AdminLayout>
    );
}