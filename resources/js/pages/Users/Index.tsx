"use client";

import { useState, useMemo } from "react";
import { usePage, router } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { routes } from "@/routes";
import { cn } from "@/lib/utils";
import {
    Plus, Search, X, Edit2, Trash2, Shield, ChevronDown,
    Eye, EyeOff, Users, Key,
    CheckSquare, Square, AlertTriangle, User as UserIcon,
    CircleDot, LayoutGrid, Tablet, List, Coffee,
    UtensilsCrossed, Scissors, Monitor, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Branch {
    id: number; name: string; code: string; business_type: string;
}
interface UserRow {
    id: number; fname: string; lname: string; full_name: string;
    username: string; role: string; role_label: string;
    branch_id: number | null; branch: Branch | null;
    access: string[]; pos_layout: string; pos_layout_label: string;
    created_at: string; is_self: boolean;
}
interface MenuGroup { [menuId: string]: string }
interface PageProps {
    users:    UserRow[];
    branches: Branch[];
    roles:    Record<string, string>;
    menus:    Record<string, MenuGroup>;
    menuIds:  string[];
    auth:     { user: { is_super_admin: boolean; is_administrator: boolean } | null };
    flash:    { message?: { type: string; text: string } };
    [key: string]: unknown;
}

type FormMode = "create" | "edit";

interface UserForm {
    fname: string; lname: string; username: string; password: string;
    role: string; branch_id: string; access: string[]; pos_layout: string;
}

const EMPTY_FORM: UserForm = {
    fname: "", lname: "", username: "", password: "",
    role: "cashier", branch_id: "", access: [], pos_layout: "grid",
};

// ─── POS Layout definitions ───────────────────────────────────────────────────

interface PosLayoutDef {
    value: string;
    label: string;
    icon: React.ElementType;
    desc: string;
    /** Business types this layout suits best */
    bestFor: string[];
}

const POS_LAYOUTS: PosLayoutDef[] = [
    { value: "grid",       label: "PC / Standard",     icon: LayoutGrid,       desc: "Image cards, 4–5 columns. Best for retail & general use.",          bestFor: ["retail","hardware","pharmacy","warehouse","school","laundry","mixed"] },
    { value: "tablet",     label: "Tablet / Touch",    icon: Tablet,           desc: "Large touch targets, 3 columns. Good for any tablet POS.",          bestFor: [] },
    { value: "grocery",    label: "Grocery / Fast",    icon: List,             desc: "Compact rows with barcode. Best for high-volume item scanning.",     bestFor: [] },
    { value: "cafe",       label: "Cafe / Quick",      icon: Coffee,           desc: "Category-first, text tiles, no images. Fast for F&B ordering.",     bestFor: ["cafe","bakery","food_stall"] },
    { value: "restaurant", label: "Restaurant / Table",icon: UtensilsCrossed,  desc: "Table map + dine-in orders. For seated service.",                   bestFor: ["restaurant","bar"] },
    { value: "salon",      label: "Salon / Service",   icon: Scissors,         desc: "Service cards with duration. Customer name required at checkout.",   bestFor: ["salon"] },
    { value: "kiosk",      label: "Kiosk / Self-serve",icon: Monitor,          desc: "Fullscreen large cards, floating checkout bar. Self-service POS.",   bestFor: [] },
    { value: "mobile",     label: "Mobile / Phone",    icon: Smartphone,       desc: "Compact vertical layout for Android phones. Single-column, thumb-friendly.", bestFor: [] },
];

function getPosLayoutDef(value: string) {
    return POS_LAYOUTS.find(l => l.value === value) ?? POS_LAYOUTS[0];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roleBadgeColor: Record<string, string> = {
    super_admin:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    administrator: "bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300",
    manager:       "bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-400",
    cashier:       "bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-400",
};

const branchTypeBadge: Record<string, string> = {
    cafe:       "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-300",
    retail:     "bg-blue-50   text-blue-600   dark:bg-blue-900/20   dark:text-blue-300",
    restaurant: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300",
    mixed:      "bg-teal-50   text-teal-600   dark:bg-teal-900/20   dark:text-teal-300",
};

const layoutBadgeColor: Record<string, string> = {
    grid:       "bg-slate-500/15 text-slate-400 border border-slate-500/20",
    tablet:     "bg-blue-500/15 text-blue-400 border border-blue-500/20",
    grocery:    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    cafe:       "bg-purple-500/15 text-purple-400 border border-purple-500/20",
    restaurant: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
    salon:      "bg-pink-500/15 text-pink-400 border border-pink-500/20",
    kiosk:      "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20",
    mobile:     "bg-rose-500/15 text-rose-400 border border-rose-500/20",
};

// ─── Access checkbox grid ─────────────────────────────────────────────────────

function AccessGrid({ menus, value, onChange }: {
    menus: Record<string, MenuGroup>;
    value: string[];
    onChange: (access: string[]) => void;
}) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggle = (id: string) => {
        onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
    };

    const toggleGroup = (ids: string[]) => {
        const allOn = ids.every(id => value.includes(id));
        onChange(allOn ? value.filter(v => !ids.includes(v)) : [...new Set([...value, ...ids])]);
    };

    const groupLabel: Record<string, string> = {
        main: "Main", sales: "Sales", inventory: "Inventory",
        cash: "Cash", reports: "Reports", management: "Management",
    };

    const presets: { label: string; ids: string[] }[] = [
        { label: "All access",     ids: Object.values(menus).flatMap(g => Object.keys(g)) },
        { label: "Manager preset", ids: ["1","2","3","4","5","6","11","12","13","14","15","16","17","18","19","20","21","22","29"] },
        { label: "Cashier preset", ids: ["1","2","4","14","15","16"] },
        { label: "Clear all",      ids: [] },
    ];

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/50">
                {presets.map(p => (
                    <button key={p.label} type="button" onClick={() => onChange(p.ids)}
                        className="h-6 px-2.5 text-[11px] font-medium rounded-full border border-border hover:border-primary/40 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                        {p.label}
                    </button>
                ))}
            </div>
            {Object.entries(menus).map(([group, items]) => {
                const ids    = Object.keys(items);
                const allOn  = ids.every(id => value.includes(id));
                const someOn = ids.some(id => value.includes(id));
                const isOpen = expanded[group] !== false;
                return (
                    <div key={group} className="border border-border rounded-xl overflow-hidden">
                        <button type="button"
                            onClick={() => setExpanded(e => ({ ...e, [group]: !isOpen }))}
                            className="w-full flex items-center gap-3 px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                            <button type="button" onClick={e => { e.stopPropagation(); toggleGroup(ids); }}
                                className="shrink-0 text-muted-foreground hover:text-primary transition-colors">
                                {allOn
                                    ? <CheckSquare className="h-4 w-4 text-primary" />
                                    : someOn
                                        ? <div className="h-4 w-4 rounded border-2 border-primary flex items-center justify-center"><div className="h-1.5 w-1.5 bg-primary rounded-sm" /></div>
                                        : <Square className="h-4 w-4" />}
                            </button>
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex-1">
                                {groupLabel[group] ?? group}
                            </span>
                            <span className="text-[10px] text-muted-foreground tabular-nums mr-1">
                                {ids.filter(id => value.includes(id)).length}/{ids.length}
                            </span>
                            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0", !isOpen && "-rotate-90")} />
                        </button>
                        {isOpen && (
                            <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {Object.entries(items).map(([id, label]) => {
                                    const checked = value.includes(id);
                                    return (
                                        <label key={id}
                                            className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors select-none",
                                                checked ? "bg-primary/8 dark:bg-primary/10" : "hover:bg-accent")}>
                                            <input type="checkbox" checked={checked} onChange={() => toggle(id)} className="sr-only" />
                                            <div className={cn("h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                                                checked ? "border-primary bg-primary" : "border-border")}>
                                                {checked && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <span className="text-xs text-foreground leading-tight">{label}</span>
                                            <span className="text-[10px] text-muted-foreground/60 font-mono ml-auto">{id}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
            <p className="text-[11px] text-muted-foreground text-right">
                {value.length} menu{value.length !== 1 ? "s" : ""} selected
            </p>
        </div>
    );
}

// ─── POS Settings tab ─────────────────────────────────────────────────────────

function PosSettingsTab({ value, onChange, branchBusinessType }: {
    value: string;
    onChange: (layout: string) => void;
    branchBusinessType?: string;
}) {
    const recommended = POS_LAYOUTS.filter(l => l.bestFor.includes(branchBusinessType ?? ""));
    const others      = POS_LAYOUTS.filter(l => !l.bestFor.includes(branchBusinessType ?? ""));

    return (
        <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                This sets the <span className="font-semibold text-foreground">default POS layout</span> when this user logs in as cashier.
                They can still switch layouts manually from the POS screen, but this is what loads first.
            </div>

            {recommended.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">
                        Recommended for {branchBusinessType?.replace("_", " ")}
                    </p>
                    {recommended.map(l => <LayoutOption key={l.value} l={l} selected={value === l.value} onSelect={onChange} />)}
                </div>
            )}

            <div className="space-y-2">
                {recommended.length > 0 && (
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Other layouts</p>
                )}
                {others.map(l => <LayoutOption key={l.value} l={l} selected={value === l.value} onSelect={onChange} />)}
            </div>
        </div>
    );
}

function LayoutOption({ l, selected, onSelect }: {
    l: PosLayoutDef; selected: boolean; onSelect: (v: string) => void;
}) {
    const Icon = l.icon;
    return (
        <button type="button" onClick={() => onSelect(l.value)}
            className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-primary/30 hover:bg-accent"
            )}>
            {/* Icon */}
            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <Icon className="h-4 w-4" />
            </div>

            {/* Label + desc */}
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", selected ? "text-primary" : "text-foreground")}>
                    {l.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{l.desc}</p>
            </div>

            {/* Selected indicator */}
            {selected
                ? <CircleDot className="h-4 w-4 text-primary shrink-0" />
                : <div className="h-4 w-4 rounded-full border-2 border-border shrink-0" />}
        </button>
    );
}

// ─── User form drawer ─────────────────────────────────────────────────────────

function UserDrawer({ mode, user, branches, roles, menus, menuIds, onClose }: {
    mode: FormMode; user: UserRow | null;
    branches: Branch[]; roles: Record<string, string>;
    menus: Record<string, MenuGroup>; menuIds: string[];
    onClose: () => void;
}) {
    const [form, setForm] = useState<UserForm>(user
        ? { fname: user.fname, lname: user.lname, username: user.username, password: "",
            role: user.role, branch_id: String(user.branch_id ?? ""),
            access: user.access, pos_layout: user.pos_layout ?? "grid" }
        : { ...EMPTY_FORM }
    );
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors,  setErrors]  = useState<Record<string, string>>({});
    const [tab,     setTab]     = useState<"info" | "access" | "pos">("info");

    const set = (k: keyof UserForm, v: any) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrors(e => ({ ...e, [k]: "" }));
    };

    // When branch changes, suggest a matching layout if current one is default
    const selectedBranch = branches.find(b => String(b.id) === String(form.branch_id));

    const handleSubmit = () => {
        setLoading(true); setErrors({});
        const opts = {
            preserveScroll: true,
            onSuccess: () => { setLoading(false); onClose(); },
            onError: (e: any) => { setErrors(e); setLoading(false); setTab("info"); },
        };
        if (mode === "create") {
            router.post(routes.users.store(), form as any, opts);
        } else {
            router.patch(routes.users.update(user!.id), form as any, opts);
        }
    };

    const tabs: { key: "info" | "access" | "pos"; label: string }[] = [
        { key: "info",   label: "User info" },
        { key: "access", label: "Menu access" },
        { key: "pos",    label: "POS Settings" },
    ];

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:w-[520px] bg-card border-l border-border flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <div>
                        <p className="font-bold text-foreground">
                            {mode === "create" ? "Create user" : `Edit — ${user?.full_name}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {mode === "create" ? "Fill in the details below" : "Update user details and access"}
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border shrink-0">
                    {tabs.map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={cn("flex-1 py-2.5 text-sm font-semibold transition-colors",
                                tab === t.key
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-muted-foreground hover:text-foreground")}>
                            {t.key === "pos" ? (
                                <span className="inline-flex items-center justify-center gap-1.5">
                                    POS Settings
                                    {/* Show current layout as a tiny badge */}
                                    {form.pos_layout && (
                                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", layoutBadgeColor[form.pos_layout])}>
                                            {getPosLayoutDef(form.pos_layout).label.split(" / ")[0]}
                                        </span>
                                    )}
                                </span>
                            ) : t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">

                    {/* ── User Info tab ────────────────────────── */}
                    {tab === "info" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="field-label">First name <span className="text-destructive">*</span></label>
                                    <Input value={form.fname} onChange={e => set("fname", e.target.value)}
                                        placeholder="Juan" className={cn("h-9 mt-1", errors.fname && "border-destructive")} />
                                    {errors.fname && <p className="field-error">{errors.fname}</p>}
                                </div>
                                <div>
                                    <label className="field-label">Last name <span className="text-destructive">*</span></label>
                                    <Input value={form.lname} onChange={e => set("lname", e.target.value)}
                                        placeholder="Dela Cruz" className={cn("h-9 mt-1", errors.lname && "border-destructive")} />
                                    {errors.lname && <p className="field-error">{errors.lname}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="field-label">Username <span className="text-destructive">*</span></label>
                                <Input value={form.username} onChange={e => set("username", e.target.value)}
                                    placeholder="juan.delacruz" autoComplete="off"
                                    className={cn("h-9 mt-1 font-mono", errors.username && "border-destructive")} />
                                {errors.username && <p className="field-error">{errors.username}</p>}
                            </div>

                            <div>
                                <label className="field-label">
                                    Password {mode === "edit" && <span className="text-muted-foreground font-normal ml-1">(leave blank to keep)</span>}
                                    {mode === "create" && <span className="text-destructive">*</span>}
                                </label>
                                <div className="relative mt-1">
                                    <Input value={form.password} onChange={e => set("password", e.target.value)}
                                        type={showPwd ? "text" : "password"} placeholder="Min. 6 characters"
                                        autoComplete="new-password"
                                        className={cn("h-9 pr-9", errors.password && "border-destructive")} />
                                    <button type="button" onClick={() => setShowPwd(p => !p)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        {showPwd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                                {errors.password && <p className="field-error">{errors.password}</p>}
                            </div>

                            <div>
                                <label className="field-label">Role <span className="text-destructive">*</span></label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                                    {Object.entries(roles).map(([val, label]) => (
                                        <button key={val} type="button" onClick={() => set("role", val)}
                                            className={cn("py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center",
                                                form.role === val
                                                    ? cn("border-primary shadow-sm", roleBadgeColor[val])
                                                    : "border-border text-muted-foreground hover:border-primary/40 hover:bg-accent")}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                {errors.role && <p className="field-error">{errors.role}</p>}
                            </div>

                            <div>
                                <label className="field-label">Branch <span className="text-destructive">*</span></label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 max-h-48 overflow-y-auto pr-1">
                                    {branches.map(b => (
                                        <button key={b.id} type="button" onClick={() => set("branch_id", String(b.id))}
                                            className={cn(
                                                "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all",
                                                String(form.branch_id) === String(b.id)
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-border hover:border-primary/30 hover:bg-accent"
                                            )}>
                                            <CircleDot className={cn("h-3.5 w-3.5 mt-0.5 shrink-0",
                                                String(form.branch_id) === String(b.id) ? "text-primary" : "text-muted-foreground/40")} />
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-foreground truncate">{b.name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] font-mono text-muted-foreground">{b.code}</span>
                                                    <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded-sm capitalize", branchTypeBadge[b.business_type] ?? "bg-muted text-muted-foreground")}>
                                                        {b.business_type}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {errors.branch_id && <p className="field-error">{errors.branch_id}</p>}
                            </div>
                        </div>
                    )}

                    {/* ── Menu Access tab ──────────────────────── */}
                    {tab === "access" && (
                        <AccessGrid menus={menus} value={form.access}
                            onChange={ids => set("access", ids)} />
                    )}

                    {/* ── POS Settings tab ─────────────────────── */}
                    {tab === "pos" && (
                        <PosSettingsTab
                            value={form.pos_layout}
                            onChange={v => set("pos_layout", v)}
                            branchBusinessType={selectedBranch?.business_type}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t border-border p-4 flex gap-3">
                    <Button variant="outline" className="flex-1 h-10" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button className="flex-1 h-10 gap-2 font-semibold" onClick={handleSubmit} disabled={loading}>
                        {loading && <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />}
                        {mode === "create" ? "Create user" : "Save changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
    const [reason,  setReason]  = useState("");
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState("");

    const handleDelete = () => {
        setLoading(true); setError("");
        router.delete(routes.users.destroy(user.id), {
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
                        <p className="font-bold text-foreground">Delete user?</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="font-semibold">{user.full_name}</span> · {user.username}
                        </p>
                    </div>
                </div>
                <div>
                    <label className="field-label">Reason (optional)</label>
                    <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                        placeholder="e.g. Resigned, duplicate account…"
                        className="w-full mt-1 text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-muted-foreground" />
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UsersIndex() {
    const { users, branches, roles, menus, menuIds, auth } = usePage<PageProps>().props;

    const [search,       setSearch]       = useState("");
    const [roleFilter,   setRoleFilter]   = useState("");
    const [branchFilter, setBranchFilter] = useState("");
    const [layoutFilter, setLayoutFilter] = useState("");
    const [drawer,       setDrawer]       = useState<{ mode: FormMode; user: UserRow | null } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);

    const filtered = useMemo(() => {
        let list = users;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(u => u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q));
        }
        if (roleFilter)   list = list.filter(u => u.role === roleFilter);
        if (branchFilter) list = list.filter(u => String(u.branch_id) === branchFilter);
        if (layoutFilter) list = list.filter(u => u.pos_layout === layoutFilter);
        return list;
    }, [users, search, roleFilter, branchFilter, layoutFilter]);

    const canManage = auth?.user?.is_super_admin || auth?.user?.is_administrator;

    const hasFilters = search || roleFilter || branchFilter || layoutFilter;

    return (
        <AdminLayout>
            <div className="space-y-5 max-w-[1400px] mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">User Management</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {users.length} user{users.length !== 1 ? "s" : ""} across {branches.length} branch{branches.length !== 1 ? "es" : ""}
                        </p>
                    </div>
                    {canManage && (
                        <Button className="gap-2 h-9 font-semibold"
                            onClick={() => setDrawer({ mode: "create", user: null })}>
                            <Plus className="h-4 w-4" /> Add user
                        </Button>
                    )}
                </div>

                {/* Filters */}
                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name or username…"
                                className="w-full h-9 pl-9 pr-9 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-foreground" />
                            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                        </div>
                        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                            className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground min-w-[140px]">
                            <option value="">All roles</option>
                            {Object.entries(roles).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                        </select>
                        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
                            className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground min-w-[140px]">
                            <option value="">All branches</option>
                            {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                        </select>
                        <select value={layoutFilter} onChange={e => setLayoutFilter(e.target.value)}
                            className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground min-w-[150px]">
                            <option value="">All POS layouts</option>
                            {POS_LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                        {hasFilters && (
                            <button onClick={() => { setSearch(""); setRoleFilter(""); setBranchFilter(""); setLayoutFilter(""); }}
                                className="h-9 px-3 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted flex items-center gap-1.5 transition-colors">
                                <X className="h-3.5 w-3.5" />Clear
                            </button>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(roles).map(([role, label]) => {
                        const count = users.filter(u => u.role === role).length;
                        return (
                            <button key={role} onClick={() => setRoleFilter(roleFilter === role ? "" : role)}
                                className={cn("bg-card border rounded-xl p-4 text-left transition-all hover:shadow-sm",
                                    roleFilter === role ? "border-primary bg-primary/5" : "border-border")}>
                                <p className={cn("text-[10px] font-bold uppercase tracking-wider", roleBadgeColor[role]?.split(" ")[1] ?? "text-muted-foreground")}>{label}</p>
                                <p className="text-2xl font-bold tabular-nums text-foreground mt-1">{count}</p>
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
                                    {["User", "Role", "Branch", "POS Layout", "Access", "Joined", ""].map((h, i) => (
                                        <th key={i} className={cn(
                                            "px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest",
                                            i === 0 ? "text-left" : i === 6 ? "text-right w-10" : "text-left",
                                            i === 2 ? "hidden md:table-cell" : "",
                                            i === 3 ? "hidden sm:table-cell" : "",
                                            i === 4 ? "hidden lg:table-cell" : "",
                                            i === 5 ? "hidden sm:table-cell" : "",
                                        )}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">No users found</td></tr>
                                ) : filtered.map(user => {
                                    const layoutDef = getPosLayoutDef(user.pos_layout);
                                    const LayoutIcon = layoutDef.icon;
                                    return (
                                        <tr key={user.id} className="hover:bg-muted/20 transition-colors group">

                                            {/* User */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0",
                                                        roleBadgeColor[user.role] ?? "bg-muted text-muted-foreground")}>
                                                        {user.fname.charAt(0)}{user.lname.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-semibold text-foreground truncate">{user.full_name}</p>
                                                            {user.is_self && (
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">you</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground font-mono">{user.username}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="px-4 py-3">
                                                <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", roleBadgeColor[user.role] ?? "bg-muted text-muted-foreground")}>
                                                    {user.role_label}
                                                </span>
                                            </td>

                                            {/* Branch */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                {user.branch ? (
                                                    <div>
                                                        <p className="text-sm text-foreground font-medium">{user.branch.name}</p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] font-mono text-muted-foreground">{user.branch.code}</span>
                                                            <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded-sm capitalize", branchTypeBadge[user.branch.business_type] ?? "bg-muted text-muted-foreground")}>
                                                                {user.branch.business_type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : <span className="text-muted-foreground text-xs">—</span>}
                                            </td>

                                            {/* POS Layout — new column */}
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <button
                                                    onClick={() => canManage && setDrawer({ mode: "edit", user })}
                                                    title="Click to change POS layout"
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all group/layout",
                                                        layoutBadgeColor[user.pos_layout] ?? "bg-muted text-muted-foreground border-border",
                                                        canManage && "hover:ring-1 hover:ring-primary/40 cursor-pointer"
                                                    )}>
                                                    <LayoutIcon className="h-3 w-3 shrink-0" />
                                                    <span className="text-[10px] font-bold">{layoutDef.label.split(" / ")[0]}</span>
                                                </button>
                                            </td>

                                            {/* Access count */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden w-20">
                                                        <div className="bg-primary h-full rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, (user.access.length / menuIds.length) * 100)}%` }} />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">{user.access.length}/{menuIds.length}</span>
                                                </div>
                                            </td>

                                            {/* Joined */}
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <p className="text-xs text-muted-foreground">
                                                    {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"}
                                                </p>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-right">
                                                {canManage && (
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setDrawer({ mode: "edit", user })}
                                                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                                            <Edit2 className="h-3.5 w-3.5" />
                                                        </button>
                                                        {!user.is_self && (
                                                            <button onClick={() => setDeleteTarget(user)}
                                                                className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
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
                <UserDrawer
                    mode={drawer.mode} user={drawer.user}
                    branches={branches} roles={roles}
                    menus={menus} menuIds={menuIds}
                    onClose={() => setDrawer(null)}
                />
            )}

            {deleteTarget && (
                <DeleteDialog user={deleteTarget} onClose={() => setDeleteTarget(null)} />
            )}
        </AdminLayout>
    );
}