import { useState, useEffect, useCallback, useRef } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { routes } from '@/routes';
import { cn } from '@/lib/utils';
import {
    Plus, Search, X, Edit2, Trash2, ChevronDown, ChevronLeft, ChevronRight,
    Package, Tag, Layers, GitMerge, ChefHat, Boxes,
    AlertTriangle, Eye, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductThumbnail from '@/components/ProductThumbnail';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductType = 'standard' | 'made_to_order' | 'bundle' | 'service';

interface StockRecord {
    branch_id: number;
    branch_name: string;
    stock: number;
    capital: number;
    markup: number;
    price: number;
    formatted_price: string;
    status: string;
    expiry_date: string | null;
    batch_number: string | null;
}

interface Variant {
    id: number;
    product_id: number;
    name: string;
    sku: string | null;
    barcode: string | null;
    attributes: Record<string, string> | null;
    extra_price: number;
    is_available: boolean;
    sort_order: number;
    total_stock: number;
}

interface BundleItem {
    id: number;
    component_product_id: number;
    component_product_name: string;
    component_variant_id: number | null;
    component_variant_name: string | null;
    quantity: number;
    override_price: number | null;
    is_required: boolean;
    notes: string | null;
    sort_order: number;
}

interface Bundle {
    id: number;
    pricing_mode: 'computed' | 'fixed';
    price_adjustment: number;
    build_notes: string | null;
    items: BundleItem[];
}

interface RecipeLine {
    id: number;
    ingredient_id: number;
    ingredient_name: string;
    quantity: number;
    unit: string;
    notes: string | null;
    formatted_quantity: string;
}

interface Product {
    id: number;
    name: string;
    unit?: string;
    barcode: string | null;
    product_img: string | null;
    product_type: ProductType;
    is_taxable: boolean;
    category: { id: number; name: string } | null;
    branch_stock: number;
    branch_stock_status: string;
    branch_price: number;
    branch_capital: number;
    branch_markup: number;
    global_stock: number;
    global_stock_formatted: string;
    global_stock_status: string;
    stocks: StockRecord[];
    variants: Variant[];
    bundle: Bundle | null;
    recipe: RecipeLine[];
    order_items_count: number;
}

interface VariantProduct {
    id: number; name: string;
    product_img: string | null;
    category: { id: number; name: string } | null;
    variants: Variant[];
}

interface BundleProduct {
    id: number; name: string;
    product_img: string | null;
    category: { id: number; name: string } | null;
    bundle: Bundle | null;
}

interface RecipeProduct {
    id: number; name: string;
    product_img: string | null;
    category: { id: number; name: string } | null;
    recipe: RecipeLine[];
}

interface StockRow {
    product_id: number;
    product_name: string;
    product_barcode: string | null;
    product_img: string | null;
    product_type: string;
    branch_id: number;
    branch_name: string;
    stock: number;
    capital: number;
    markup: number;
    price: number;
    formatted_price: string;
    status: string;
    expiry_date: string | null;
    batch_number: string | null;
}

interface Pagination {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
}

interface Category {
    id: number; name: string; slug: string;
    description: string | null; is_active: boolean; products_count: number;
}

interface Branch { id: number; name: string; code: string; }

interface SelectProduct { id: number; name: string; product_type: string; }

interface PageProps {
    products: Product[];
    pagination: Pagination;
    filters: { search: string; category_id: number | null; type: string; status: string; per_page: number; branch_id: number | null; };
    stats: { total_products: number; total_units: number; low_stock: number; out_of_stock: number; };
    variantProducts: VariantProduct[];
    bundleProducts: BundleProduct[];
    recipeProducts: RecipeProduct[];
    stockRows: StockRow[];
    stockPagination: Pagination;
    stockFilters: { search: string; branch_id: number | null; status: string; per_page: number; };
    categories: Category[];
    branches: Branch[];
    allProductsForSelect: SelectProduct[];
    isAdmin: boolean;
    userBranchId: number | null;
    userRole: string;
    tab?: string;
    flash?: { message?: { type: string; text: string } };
    errors?: Record<string, string>;
    [key: string]: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusBadge = (s: string) => ({
    'In Stock':     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    'Low Stock':    'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    'Near Expiry':  'bg-orange-500/15 text-orange-400 border border-orange-500/25',
    'Expired':      'bg-red-500/15 text-red-400 border border-red-500/25',
    'Out of Stock': 'bg-red-500/15 text-red-400 border border-red-500/25',
    'Bundle':       'bg-purple-500/15 text-purple-400 border border-purple-500/25',
}[s] ?? 'bg-muted text-muted-foreground border border-border');

const typeBadge = (t: ProductType) => ({
    bundle:        'bg-purple-500/15 text-purple-400 border border-purple-500/20',
    made_to_order: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
    service:       'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    standard:      'bg-slate-500/15 text-slate-400 border border-slate-500/20',
}[t]);

const typeLabel = (t: ProductType) => ({ bundle: 'Bundle', made_to_order: 'MTO', standard: 'Standard', service: 'Service' }[t]);

const inp = 'w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all';
const sel = inp;

// ─── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce(fn: (...args: any[]) => void, delay: number) {
    const timer = useRef<ReturnType<typeof setTimeout>>();
    return useCallback((...args: any[]) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => fn(...args), delay);
    }, [fn, delay]);
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: { type: string; text: string }; onClose: () => void }) {
    return (
        <div className={cn(
            'fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium',
            msg.type === 'success' ? 'bg-[#0b1a10] border-emerald-500/40 text-emerald-300' : 'bg-[#1a0b0b] border-red-500/40 text-red-300'
        )}>
            <span>{msg.type === 'success' ? '✓' : '✕'}</span>
            <span>{msg.text}</span>
            <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100">✕</button>
        </div>
    );
}

function Modal({ open, onClose, title, size = 'md', children }: {
    open: boolean; onClose: () => void; title: string; size?: 'sm' | 'md' | 'lg'; children: React.ReactNode;
}) {
    if (!open) return null;
    const w = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className={cn('relative bg-card border border-border rounded-2xl w-full shadow-2xl max-h-[92vh] flex flex-col', w)}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <h2 className="text-foreground font-semibold text-sm">{title}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">✕</button>
                </div>
                <div className="px-6 py-5 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
            {children}
            {hint && !error && <p className="text-muted-foreground/60 text-xs mt-1">{hint}</p>}
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
    );
}

function ConfirmModal({ open, onClose, title, message, onConfirm, processing }: {
    open: boolean; onClose: () => void; title: string; message: React.ReactNode; onConfirm: () => void; processing: boolean;
}) {
    return (
        <Modal open={open} onClose={onClose} title={title} size="sm">
            <div className="flex items-start gap-3 mb-5">
                <div className="p-2 rounded-full bg-red-500/10 shrink-0"><AlertTriangle className="h-5 w-5 text-red-400" /></div>
                <p className="text-muted-foreground text-sm pt-1">{message}</p>
            </div>
            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted">Cancel</button>
                <button onClick={onConfirm} disabled={processing} className="flex-1 py-2.5 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-medium disabled:opacity-50">
                    {processing ? 'Processing…' : 'Confirm'}
                </button>
            </div>
        </Modal>
    );
}

// ─── Pagination component ─────────────────────────────────────────────────────

function PaginationBar({ pagination, onPageChange, onPerPageChange, perPageOptions = [12, 24, 48, 96], loading = false }: {
    pagination: Pagination;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    perPageOptions?: number[];
    loading?: boolean;
}) {
    const { total, per_page, current_page, last_page, from, to } = pagination;
    if (total === 0) return null;

    const pages: (number | '...')[] = [];
    if (last_page <= 7) {
        for (let i = 1; i <= last_page; i++) pages.push(i);
    } else {
        pages.push(1);
        if (current_page > 3) pages.push('...');
        for (let i = Math.max(2, current_page - 1); i <= Math.min(last_page - 1, current_page + 1); i++) pages.push(i);
        if (current_page < last_page - 2) pages.push('...');
        pages.push(last_page);
    }

    return (
        <div className="flex items-center justify-between gap-4 pt-4 flex-wrap">
            {/* Left: count + per-page */}
            <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground tabular-nums">
                    {from ?? 0}–{to ?? 0} of <span className="font-semibold text-foreground">{total.toLocaleString()}</span>
                </p>
                <select
                    value={per_page}
                    onChange={e => onPerPageChange(Number(e.target.value))}
                    className="h-7 px-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                    {perPageOptions.map(n => <option key={n} value={n}>{n} / page</option>)}
                </select>
            </div>

            {/* Right: page buttons */}
            <div className="flex items-center gap-1">
                <button onClick={() => onPageChange(1)} disabled={current_page === 1 || loading}
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronsLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onPageChange(current_page - 1)} disabled={current_page === 1 || loading}
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {pages.map((p, i) => p === '...'
                    ? <span key={`ellipsis-${i}`} className="h-7 w-7 flex items-center justify-center text-xs text-muted-foreground">…</span>
                    : <button key={p} onClick={() => onPageChange(p as number)} disabled={loading}
                        className={cn('h-7 w-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors',
                            p === current_page
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}>{p}</button>
                )}

                <button onClick={() => onPageChange(current_page + 1)} disabled={current_page === last_page || loading}
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => onPageChange(last_page)} disabled={current_page === last_page || loading}
                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronsRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}

// ─── Product Form Modal ───────────────────────────────────────────────────────

