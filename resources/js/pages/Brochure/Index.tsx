"use client";

import { useState, useMemo, useCallback } from "react";
import { Head, usePage } from "@inertiajs/react";
import { QRCodeSVG } from "qrcode.react";
import AdminLayout from "@/layouts/AdminLayout";

import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { cn }     from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
    Search, Printer, BookImage, QrCode,
    PanelLeftClose, PanelLeftOpen, Type,
} from "lucide-react";
import ProductThumbnail, { getDefaultProductIcon } from "@/components/ProductThumbnail";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Product {
    id: number;
    name: string;
    barcode: string | null;
    category: string | null;
    price: number;
    product_img: string | null;
}

interface SharedApp { color_theme: string; logo_url: string | null; name: string; }

interface PageProps {
    products:  Product[];
    shop_name: string;
    currency:  string;
    app:       SharedApp;
}

// ─── Theme palette ──────────────────────────────────────────────────────────────

const PALETTE: Record<string, { primary: string; dark: string }> = {
    ea:      { primary: "#D51A5C", dark: "#0A1134" },
    indigo:  { primary: "#4f46e5", dark: "#3730a3" },
    violet:  { primary: "#7c3aed", dark: "#4c1d95" },
    emerald: { primary: "#059669", dark: "#065f46" },
    teal:    { primary: "#0d9488", dark: "#134e4a" },
    cyan:    { primary: "#0891b2", dark: "#164e63" },
    amber:   { primary: "#d97706", dark: "#92400e" },
    orange:  { primary: "#ea580c", dark: "#7c2d12" },
    rose:    { primary: "#e11d48", dark: "#9f1239" },
    slate:   { primary: "#475569", dark: "#1e293b" },
};

type P = typeof PALETTE[string];
type LayoutId = "classic" | "magazine" | "catalog" | "dark" | "minimal" | "bold";

// ─── Layout definitions ────────────────────────────────────────────────────────

