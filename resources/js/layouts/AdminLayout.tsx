"use client";

import { ReactNode } from "react";
import { Link, Head, router, usePage } from "@inertiajs/react";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar";

import {
    Avatar,
    AvatarFallback,
} from "@/components/ui/avatar";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";

import {
    LayoutDashboard,
    ShoppingCart,
    History,
    ShoppingBag,
    Package,
    Tag,
    Layers,
    GitMerge,
    ChefHat,
    Boxes,
    ClipboardList,
    PackageCheck,
    Wallet,
    Calculator,
    PiggyBank,
    Receipt,
    BarChart2,
    TrendingUp,
    ArchiveX,
    PackageX,
    FileText,
    ScrollText,
    Users,
    Truck,
    Building2,
    FolderOpen,
    Settings,
    LogOut,
    Bell,
    Sun,
    Moon,
    ChevronDown,
    LayoutList,
    ArrowLeftRight,
    Warehouse,
    ClipboardCheck,
    BookImage,
    Wrench,
} from "lucide-react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { routes } from "@/routes";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import FloatingChat from "@/components/FloatingChat";
import CashierLayout from "./CashierLayout";

interface AdminLayoutProps {
    children: ReactNode;
    defaultSidebarOpen?: boolean;
    sidebarCollapsible?: "offcanvas" | "icon" | "none";
    title?: string;
}

// ─── Menu ID constants (must match MenuHelper.php) ───────────────────────────
const MENU = {
    DASHBOARD:          "1",
    POS:                "2",
    SALES_HISTORY:      "3",
    SHOP_ORDERS:        "5",
    PRODUCTS:           "6",
    CATEGORIES:         "7",
    VARIANTS:           "8",
    BUNDLES:            "9",
    RECIPES:            "10",
    STOCK:              "11",
    PURCHASE_ORDERS:    "12",
    GRN:                "13",
    CASH_SESSIONS:      "14",
    CASH_COUNTS:        "15",
    PETTY_CASH:         "16",
    EXPENSES:           "17",
    DAILY_SUMMARY:      "18",
    SALES_REPORT:       "19",
    INVENTORY_REPORT:   "20",
    EXPENSE_REPORT:           "21",
    INGREDIENT_USAGE_REPORT:  "30",
    ACTIVITY_LOGS:            "22",
    USERS:              "23",
    SUPPLIERS:          "24",
    BRANCHES:           "25",
    EXPENSE_CATEGORIES: "27",
    SYSTEM_SETTINGS:    "28",
    PROMOS:             "29",
    STOCK_ADJUSTMENTS:  "31",
    INVENTORY:          "33",
    STOCK_TRANSFERS:    "34",
    WAREHOUSES:         "35",
    STOCK_COUNT:        "36",
    BROCHURE:           "37",
    SERVICES:           "38",
    CUSTOMERS:          "39",
} as const;

// ─── Sidebar section header ───────────────────────────────────────────────────
function SidebarSectionLabel({ label }: { label: string }) {
    return (
        <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
            {label}
        </p>
    );
}

