import React, { useState, useEffect } from 'react';
import { X, Scale, Banknote, Calculator, Check, ArrowRight } from 'lucide-react';
import { fmtMoney, fmtQty } from './ReceiptTemplate';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CartItem } from './posTypes';

interface WeightAmountModalProps {
    item: CartItem;
    currency: string;
    onApply: (newQty: number) => void;
    onClose: () => void;
}

export default function WeightAmountModal({
    item,
    currency,
    onApply,
    onClose,
}: WeightAmountModalProps) {
    const unit = item.unit || 'kg';
    const isKg = unit.toLowerCase() === 'kg';
    const unitPrice = item.price;

    // Tabs: 'amount' (By Pesos ₱) or 'weight' (By kg/units)
    const [mode, setMode] = useState<'amount' | 'weight'>('amount');

    // Values
    const [amountInput, setAmountInput] = useState<string>(() => {
        // If current qty * price is close to a whole number, initialize amount
        const currentAmt = Math.round(item.qty * unitPrice * 100) / 100;
        return currentAmt > 0 ? String(currentAmt) : "50";
    });

    const [weightInput, setWeightInput] = useState<string>(() => {
        return String(item.qty || 1);
    });

    // Calculated states
    const numericAmount = parseFloat(amountInput) || 0;
    const computedWeightFromAmount = unitPrice > 0
        ? Math.round((numericAmount / unitPrice) * 1000) / 1000
        : 0;

    const numericWeight = parseFloat(weightInput) || 0;
    const computedAmountFromWeight = Math.round(numericWeight * unitPrice * 100) / 100;

    // Active applied weight based on mode
    const finalQty = mode === 'amount' ? computedWeightFromAmount : numericWeight;
    const finalAmount = Math.round(finalQty * unitPrice * 100) / 100;

    // When mode switches, sync the other input
    const handleSwitchMode = (newMode: 'amount' | 'weight') => {
        setMode(newMode);
        if (newMode === 'amount') {
            setAmountInput(String(Math.round(computedAmountFromWeight * 100) / 100));
        } else {
            setWeightInput(String(computedWeightFromAmount));
        }
    };

    // Quick presets
    const amountPresets = [10, 20, 30, 40, 50, 75, 100, 150, 200, 500];
    const weightPresets = [0.25, 0.5, 0.75, 1, 1.25, 1.4, 1.5, 2, 2.5, 3, 5, 10, 25];

    // Keypad handler
    const handleKeypadPress = (val: string) => {
        if (mode === 'amount') {
            if (val === 'C') {
                setAmountInput('');
            } else if (val === '⌫') {
                setAmountInput(prev => prev.slice(0, -1));
            } else if (val === '.') {
                if (!amountInput.includes('.')) setAmountInput(prev => (prev || '0') + '.');
            } else {
                setAmountInput(prev => prev === '0' ? val : prev + val);
            }
        } else {
            if (val === 'C') {
                setWeightInput('');
            } else if (val === '⌫') {
                setWeightInput(prev => prev.slice(0, -1));
            } else if (val === '.') {
                if (!weightInput.includes('.')) setWeightInput(prev => (prev || '0') + '.');
            } else {
                setWeightInput(prev => prev === '0' ? val : prev + val);
            }
        }
    };

    const handleConfirm = () => {
        if (finalQty > 0) {
            onApply(finalQty);
            onClose();
        }
    };

    // Handle Enter and Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [finalQty]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex items-start justify-between p-4 border-b border-border bg-muted/20">
                    <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <Scale className="h-5 w-5" />
                            </span>
                            <div>
                                <h3 className="font-black text-base text-foreground leading-tight truncate">
                                    {item.name}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Price: <strong className="text-primary font-mono">{fmtMoney(unitPrice, currency)} / {unit}</strong>
                                    {item.variant_name && <span className="ml-1 text-primary">[{item.variant_name}]</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    {/* Mode Selector Tabs */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-xl border border-border text-xs font-bold">
                        <button
                            type="button"
                            onClick={() => handleSwitchMode('amount')}
                            className={cn(
                                "flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
                                mode === 'amount'
                                    ? "bg-background text-foreground shadow-xs border border-border/80 font-black text-amber-600 dark:text-amber-400"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Banknote className="h-4 w-4" />
                            <span>Pabili ng Halaga (₱ Amount)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleSwitchMode('weight')}
                            className={cn(
                                "flex items-center justify-center gap-2 py-2 rounded-lg transition-all",
                                mode === 'weight'
                                    ? "bg-background text-foreground shadow-xs border border-border/80 font-black text-emerald-600 dark:text-emerald-400"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Scale className="h-4 w-4" />
                            <span>Pabili ng Timbang ({unit})</span>
                        </button>
                    </div>

                    {/* Mode A: By Cash Amount */}
                    {mode === 'amount' ? (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span>Target Amount (Pesos ₱)</span>
                                    <span className="text-[11px] font-normal text-muted-foreground">Type or tap quick buttons below</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-lg text-muted-foreground">
                                        ₱
                                    </span>
                                    <input
                                        type="number"
                                        step="any"
                                        min="1"
                                        autoFocus
                                        value={amountInput}
                                        onChange={e => setAmountInput(e.target.value)}
                                        placeholder="50"
                                        className="w-full h-12 pl-8 pr-4 font-mono font-black text-2xl bg-background border-2 border-primary/40 focus:border-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                                    />
                                </div>
                            </div>

                            {/* Quick Amount Chips */}
                            <div>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                                    Quick Amount Presets
                                </span>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {amountPresets.map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setAmountInput(String(amt))}
                                            className={cn(
                                                "py-1.5 px-2 rounded-lg border font-mono font-bold text-xs transition-all",
                                                numericAmount === amt
                                                    ? "bg-amber-500 text-white border-amber-600 shadow-xs scale-102"
                                                    : "bg-background border-border hover:border-amber-500/50 hover:bg-amber-500/10 text-foreground"
                                            )}
                                        >
                                            ₱{amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Real-time Calculation Card */}
                            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                        <Scale className="h-4 w-4" /> System Auto-Detected Weight:
                                    </span>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                        ₱{numericAmount.toFixed(2)} ÷ ₱{unitPrice.toFixed(2)}/{unit}
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                    <div>
                                        <span className="text-3xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                                            {fmtQty(computedWeightFromAmount)}
                                        </span>
                                        <span className="text-base font-bold text-emerald-700 dark:text-emerald-300 ml-1">
                                            {unit}
                                        </span>
                                        {isKg && (
                                            <span className="text-xs font-mono text-emerald-600/80 dark:text-emerald-400/80 ml-2">
                                                ({Math.round(computedWeightFromAmount * 1000)} grams)
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-muted-foreground block">Actual Total:</span>
                                        <span className="text-base font-black font-mono text-foreground">
                                            {fmtMoney(computedWeightFromAmount * unitPrice, currency)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Mode B: By Exact Weight */
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span>Exact Weight / Quantity ({unit})</span>
                                    <span className="text-[11px] font-normal text-muted-foreground">Type or tap quick weight presets</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="any"
                                        min="0.001"
                                        autoFocus
                                        value={weightInput}
                                        onChange={e => setWeightInput(e.target.value)}
                                        placeholder="1.5"
                                        className="w-full h-12 px-4 font-mono font-black text-2xl bg-background border-2 border-primary/40 focus:border-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-base text-muted-foreground uppercase">
                                        {unit}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Weight Chips */}
                            <div>
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                                    Quick Weight Presets
                                </span>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                    {weightPresets.map(w => (
                                        <button
                                            key={w}
                                            type="button"
                                            onClick={() => setWeightInput(String(w))}
                                            className={cn(
                                                "py-1.5 px-2 rounded-lg border font-mono font-bold text-xs transition-all",
                                                numericWeight === w
                                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs scale-102"
                                                    : "bg-background border-border hover:border-emerald-500/50 hover:bg-emerald-500/10 text-foreground"
                                            )}
                                        >
                                            {w} {w === 0.25 ? '(¼)' : w === 0.5 ? '(½)' : w === 0.75 ? '(¾)' : 'k'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Real-time Total Price Card */}
                            <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/10 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-primary flex items-center gap-1.5">
                                        <Banknote className="h-4 w-4" /> Computed Total Price:
                                    </span>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                        {numericWeight} {unit} × {fmtMoney(unitPrice, currency)}
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between">
                                    <div className="text-3xl font-black font-mono text-primary">
                                        {fmtMoney(computedAmountFromWeight, currency)}
                                    </div>
                                    <div className="text-right text-xs text-muted-foreground">
                                        Weight: <strong className="text-foreground">{fmtQty(numericWeight)} {unit}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Touch Keypad */}
                    <div className="border border-border/80 rounded-xl p-2 bg-muted/30">
                        <div className="grid grid-cols-4 gap-1.5">
                            {['7', '8', '9', 'C', '4', '5', '6', '⌫', '1', '2', '3', '.'].map(key => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => handleKeypadPress(key)}
                                    className={cn(
                                        "h-10 rounded-lg border font-mono font-bold text-sm transition-all flex items-center justify-center",
                                        key === 'C' ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" :
                                        key === '⌫' ? "bg-muted hover:bg-muted/80 text-foreground border-border" :
                                        "bg-background text-foreground border-border hover:bg-primary/10 hover:border-primary/40 active:scale-95"
                                    )}
                                >
                                    {key}
                                </button>
                            ))}
                            <div className="col-span-4 grid grid-cols-4 gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleKeypadPress('0')}
                                    className="col-span-2 h-10 rounded-lg border border-border bg-background text-foreground font-mono font-bold text-sm hover:bg-primary/10 active:scale-95"
                                >
                                    0
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleKeypadPress('00')}
                                    className="col-span-2 h-10 rounded-lg border border-border bg-background text-foreground font-mono font-bold text-sm hover:bg-primary/10 active:scale-95"
                                >
                                    00
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="h-11 px-4 text-xs font-bold"
                    >
                        Cancel [Esc]
                    </Button>

                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={finalQty <= 0}
                        className="h-11 flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm gap-2 shadow-md"
                    >
                        <Check className="h-4 w-4" />
                        <span>Apply {fmtQty(finalQty)} {unit} ({fmtMoney(finalAmount, currency)}) [Enter]</span>
                    </Button>
                </div>
            </div>
        </div>
    );
}