const LAYOUTS: { id: LayoutId; label: string; desc: string; preview: (c: string) => JSX.Element }[] = [
    {
        id: "classic", label: "Classic Grid", desc: "Image top, name & price below, accent bar",
        preview: c => (
            <div className="w-full h-full grid grid-cols-2 gap-1 p-1">
                {[0,1,2,3].map(i => (
                    <div key={i} className="rounded border border-gray-200 bg-white overflow-hidden">
                        <div className="h-5 bg-gray-100" />
                        <div className="p-0.5 space-y-0.5">
                            <div className="h-1.5 bg-gray-300 rounded w-3/4" />
                            <div className="h-1.5 rounded w-1/2" style={{ background: c }} />
                        </div>
                        <div className="h-0.5" style={{ background: c }} />
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: "magazine", label: "Magazine", desc: "Hero featured image + supporting grid",
        preview: c => (
            <div className="w-full h-full p-1 space-y-1">
                <div className="h-9 rounded overflow-hidden relative" style={{ background: `linear-gradient(135deg,${c}99,${c})` }}>
                    <div className="absolute bottom-1 left-1 space-y-0.5">
                        <div className="h-1.5 bg-white/80 rounded w-12" />
                        <div className="h-1 bg-white/60 rounded w-7" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-0.5">
                    {[0,1,2].map(i => (
                        <div key={i} className="rounded border border-gray-200 bg-white">
                            <div className="h-4 bg-gray-100" />
                            <div className="p-0.5"><div className="h-1 rounded" style={{ background: `${c}50` }} /></div>
                        </div>
                    ))}
                </div>
            </div>
        ),
    },
    {
        id: "catalog", label: "Catalog", desc: "Horizontal cards — image left, details right",
        preview: c => (
            <div className="w-full h-full p-1 space-y-1">
                {[0,1,2,3].map(i => (
                    <div key={i} className="flex gap-1 rounded border border-gray-200 bg-white h-7" style={{ borderLeft: `2px solid ${c}` }}>
                        <div className="w-6 shrink-0 bg-gray-100" />
                        <div className="flex-1 p-0.5 flex flex-col justify-center space-y-0.5">
                            <div className="h-1.5 bg-gray-300 rounded w-3/4" />
                            <div className="h-1.5 rounded w-1/3" style={{ background: c }} />
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: "dark", label: "Luxe Dark", desc: "Premium dark cards with glow accents",
        preview: c => (
            <div className="w-full h-full grid grid-cols-2 gap-1 p-1 bg-gray-900 rounded">
                {[0,1,2,3].map(i => (
                    <div key={i} className="rounded overflow-hidden bg-gray-800">
                        <div className="h-6 bg-gray-700" />
                        <div className="p-0.5 space-y-0.5">
                            <div className="h-1.5 bg-gray-500 rounded w-3/4" />
                            <div className="h-1.5 rounded w-1/2" style={{ background: c }} />
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: "minimal", label: "Minimal", desc: "Generous whitespace, refined typography",
        preview: c => (
            <div className="w-full h-full grid grid-cols-2 gap-1.5 p-1.5 bg-white">
                {[0,1,2,3].map(i => (
                    <div key={i} className="space-y-0.5">
                        <div className="aspect-square bg-gray-50 rounded-sm" />
                        <div className="h-1.5 bg-gray-200 rounded w-4/5" />
                        <div className="h-1.5 rounded w-1/3" style={{ background: c }} />
                    </div>
                ))}
            </div>
        ),
    },
    {
        id: "bold", label: "Vibrant Bold", desc: "Color header band, strong price badge",
        preview: c => (
            <div className="w-full h-full grid grid-cols-2 gap-1 p-1">
                {[0,1,2,3].map(i => (
                    <div key={i} className="rounded overflow-hidden border border-gray-200">
                        <div className="h-2.5 flex items-center px-1" style={{ background: c }}>
                            <div className="h-1 bg-white/70 rounded w-3/4" />
                        </div>
                        <div className="h-6 bg-gray-50" />
                        <div className="p-0.5 flex justify-between items-center bg-white">
                            <div className="h-1 bg-gray-300 rounded w-1/2" />
                            <div className="h-2.5 w-5 rounded flex items-center justify-center" style={{ background: c }}>
                                <span style={{ fontSize: 4, color: "#fff", fontWeight: 700 }}>₱</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
];

// ─── QR overlay ────────────────────────────────────────────────────────────────

function QrOverlay({ value, size = 32 }: { value: string; size?: number }) {
    return (
        <div className="absolute bottom-1.5 right-1.5 bg-white rounded p-0.5 shadow"
            style={{ width: size + 4, height: size + 4 }}>
            <QRCodeSVG value={value || "N/A"} size={size} level="M" />
        </div>
    );
}

// ─── Brochure card ─────────────────────────────────────────────────────────────

function BrochureCard({ product, layout, pal, currency, showQr }: {
    product: Product; layout: LayoutId; pal: P; currency: string; showQr: boolean;
}) {
    const qrVal = product.barcode ?? product.name;
    const price = product.price > 0
        ? `${currency}${product.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
        : "—";

    const fallback = getDefaultProductIcon(product.name, product.category ?? '');
    const img = (
        <img
            src={product.product_img || fallback}
            alt=""
            className="w-full h-full object-contain p-2"
            loading="lazy"
            onError={(e) => {
                (e.target as HTMLImageElement).src = fallback;
            }}
        />
    );

    if (layout === "classic") return (
        <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 flex flex-col break-inside-avoid">
            <div className="relative aspect-square overflow-hidden bg-gray-50">{img}
                {showQr && <QrOverlay value={qrVal} size={30} />}
            </div>
            <div className="p-2 flex-1 flex flex-col">
                {product.category && <span className="text-[8px] font-bold uppercase tracking-wider mb-0.5" style={{ color: pal.primary }}>{product.category}</span>}
                <p className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2 flex-1">{product.name}</p>
                <p className="text-sm font-bold mt-1" style={{ color: pal.primary }}>{price}</p>
            </div>
            <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg,${pal.primary},${pal.dark})` }} />
        </div>
    );

    if (layout === "magazine") return (
        <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 flex flex-col break-inside-avoid">
            <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: "4/3" }}>{img}
                {showQr && <QrOverlay value={qrVal} size={26} />}
            </div>
            <div className="p-2">
                <p className="text-[10px] font-bold text-gray-800 line-clamp-2 leading-tight">{product.name}</p>
                <p className="text-xs font-bold mt-1" style={{ color: pal.primary }}>{price}</p>
            </div>
        </div>
    );

    if (layout === "catalog") return (
        <div className="bg-white rounded-lg overflow-hidden flex break-inside-avoid"
            style={{ borderLeft: `3px solid ${pal.primary}`, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
            <div className="relative shrink-0 bg-gray-50 overflow-hidden" style={{ width: 80, height: 80 }}>{img}
                {showQr && <QrOverlay value={qrVal} size={22} />}
            </div>
            <div className="p-2.5 flex flex-col justify-center flex-1 min-w-0">
                {product.category && <span className="text-[7px] uppercase font-bold tracking-widest" style={{ color: pal.primary }}>{product.category}</span>}
                <p className="text-[11px] font-bold text-gray-800 line-clamp-2 leading-snug">{product.name}</p>
                {product.barcode && <p className="text-[8px] text-gray-400 mt-0.5">{product.barcode}</p>}
                <p className="text-[13px] font-extrabold mt-1" style={{ color: pal.dark }}>{price}</p>
            </div>
        </div>
    );

    if (layout === "dark") return (
        <div className="rounded-xl overflow-hidden break-inside-avoid" style={{ background: "#1e2030" }}>
            <div className="relative overflow-hidden bg-gray-800" style={{ aspectRatio: "1" }}>{img}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top,#1e2030,transparent 55%)" }} />
                {product.category && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[7px] font-bold text-white"
                        style={{ background: pal.primary }}>{product.category}</div>
                )}
                {showQr && (
                    <div className="absolute bottom-2 right-2 bg-white/90 rounded p-0.5">
                        <QRCodeSVG value={qrVal} size={26} level="M" />
                    </div>
                )}
            </div>
            <div className="px-2.5 py-2">
                <p className="text-[11px] font-semibold text-white line-clamp-2 leading-snug">{product.name}</p>
                <p className="text-[13px] font-extrabold mt-1" style={{ color: pal.primary }}>{price}</p>
            </div>
        </div>
    );

    if (layout === "minimal") return (
        <div className="bg-white flex flex-col break-inside-avoid">
            <div className="relative aspect-square overflow-hidden rounded-sm bg-gray-50">{img}
                {showQr && <QrOverlay value={qrVal} size={28} />}
            </div>
            <div className="pt-1.5 pb-2.5 px-0.5">
                {product.category && <p className="text-[7px] uppercase tracking-[0.15em] text-gray-400 mb-0.5">{product.category}</p>}
                <p className="text-[11px] font-medium text-gray-700 line-clamp-2 leading-snug">{product.name}</p>
                <p className="text-[13px] font-bold mt-1" style={{ color: pal.primary }}>{price}</p>
            </div>
            <div className="h-px bg-gray-100 w-full" />
        </div>
    );

    if (layout === "bold") return (
        <div className="rounded-xl overflow-hidden shadow-md break-inside-avoid">
            <div className="px-2.5 py-1.5 flex items-center"
                style={{ background: `linear-gradient(135deg,${pal.dark},${pal.primary})` }}>
                <p className="text-[10px] font-bold text-white line-clamp-1 flex-1">{product.name}</p>
            </div>
            <div className="relative bg-white overflow-hidden" style={{ aspectRatio: "4/3" }}>{img}
                {showQr && <QrOverlay value={qrVal} size={30} />}
            </div>
            <div className="px-2.5 py-1.5 bg-white flex items-center justify-between">
                {product.category && <span className="text-[8px] text-gray-400 uppercase tracking-wider">{product.category}</span>}
                <div className="ml-auto px-2 py-0.5 rounded-full text-[11px] font-extrabold text-white" style={{ background: pal.primary }}>
                    {price}
                </div>
            </div>
        </div>
    );

    return null;
}

// ─── Magazine hero ─────────────────────────────────────────────────────────────

function MagazineHero({ product, pal, currency, showQr }: {
    product: Product; pal: P; currency: string; showQr: boolean;
}) {
    const qrVal = product.barcode ?? product.name;
    const price = product.price > 0
        ? `${currency}${product.price.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : "—";
    return (
        <div className="relative rounded-xl overflow-hidden mb-4 shadow-md" style={{ height: 200 }}>
            {product.product_img
                ? <img src={product.product_img} alt={product.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = getDefaultProductIcon(product.name, product.category ?? ''); }} />
                : <div className="w-full h-full" style={{ background: `linear-gradient(135deg,${pal.dark},${pal.primary})` }} />
            }
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,.75),transparent 55%)" }} />
            {product.category && (
                <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                    style={{ background: pal.primary }}>{product.category}</div>
            )}
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                <div>
                    <p className="text-white font-bold text-base leading-tight drop-shadow">{product.name}</p>
                    <p className="text-white/80 text-sm font-bold mt-0.5">{price}</p>
                </div>
                {showQr && <div className="bg-white rounded p-0.5 shrink-0"><QRCodeSVG value={qrVal} size={36} level="M" /></div>}
            </div>
        </div>
    );
}

// ─── A4 page ───────────────────────────────────────────────────────────────────

function BrochurePage({ products, layout, cols, pal, currency, showQr, shopName, logoUrl, pageNum, totalPages, brochureTitle, subtitle, footerNote }: {
    products: Product[]; layout: LayoutId; cols: number; pal: P; currency: string;
    showQr: boolean; shopName: string; logoUrl: string | null; pageNum: number; totalPages: number;
    brochureTitle: string; subtitle: string; footerNote: string;
}) {
    const isCatalog  = layout === "catalog";
    const isMagazine = layout === "magazine" && pageNum === 1;
    const isDark     = layout === "dark";
    const hero       = isMagazine ? products[0] : null;
    const grid       = isMagazine ? products.slice(1) : products;

    const pageStyle: React.CSSProperties = {
        width: "210mm", minHeight: "297mm",
        backgroundColor: isDark ? "#111827" : "#ffffff",
        padding: "12mm 14mm", boxSizing: "border-box",
        fontFamily: "'Segoe UI', Arial, sans-serif",
        display: "flex", flexDirection: "column",
    };

    const gridStyle: React.CSSProperties = isCatalog
        ? { display: "flex", flexDirection: "column", gap: 10, flex: 1 }
        : { display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: layout === "minimal" ? 16 : 10, flex: 1, alignContent: "start" };

    return (
        <div style={pageStyle} className="brochure-a4-page">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 10, borderBottom: `2px solid ${pal.primary}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {logoUrl && <img src={logoUrl} alt="logo" style={{ height: 30, width: "auto", objectFit: "contain" }} />}
                    <span style={{ fontWeight: 700, fontSize: 14, color: isDark ? "#fff" : pal.dark }}>{shopName}</span>
                </div>
                <span style={{ fontSize: 9, color: isDark ? "#9ca3af" : "#9ca3af", fontWeight: 500 }}>
                    {pageNum > 1 ? `Page ${pageNum} of ${totalPages}` : "Product Catalog"}
                </span>
            </div>

            {/* Title banner — first page only */}
            {pageNum === 1 && brochureTitle && (
                <div style={{
                    background: `linear-gradient(135deg, ${pal.dark}, ${pal.primary})`,
                    borderRadius: 8, padding: "10px 18px", marginBottom: 12,
                    textAlign: "center",
                }}>
                    <p style={{ color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0, lineHeight: 1.2 }}>
                        {brochureTitle}
                    </p>
                    {subtitle && (
                        <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 11, fontWeight: 500, margin: "4px 0 0" }}>
                            {subtitle}
                        </p>
                    )}
                </div>
            )}

            {hero && <MagazineHero product={hero} pal={pal} currency={currency} showQr={showQr} />}

            <div style={gridStyle}>
                {grid.map(p => (
                    <BrochureCard key={p.id} product={p} layout={layout} pal={pal} currency={currency} showQr={showQr} />
                ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 8, color: isDark ? "#6b7280" : "#9ca3af" }}>
                    {footerNote || `${shopName} — Prices are subject to change without prior notice.`}
                </span>
                <span style={{ fontSize: 8, color: isDark ? "#6b7280" : pal.primary, fontWeight: 600 }}>
                    {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                </span>
            </div>
        </div>
    );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function BrochureIndex() {
    const { props } = usePage<PageProps>();
    const { products, shop_name, currency, app } = props;

    const pal     = PALETTE[app.color_theme ?? "ea"] ?? PALETTE.ea;
    const logoUrl = app.logo_url ?? null;

    // ── State ─────────────────────────────────────────────────────────────────
    const [layout,         setLayout]         = useState<LayoutId>("classic");
    const [cols,           setCols]           = useState(3);
    const [showQr,         setShowQr]         = useState(false);
    const [search,         setSearch]         = useState("");
    const [selected,       setSelected]       = useState<Set<number>>(new Set());
    const [sideOpen,       setSideOpen]       = useState(true);
    const [brochureTitle,  setBrochureTitle]  = useState("");
    const [subtitle,       setSubtitle]       = useState("");
    const [footerNote,     setFooterNote]     = useState("");

    // ── Derived ───────────────────────────────────────────────────────────────
    const itemsPerPage = useMemo(() => {
        if (layout === "catalog") return 6;
        if (layout === "magazine") return cols * 3; // hero counts as 1
        return cols * 3;
    }, [layout, cols]);

    const selectedProducts = useMemo(
        () => products.filter(p => selected.has(p.id)),
        [products, selected]
    );

    const pages = useMemo(() => {
        if (!selectedProducts.length) return [];
        const out: Product[][] = [];
        for (let i = 0; i < selectedProducts.length; i += itemsPerPage)
            out.push(selectedProducts.slice(i, i + itemsPerPage));
        return out;
    }, [selectedProducts, itemsPerPage]);

    const filteredProducts = useMemo(() => {
        const q = search.toLowerCase().trim();
        return q ? products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.category ?? "").toLowerCase().includes(q)
        ) : products;
    }, [products, search]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const toggle      = (id: number) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const selectAll   = () => setSelected(new Set(filteredProducts.map(p => p.id)));
    const deselectAll = () => setSelected(new Set());

    const handleViewPDF = useCallback(() => {
        const root = document.getElementById("__bro_print");
        if (!root || pages.length === 0) return;

        // Clone the hidden brochure into a temporary visible container so the
        // browser resolves all CSS (including layout / computed colours) before
        // we serialise.  The container is off-screen so the user never sees it.
        const tmp = root.cloneNode(true) as HTMLElement;
        tmp.style.cssText = "position:fixed;top:-99999px;left:-99999px;display:block;";
        document.body.appendChild(tmp);

        // Allow one frame for the browser to paint / resolve images.
        requestAnimationFrame(() => {
            const content = tmp.innerHTML;
            document.body.removeChild(tmp);

            // Collect every stylesheet <link> so Tailwind + app CSS is available.
            const styleLinks = Array.from(
                document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
            )
                .map(l => `<link rel="stylesheet" href="${l.href}">`)
                .join("\n");

            // Collect inline <style> blocks (runtime-injected CSS-var overrides, etc.).
            const inlineStyles = Array.from(document.querySelectorAll("style"))
                .map(s => `<style>${s.textContent}</style>`)
                .join("\n");

            // Preserve colour-theme & dark-mode from <html> so data-theme CSS
            // variables and .dark selectors activate in the new window.
            const htmlEl  = document.documentElement;
            const theme   = htmlEl.getAttribute("data-theme") ?? "";
            const htmlCls = htmlEl.className ?? "";

            const win = window.open("", "_blank");
            if (!win) return;

            const html = `<!DOCTYPE html>
<html class="${htmlCls}" ${theme ? `data-theme="${theme}"` : ""}>
<head>
<meta charset="utf-8"/>
<title>${shop_name} — Brochure</title>
<base href="${window.location.origin}/">
${styleLinks}
${inlineStyles}
<style>
  *{box-sizing:border-box}
  body{background:#e5e7eb!important;margin:0;padding:24px 0;font-family:'Segoe UI',Inter,Arial,sans-serif}
  #__bro_print{display:block!important}
  .brochure-a4-page{
    display:block;margin:24px auto;
    box-shadow:0 4px 24px rgba(0,0,0,.18);
    page-break-after:always;break-after:page
  }
  .brochure-a4-page:last-child{page-break-after:avoid;break-after:avoid;margin-bottom:48px}
  /* force colour printing */
  @media print{
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{background:#fff!important;padding:0!important}
    .brochure-a4-page{margin:0!important;box-shadow:none!important}
    @page{size:A4;margin:0}
  }
</style>
</head>
<body>
<div id="__bro_print">${content}</div>
</body>
</html>`;

            win.document.write(html);
            win.document.close();
        });
    }, [pages, shop_name]);

    const curLayout = LAYOUTS.find(l => l.id === layout)!;

    return (
        <AdminLayout>
            <Head title="Brochure Builder" />

            {/* Hidden print target */}
            <div id="__bro_print" style={{ display: "none" }} aria-hidden>
                {pages.map((chunk, i) => (
                    <BrochurePage key={i} products={chunk} layout={layout} cols={cols} pal={pal}
                        currency={currency} showQr={showQr} shopName={shop_name} logoUrl={logoUrl}
                        pageNum={i + 1} totalPages={pages.length}
                        brochureTitle={brochureTitle} subtitle={subtitle} footerNote={footerNote} />
                ))}
            </div>

            {/* Shell */}
            <div className="flex overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <aside className={cn(
                    "shrink-0 border-r border-border bg-background flex flex-col transition-all duration-200 overflow-hidden",
                    sideOpen ? "w-64 xl:w-72" : "w-10"
                )}>

                    {/* Collapse toggle */}
                    <div className={cn("flex items-center border-b border-border shrink-0", sideOpen ? "px-3 py-2.5 gap-2" : "justify-center py-2.5")}>
                        <button type="button" onClick={() => setSideOpen(v => !v)}
                            className="p-1 rounded hover:bg-muted/60 text-muted-foreground transition-colors shrink-0" title={sideOpen ? "Collapse panel" : "Expand panel"}>
                            {sideOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                        </button>
                        {sideOpen && (
                            <div>
                                <p className="font-semibold text-sm leading-none">Brochure Builder</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">A4 · print-ready</p>
                            </div>
                        )}
                    </div>

                    {/* All content hidden when collapsed */}
                    {sideOpen && (
                        <>
                            {/* ── All sections — single scrollable area ──── */}
                            <div className="flex-1 overflow-y-auto min-h-0">

                                {/* Layout picker */}
                                <div className="px-3 pt-3 pb-2 border-b border-border">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Layout</p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {LAYOUTS.map(l => (
                                            <button key={l.id} type="button" onClick={() => setLayout(l.id)}
                                                className={cn(
                                                    "rounded-md border-2 overflow-hidden transition-all text-left",
                                                    layout === l.id
                                                        ? "border-primary ring-1 ring-primary/30"
                                                        : "border-border hover:border-muted-foreground/40"
                                                )}>
                                                <div className="h-12 bg-muted/20 p-0.5">{l.preview(pal.primary)}</div>
                                                <p className="text-[8px] font-semibold px-1 py-0.5 leading-none truncate">{l.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1.5">{curLayout.desc}</p>
                                </div>

                                {/* Columns */}
                                <div className="px-3 py-2.5 border-b border-border">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Columns per row</p>
                                    <div className="flex gap-1">
                                        {[1,2,3,4].map(n => (
                                            <button key={n} type="button" onClick={() => setCols(n)}
                                                className={cn(
                                                    "flex-1 h-7 rounded border text-xs font-bold transition-colors",
                                                    cols === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted/50"
                                                )}>{n}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* QR toggle */}
                                <div className="px-3 py-2.5 border-b border-border">
                                    <label className="flex items-center justify-between cursor-pointer gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <QrCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <div>
                                                <p className="text-xs font-medium">Show QR Code</p>
                                                <p className="text-[10px] text-muted-foreground leading-none">Barcode on image corner</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => setShowQr(v => !v)}
                                            className={cn(
                                                "relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-colors shrink-0",
                                                showQr ? "bg-primary border-primary" : "bg-muted border-border"
                                            )}>
                                            <span className={cn(
                                                "inline-block h-3 w-3 rounded-full bg-white shadow transition-transform",
                                                showQr ? "translate-x-4" : "translate-x-0.5"
                                            )} />
                                        </button>
                                    </label>
                                </div>

                                {/* Text & Labels */}
                                <div className="px-3 py-2.5 border-b border-border space-y-2.5">
                                    <div className="flex items-center gap-1.5">
                                        <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Text & Labels</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Title</Label>
                                        <Input placeholder="e.g. PROMO SALES" value={brochureTitle}
                                            onChange={e => setBrochureTitle(e.target.value)}
                                            className="h-7 text-xs" maxLength={60} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Subtitle</Label>
                                        <Input placeholder="e.g. Limited time offer only" value={subtitle}
                                            onChange={e => setSubtitle(e.target.value)}
                                            className="h-7 text-xs" maxLength={80} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Footer Note</Label>
                                        <Textarea placeholder="e.g. Valid until Dec 31 · While stocks last"
                                            value={footerNote} onChange={e => setFooterNote(e.target.value)}
                                            className="text-xs resize-none" rows={2} maxLength={120} />
                                    </div>
                                </div>

                                {/* Product selector */}
                                <div className="px-3 pt-2.5 pb-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Products</p>
                                        <span className="text-[10px] text-muted-foreground">{selected.size} selected</span>
                                    </div>
                                    <div className="relative mb-1.5">
                                        <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input placeholder="Search…" value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            className="pl-6 h-7 text-xs" />
                                    </div>
                                    <div className="flex gap-1 mb-2">
                                        <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1 px-1" onClick={selectAll}>All</Button>
                                        <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1 px-1" onClick={deselectAll}>None</Button>
                                    </div>
                                    <div className="space-y-0.5">
                                        {filteredProducts.length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-4">No products found.</p>
                                        )}
                                        {filteredProducts.map(p => (
                                            <label key={p.id}
                                                className={cn(
                                                    "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                                                    selected.has(p.id) ? "bg-primary/8" : "hover:bg-muted/40"
                                                )}>
                                                <input type="checkbox" checked={selected.has(p.id)}
                                                    onChange={() => toggle(p.id)} className="rounded shrink-0 h-3 w-3" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[11px] font-medium truncate leading-tight">{p.name}</p>
                                                    {p.category && <p className="text-[9px] text-muted-foreground truncate">{p.category}</p>}
                                                </div>
                                                <ProductThumbnail
                                                    src={p.product_img}
                                                    name={p.name}
                                                    categoryName={p.category}
                                                    aspect="h-6 w-6 rounded shrink-0 border border-border"
                                                    padding="p-0.5"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ── View as PDF button — always visible at bottom ── */}
                            <div className="px-3 py-3 border-t border-border shrink-0">
                                <Button className="w-full gap-1.5 h-8 text-xs" onClick={handleViewPDF}
                                    disabled={selectedProducts.length === 0}>
                                    <Printer className="h-3.5 w-3.5" />
                                    View as PDF
                                </Button>
                                <p className="text-[9px] text-muted-foreground text-center mt-1">
                                    {selectedProducts.length} product{selectedProducts.length !== 1 ? "s" : ""} · {pages.length} page{pages.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </>
                    )}
                </aside>

                {/* ── Preview ───────────────────────────────────────────────── */}
                <div className="flex-1 overflow-auto bg-neutral-300 flex flex-col items-center py-8 gap-6 min-w-0">
                    {pages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-4">
                            <BookImage className="h-12 w-12 text-neutral-400" />
                            <div>
                                <p className="font-medium text-neutral-600">No products selected</p>
                                <p className="text-sm text-neutral-500 mt-0.5">
                                    {!sideOpen ? "Open the panel and select" : "Check products in the left panel"} to preview your brochure
                                </p>
                            </div>
                            {!sideOpen && (
                                <Button size="sm" variant="outline" onClick={() => setSideOpen(true)}>
                                    <PanelLeftOpen className="h-4 w-4 mr-1" /> Open Builder
                                </Button>
                            )}
                        </div>
                    ) : (
                        pages.map((chunk, i) => (
                            <div key={i} className="shadow-2xl rounded-sm overflow-hidden">
                                <BrochurePage products={chunk} layout={layout} cols={cols} pal={pal}
                                    currency={currency} showQr={showQr} shopName={shop_name} logoUrl={logoUrl}
                                    pageNum={i + 1} totalPages={pages.length}
                                    brochureTitle={brochureTitle} subtitle={subtitle} footerNote={footerNote} />
                            </div>
                        ))
                    )}
                    <div className="pb-8" />
                </div>
            </div>
        </AdminLayout>
    );
}