// ─── Simple flat link ─────────────────────────────────────────────────────────
function NavItem({
    href,
    icon: Icon,
    label,
    active,
    tooltip,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    active: boolean;
    tooltip?: string;
}) {
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                tooltip={tooltip ?? label}
                className={cn(
                    "hover:bg-accent/80 transition-colors",
                    active && "bg-accent text-accent-foreground font-medium"
                )}
            >
                <Link href={href}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

// ─── Collapsible group ────────────────────────────────────────────────────────
function NavGroup({
    icon: Icon,
    label,
    active,
    children,
}: {
    icon: React.ElementType;
    label: string;
    active: boolean;
    children: ReactNode;
}) {
    return (
        <SidebarMenuItem>
            <Collapsible defaultOpen={active}>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                        tooltip={label}
                        className={cn(
                            "justify-between [&[data-state=open]>svg:last-child]:rotate-180 hover:bg-accent/80 transition-colors",
                            active && "bg-accent/60 text-accent-foreground font-medium"
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span>{label}</span>
                        </div>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="ml-4 mt-0.5 mb-1 flex flex-col gap-0.5 pl-2 border-l border-border/50">
                        {children}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </SidebarMenuItem>
    );
}

// ─── Sub-link inside a NavGroup ───────────────────────────────────────────────
function SubLink({
    href,
    label,
    active,
}: {
    href: string;
    label: string;
    active: boolean;
}) {
    return (
        <Link
            href={href}
            className={cn(
                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                active && "bg-accent text-accent-foreground font-medium"
            )}
        >
            {label}
        </Link>
    );
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export default function AdminLayout({
    children,
    defaultSidebarOpen,
    sidebarCollapsible = "icon",
    title,
}: AdminLayoutProps) {
    const { props } = usePage<any>();
    const { theme, setTheme } = useTheme();
    const appName = props.app?.name ?? "POS System";
    const appLogo = props.app?.logo_url ?? null;
    const appIcon = props.app?.icon_url || appLogo || "/uploads/eaj-appicon__.png";

    const currentPath = usePage().url.split("?")[0].replace(/\/$/, "");
    const isPosPage = currentPath === "/pos" || currentPath.startsWith("/pos");

    // Touch-oriented layouts use the compact cashier navigation on other pages.
    // On /pos, always maintain the full SimSoft POS register interface!
    const posLayout = props.auth?.user?.pos_layout ?? "grid";
    const BOTTOM_NAV_LAYOUTS = ["tablet", "grocery", "cafe", "salon"];
    if (BOTTOM_NAV_LAYOUTS.includes(posLayout) && !isPosPage) {
        return <CashierLayout>{children}</CashierLayout>;
    }

    // Automatically collapse / close sidebar when entering POS, unless explicitly overridden
    const shouldOpen = defaultSidebarOpen !== undefined ? defaultSidebarOpen : !isPosPage;

    const isActive = (path: string): boolean => {
        const p = path.replace(/\/$/, "");
        return currentPath === p || currentPath.startsWith(p + "/");
    };

    const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

    const role: string = props.auth?.user?.role ?? "";
    const isSuperOrAdmin = role === "super_admin" || role === "administrator" || Boolean(props.auth?.user?.is_super_admin) || Boolean(props.auth?.user?.is_administrator);

    const userAccess: string[] = props.auth?.user?.access ?? [];
    const has = (id: string) => {
        if (isSuperOrAdmin && (id === MENU.DASHBOARD || id === MENU.SYSTEM_SETTINGS)) {
            return true;
        }
        return userAccess.includes(id);
    };
    const roleLabel = () => {
        if (role === "super_admin")   return "Super Admin";
        if (role === "administrator") return "Administrator";
        if (role === "manager")       return "Manager";
        if (role === "cashier")       return "Cashier";
        return role;
    };

    // Inventory group active if any sub-path is active
    const inventoryActive = ["/products", "/categories", "/variants", "/bundles", "/recipes", "/stock", "/purchase-orders", "/grn", "/stock-adjustments", "/inventory", "/stock-transfers", "/warehouses"].some(isActive);
    // Cash group active
    const cashActive = ["/cash-sessions", "/cash-counts", "/petty-cash", "/expenses"].some(isActive);
    // Reports group active
    const reportsActive = ["/reports", "/logs", "/stock-adjustments"].some(isActive);
    // Management group active
    const managementActive = ["/users", "/suppliers", "/branches", "/settings"].some(isActive);

    return (
        <SidebarProvider
            key={isPosPage ? "sidebar-pos" : "sidebar-main"}
            defaultOpen={shouldOpen}
            forceDesktop={isPosPage}
        >
            <div className="flex min-h-screen w-full bg-background text-foreground">

                {/* ── SIDEBAR ─────────────────────────────────────────── */}
                <Sidebar collapsible={sidebarCollapsible} className="border-r border-border">
                    <Head title={props.title ?? ""}>
                        <link rel="icon" href={appIcon} />
                        <link rel="apple-touch-icon" href={appIcon} />
                    </Head>

                    {/* Header / Logo */}
                    <SidebarHeader className="border-b border-border">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton size="lg" asChild>
                                    <Link href={has(MENU.DASHBOARD) ? routes.dashboard() : routes.pos.index()}>
                                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#0A1134] border border-white/10 text-primary-foreground overflow-hidden p-1 shadow-xs">
                                            <img src={appIcon} alt={appName} className="h-full w-full object-contain" />
                                        </div>
                                        <div className="grid flex-1 text-left text-sm leading-tight">
                                            <span className="truncate font-semibold">{appName}</span>
                                            <span className="truncate text-xs text-muted-foreground">
                                                {props.auth?.user?.supplier?.name ?? "—"}
                                            </span>
                                        </div>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarHeader>

                    {/* Content */}
                    <SidebarContent className="overflow-y-auto">
                        <SidebarGroup>
                            <SidebarGroupContent>
                                <SidebarMenu>

                                    {/* ── MAIN ──────────────────────────── */}
                                    {has(MENU.DASHBOARD) && (
                                        <NavItem
                                            href={routes.dashboard()}
                                            icon={LayoutDashboard}
                                            label="Dashboard"
                                            active={isActive(routes.dashboard())}
                                        />
                                    )}

                                    {/* ── SALES ─────────────────────────── */}
                                    {(has(MENU.POS) || has(MENU.SALES_HISTORY) || has(MENU.SHOP_ORDERS) || has(MENU.PROMOS) || has(MENU.CUSTOMERS)) && (
                                        <>
                                            <SidebarSectionLabel label="Sales" />

                                            {has(MENU.POS) && (
                                                <NavItem href="/pos" icon={ShoppingCart} label="POS / Cashier" active={isActive("/pos")} />
                                            )}
                                            {has(MENU.SALES_HISTORY) && (
                                                <NavItem href="/sales/history" icon={History} label="Sales History" active={isActive("/sales/history")} />
                                            )}
                                            {has(MENU.SHOP_ORDERS) && (
                                                <NavItem href="/shop/orders" icon={ShoppingBag} label="Shop Orders" active={isActive("/shop/orders")} />
                                            )}
                                            {has(MENU.PROMOS) && (
                                                <NavItem href="/promos" icon={Tag} label="Promos & Discounts" active={isActive("/promos")} />
                                            )}
                                            {has(MENU.CUSTOMERS) && (
                                                <NavItem href="/customers" icon={Users} label="Customers" active={isActive("/customers")} />
                                            )}
                                        </>
                                    )}

                                    {/* ── INVENTORY ─────────────────────── */}
                                    {(has(MENU.PRODUCTS) || has(MENU.PURCHASE_ORDERS) || has(MENU.STOCK_ADJUSTMENTS) || has(MENU.INVENTORY) || has(MENU.STOCK_TRANSFERS) || has(MENU.WAREHOUSES) || has(MENU.STOCK_COUNT) || has(MENU.BROCHURE) || has(MENU.SERVICES)) && (
                                        <>
                                            <SidebarSectionLabel label="Inventory" />
                                            {has(MENU.INVENTORY) && (
                                                <NavItem href="/inventory" icon={LayoutList} label="Inventory" active={isActive("/inventory")} />
                                            )}
                                            {has(MENU.STOCK_COUNT) && (
                                                <NavItem href="/stock-count" icon={ClipboardCheck} label="Stock Count" active={isActive("/stock-count")} />
                                            )}
                                            {has(MENU.BROCHURE) && (
                                                <NavItem href="/brochure" icon={BookImage} label="Brochure Builder" active={isActive("/brochure")} />
                                            )}
                                            {has(MENU.SERVICES) && (
                                                <NavItem href="/services" icon={Wrench} label="Services" active={isActive("/services")} />
                                            )}
                                            {has(MENU.PRODUCTS) && (
                                                <NavItem
                                                    href="/products"
                                                    icon={Package}
                                                    label="All Products"
                                                    active={currentPath === "/products"}
                                                />
                                            )}
                                            {has(MENU.STOCK_TRANSFERS) && (
                                                <NavItem href="/stock-transfers" icon={ArrowLeftRight} label="Stock Transfers" active={isActive("/stock-transfers")} />
                                            )}
                                            {has(MENU.WAREHOUSES) && (
                                                <NavItem href="/warehouses" icon={Warehouse} label="Warehouses" active={isActive("/warehouses")} />
                                            )}
                                            {has(MENU.PURCHASE_ORDERS) && (
                                                <NavItem
                                                    href="/purchase-orders"
                                                    icon={PackageCheck}
                                                    label="Purchase Orders"
                                                    active={isActive("/purchase-orders")}
                                                />
                                            )}
                                            {has(MENU.STOCK_ADJUSTMENTS) && (
                                                <NavItem
                                                    href="/stock-adjustments"
                                                    icon={PackageX}
                                                    label="Losses / Damages"
                                                    active={isActive("/stock-adjustments")}
                                                />
                                            )}
                                        </>
                                    )}

                                    {/* ── CASH ──────────────────────────── */}
                                    {(has(MENU.CASH_SESSIONS) || has(MENU.CASH_COUNTS) || has(MENU.PETTY_CASH) || has(MENU.EXPENSES)) && (
                                        <>
                                            <SidebarSectionLabel label="Cash" />

                                            <NavGroup icon={Wallet} label="Cash Management" active={cashActive}>
                                                {has(MENU.CASH_SESSIONS) && (
                                                    <SubLink href="/cash-sessions" label="Cash Sessions" active={isActive("/cash-sessions")} />
                                                )}
                                                {has(MENU.CASH_COUNTS) && (
                                                    <SubLink href="/cash-counts" label="Cash Counts" active={isActive("/cash-counts")} />
                                                )}
                                                {has(MENU.PETTY_CASH) && (
                                                    <SubLink href="/petty-cash" label="Petty Cash" active={isActive("/petty-cash")} />
                                                )}
                                                {has(MENU.EXPENSES) && (
                                                    <SubLink href="/expenses" label="Expenses" active={isActive("/expenses")} />
                                                )}
                                            </NavGroup>
                                        </>
                                    )}

                                    {/* ── REPORTS ───────────────────────── */}
                                    {(has(MENU.DAILY_SUMMARY) || has(MENU.SALES_REPORT) || has(MENU.INVENTORY_REPORT) || has(MENU.EXPENSE_REPORT) || has(MENU.INGREDIENT_USAGE_REPORT) || has(MENU.ACTIVITY_LOGS)) && (
                                        <>
                                            <SidebarSectionLabel label="Reports" />

                                            <NavGroup icon={BarChart2} label="Reports" active={reportsActive}>
                                                {has(MENU.DAILY_SUMMARY) && (
                                                    <SubLink href="/reports/daily" label="Daily Summary" active={isActive("/reports/daily")} />
                                                )}
                                                {has(MENU.SALES_REPORT) && (
                                                    <SubLink href="/reports/sales" label="Sales Report" active={isActive("/reports/sales")} />
                                                )}
                                                {has(MENU.INVENTORY_REPORT) && (
                                                    <SubLink href="/reports/inventory" label="Inventory Report" active={isActive("/reports/inventory")} />
                                                )}
                                                {has(MENU.EXPENSE_REPORT) && (
                                                    <SubLink href="/reports/expenses" label="Expense Report" active={isActive("/reports/expenses")} />
                                                )}
                                                {has(MENU.INGREDIENT_USAGE_REPORT) && (
                                                    <SubLink href="/reports/ingredient-usage" label="Ingredient Usage" active={isActive("/reports/ingredient-usage")} />
                                                )}
                                                {has(MENU.STOCK_ADJUSTMENTS) && (
                                                    <SubLink href="/reports/stock-loss" label="Stock Loss Report" active={isActive("/reports/stock-loss")} />
                                                )}
                                            </NavGroup>

                                            {has(MENU.ACTIVITY_LOGS) && (
                                                <NavItem href="/logs" icon={ScrollText} label="Activity Logs" active={isActive("/logs")} />
                                            )}
                                        </>
                                    )}

                                    {/* ── MANAGEMENT ────────────────────── */}
                                    {(has(MENU.USERS) || has(MENU.SUPPLIERS) || has(MENU.BRANCHES) || has(MENU.EXPENSE_CATEGORIES) || has(MENU.SYSTEM_SETTINGS)) && (
                                        <>
                                            <SidebarSectionLabel label="Management" />

                                            {has(MENU.USERS) && (
                                                <NavItem href="/users" icon={Users} label="Users" active={isActive("/users")} />
                                            )}
                                            {has(MENU.SUPPLIERS) && (
                                                <NavItem href="/suppliers" icon={Truck} label="Suppliers" active={isActive("/suppliers")} />
                                            )}
                                            {has(MENU.BRANCHES) && (
                                                <NavItem href="/branches" icon={Building2} label="Branches" active={isActive("/branches")} />
                                            )}
                                            {has(MENU.EXPENSE_CATEGORIES) && (
                                                <NavItem href="/expense-categories" icon={FolderOpen} label="Expense Categories" active={isActive("/expense-categories")} />
                                            )}
                                            {has(MENU.SYSTEM_SETTINGS) && (
                                                <NavItem href="/settings" icon={Settings} label="System Settings" active={isActive("/settings")} />
                                            )}
                                        </>
                                    )}

                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>

                    {/* Footer / Profile */}
                    <SidebarFooter className="border-t border-border">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            size="lg"
                                            className="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground w-full"
                                        >
                                            <Avatar className="h-8 w-8 rounded-lg">
                                                <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs">
                                                    {props.auth?.user?.fname?.[0]?.toUpperCase() ?? "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="grid flex-1 text-left text-sm leading-tight">
                                                <span className="truncate font-semibold">
                                                    {props.auth?.user?.fname ?? ""} {props.auth?.user?.lname ?? ""}
                                                </span>
                                                <span className="truncate text-xs text-muted-foreground">
                                                    {roleLabel()}
                                                </span>
                                            </div>
                                            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent className="w-56 rounded-lg" align="start" side="right">
                                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href="/account" className="flex items-center gap-2 cursor-pointer">
                                                <Users className="h-4 w-4" />
                                                Profile
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive cursor-pointer"
                                            onSelect={() => router.post("/logout", {}, { preserveState: false })}
                                        >
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Logout
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarFooter>

                    <SidebarRail />
                </Sidebar>

                {/* ── MAIN CONTENT ────────────────────────────────────── */}
                <div className="flex flex-1 flex-col min-w-0">
                    {/* Top bar */}
                    <header className="sticky top-0 z-40 h-16 bg-background border-b border-border flex items-center justify-between px-6 shadow-sm">
                        <div className="flex items-center gap-3">
                            <SidebarTrigger />
                            <h1 className="text-base font-semibold">{title ?? (isPosPage ? "POS / Cashier" : (props.title ?? "Dashboard"))}</h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleTheme}
                                aria-label="Toggle theme"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            </Button>

                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                                <Bell className="h-4 w-4" />
                            </Button>

                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                    {props.auth?.user?.fname?.[0]?.toUpperCase() ?? "?"}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </header>

                    {/* Page content */}
                    <main className={cn(
                        "flex-1 bg-background",
                        isPosPage ? "p-0 overflow-x-auto overflow-y-auto" : "overflow-y-auto p-6"
                    )}>
                        {children}
                    </main>
                </div>
            </div>

            {/* Floating AI Assistant — hidden on /pos and for admin/super_admin */}
            <FloatingChat />
        </SidebarProvider>
    );
}
