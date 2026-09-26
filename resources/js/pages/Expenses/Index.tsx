"use client";

import { useState } from "react";
import { manilaTodayStr } from "@/lib/date";
import { Head, router, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { Plus, DollarSign } from "lucide-react";
import { routes } from "@/routes";

export default function ExpensesIndex() {
    const { expenses, categories, total_this_month, is_manager, current_user } = usePage().props as any;

    const [categoryId, setCategoryId] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [expenseDate, setExpenseDate] = useState(manilaTodayStr());
    const [paymentMethod, setPaymentMethod] = useState("cash");
    const [notes, setNotes] = useState("");

    const handleSubmit = () => {
        if (!amount || !description || !categoryId) return;

        router.post(routes.expenses.store(), {
            expense_category_id: categoryId,
            amount: parseFloat(amount),
            expense_date: expenseDate,
            description: description.trim(),
            payment_method: paymentMethod,
            notes: notes.trim(),
        });
    };

    return (
        <AdminLayout>
            <Head title="Expenses" />

            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
                        <p className="text-muted-foreground">Record and manage business expenses</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-muted-foreground">This Month Total</div>
                        <div className="text-3xl font-mono font-bold text-red-600">
                            ₱{total_this_month.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* LEFT: New Expense */}
                    <div className="lg:col-span-3">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                                        <DollarSign className="h-5 w-5 text-red-500" />
                                    </div>
                                    <div>
                                        <CardTitle>New Expense</CardTitle>
                                        <CardDescription>Record a new business expense</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Category</Label>
                                        <Select value={categoryId} onValueChange={setCategoryId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat: any) => (
                                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
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
                                    <Label>Description</Label>
                                    <Input 
                                        value={description} 
                                        onChange={(e) => setDescription(e.target.value)} 
                                        placeholder="What was this expense for?" 
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Date</Label>
                                        <Input 
                                            type="date" 
                                            value={expenseDate} 
                                            onChange={(e) => setExpenseDate(e.target.value)} 
                                        />
                                    </div>
                                    <div>
                                        <Label>Payment Method</Label>
                                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="bank">Bank Transfer</SelectItem>
                                                <SelectItem value="card">Card</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <Label>Notes (optional)</Label>
                                    <Textarea 
                                        value={notes} 
                                        onChange={(e) => setNotes(e.target.value)} 
                                        placeholder="Additional details..." 
                                        rows={3} 
                                    />
                                </div>

                                <Button 
                                    onClick={handleSubmit} 
                                    className="w-full h-12 text-lg" 
                                    disabled={!amount || !description || !categoryId}
                                >
                                    Record Expense
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* RIGHT: Recent Expenses */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-lg h-full">
                            <CardHeader>
                                <CardTitle>Recent Expenses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-h-[700px] overflow-y-auto">
                                    {expenses.data.length === 0 ? (
                                        <p className="text-center py-12 text-muted-foreground">No expenses recorded yet.</p>
                                    ) : (
                                        expenses.data.map((exp: any) => (
                                            <div key={exp.id} className="p-5 border rounded-2xl hover:bg-muted/50 transition-all">
                                                <div className="flex justify-between">
                                                    <div>
                                                        <div className="font-medium">{exp.description}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {exp.category?.name} • {new Date(exp.expense_date + "T00:00:00+08:00").toLocaleDateString("en-PH", { timeZone: "Asia/Manila" })}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-mono text-lg text-red-600">
                                                            -₱{exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </div>
                                                        <Badge variant="destructive">{exp.payment_method}</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}