function ProductFormModal({ open, onClose, product, categories, branches, isAdmin }: {
    open: boolean; onClose: () => void; product: Product | null;
    categories: Category[]; branches: Branch[]; isAdmin: boolean;
}) {
    const isEdit  = !!product;
    const fileRef = useRef<HTMLInputElement>(null);
    const { userBranchId } = usePage<PageProps>().props;

    // ── Local state — re-syncs every time `product` changes ──────────────────
    const [preview,     setPreview]     = useState<string | null>(null);
    const [name,        setName]        = useState('');
    const [barcode,     setBarcode]     = useState('');
    const [productType, setProductType] = useState<ProductType>('standard');
    const [categoryId,  setCategoryId]  = useState('');
    const [branchId,    setBranchId]    = useState('');
    const [stock,       setStock]       = useState('0');
    const [capital,     setCapital]     = useState('');
    const [markup,      setMarkup]      = useState('0');
    const [isTaxable,   setIsTaxable]   = useState(true);
    const [imageFile,   setImageFile]   = useState<File | null>(null);
    const [errors,      setErrors]      = useState<Record<string, string>>({});
    const [processing,  setProcessing]  = useState(false);

    // Re-populate whenever the product prop or open state changes
    useEffect(() => {
        if (open) {
            setPreview(product?.product_img ?? null);
            setName(product?.name ?? '');
            setBarcode(product?.barcode ?? '');
            setProductType(product?.product_type ?? 'standard');
            setCategoryId(product?.category?.id?.toString() ?? '');
            // branch_id: use the first stock record if present, else user's branch
            setBranchId((product?.stocks[0]?.branch_id ?? userBranchId ?? '').toString());
            setStock(product?.branch_stock?.toString() ?? '0');
            setCapital(product?.branch_capital?.toString() ?? '');
            setMarkup(product?.branch_markup?.toString() ?? '0');
            setIsTaxable(product?.is_taxable ?? true);
            setImageFile(null);
            setErrors({});
        }
    }, [open, product]);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        setImageFile(f); setPreview(URL.createObjectURL(f));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        // Build FormData manually — the only reliable way for file + method-spoofing
        const fd = new FormData();
        fd.append('name', name);
        fd.append('barcode', barcode);
        fd.append('product_type', productType);
        fd.append('category_id', categoryId);
        // Services and MTO don't track stock — always send 0
        fd.append('stock', (productType === 'service' || productType === 'made_to_order') ? '0' : stock);
        fd.append('capital', capital);
        fd.append('markup', markup);
        fd.append('is_taxable', isTaxable ? '1' : '0');
        if (isAdmin) fd.append('branch_id', branchId);
        // Only append image when user actually picked a new file
        if (imageFile) fd.append('product_img', imageFile);
        if (isEdit) fd.append('_method', 'PATCH');

        const url = isEdit ? routes.products.update(product!.id) : routes.products.store();

        router.post(url, fd as any, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => { setProcessing(false); onClose(); },
            onError: (errs) => { setErrors(errs); setProcessing(false); },
        });
    };

    const capitalNum = parseFloat(capital) || 0;
    const markupNum  = parseFloat(markup)  || 0;
    const pricePreview = capitalNum > 0 ? (capitalNum * (1 + markupNum / 100)).toFixed(2) : null;

    return (
        <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Product' : 'Add Product'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Image */}
                <div className="flex items-center gap-4">
                    <div onClick={() => fileRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 overflow-hidden bg-muted/30 flex items-center justify-center shrink-0">
                        {preview ? (
                            <img src={preview} className="w-full h-full object-contain p-1" alt="" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-muted/20">
                                <img src="/images/products/default-product.svg" className="h-9 w-9 object-contain mb-0.5 opacity-80" alt="" />
                                <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Upload</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-indigo-400 hover:text-indigo-300 block mb-1">
                            {preview ? 'Change image' : 'Upload image'}
                        </button>
                        <p className="text-muted-foreground/50 text-xs">JPEG · PNG · WEBP — max 5 MB</p>
                        {errors.product_img && <p className="text-red-400 text-xs mt-1">{errors.product_img}</p>}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Product Name" error={errors.name}>
                        <input className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bottled Water 500ml" />
                    </Field>
                    <Field label="Barcode" error={errors.barcode} hint="Auto-generated if blank">
                        <input className={inp} value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Optional" />
                    </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Category" error={errors.category_id}>
                        <select className={sel} value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                            <option value="">Select…</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Product Type" error={errors.product_type}>
                        <select className={sel} value={productType} onChange={e => setProductType(e.target.value as ProductType)}>
                            <option value="standard">Standard</option>
                            <option value="made_to_order">Made-to-Order</option>
                            <option value="bundle">Bundle</option>
                            <option value="service">Service</option>
                        </select>
                    </Field>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <div>
                        <p className="text-sm font-medium">VAT / Tax Applicable</p>
                        <p className="text-xs text-muted-foreground">When enabled, VAT will be applied to this product at checkout.</p>
                    </div>
                    <button type="button" onClick={() => setIsTaxable(v => !v)}
                        className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none',
                            isTaxable ? 'bg-primary' : 'bg-muted')}>
                        <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform',
                            isTaxable ? 'translate-x-5' : 'translate-x-0')} />
                    </button>
                </div>

                {isAdmin && (
                    <Field label="Branch" error={errors.branch_id}>
                        <select className={sel} value={branchId} onChange={e => setBranchId(e.target.value)}>
                            <option value="">Select branch…</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                        </select>
                    </Field>
                )}

                {/* MTO: no stock — ingredients are deducted on sale */}
                {productType === 'made_to_order' ? (
                    <div className="bg-cyan-500/8 border border-cyan-500/20 rounded-xl px-4 py-3 text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                        <span>🍳</span>
                        <span><strong>Made-to-Order</strong> — no stock is tracked. Ingredients are deducted automatically when sold based on the recipe.</span>
                    </div>
                ) : productType === 'service' ? (
                    <>
                        <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                            <span>🛠️</span>
                            <span><strong>Service</strong> — no physical stock. Set the service fee below. It will appear in POS and can be sold unlimited times.</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Capital / Cost (₱)" error={errors.capital}>
                                <input type="number" min="0" step="0.01" className={inp} value={capital} onChange={e => setCapital(e.target.value)} placeholder="0" />
                            </Field>
                            <Field label="Markup (%)" error={errors.markup} hint="e.g. 20 = 20%">
                                <input type="number" min="0" max="500" step="0.01" className={inp} value={markup} onChange={e => setMarkup(e.target.value)} placeholder="0" />
                            </Field>
                        </div>
                        <Field label="Service Fee (₱)">
                            <div className={cn(
                                'flex items-center h-[42px] px-3 rounded-lg border text-sm font-bold tabular-nums',
                                pricePreview ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border bg-muted/30 text-muted-foreground'
                            )}>
                                {pricePreview ? `₱${pricePreview}` : '—'}
                                {pricePreview && <span className="ml-auto text-[10px] font-normal text-muted-foreground">auto</span>}
                            </div>
                        </Field>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Bundle: stock managed in Stock Management tab only */}
                            <Field label="Stock" error={errors.stock}
                                   hint={productType === 'bundle' ? 'Set in Stock Mgmt tab' : undefined}>
                                <input type="number" min="0" className={cn(inp, productType === 'bundle' && 'opacity-40 cursor-not-allowed bg-muted')}
                                    value={productType === 'bundle' ? '—' : stock}
                                    onChange={e => productType !== 'bundle' && setStock(e.target.value)}
                                    disabled={productType === 'bundle'}
                                    placeholder={productType === 'bundle' ? 'Stock Mgmt only' : '0'} />
                            </Field>
                            <Field label="Capital (₱)" error={errors.capital}>
                                <input type="number" min="0" step="0.01" className={inp} value={capital} onChange={e => setCapital(e.target.value)} />
                            </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Markup (%)" error={errors.markup} hint="Percentage only — e.g. 20 = 20%">
                                <input type="number" min="0" max="500" step="0.01" className={inp} value={markup} onChange={e => setMarkup(e.target.value)} placeholder="0" />
                            </Field>
                            <Field label="Selling Price">
                                <div className={cn(
                                    'flex items-center h-[42px] px-3 rounded-lg border text-sm font-bold tabular-nums',
                                    pricePreview ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border bg-muted/30 text-muted-foreground'
                                )}>
                                    {pricePreview ? `₱${pricePreview}` : '—'}
                                    {pricePreview && <span className="ml-auto text-[10px] font-normal text-muted-foreground">auto</span>}
                                </div>
                            </Field>
                        </div>

                        {productType === 'bundle' && (
                            <div className="bg-purple-500/8 border border-purple-500/20 rounded-xl px-4 py-3 text-xs text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                <span>📦</span>
                                <span><strong>Bundle</strong> — go to <strong>Stock Management</strong> tab to set the qty available for sale. Capital is auto-computed from components.</span>
                            </div>
                        )}
                    </>
                )}

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted">Cancel</button>
                    <button type="submit" disabled={processing} className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-50">
                        {processing ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ─── Stock Detail Modal ───────────────────────────────────────────────────────

function StockDetailModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
    if (!product) return null;
    return (
        <Modal open={!!product} onClose={onClose} title={`Stock — ${product.name}`}>
            <div className="space-y-3">
                {product.stocks.length > 0 ? product.stocks.map((s, i) => (
                    <div key={i} className="bg-muted/20 border border-border rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-foreground font-medium text-sm">{s.branch_name}</span>
                            <span className={cn('text-xs px-2.5 py-0.5 rounded-full', statusBadge(s.status))}>{s.status}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div><div className="text-muted-foreground text-xs mb-1">Stock</div><div className="text-foreground font-semibold">{s.stock.toLocaleString()}</div></div>
                            <div><div className="text-muted-foreground text-xs mb-1">Capital</div><div className="text-foreground font-semibold">₱{s.capital.toFixed(2)}</div></div>
                            <div><div className="text-muted-foreground text-xs mb-1">Price</div><div className="text-emerald-600 dark:text-emerald-400 font-semibold">{s.formatted_price}</div></div>
                        </div>
                        {(s.expiry_date || s.batch_number) && (
                            <div className="mt-3 pt-3 border-t border-border flex gap-4 text-xs text-muted-foreground">
                                {s.batch_number && <span>Batch: <span className="text-foreground/70">{s.batch_number}</span></span>}
                                {s.expiry_date  && <span>Expires: <span className="text-foreground/70">{s.expiry_date}</span></span>}
                            </div>
                        )}
                    </div>
                )) : <p className="text-center text-muted-foreground py-8 text-sm">No stock records.</p>}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
                <span className="text-muted-foreground">Global Total</span>
                <span className="text-foreground font-semibold">{product.global_stock_formatted} units</span>
            </div>
        </Modal>
    );
}

