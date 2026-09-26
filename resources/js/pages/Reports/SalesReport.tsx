import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { manilaTodayStr, toDateStr, fmtDate } from '@/lib/date';
import { type DateRange } from 'react-day-picker';
import { reportRoutes, getReportTitle, openLivePdfPreview, type ReportFilters } from './Files';
import { DateRangePicker } from '@/components/ui/date-range-picker';

import AdminLayout from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Building2, TrendingUp, Download, Receipt } from 'lucide-react';

interface Props {
  sales: {
    data: Array<{
      id: number;
      receipt_number: string;
      created_at: string;
      user?: { full_name: string };
      customer_name?: string;
      customer?: { id: number; name: string } | null;
      total: number;
      amount_paid: number;
      balance_due: number;
      payment_status: string;
      payment_method: string;
      discount_amount: number;
    }>;
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: Array<any>;
  };
  branches: Array<{ id: number; name: string }> | null;
  filters: ReportFilters;
}

export default function SalesReport({ sales, branches, filters: initialFilters }: Props) {
  const today = manilaTodayStr();

  const [branchId, setBranchId] = useState<number | undefined>(
    initialFilters?.branch_id ? Number(initialFilters.branch_id) : undefined
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date((initialFilters?.from_date || today) + "T00:00:00+08:00"),
    to:   new Date((initialFilters?.to_date   || today) + "T00:00:00+08:00"),
  });
  const [loading, setLoading] = useState(false);

  const getParams = () => ({
    branch_id: branchId,
    from_date: dateRange?.from ? toDateStr(dateRange.from) : undefined,
    to_date:   dateRange?.to   ? toDateStr(dateRange.to)   : undefined,
  });

  const handleGenerate = () => {
    setLoading(true);
    router.get(reportRoutes.sales(), { ...getParams(), per_page: 10 }, {
      preserveState: true,
      preserveScroll: true,
      onFinish: () => setLoading(false),
    });
  };

  const handleViewPdf = () => {
    openLivePdfPreview('sales', getParams());
  };

  const totalSales = sales.data.reduce((sum, sale) => sum + Number(sale.amount_paid ?? sale.total), 0);

  return (
    <AdminLayout>
      <Head title={getReportTitle('sales')} />

      <div className="max-w-6xl mx-auto space-y-6 p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{getReportTitle('sales')}</h1>
              <p className="text-sm text-muted-foreground">Complete sales history and transaction details</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleViewPdf} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              PDF Preview
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Filters
            </CardTitle>
            <CardDescription>Select branch and date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {branches && (
                <div className="md:col-span-4">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Branch
                  </Label>
                  <Select
                    value={branchId?.toString() || 'all'}
                    onValueChange={(v) => setBranchId(v === 'all' ? undefined : Number(v))}
                  >
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.id.toString()}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="md:col-span-6">
                <Label className="text-xs font-medium">Date Range</Label>
                <div className="mt-1.5">
                  <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
                </div>
              </div>

              <div className="md:col-span-2 flex items-end">
                <Button onClick={handleGenerate} disabled={loading} className="w-full h-10">
                  {loading ? 'Generating...' : 'Show Sales'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        {sales.data.length > 0 ? (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Sales Transactions
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Collected on page: <span className="font-semibold tabular-nums">₱{totalSales.toLocaleString()}</span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Cashier</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Collected</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-center">Payment</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.data.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono">{sale.receipt_number}</TableCell>
                        <TableCell>
                          {fmtDate(sale.created_at, "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell>{sale.user?.full_name || '—'}</TableCell>
                        <TableCell>{sale.customer?.name || sale.customer_name || 'Walk-in'}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          ₱{Number(sale.total).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          ₱{Number(sale.amount_paid ?? sale.total).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-amber-700">
                          {Number(sale.balance_due ?? 0) > 0 ? `₱${Number(sale.balance_due).toLocaleString()}` : '—'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{sale.payment_method.toUpperCase()} {sale.payment_status !== 'paid' ? `/${sale.payment_status.toUpperCase()}` : ''}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {sale.discount_amount > 0 ? `-₱${Number(sale.discount_amount).toLocaleString()}` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination */}
            {sales.last_page > 1 && (
              <div className="flex items-center justify-between text-sm pt-4">
                <p className="text-muted-foreground">
                  Showing {sales.from} to {sales.to} of {sales.total} transactions (10 per page)
                </p>
                <div className="flex gap-1">
                  {sales.links.map((link: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => link.url && router.get(link.url, {}, {
                        preserveState: true,
                        preserveScroll: true,
                      })}
                      disabled={!link.url}
                      className={`px-3 py-1.5 text-xs rounded-md border font-medium transition-all ${
                        link.active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:bg-muted disabled:opacity-50'
                      }`}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <Card className="p-12 text-center border-dashed">
            <p className="text-muted-foreground">No sales found for the selected period</p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
