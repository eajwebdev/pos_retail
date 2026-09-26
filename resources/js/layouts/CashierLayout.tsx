"use client";

import { ReactNode, useEffect } from "react";
import { Link, Head, router, usePage } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
    ShoppingCart, History, Wallet, Calculator,
    PiggyBank, LogOut, Sun, Moon, Users,
} from "lucide-react";

// ─── Menu IDs (must match MenuHelper.php) ─────────────────────────────────────
const M = {
    POS:           "2",
    SALES_HISTORY: "3",
    CASH_SESSIONS: "14",
    CASH_COUNTS:   "15",
    PETTY_CASH:    "16",
    CUSTOMERS:     "39",
} as const;

// Alt+1…6 — reliably interceptable, don't clash with browser or POS F-key bindings
const NAV = [
    { id: M.POS,           href: "/pos",           icon: ShoppingCart,  label: "Cashier",      key: "Alt+1" },
    { id: M.SALES_HISTORY, href: "/sales/history", icon: History,       label: "History",      key: "Alt+2" },
    { id: M.CASH_SESSIONS, href: "/cash-sessions", icon: Wallet,        label: "Cash Session", key: "Alt+3" },
    { id: M.CASH_COUNTS,   href: "/cash-counts",   icon: Calculator,    label: "Cash Count",   key: "Alt+4" },
    { id: M.PETTY_CASH,    href: "/petty-cash",    icon: PiggyBank,     label: "Petty Cash",   key: "Alt+5" },
    { id: M.CUSTOMERS,     href: "/customers",     icon: Users,         label: "Customers",    key: "Alt+6" },
] as const;

export default function CashierLayout({ children }: { children: ReactNode }) {
    const { props } = usePage<any>();
    const { theme, setTheme } = useTheme();
    const currentPath = usePage().url.split("?")[0].replace(/\/$/, "");

    const access: string[] = props.auth?.user?.access ?? [];
    const has = (id: string) => access.includes(id);

    const user   = props.auth?.user;
    const branch = (props.branch as any) ?? user?.branch;
    const session = props.session as any;   // only present on POS page
    const appName = props.app?.name ?? "POS System";
    const appLogo = props.app?.logo_url ?? null;
    const appIcon = props.app?.icon_url || appLogo || "/uploads/eaj-appicon__.png";

    const isActive = (href: string) => {
        const h = href.replace(/\/$/, "");
        return currentPath === h || currentPath.startsWith(h + "/");
    };

    // Global nav shortcuts — disabled on /pos (it registers its own F-key handlers)
    useEffect(() => {
        if (currentPath === "/pos") return;
        const fn = (e: KeyboardEvent) => {
            if (!e.altKey) return;
            const digit = e.key; // "1"–"5" when altKey is held
            const item = NAV.find(n => n.key === `Alt+${digit}`);
            if (!item) return;
            // Always suppress the browser's Alt+key action first
            e.preventDefault();
            if (has(item.id)) router.visit(item.href);
        };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, [currentPath, access.join(",")]);

    const visibleNav = NAV.filter(n => has(n.id));

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
            <Head title={(props as any).title ?? ""}>
                <link rel="icon" href={appIcon} />
                <link rel="apple-touch-icon" href={appIcon} />
            </Head>

            {/* ── Top bar (h-12) ───────────────────────────────────── */}
            <header className="shrink-0 h-12 bg-card border-b border-border flex items-center justify-between px-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md bg-[#0A1134] border border-white/10 text-primary-foreground overflow-hidden p-0.5 shadow-xs">
                        <img src={appIcon} alt={appName} className="h-full w-full object-contain" />
                    </div>
                    <span className="font-semibold text-sm truncate">
                        {branch?.name ?? appName}
                    </span>
                    {/* Session status — only shown when POS passes it as a prop */}
                    {session !== undefined && (
                        <div className={cn(
                            "hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0",
                            session
                                ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                        )}>
                            <span className={cn("h-1.5 w-1.5 rounded-full",
                                session ? "bg-green-500" : "bg-amber-500")} />
                            {session ? "Session Open" : "No Session"}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden md:block text-xs text-muted-foreground">
                        {user?.fname} {user?.lname}
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-muted text-[10px] font-bold uppercase">Cashier</span>
                    </span>
                    <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        aria-label="Toggle theme"
                    >
                        <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>
                </div>
            </header>

            {/* ── Page content ─────────────────────────────────────── */}
            {/* POS page manages its own layout — no padding, no overflow */}
            <main className={cn("flex-1 min-h-0 overflow-hidden", currentPath !== "/pos" && "overflow-y-auto p-6")}>
                {children}
            </main>

            {/* ── Bottom nav bar (h-16) ────────────────────────────── */}
            <nav className="shrink-0 h-16 flex items-stretch select-none border-t border-border bg-primary">
                {visibleNav.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                                "relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                                active
                                    ? "border-t-2 border-primary-foreground bg-black/20"
                                    : "text-primary-foreground/60 hover:bg-black/10 hover:text-primary-foreground"
                            )}
                            style={active ? { color: "var(--primary-foreground)" } : undefined}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="text-[10px] font-semibold leading-none">{item.label}</span>
                            <span className={cn(
                                "absolute bottom-1.5 right-1.5 text-[8px] font-mono px-1 py-px rounded leading-none",
                                active
                                    ? "bg-white/20 text-primary-foreground"
                                    : "bg-black/20 text-primary-foreground/40"
                            )}>
                                {item.key}
                            </span>
                        </Link>
                    );
                })}

                {/* Divider */}
                <div className="w-px self-stretch my-2 shrink-0 bg-primary-foreground/20" />

                {/* Logout */}
                <button
                    onClick={() => router.post("/logout", {}, { preserveState: false })}
                    className="shrink-0 w-16 flex flex-col items-center justify-center gap-0.5 transition-colors text-primary-foreground/60 hover:bg-black/10 hover:text-primary-foreground"
                >
                    <LogOut className="h-5 w-5" />
                    <span className="text-[10px] font-semibold leading-none">Logout</span>
                </button>
            </nav>
        </div>
    );
}