// ─── Stock Adjust Modal ───────────────────────────────────────────────────────

function StockAdjustModal({ item, onClose }: {
    item: { product_id: number; product_name: string; stock: StockRow } | null; onClose: () => void;
}) {
    const { data, setData, patch, processing, errors } = useForm({
        branch_id: item?.stock.branch_id.toString() ?? '',
        stock:     item?.stock.stock.toString() ?? '',
        capital:   item?.stock.capital.toString() ?? '',
        markup:    item?.stock.markup.toString() ?? '',
    });

    if (!item) return null;

    const isBundle  = item.stock.product_type === 'bundle';
    const capital   = parseFloat(data.capital) || 0;
    const markup    = parseFloat(data.markup)  || 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(routes.products.adjustStock(item.product_id), { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <Modal open={!!item} onClose={onClose} title={`Adjust Stock — ${item.product_name}`} size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-muted/30 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
                    <div>
                        <span className="text-muted-foreground">Branch: </span>
                        <span className="text-foreground">{item.stock.branch_name}</span>
                    </div>
                    {isBundle && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                            Bundle
                        </span>
                    )}
                    <input type="hidden" value={data.branch_id} />
                </div>

                {isBundle && (
                    <div className="bg-purple-500/8 border border-purple-500/20 rounded-xl px-4 py-3 text-xs text-purple-600 dark:text-purple-400 flex items-start gap-2">
                        <span className="shrink-0">📦</span>
                        <span>Bundle capital is auto-computed from components. Only <strong>Qty available for sale</strong> is editable here.</span>
                    </div>
                )}

                <div className={cn("grid gap-3", isBundle ? "grid-cols-1" : "grid-cols-3")}>
                    {/* Stock — always editable */}
                    <Field label={isBundle ? "Qty Available for Sale" : "Stock"} error={errors.stock}>
                        <input type="number" min="0" className={inp} value={data.stock} onChange={e => setData('stock', e.target.value)} />
                    </Field>

                    {/* Capital + Markup — hidden for bundles (auto-synced from components) */}
                    {!isBundle && (
                        <>
                            <Field label="Capital (₱)" error={errors.capital}>
                                <input type="number" step="0.01" min="0" className={inp} value={data.capital} onChange={e => setData('capital', e.target.value)} />
                            </Field>
                            <Field label="Markup (%)" error={errors.markup}>
                                <input type="number" step="0.01" min="0" className={inp} value={data.markup} onChange={e => setData('markup', e.target.value)} />
                            </Field>
                        </>
                    )}
                </div>

                {/* Price preview — only for non-bundles */}
                {!isBundle && capital > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 flex justify-between text-sm">
                        <span className="text-muted-foreground">New Price Preview</span>
                        <span className="text-primary font-semibold">₱{(capital * (1 + markup / 100)).toFixed(2)}</span>
                    </div>
                )}

                {/* For bundles show current capital/price as read-only info */}
                {isBundle && item.stock.capital > 0 && (
                    <div className="bg-muted/20 rounded-lg px-4 py-3 text-sm space-y-1">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Capital (auto)</span>
                            <span className="tabular-nums font-medium text-foreground">₱{item.stock.capital.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Markup</span>
                            <span className="tabular-nums font-medium text-foreground">{item.stock.markup}%</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-1 mt-1">
                            <span className="text-muted-foreground">Selling Price</span>
                            <span className="tabular-nums font-bold text-primary">{item.stock.formatted_price}</span>
                        </div>
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted">Cancel</button>
                    <button type="submit" disabled={processing} className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-50">
                        {processing ? 'Saving…' : isBundle ? 'Set Qty' : 'Save Adjustments'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// ─── All Products Tab ─────────────────────────────────────────────────────────

function AllProductsTab({ products, pagination, filters, stats, categories, branches, isAdmin }: {
    products: Product[];
    pagination: Pagination;
    filters: PageProps['filters'];
    stats: PageProps['stats'];
    categories: Category[];
    branches: Branch[];
    isAdmin: boolean;
}) {
    const [loading, setLoading]       = useState(false);
    const [addOpen, setAddOpen]       = useState(false);
    const [editProd, setEditProd]     = useState<Product | null>(null);
    const [deleteProd, setDeleteProd] = useState<Product | null>(null);
    const [stockProd, setStockProd]   = useState<Product | null>(null);
    const { delete: destroy, processing } = useForm({});

    // Local filter state (mirrors URL params)
    const [search, setSearchVal]           = useState(filters.search);
    const [filterCat, setFilterCat]       = useState(filters.category_id?.toString() ?? '');
    const [filterType, setFilterType]     = useState(filters.type);
    const [filterStatus, setFilterStatus] = useState(filters.status);
    const [filterBranch, setFilterBranch] = useState(filters.branch_id?.toString() ?? '');

    const navigate = useCallback((params: Record<string, any>) => {
        setLoading(true);
        router.get(routes.products.index(), { ...params }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onFinish: () => setLoading(false),
        });
    }, []);

    const debouncedSearch = useDebounce((val: string) => {
        navigate({ search: val, category_id: filterCat, type: filterType, status: filterStatus, branch_id: filterBranch, per_page: pagination.per_page, page: 1 });
    }, 400);

    const handleSearch = (val: string) => { setSearchVal(val); debouncedSearch(val); };

    const handleFilter = (key: string, val: string) => {
        const next = { search, category_id: filterCat, type: filterType, status: filterStatus, branch_id: filterBranch, per_page: pagination.per_page, page: 1, [key]: val };
        if (key === 'category_id') setFilterCat(val);
        if (key === 'type')        setFilterType(val);
        if (key === 'status')      setFilterStatus(val);
        if (key === 'branch_id')   setFilterBranch(val);
        navigate(next);
    };

    const handlePageChange = (page: number) => navigate({ search, category_id: filterCat, type: filterType, status: filterStatus, branch_id: filterBranch, per_page: pagination.per_page, page });
    const handlePerPage    = (pp: number)   => navigate({ search, category_id: filterCat, type: filterType, status: filterStatus, branch_id: filterBranch, per_page: pp, page: 1 });

    const clearFilters = () => {
        setSearchVal(''); setFilterCat(''); setFilterType(''); setFilterStatus('');
        navigate({ per_page: pagination.per_page, page: 1, branch_id: filterBranch });
    };

    const hasFilters = search || filterCat || filterType || filterStatus || filterBranch;

    const handleDelete = () => {
        if (!deleteProd) return;
        destroy(routes.products.destroy(deleteProd.id), { preserveScroll: true, onSuccess: () => setDeleteProd(null) });
    };

    return (
        <div className="space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Products', value: stats.total_products.toLocaleString(), color: 'text-foreground' },
                    { label: 'Total Units',    value: stats.total_units.toLocaleString(),    color: 'text-foreground' },
                    { label: 'Low Stock',      value: stats.low_stock,                       color: 'text-amber-400' },
                    { label: 'Out of Stock',   value: stats.out_of_stock,                    color: 'text-red-400' },
                ].map(s => (
                    <div key={s.label} className="bg-card border border-border rounded-xl p-4">
                        <div className="text-xs text-muted-foreground mb-1.5">{s.label}</div>
                        <div className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            className={cn('w-full h-9 pl-9 pr-9 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-foreground', loading && 'opacity-60')}
                            placeholder="Search name or barcode…" value={search} onChange={e => handleSearch(e.target.value)} />
                        {search && <button onClick={() => handleSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                    </div>
                    <select value={filterCat} onChange={e => handleFilter('category_id', e.target.value)}
                        className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select value={filterType} onChange={e => handleFilter('type', e.target.value)}
                        className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                        <option value="">All Types</option>
                        <option value="standard">Standard</option>
                        <option value="made_to_order">Made-to-Order</option>
                        <option value="bundle">Bundle</option>
                    </select>
                    <select value={filterStatus} onChange={e => handleFilter('status', e.target.value)}
                        className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                        <option value="">All Status</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>
                    {isAdmin && branches.length > 0 && (
                        <select value={filterBranch} onChange={e => handleFilter('branch_id', e.target.value)}
                            className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}
                    {hasFilters && (
                        <button onClick={clearFilters} className="h-9 px-3 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted flex items-center gap-1.5 transition-colors">
                            <X className="h-3.5 w-3.5" /> Clear
                        </button>
                    )}
                    <Button size="sm" className="gap-1.5 h-9 font-semibold" onClick={() => setAddOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Add Product
                    </Button>
                </div>
            </div>

            {/* Loading bar */}
            {loading && <div className="w-full h-0.5 bg-border rounded-full overflow-hidden"><div className="h-full bg-primary animate-pulse rounded-full" /></div>}

            {/* Grid */}
            {products.length === 0 ? (
                <div className="bg-card border border-border rounded-xl py-20 text-center text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No products found{hasFilters ? ' — try adjusting your filters' : ''}</p>
                </div>
            ) : (
                <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', loading && 'opacity-60 pointer-events-none')}>
                    {products.map(p => (
                        <div key={p.id} className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-md transition-all flex flex-col">
                            <div className="relative aspect-[4/3] bg-muted/30 overflow-hidden border-b border-border/50">
                                <ProductThumbnail
                                    src={p.product_img}
                                    name={p.name}
                                    categoryName={p.category?.name}
                                    unit={p.unit}
                                />
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    <span className={cn('text-xs px-2 py-0.5 rounded-full', typeBadge(p.product_type))}>{typeLabel(p.product_type)}</span>
                                    {!p.is_taxable && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">No VAT</span>}
                                </div>
                                <div className="absolute top-2 right-2">
                                    <span className={cn('text-xs px-2 py-0.5 rounded-full', statusBadge(p.global_stock_status))}>{p.global_stock_status}</span>
                                </div>
                                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button onClick={() => setStockProd(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white text-xs font-medium">
                                        <Eye className="h-3.5 w-3.5" /> Stock
                                    </button>
                                    <button onClick={() => setEditProd(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/80 hover:bg-primary text-primary-foreground text-xs font-medium">
                                        <Edit2 className="h-3.5 w-3.5" /> Edit
                                    </button>
                                    <button onClick={() => setDeleteProd(p)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/80 hover:bg-destructive text-destructive-foreground text-xs font-medium">
                                        <Trash2 className="h-3.5 w-3.5" /> Del
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 flex flex-col gap-2 flex-1">
                                <div>
                                    <h3 className="text-foreground font-semibold text-sm leading-snug line-clamp-2">{p.name}</h3>
                                    {p.category && <p className="text-muted-foreground text-xs mt-0.5">{p.category.name}</p>}
                                </div>
                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                                    <div>
                                        <div className="text-muted-foreground text-xs">Price</div>
                                        <div className="text-emerald-500 dark:text-emerald-400 font-bold text-sm">₱{p.branch_price.toFixed(2)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-muted-foreground text-xs">Stock</div>
                                        <div className="text-foreground font-bold text-sm">{p.global_stock_formatted}</div>
                                    </div>
                                </div>
                                {p.barcode && <p className="text-muted-foreground/50 text-xs font-mono truncate">{p.barcode}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            <PaginationBar pagination={pagination} onPageChange={handlePageChange} onPerPageChange={handlePerPage} loading={loading} />

            <ProductFormModal open={addOpen}    onClose={() => setAddOpen(false)}  product={null}     categories={categories} branches={branches} isAdmin={isAdmin} />
            <ProductFormModal open={!!editProd} onClose={() => setEditProd(null)}  product={editProd} categories={categories} branches={branches} isAdmin={isAdmin} />
            <StockDetailModal product={stockProd} onClose={() => setStockProd(null)} />
            <ConfirmModal
                open={!!deleteProd} onClose={() => setDeleteProd(null)} title="Delete Product"
                message={<>Delete <strong className="text-white">"{deleteProd?.name}"</strong>? This cannot be undone.</>}
                onConfirm={handleDelete} processing={processing}
            />
        </div>
    );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────

function CategoriesTab({ categories }: { categories: Category[] }) {
    const [modal, setModal]               = useState<{ open: boolean; cat: Category | null }>({ open: false, cat: null });
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
    const { data, setData, post, patch, delete: destroy, processing, errors, reset } = useForm({ name: '', slug: '', description: '', is_active: true });

    const openAdd  = () => { reset(); setModal({ open: true, cat: null }); };
    const openEdit = (c: Category) => { setData({ name: c.name, slug: c.slug ?? '', description: c.description ?? '', is_active: c.is_active }); setModal({ open: true, cat: c }); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (modal.cat) {
            patch(routes.products.categories.update(modal.cat.id), { preserveScroll: true, onSuccess: () => setModal({ open: false, cat: null }) });
        } else {
            post(routes.products.categories.store(), { preserveScroll: true, onSuccess: () => setModal({ open: false, cat: null }) });
        }
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        destroy(routes.products.categories.destroy(deleteTarget.id), { preserveScroll: true, onSuccess: () => setDeleteTarget(null) });
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div><h2 className="text-foreground font-bold">Categories</h2><p className="text-muted-foreground text-sm">{categories.length} categories</p></div>
                <Button size="sm" className="gap-1.5 h-9 font-semibold" onClick={openAdd}><Plus className="h-3.5 w-3.5" /> Add Category</Button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
                {categories.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground"><Tag className="h-10 w-10 mx-auto mb-3 opacity-20" /><p>No categories yet</p></div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                {['Category', 'Products', 'Status', ''].map((h, i) => (
                                    <th key={i} className={cn('px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest', i === 0 ? 'text-left' : i === 3 ? 'text-right w-10' : 'text-left')}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {categories.map(c => (
                                <tr key={c.id} className="hover:bg-muted/20 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">{c.name.charAt(0).toUpperCase()}</div>
                                            <div><p className="text-foreground font-semibold text-sm">{c.name}</p>{c.description && <p className="text-muted-foreground text-xs">{c.description}</p>}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground text-sm">{c.products_count} product{c.products_count !== 1 ? 's' : ''}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', c.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground')}>
                                            {c.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(c)} className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"><Edit2 className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => setDeleteTarget(c)} className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30"><Trash2 className="h-3.5 w-3.5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal open={modal.open} onClose={() => setModal({ open: false, cat: null })} title={modal.cat ? 'Edit Category' : 'Add Category'} size="sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field label="Name" error={errors.name}><input className={inp} value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Category name" autoFocus /></Field>
                    <Field label="Description" error={errors.description}><textarea className={inp} rows={2} value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Optional" /></Field>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className={cn('w-9 h-5 rounded-full transition-colors relative', data.is_active ? 'bg-primary' : 'bg-muted')} onClick={() => setData('is_active', !data.is_active)}>
                            <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', data.is_active ? 'translate-x-4' : 'translate-x-0.5')} />
                        </div>
                        <span className="text-sm text-muted-foreground">Active</span>
                    </label>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setModal({ open: false, cat: null })} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted">Cancel</button>
                        <button type="submit" disabled={processing} className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-50">{processing ? 'Saving…' : modal.cat ? 'Save' : 'Add'}</button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Category"
                message={<>Delete <strong className="text-white">"{deleteTarget?.name}"</strong>? Products will become uncategorized.</>}
                onConfirm={handleDelete} processing={processing} />
        </div>
    );
}

// ─── Variants Tab ─────────────────────────────────────────────────────────────

function VariantsTab({ variantProducts, allProducts }: { variantProducts: VariantProduct[]; allProducts: SelectProduct[] }) {
    const [search, setSearch]               = useState('');
    const [selected, setSelected]           = useState<VariantProduct | null>(null);
    const [addModal, setAddModal]           = useState(false);
    const [editVariant, setEditVariant]     = useState<Variant | null>(null);
    const [deleteVariant, setDeleteVariant] = useState<Variant | null>(null);
    const { data, setData, post, patch, delete: destroy, processing, errors, reset } = useForm({
        product_id: '', name: '', sku: '', barcode: '', extra_price: '0', is_available: true, sort_order: '0', attributes: '{}',
    });

    const filtered = variantProducts.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

    const openAdd = (p: VariantProduct) => { reset(); setData('product_id', p.id.toString()); setSelected(p); setAddModal(true); };
    const openEdit = (v: Variant) => {
        setData({ product_id: v.product_id.toString(), name: v.name, sku: v.sku ?? '', barcode: v.barcode ?? '',
            extra_price: v.extra_price.toString(), is_available: v.is_available, sort_order: v.sort_order.toString(), attributes: JSON.stringify(v.attributes ?? {}) });
        setEditVariant(v);
    };
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editVariant) { patch(routes.products.variants.update(editVariant.id), { preserveScroll: true, onSuccess: () => setEditVariant(null) }); }
        else { post(routes.products.variants.store(), { preserveScroll: true, onSuccess: () => { setAddModal(false); reset(); } }); }
    };
    const handleDelete = () => {
        if (!deleteVariant) return;
        destroy(routes.products.variants.destroy(deleteVariant.id), { preserveScroll: true, onSuccess: () => setDeleteVariant(null) });
    };

    const VariantForm = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            {!editVariant && (
                <Field label="Product" error={errors.product_id}>
                    <select className={sel} value={data.product_id} onChange={e => setData('product_id', e.target.value)}>
                        <option value="">Select product…</option>
                        {allProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
                <Field label="Variant Name" error={errors.name}><input className={inp} value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. Large / Red" /></Field>
                <Field label="Extra Price (₱)" error={errors.extra_price}><input type="number" step="0.01" className={inp} value={data.extra_price} onChange={e => setData('extra_price', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Field label="SKU" error={errors.sku}><input className={inp} value={data.sku} onChange={e => setData('sku', e.target.value)} placeholder="Optional" /></Field>
                <Field label="Barcode" error={errors.barcode}><input className={inp} value={data.barcode} onChange={e => setData('barcode', e.target.value)} placeholder="Optional" /></Field>
            </div>
            <Field label='Attributes (JSON)' error={errors.attributes} hint='e.g. {"size":"L","color":"Blue"}'><input className={inp} value={data.attributes} onChange={e => setData('attributes', e.target.value)} /></Field>
            <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={cn('w-9 h-5 rounded-full transition-colors relative', data.is_available ? 'bg-primary' : 'bg-muted')} onClick={() => setData('is_available', !data.is_available)}>
                    <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', data.is_available ? 'translate-x-4' : 'translate-x-0.5')} />
                </div>
                <span className="text-sm text-muted-foreground">Available</span>
            </label>
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setAddModal(false); setEditVariant(null); }} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted">Cancel</button>
                <button type="submit" disabled={processing} className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-50">{processing ? 'Saving…' : editVariant ? 'Save' : 'Add Variant'}</button>
            </div>
        </form>
    );

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div><h2 className="text-foreground font-bold">Variants</h2><p className="text-muted-foreground text-sm">{variantProducts.length} products with variants</p></div>
                <div className="flex gap-2">
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><input className="w-48 h-9 pl-9 pr-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-foreground" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></div>
                    <Button size="sm" className="gap-1.5 h-9 font-semibold" onClick={() => { reset(); setSelected(null); setAddModal(true); }}><Plus className="h-3.5 w-3.5" /> Add Variant</Button>
                </div>
            </div>
            {filtered.length === 0 ? (
                <div className="bg-card border border-border rounded-xl py-16 text-center text-muted-foreground"><Layers className="h-10 w-10 mx-auto mb-3 opacity-20" /><p>{variantProducts.length === 0 ? 'No products with variants yet' : `No results for "${search}"`}</p></div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(p => (
                        <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                                <div className="flex items-center gap-3">
                                    <ProductThumbnail
                                        src={p.product_img}
                                        name={p.name}
                                        categoryName={p.category?.name}
                                        aspect="w-8 h-8 rounded-lg shrink-0 border border-border"
                                        padding="p-0.5"
                                    />
                                    <div><span className="text-foreground font-semibold text-sm">{p.name}</span>{p.category && <span className="text-muted-foreground text-xs ml-2">{p.category.name}</span>}</div>
                                </div>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openAdd(p)}><Plus className="h-3 w-3" /> Add Variant</Button>
                            </div>
                            <div className="divide-y divide-border">
                                {p.variants.map(v => (
                                    <div key={v.id} className="flex items-center justify-between px-4 py-3 group hover:bg-muted/20 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn('w-2 h-2 rounded-full shrink-0', v.is_available ? 'bg-emerald-400' : 'bg-muted-foreground/30')} />
                                            <div>
                                                <span className="text-foreground text-sm">{v.name}</span>
                                                {v.attributes && Object.keys(v.attributes).length > 0 && <span className="ml-2 text-muted-foreground text-xs">{Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ')}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {v.extra_price !== 0 && <span className="text-emerald-500 dark:text-emerald-400 text-xs">+₱{v.extra_price.toFixed(2)}</span>}
                                            <span className="text-muted-foreground text-xs">{v.total_stock} units</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(v)} className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"><Edit2 className="h-3.5 w-3.5" /></button>
                                                <button onClick={() => setDeleteVariant(v)} className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30"><Trash2 className="h-3.5 w-3.5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Modal open={addModal} onClose={() => setAddModal(false)} title={selected ? `Add Variant — ${selected.name}` : 'Add Variant'} size="sm"><VariantForm /></Modal>
            <Modal open={!!editVariant} onClose={() => setEditVariant(null)} title="Edit Variant" size="sm"><VariantForm /></Modal>
            <ConfirmModal open={!!deleteVariant} onClose={() => setDeleteVariant(null)} title="Delete Variant" message={<>Delete variant <strong className="text-white">"{deleteVariant?.name}"</strong>?</>} onConfirm={handleDelete} processing={processing} />
        </div>
    );
}

// ─── Bundles Tab ──────────────────────────────────────────────────────────────
// A bundle = a sellable combo of multiple products (e.g. "PC Build", "Promo Meal").
// Define what products it contains + qty. Price can be:
//   computed = sum of component prices (auto)
//   fixed    = you set the price manually
// Promo discount can be applied on top.

function BundlesTab({ bundleProducts, allProducts, branches, isAdmin }: {
    bundleProducts: BundleProduct[];
    allProducts: SelectProduct[];
    branches: Branch[];
    isAdmin: boolean;
}) {
    const [expanded,   setExpanded]   = useState<number | null>(null);
    const [configFor,  setConfigFor]  = useState<BundleProduct | null>(null);  // settings modal
    const [addItemFor, setAddItemFor] = useState<BundleProduct | null>(null);  // add component modal
    const [editItem,   setEditItem]   = useState<{ bp: BundleProduct; item: BundleItem } | null>(null);

    // ── Bundle settings form (pricing mode + promo) ─────────────────────────
    const { data: bData, setData: setBData, post: postBundle, patch: patchBundle,
            processing: bProc, errors: bErr, reset: resetBundle } = useForm({
        product_id:        '',
        pricing_mode:      'computed' as 'computed' | 'fixed',
        price_adjustment:  '0',   // flat ₱ add/subtract from computed total
        build_notes:       '',
    });

    // ── Component item form ─────────────────────────────────────────────────
    const { data: iData, setData: setIData, post: postItem, patch: patchItem,
            delete: delItem, processing: iProc, errors: iErr, reset: resetItem } = useForm({
        component_product_id: '',
        component_variant_id: '',
        quantity:             '1',
        override_price:       '',   // override selling price for this component in the bundle
        is_required:          true,
        notes:                '',
    });

    // ── Helpers ─────────────────────────────────────────────────────────────

    const openConfig = (bp: BundleProduct) => {
        resetBundle();
        setBData({
            product_id:       bp.id.toString(),
            pricing_mode:     (bp.bundle?.pricing_mode ?? 'computed') as 'computed' | 'fixed',
            price_adjustment: bp.bundle?.price_adjustment?.toString() ?? '0',
            build_notes:      bp.bundle?.build_notes ?? '',
        });
        setConfigFor(bp);
    };

    const openAddItem = (bp: BundleProduct) => {
        resetItem();
        setAddItemFor(bp);
    };

    const openEditItem = (bp: BundleProduct, item: BundleItem) => {
        setIData({
            component_product_id: item.component_product_id.toString(),
            component_variant_id: item.component_variant_id?.toString() ?? '',
            quantity:             item.quantity.toString(),
            override_price:       item.override_price?.toString() ?? '',
            is_required:          item.is_required,
            notes:                item.notes ?? '',
        });
        setEditItem({ bp, item });
    };

    // ── Submit handlers ──────────────────────────────────────────────────────

    const handleSaveBundle = (e: React.FormEvent) => {
        e.preventDefault();
        if (configFor?.bundle) {
            patchBundle(routes.products.bundles.update(configFor.bundle.id), {
                preserveScroll: true,
                onSuccess: () => setConfigFor(null),
            });
        } else {
            postBundle(routes.products.bundles.store(), {
                preserveScroll: true,
                onSuccess: () => setConfigFor(null),
            });
        }
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addItemFor?.bundle) {
            // Bundle not configured yet — show a message
            alert('Please click "Configure" on this bundle first before adding products.');
            return;
        }
        postItem(routes.products.bundles.addItem(addItemFor.bundle.id), {
            preserveScroll: true,
            onSuccess: () => { setAddItemFor(null); resetItem(); },
        });
    };

    const handleUpdateItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editItem?.bp.bundle) return;
        patchItem(routes.products.bundles.updateItem(editItem.bp.bundle.id, editItem.item.id), {
            preserveScroll: true,
            onSuccess: () => setEditItem(null),
        });
    };

    const handleRemoveItem = (bp: BundleProduct, item: BundleItem) => {
        if (!bp.bundle) return;
        delItem(routes.products.bundles.removeItem(bp.bundle.id, item.id), { preserveScroll: true });
    };

    // ── Live price preview ────────────────────────────────────────────────────
    // Components subtotal + price_adjustment. Markup lives on the bundle
    // product's own ProductStock row — the server recomputes it automatically
    // via syncBundleStock() every time a component is added/updated/removed.
    // Here we just show what we can from the component data.
    const computedPrice = (bp: BundleProduct): number => {
        if (!bp.bundle) return 0;
        const base = bp.bundle.items.reduce((s, i) => s + (i.override_price ?? 0) * i.quantity, 0);
        return Math.max(0, base + (bp.bundle.price_adjustment ?? 0));
    };

    const computedSubtotal = (bp: BundleProduct): number => {
        if (!bp.bundle) return 0;
        return bp.bundle.items.reduce((s, i) => s + (i.override_price ?? 0) * i.quantity, 0);
    };

    const bundlesWithNoDef = bundleProducts.filter(bp => bp.bundle === null);

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-foreground font-bold">Product Bundles</h2>
                    <p className="text-muted-foreground text-sm">
                        {bundleProducts.length} bundle{bundleProducts.length !== 1 ? 's' : ''}
                        {bundlesWithNoDef.length > 0 && (
                            <span className="ml-2 text-amber-500">· {bundlesWithNoDef.length} not configured</span>
                        )}
                    </p>
                </div>
            </div>

            {/* How it works */}
            <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
                <p><strong className="text-foreground">How bundles work:</strong> A bundle is a combo product you sell on the POS (e.g. "Gaming PC", "Promo Meal Set A").</p>
                <p>1. Go to <strong className="text-foreground">All Products</strong> tab → add a product → set type to <strong className="text-foreground">Bundle</strong></p>
                <p>2. Come back here → click <strong className="text-foreground">Configure</strong> → add the component products that make up this bundle</p>
                <p>3. Set pricing mode: <strong className="text-foreground">Computed</strong> = auto-sum component prices, <strong className="text-foreground">Fixed</strong> = set price yourself. Add a promo discount via Price Adjustment.</p>
            </div>

            {bundleProducts.length === 0 ? (
                <div className="bg-card border border-border rounded-xl py-20 text-center text-muted-foreground">
                    <GitMerge className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No bundle products yet</p>
                    <p className="text-xs mt-1">Go to <strong className="text-foreground">All Products</strong> tab → Add Product → set type to Bundle</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bundleProducts.map(bp => {
                        const isOpen   = expanded === bp.id;
                        const price    = computedPrice(bp);
                        const adjAmt   = bp.bundle?.price_adjustment ?? 0;
                        const hasItems = (bp.bundle?.items.length ?? 0) > 0;

                        return (
                            <div key={bp.id} className="bg-card border border-border rounded-2xl overflow-hidden">

                                {/* ── Bundle header row ─────────────────────── */}
                                <div className="flex items-center gap-3 px-4 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
                                     onClick={() => setExpanded(isOpen ? null : bp.id)}>

                                    {/* Icon / image */}
                                    <ProductThumbnail
                                        src={bp.product_img}
                                        name={bp.name}
                                        categoryName={bp.category?.name}
                                        aspect="w-12 h-12 rounded-xl shrink-0 border border-border"
                                        padding="p-1"
                                    />

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-foreground font-semibold text-sm">{bp.name}</span>
                                            {bp.category && <span className="text-muted-foreground text-xs">{bp.category.name}</span>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {!bp.bundle ? (
                                                <span className="text-xs text-amber-500 font-medium">⚠ Not configured — click Configure</span>
                                            ) : (
                                                <>
                                                    <span className="text-xs text-muted-foreground">{bp.bundle.items.length} component{bp.bundle.items.length !== 1 ? 's' : ''}</span>
                                                    {bp.bundle.pricing_mode === 'computed' && hasItems && (() => {
                                                        const sub = computedSubtotal(bp);
                                                        const adj = bp.bundle.price_adjustment ?? 0;
                                                        return (
                                                            <div className="flex items-center gap-1.5 text-xs flex-wrap">
                                                                <span className="text-muted-foreground tabular-nums">Capital ₱{sub.toFixed(2)}</span>
                                                                {adj !== 0 && <span className={cn('tabular-nums', adj < 0 ? 'text-emerald-500' : 'text-amber-500')}>{adj < 0 ? '−' : '+'}₱{Math.abs(adj).toFixed(2)}</span>}
                                                                <span className="text-muted-foreground">· price auto-synced</span>
                                                            </div>
                                                        );
                                                    })()}
                                                    {bp.bundle.pricing_mode === 'fixed' && (
                                                        <span className="text-xs text-purple-400 font-medium">Fixed pricing</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1"
                                            onClick={() => openConfig(bp)}>
                                            <Edit2 className="h-3 w-3" />
                                            {bp.bundle ? 'Edit' : 'Configure'}
                                        </Button>
                                        <Button variant="outline" size="sm"
                                            className={cn("h-8 text-xs gap-1", !bp.bundle && "opacity-40 cursor-not-allowed")}
                                            title={!bp.bundle ? "Configure this bundle first" : "Add a product to this bundle"}
                                            onClick={() => bp.bundle ? openAddItem(bp) : alert('Click "Configure" first to set up this bundle.')}>
                                            <Plus className="h-3 w-3" /> Add Product
                                        </Button>
                                    </div>

                                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', isOpen && 'rotate-180')} />
                                </div>

                                {/* ── Components list ───────────────────────── */}
                                {isOpen && bp.bundle && (
                                    <div className="border-t border-border">
                                        {bp.bundle.items.length === 0 ? (
                                            <div className="py-10 text-center space-y-3">
                                                <Package className="h-8 w-8 mx-auto text-muted-foreground opacity-20" />
                                                <p className="text-sm text-muted-foreground">No products in this bundle yet</p>
                                                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openAddItem(bp)}>
                                                    <Plus className="h-3.5 w-3.5" /> Add first product
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-muted/20 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                            <th className="px-4 py-2.5 text-left">Product</th>
                                                            <th className="px-4 py-2.5 text-right">Qty</th>
                                                            <th className="px-4 py-2.5 text-right hidden sm:table-cell">Unit Price</th>
                                                            <th className="px-4 py-2.5 text-right">Line Total</th>
                                                            <th className="px-4 py-2.5 text-center hidden md:table-cell">Required</th>
                                                            <th className="px-4 py-2.5 w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        {bp.bundle.items.map(item => {
                                                            const unitPrice  = item.override_price ?? 0;
                                                            const lineTotal  = unitPrice * item.quantity;
                                                            return (
                                                                <tr key={item.id} className="hover:bg-muted/10 transition-colors group">
                                                                    <td className="px-4 py-3">
                                                                        <p className="text-foreground font-medium">{item.component_product_name}</p>
                                                                        {item.component_variant_name && (
                                                                            <p className="text-xs text-muted-foreground">{item.component_variant_name}</p>
                                                                        )}
                                                                        {item.notes && (
                                                                            <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-bold tabular-nums">×{item.quantity}</td>
                                                                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums hidden sm:table-cell">
                                                                        {item.override_price !== null
                                                                            ? `₱${item.override_price.toFixed(2)}`
                                                                            : <span className="italic text-xs">auto</span>}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                                                                        {item.override_price !== null ? `₱${lineTotal.toFixed(2)}` : '—'}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center hidden md:table-cell">
                                                                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                                                                            item.is_required
                                                                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                                                : 'bg-muted text-muted-foreground')}>
                                                                            {item.is_required ? 'Yes' : 'Optional'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => openEditItem(bp, item)}
                                                                                className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted">
                                                                                <Edit2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                            <button onClick={() => handleRemoveItem(bp, item)}
                                                                                className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30">
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    {/* Totals footer */}
                                                    {bp.bundle.pricing_mode === 'computed' && hasItems && (() => {
                                                        const sub = computedSubtotal(bp);
                                                        const adj = bp.bundle.price_adjustment ?? 0;
                                                        return (
                                                            <tfoot className="border-t-2 border-border">
                                                                {/* Components subtotal */}
                                                                <tr className="bg-muted/10">
                                                                    <td colSpan={3} className="px-4 py-2 text-xs text-muted-foreground">Components subtotal</td>
                                                                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground text-xs font-medium">₱{sub.toFixed(2)}</td>
                                                                    <td colSpan={2} />
                                                                </tr>
                                                                {/* Price adjustment */}
                                                                {adj !== 0 && (
                                                                    <tr className="bg-muted/10">
                                                                        <td colSpan={3} className="px-4 py-2 text-xs text-muted-foreground">
                                                                            {adj < 0 ? '🏷 Price adjustment (discount)' : 'Price adjustment (surcharge)'}
                                                                        </td>
                                                                        <td className={cn('px-4 py-2 text-right tabular-nums text-xs font-semibold',
                                                                            adj < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500')}>
                                                                            {adj < 0 ? '−' : '+'}₱{Math.abs(adj).toFixed(2)}
                                                                        </td>
                                                                        <td colSpan={2} />
                                                                    </tr>
                                                                )}
                                                                {/* Capital total — markup is on the product's own stock, auto-applied server-side */}
                                                                <tr className="bg-primary/5">
                                                                    <td colSpan={3} className="px-4 py-3 font-bold text-sm text-foreground">
                                                                        Bundle Capital (auto-synced)
                                                                        <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                                                                            Selling price = capital × (1 + product markup %)
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right font-black text-primary text-base tabular-nums">
                                                                        ₱{price.toFixed(2)}
                                                                    </td>
                                                                    <td colSpan={2} />
                                                                </tr>
                                                            </tfoot>
                                                        );
                                                    })()}
                                                </table>

                                                {bp.bundle.build_notes && (
                                                    <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground italic">
                                                        📝 {bp.bundle.build_notes}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Not configured yet */}
                                {isOpen && !bp.bundle && (
                                    <div className="border-t border-border px-4 py-5 flex items-center gap-3">
                                        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                        <p className="text-sm text-muted-foreground flex-1">Configure this bundle to start adding component products.</p>
                                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openConfig(bp)}>Configure</Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                Bundle Settings Modal — pricing mode + promo adjustment
            ══════════════════════════════════════════════════════════════════ */}
            <Modal open={!!configFor} onClose={() => setConfigFor(null)}
                   title={configFor?.bundle ? `Edit Bundle — ${configFor.name}` : `Configure — ${configFor?.name}`}
                   size="sm">
                <form onSubmit={handleSaveBundle} className="space-y-4">
                    {/* Product selector only when creating new */}
                    {!configFor?.bundle && (
                        <Field label="Bundle Product" error={bErr.product_id}>
                            <select className={inp} value={bData.product_id} onChange={e => setBData('product_id', e.target.value)}>
                                <option value="">Select…</option>
                                {bundleProducts.filter(bp => !bp.bundle).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </Field>
                    )}

                    {/* Pricing mode */}
                    <Field label="Pricing Mode" error={bErr.pricing_mode}>
                        <div className="grid grid-cols-2 gap-2">
                            {(['computed', 'fixed'] as const).map(m => (
                                <button key={m} type="button" onClick={() => setBData('pricing_mode', m)}
                                    className={cn('p-3 rounded-xl border text-left transition-all',
                                        bData.pricing_mode === m ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50')}>
                                    <p className={cn('text-sm font-semibold', bData.pricing_mode === m ? 'text-primary' : 'text-foreground')}>
                                        {m === 'computed' ? 'Auto (computed)' : 'Fixed price'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                                        {m === 'computed'
                                            ? 'Sum of component prices automatically'
                                            : 'Set price manually on the product'}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </Field>

                    {/* Promo / price adjustment — only for computed mode */}
                    {bData.pricing_mode === 'computed' && (
                        <Field label="Promo / Price Adjustment (₱)" error={bErr.price_adjustment}
                               hint="Negative = discount (e.g. -50 for ₱50 off). Positive = surcharge.">
                            <input type="number" step="0.01" className={inp}
                                value={bData.price_adjustment}
                                onChange={e => setBData('price_adjustment', e.target.value)}
                                placeholder="0.00 — leave blank for no promo" />
                            {/* Preview */}
                            {parseFloat(bData.price_adjustment) < 0 && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                                    <span>🏷</span>
                                    <span>Promo: ₱{Math.abs(parseFloat(bData.price_adjustment)).toFixed(2)} off the bundle total</span>
                                </div>
                            )}
                            {parseFloat(bData.price_adjustment) > 0 && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-amber-500">
                                    <span>+</span>
                                    <span>₱{parseFloat(bData.price_adjustment).toFixed(2)} added to bundle total</span>
                                </div>
                            )}
                        </Field>
                    )}

                    {/* Notes */}
                    <Field label="Notes (optional)" error={bErr.build_notes}>
                        <textarea className={inp} rows={2} value={bData.build_notes}
                            onChange={e => setBData('build_notes', e.target.value)}
                            placeholder="e.g. Promo valid weekdays only…" />
                    </Field>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => setConfigFor(null)}
                            className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted">
                            Cancel
                        </button>
                        <button type="submit" disabled={bProc}
                            className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-50">
                            {bProc ? 'Saving…' : configFor?.bundle ? 'Save Changes' : 'Create Bundle'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ══════════════════════════════════════════════════════════════════
                Add Product to Bundle Modal
            ══════════════════════════════════════════════════════════════════ */}
            <Modal open={!!addItemFor} onClose={() => setAddItemFor(null)}
                   title={`Add Product — ${addItemFor?.name}`} size="sm">
                <form onSubmit={handleAddItem} className="space-y-4">
                    <Field label="Product" error={iErr.component_product_id}>
                        <select className={inp} value={iData.component_product_id}
                            onChange={e => setIData('component_product_id', e.target.value)}>
                            <option value="">Select product…</option>
                            {allProducts
                                .filter(p => p.id !== addItemFor?.id && p.product_type !== 'bundle')
                                .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Quantity" error={iErr.quantity}>
                            <input type="number" min="1" className={inp} value={iData.quantity}
                                onChange={e => setIData('quantity', e.target.value)} />
                        </Field>
                        <Field label="Price in Bundle (₱)" error={iErr.override_price}
                               hint="Leave blank to use live selling price">
                            <input type="number" step="0.01" min="0" className={inp}
                                value={iData.override_price}
                                onChange={e => setIData('override_price', e.target.value)}
                                placeholder="Auto" />
                        </Field>
                    </div>

                    <Field label="Notes" error={iErr.notes}>
                        <input className={inp} value={iData.notes}
                            onChange={e => setIData('notes', e.target.value)}
                            placeholder="e.g. Comes with free sauce" />
                    </Field>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className={cn('w-9 h-5 rounded-full transition-colors relative shrink-0',
                                iData.is_required ? 'bg-primary' : 'bg-muted')}
                             onClick={() => setIData('is_required', !iData.is_required)}>
                            <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                                iData.is_required ? 'translate-x-5' : 'translate-x-0.5')} />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Always included</p>
                            <p className="text-xs text-muted-foreground/60">Toggle off for optional add-ons</p>
                        </div>
                    </label>

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => setAddItemFor(null)}
                            className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted">
                            Cancel
                        </button>
                        <button type="submit" disabled={iProc}
                            className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-50">
                            {iProc ? 'Adding…' : 'Add to Bundle'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ══════════════════════════════════════════════════════════════════
                Edit Component Modal
            ══════════════════════════════════════════════════════════════════ */}
            <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Component" size="sm">
                <form onSubmit={handleUpdateItem} className="space-y-4">
                    <div className="bg-muted/30 rounded-lg px-4 py-3 text-sm">
                        <span className="text-muted-foreground">Product: </span>
                        <span className="text-foreground font-semibold">{editItem?.item.component_product_name}</span>
                        {editItem?.item.component_variant_name && (
                            <span className="text-muted-foreground ml-1">({editItem.item.component_variant_name})</span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Quantity" error={iErr.quantity}>
                            <input type="number" min="1" className={inp} value={iData.quantity}
                                onChange={e => setIData('quantity', e.target.value)} />
                        </Field>
                        <Field label="Price in Bundle (₱)" error={iErr.override_price}
                               hint="Blank = live price">
                            <input type="number" step="0.01" min="0" className={inp}
                                value={iData.override_price}
                                onChange={e => setIData('override_price', e.target.value)}
                                placeholder="Auto" />
                        </Field>
                    </div>
                    <Field label="Notes" error={iErr.notes}>
                        <input className={inp} value={iData.notes}
                            onChange={e => setIData('notes', e.target.value)}
                            placeholder="Optional" />
                    </Field>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <div className={cn('w-9 h-5 rounded-full transition-colors relative shrink-0',
                                iData.is_required ? 'bg-primary' : 'bg-muted')}
                             onClick={() => setIData('is_required', !iData.is_required)}>
                            <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                                iData.is_required ? 'translate-x-5' : 'translate-x-0.5')} />
                        </div>
                        <span className="text-sm text-muted-foreground">Always included</span>
                    </label>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => setEditItem(null)}
                            className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted">
                            Cancel
                        </button>
                        <button type="submit" disabled={iProc}
                            className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-50">
                            {iProc ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>

        </div>
    );
}

// ─── Recipes Tab ──────────────────────────────────────────────────────────────

function RecipesTab({ recipeProducts, allProducts }: { recipeProducts: RecipeProduct[]; allProducts: SelectProduct[] }) {
    const [search, setSearch]         = useState('');
    const [selected, setSelected]     = useState<RecipeProduct | null>(null);
    const [addModal, setAddModal]     = useState(false);
    const [deleteLine, setDeleteLine] = useState<RecipeLine | null>(null);
    const { data, setData, post, delete: destroy, processing, errors, reset } = useForm({ product_id: '', ingredient_id: '', quantity: '', unit: 'pcs', notes: '' });

    const ingredients = allProducts.filter(p => p.product_type === 'standard');
    const filtered    = recipeProducts.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

    const openAdd = (p: RecipeProduct) => { reset(); setData('product_id', p.id.toString()); setSelected(p); setAddModal(true); };
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); post(routes.products.recipes.store(), { preserveScroll: true, onSuccess: () => { setAddModal(false); reset(); } }); };
    const handleDelete = () => { if (!deleteLine) return; destroy(routes.products.recipes.destroy(deleteLine.id), { preserveScroll: true, onSuccess: () => setDeleteLine(null) }); };
    const units = ['pcs', 'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'pinch'];

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div><h2 className="text-foreground font-bold">Recipes / BOM</h2><p className="text-muted-foreground text-sm">Bill of Materials for made-to-order products</p></div>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><input className="w-48 h-9 pl-9 pr-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-foreground" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            </div>
            {recipeProducts.length === 0 ? (
                <div className="bg-card border border-border rounded-xl py-20 text-center text-muted-foreground"><ChefHat className="h-10 w-10 mx-auto mb-3 opacity-20" /><p>No made-to-order products</p></div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(p => (
                        <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0"><ChefHat className="h-4 w-4" /></div><div><span className="text-foreground font-semibold text-sm">{p.name}</span><span className="text-muted-foreground text-xs ml-2">{p.recipe.length > 0 ? `${p.recipe.length} ingredients` : 'No recipe defined'}</span></div></div>
                                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openAdd(p)}><Plus className="h-3 w-3" /> Add Ingredient</Button>
                            </div>
                            {p.recipe.length > 0 && (
                                <div className="divide-y divide-border">
                                    {p.recipe.map((line, i) => (
                                        <div key={i} className="flex items-center justify-between px-4 py-3 group hover:bg-muted/20 transition-colors">
                                            <div className="flex items-center gap-3"><div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs shrink-0">{i + 1}</div><span className="text-foreground text-sm">{line.ingredient_name}</span></div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-cyan-500 dark:text-cyan-400 text-sm font-mono">{line.formatted_quantity}</span>
                                                {line.notes && <span className="text-muted-foreground text-xs italic">{line.notes}</span>}
                                                <button onClick={() => setDeleteLine(line)} className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <Modal open={addModal} onClose={() => setAddModal(false)} title={`Add Ingredient — ${selected?.name}`} size="sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Field label="Ingredient (Standard Product)" error={errors.ingredient_id}>
                        <select className={sel} value={data.ingredient_id} onChange={e => setData('ingredient_id', e.target.value)}>
                            <option value="">Select ingredient…</option>
                            {ingredients.filter(p => p.id !== selected?.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Quantity" error={errors.quantity}><input type="number" step="0.0001" min="0" className={inp} value={data.quantity} onChange={e => setData('quantity', e.target.value)} placeholder="e.g. 18" /></Field>
                        <Field label="Unit" error={errors.unit}><select className={sel} value={data.unit} onChange={e => setData('unit', e.target.value)}>{units.map(u => <option key={u} value={u}>{u}</option>)}</select></Field>
                    </div>
                    <Field label="Notes" error={errors.notes}><input className={inp} value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Optional" /></Field>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setAddModal(false)} className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground text-sm hover:bg-muted">Cancel</button>
                        <button type="submit" disabled={processing} className="flex-1 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium disabled:opacity-50">{processing ? 'Adding…' : 'Add Ingredient'}</button>
                    </div>
                </form>
            </Modal>
            <ConfirmModal open={!!deleteLine} onClose={() => setDeleteLine(null)} title="Remove Ingredient" message={<>Remove <strong className="text-white">"{deleteLine?.ingredient_name}"</strong> from this recipe?</>} onConfirm={handleDelete} processing={processing} />
        </div>
    );
}

// ─── Stock Management Tab ─────────────────────────────────────────────────────

function StockManagementTab({ stockRows, stockPagination, stockFilters, branches, isAdmin }: {
    stockRows: StockRow[]; stockPagination: Pagination; stockFilters: PageProps['stockFilters']; branches: Branch[]; isAdmin: boolean;
}) {
    const [loading, setLoading]       = useState(false);
    const [adjustItem, setAdjustItem] = useState<{ product_id: number; product_name: string; stock: StockRow } | null>(null);
    const [search, setSearchVal]      = useState(stockFilters.search);
    const [filterBranch, setFilterBranch] = useState(stockFilters.branch_id?.toString() ?? '');
    const [filterStatus, setFilterStatus] = useState(stockFilters.status);

    const navigate = useCallback((params: Record<string, any>) => {
        setLoading(true);
        router.get(routes.products.index(), { ...params }, {
            preserveState: true, preserveScroll: true, replace: true, onFinish: () => setLoading(false),
        });
    }, []);

    const debouncedSearch = useDebounce((val: string) => {
        navigate({ stock_search: val, stock_branch: filterBranch, stock_status: filterStatus, stock_per_page: stockPagination.per_page, stock_page: 1 });
    }, 400);

    const handleSearch = (val: string) => { setSearchVal(val); debouncedSearch(val); };
    const handleFilter = (key: string, val: string) => {
        const next = { stock_search: search, stock_branch: filterBranch, stock_status: filterStatus, stock_per_page: stockPagination.per_page, stock_page: 1, [key]: val };
        if (key === 'stock_branch') setFilterBranch(val);
        if (key === 'stock_status') setFilterStatus(val);
        navigate(next);
    };
    const handlePageChange = (page: number) => navigate({ stock_search: search, stock_branch: filterBranch, stock_status: filterStatus, stock_per_page: stockPagination.per_page, stock_page: page });
    const handlePerPage    = (pp: number)   => navigate({ stock_search: search, stock_branch: filterBranch, stock_status: filterStatus, stock_per_page: pp, stock_page: 1 });

    return (
        <div className="space-y-5">
            {/* Filters */}
            <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input className="w-full h-9 pl-9 pr-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground text-foreground"
                            placeholder="Search product…" value={search} onChange={e => handleSearch(e.target.value)} />
                    </div>
                    {isAdmin && (
                        <select value={filterBranch} onChange={e => handleFilter('stock_branch', e.target.value)}
                            className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                            <option value="">All Branches</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    )}
                    <select value={filterStatus} onChange={e => handleFilter('stock_status', e.target.value)}
                        className="h-9 px-3 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground">
                        <option value="">All Status</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="near_expiry">Near Expiry</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="expired">Expired</option>
                    </select>
                    <span className="text-xs text-muted-foreground ml-auto tabular-nums">{stockPagination.total.toLocaleString()} records</span>
                </div>
            </div>

            {loading && <div className="w-full h-0.5 bg-border rounded-full overflow-hidden"><div className="h-full bg-primary animate-pulse rounded-full" /></div>}

            {/* Table */}
            <div className={cn('bg-card border border-border rounded-xl overflow-hidden', loading && 'opacity-60')}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                {['Product', 'Branch', 'Stock', 'Capital', 'Price', 'Status', 'Expiry', ''].map((h, i) => (
                                    <th key={i} className={cn('px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap',
                                        i >= 2 && i <= 4 ? 'text-right' : i === 5 ? 'text-center' : i === 6 ? 'text-right' : 'text-left',
                                        i === 1 ? 'hidden md:table-cell' : '', i === 3 ? 'hidden lg:table-cell' : '', i === 6 ? 'hidden lg:table-cell' : ''
                                    )}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {stockRows.length === 0 ? (
                                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">No stock records found</td></tr>
                            ) : stockRows.map((s, i) => (
                                <tr key={i} className="hover:bg-muted/20 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <ProductThumbnail
                                                src={s.product_img}
                                                name={s.product_name}
                                                aspect="w-9 h-9 rounded-lg shrink-0 border border-border"
                                                padding="p-0.5"
                                            />
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-foreground text-sm font-semibold">{s.product_name}</span>
                                                    {s.product_type === 'bundle' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400">Bundle</span>}
                                                </div>
                                                {s.product_barcode && <div className="text-muted-foreground text-xs font-mono">{s.product_barcode}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-sm">{s.branch_name}</td>
                                    <td className="px-4 py-3 text-right font-bold text-foreground">{s.stock.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">₱{s.capital.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right text-emerald-500 dark:text-emerald-400 font-semibold">{s.formatted_price}</td>
                                    <td className="px-4 py-3 text-center"><span className={cn('text-xs px-2.5 py-1 rounded-full', statusBadge(s.status))}>{s.status}</span></td>
                                    <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden lg:table-cell">{s.expiry_date ?? '—'}</td>
                                    <td className="px-4 py-3 text-right">
                                        {s.product_type !== 'made_to_order' && (
                                            <button onClick={() => setAdjustItem({ product_id: s.product_id, product_name: s.product_name, stock: s })}
                                                className={cn(
                                                    "h-7 px-3 text-xs font-medium rounded-lg border transition-all opacity-0 group-hover:opacity-100",
                                                    s.product_type === 'bundle'
                                                        ? "border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                                                        : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                                )}>
                                                {s.product_type === 'bundle' ? 'Set Qty' : 'Adjust'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stock pagination */}
            <PaginationBar pagination={stockPagination} onPageChange={handlePageChange} onPerPageChange={handlePerPage} perPageOptions={[10, 25, 50, 100]} loading={loading} />

            <StockAdjustModal item={adjustItem} onClose={() => setAdjustItem(null)} />
        </div>
    );
}

// ─── Tabs definition ──────────────────────────────────────────────────────────

const TABS = [
    { key: 'products',   label: 'All Products', icon: Package },
    { key: 'categories', label: 'Categories',   icon: Tag },
    { key: 'variants',   label: 'Variants',     icon: Layers },
    { key: 'bundles',    label: 'Bundles',       icon: GitMerge },
    { key: 'recipes',    label: 'Recipes / BOM', icon: ChefHat },
    { key: 'stock',      label: 'Stock Mgmt',    icon: Boxes },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductsIndex() {
    const {
        products, pagination, filters, stats,
        variantProducts, bundleProducts, recipeProducts,
        stockRows, stockPagination, stockFilters,
        categories, branches, allProductsForSelect,
        isAdmin, flash, tab: initialTab,
    } = usePage<PageProps>().props;

    const [activeTab, setActiveTab] = useState(initialTab ?? 'products');
    const [toast, setToast]         = useState<{ type: string; text: string } | null>(flash?.message ?? null);

    const tabCount = (key: string) => {
        if (key === 'products')   return stats.total_products;
        if (key === 'categories') return categories.length;
        if (key === 'variants')   return variantProducts.length;
        if (key === 'bundles')    return bundleProducts.length;
        if (key === 'recipes')    return recipeProducts.length;
        if (key === 'stock')      return stockPagination.total;
        return null;
    };

    return (
        <AdminLayout>
            <Head title="Products" />
            {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

            <div className="space-y-5 max-w-[1400px] mx-auto">

                {/* Page header */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Products</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {stats.total_products.toLocaleString()} product{stats.total_products !== 1 ? 's' : ''} · {stats.total_units.toLocaleString()} units across {branches.length} branch{branches.length !== 1 ? 'es' : ''}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-0 border-b border-border overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {TABS.map(t => {
                        const count = tabCount(t.key);
                        const Icon  = t.icon;
                        return (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className={cn('flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors',
                                    activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                )}>
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                {t.label}
                                {count !== null && (
                                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums',
                                        activeTab === t.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                                    )}>{count.toLocaleString()}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab content */}
                {activeTab === 'products'   && <AllProductsTab products={products} pagination={pagination} filters={filters} stats={stats} categories={categories} branches={branches} isAdmin={isAdmin} />}
                {activeTab === 'categories' && <CategoriesTab categories={categories} />}
                {activeTab === 'variants'   && <VariantsTab variantProducts={variantProducts} allProducts={allProductsForSelect} />}
                {activeTab === 'bundles'    && <BundlesTab bundleProducts={bundleProducts} allProducts={allProductsForSelect} branches={branches} isAdmin={isAdmin} />}
                {activeTab === 'recipes'    && <RecipesTab recipeProducts={recipeProducts} allProducts={allProductsForSelect} />}
                {activeTab === 'stock'      && <StockManagementTab stockRows={stockRows} stockPagination={stockPagination} stockFilters={stockFilters} branches={branches} isAdmin={isAdmin} />}

            </div>
        </AdminLayout>
    );
}