"use client";

import { useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/Layouts/AdminLayout";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { Plus, Wallet, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { routes } from "@/routes";

export default function PettyCashIndex() {
    const { active_fund, vouchers, categories, is_manager, current_user } = usePage().props as any;

    // Voucher form
    const [voucherType, setVoucherType] = useState<"withdrawal" | "replenishment">("withdrawal");
    const [amount, setAmount] = useState("");
    const [payee, setPayee] = useState("");
    const [purpose, setPurpose] = useState("");
    const [categoryId, setCategoryId] = useState("");

    // New Fund dialog
    const [showNewFund, setShowNewFund] = useState(false);
    const [fundName, setFundName] = useState("");
    const [initialAmount, setInitialAmount] = useState("");

    // Approval dialog
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [selectedApproveId, setSelectedApproveId] = useState<number | null>(null);

    // Rejection dialog
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedRejectId, setSelectedRejectId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const handleVoucherSubmit = () => {
        if (!amount || !payee || !purpose) return;

        router.post(routes.pettyCash.store(), {
            fund_id: active_fund?.id,
            voucher_type: voucherType,
            amount: parseFloat(amount),
            payee: payee.trim(),
            purpose: purpose.trim(),
            expense_category_id: voucherType === "withdrawal" ? categoryId : null,
        });
    };

    const openApproveDialog = (voucherId: number) => {
        setSelectedApproveId(voucherId);
        setShowApproveDialog(true);
    };

    const handleApproveConfirm = () => {
        if (!selectedApproveId) return;

        router.post(routes.pettyCash.approve(selectedApproveId), {}, {
            onSuccess: () => {
                setShowApproveDialog(false);
                setSelectedApproveId(null);
            }
        });
    };

    const openRejectDialog = (voucherId: number) => {
        setSelectedRejectId(voucherId);
        setRejectionReason("");
        setShowRejectDialog(true);
    };

    const handleRejectConfirm = () => {
        if (!selectedRejectId || !rejectionReason.trim()) return;

        router.post(routes.pettyCash.reject(selectedRejectId), {
            reason: rejectionReason.trim()
        }, {
            onSuccess: () => {
                setShowRejectDialog(false);
                setSelectedRejectId(null);
                setRejectionReason("");
            }
        });
    };

    const handleCreateFund = () => {
        if (!fundName || !initialAmount) return;

        router.post(routes.pettyCash.funds.store(), {
            fund_name: fundName.trim(),
            fund_amount: parseFloat(initialAmount),
        }, {
            onSuccess: () => {
                setShowNewFund(false);
                setFundName("");
                setInitialAmount("");
            }
        });
    };

    return (
        <AdminLayout>
            <Head title="Petty Cash" />

            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Petty Cash</h1>
                        <p className="text-muted-foreground">Fund management and small cash expenses</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Logged in as: <span className="font-medium">{current_user?.name}</span> 
                        ({current_user?.role}) — Manager: {is_manager ? 'YES' : 'NO'}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* LEFT: New Voucher */}
                    <div className="lg:col-span-3">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <Wallet className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <CardTitle>New Petty Cash Voucher</CardTitle>
                                        <CardDescription>Request withdrawal or replenishment</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {active_fund && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-xl border border-amber-200 flex justify-between items-center">
                                        <div>
                                            <div className="text-sm text-amber-600">Current Balance</div>
                                            <div className="text-3xl font-mono font-bold">
                                                ₱{active_fund.current_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium">{active_fund.fund_name}</div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Voucher Type</Label>
                                        <Select value={voucherType} onValueChange={(v: "withdrawal" | "replenishment") => setVoucherType(v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="withdrawal">Withdrawal (Expense)</SelectItem>
                                                <SelectItem value="replenishment">Replenishment (Add Funds)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Amount (₱)</Label>
                                        <Input 
                                            type="number" 
                                            step="0.01" 
                                            value={amount} 
                                            onChange={(e) => setAmount(e.target.value)} 
                                            placeholder="0.00" 
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label>Payee / Recipient</Label>
                                    <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="Who receives this?" />
                                </div>

                                <div>
                                    <Label>Purpose</Label>
                                    <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What is this payment for?" />
                                </div>

                                {voucherType === "withdrawal" && (
                                    <div>
                                        <Label>Expense Category</Label>
                                        <Select value={categoryId} onValueChange={setCategoryId}>
                                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat: any) => (
                                                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <Button
                                    onClick={handleVoucherSubmit} 
                                    className="w-full h-12 text-lg" 
                                    disabled={!amount || !payee || !purpose || (voucherType === "withdrawal" && !categoryId)}
                                >
                                    Submit Voucher
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT: Recent Vouchers */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-lg h-full">
                            <CardHeader>
                                <CardTitle>Recent Vouchers</CardTitle>
                                <CardDescription>
                                    Cashier requests = Pending • Manager/Admin = Auto Approved
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                                    {vouchers.data.length === 0 ? (
                                        <p className="text-center py-12 text-muted-foreground">No vouchers recorded yet.</p>
                                    ) : (
                                        vouchers.data.map((v: any) => (
                                            <div key={v.id} className="p-5 border rounded-2xl hover:bg-muted/50 transition-all">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-medium flex items-center gap-2">
                                                            #{v.voucher_number}
                                                            {v.status === 'pending' && <AlertCircle className="h-4 w-4 text-amber-500" />}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground mt-1">{v.purpose}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Requested by: {v.requested_by?.fname} {v.requested_by?.lname}
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="font-mono text-lg">
                                                            ₱{v.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </div>
                                                        <Badge
                                                            variant={(v.status === 'approved' ? 'success' : v.status === 'rejected' ? 'destructive' : 'warning') as any}
                                                        >
                                                            {v.status.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {is_manager && v.status === 'pending' && (
                                                    <div className="flex gap-3 mt-4">
                                                        <Button 
                                                            onClick={() => openApproveDialog(v.id)}
                                                            className="flex-1"
                                                            variant="default"
                                                        >
                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                            Approve
                                                        </Button>
                                                        <Button 
                                                            onClick={() => openRejectDialog(v.id)}
                                                            className="flex-1"
                                                            variant="destructive"
                                                        >
                                                            <XCircle className="mr-2 h-4 w-4" />
                                                            Reject
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* APPROVAL DIALOG */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Voucher</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to approve this voucher?<br />
                            The petty cash fund balance will be updated immediately.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setShowApproveDialog(false);
                                setSelectedApproveId(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleApproveConfirm}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Yes, Approve Voucher
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* REJECTION DIALOG */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Voucher</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this voucher.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Label htmlFor="rejection-reason">Rejection Reason</Label>
                        <Textarea
                            id="rejection-reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter detailed reason for rejection..."
                            rows={5}
                            className="mt-2"
                        />
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowRejectDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive"
                            onClick={handleRejectConfirm}
                            disabled={!rejectionReason.trim()}
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}