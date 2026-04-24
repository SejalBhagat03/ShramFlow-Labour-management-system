import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { useLabourLedger } from '@/hooks/useLabourLedger';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services/paymentService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    FileDown,
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Wallet,
    Calendar,
    Briefcase
} from 'lucide-react';
import { pdfService } from '@/services/pdfService';
import { cn } from '@/lib/utils';

const LabourLedger = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { data: ledger, isLoading, error } = useLabourLedger(id);

    // Settle Dues Mutation
    const settleDues = useMutation({
        mutationFn: async () => {
            if (!ledger || !ledger.balance || ledger.balance <= 0) {
                throw new Error("No pending balance to settle");
            }
            return await paymentService.bulkSettleEntries(id, ledger.balance, 'cash');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['labour_ledger', id] });
            queryClient.invalidateQueries({ queryKey: ['labourers'] });
        },
        onError: (err) => {
            alert(err.message);
        }
    });

    if (error) {
        return (
            <AppLayout>
                <div className="flex flex-col items-center justify-center py-20">
                    <h2 className="text-xl font-bold text-destructive">Error loading ledger</h2>
                    <p className="text-muted-foreground">{error.message}</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                </div>
            </AppLayout>
        );
    }

    const handleDownload = () => {
        if (ledger) {
            pdfService.generateLedgerPDF(ledger);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 md:space-y-6">
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-white/10 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate(-1)}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div>
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">Labour Ledger</h1>
                                <p className="text-muted-foreground mt-1 text-xs sm:text-sm font-medium">Detailed financial history for {ledger?.name || '...'}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {user?.role === 'supervisor' && ledger?.balance > 0 && (
                                <Button
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 rounded-xl font-bold shadow-glow text-xs"
                                    onClick={() => {
                                        if (window.confirm(`Are you sure you want to settle ₹${ledger.balance} for ${ledger.name}?`)) {
                                            settleDues.mutate();
                                        }
                                    }}
                                    disabled={settleDues.isPending}
                                >
                                    <Wallet className="h-3.5 w-3.5 mr-2" />
                                    {settleDues.isPending ? "Settling..." : "Settle All Dues"}
                                </Button>
                            )}
                            <Button
                                size="sm"
                                className="gradient-primary h-9 px-4 rounded-xl font-bold shadow-glow text-xs"
                                onClick={handleDownload}
                                disabled={isLoading || !ledger}
                            >
                                <FileDown className="h-3.5 w-3.5 mr-2" />
                                Download PDF
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-32 rounded-2xl" />
                        ))
                    ) : (
                        <>
                            <Card className="rounded-2xl border-none bg-success/5 shadow-sm overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 text-success/20">
                                    <TrendingUp className="h-16 w-16" />
                                </div>
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-success font-medium">Total Earned</CardDescription>
                                    <CardTitle className="text-3xl font-bold">₹{ledger.totalEarned?.toLocaleString() || 0}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">From {ledger.entries?.length || 0} approved work days</p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-none bg-blue-500/5 shadow-sm overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 text-blue-500/20">
                                    <TrendingDown className="h-16 w-16" />
                                </div>
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-blue-600 font-medium">Total Paid</CardDescription>
                                    <CardTitle className="text-3xl font-bold">₹{ledger.totalPaid?.toLocaleString() || 0}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Advances & final settlements</p>
                                </CardContent>
                            </Card>

                            <Card className="rounded-2xl border-none bg-red-500/5 shadow-sm overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 text-red-500/20">
                                    <TrendingDown className="h-16 w-16" />
                                </div>
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-red-600 font-medium">Total Deducted</CardDescription>
                                    <CardTitle className="text-3xl font-bold">₹{ledger.totalDeductions?.toLocaleString() || 0}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Fines, tool damages, food, etc.</p>
                                </CardContent>
                            </Card>

                            <Card className={cn(
                                "rounded-2xl border-none shadow-sm overflow-hidden relative",
                                ledger.balance >= 0 ? "bg-primary/5" : "bg-destructive/5"
                            )}>
                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                    <Wallet className="h-16 w-16" />
                                </div>
                                <CardHeader className="pb-2">
                                    <CardDescription className={cn(
                                        "font-medium",
                                        ledger.balance >= 0 ? "text-primary" : "text-destructive"
                                    )}>
                                        Balance {ledger.balance >= 0 ? 'Pending' : 'Due'}
                                    </CardDescription>
                                    <CardTitle className="text-3xl font-bold">₹{Math.abs(ledger.balance || 0).toLocaleString()}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">
                                        {ledger.balance >= 0 ? 'To be paid to labour' : 'To be recovered from labour'}
                                    </p>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* Ledger Content */}
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Work History */}
                    <Card className="rounded-2xl border shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-primary" />
                                Work History
                            </CardTitle>
                            <CardDescription>Only approved/paid entries listed here</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-64 w-full rounded-xl" />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Task</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ledger.entries.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                    No work entries found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            ledger.entries.map((entry) => (
                                                <TableRow key={entry.id}>
                                                    <TableCell className="font-medium">{entry.date}</TableCell>
                                                    <TableCell>{entry.task_type}</TableCell>
                                                    <TableCell className="text-right font-bold">₹{entry.amount.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Payment History */}
                    <Card className="rounded-2xl border shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-500" />
                                Payment & Advance History
                            </CardTitle>
                            <CardDescription>All successful payouts and advances</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-64 w-full rounded-xl" />
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Method</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ledger.payments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                    No payments found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            ledger.payments.map((p) => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">
                                                        {new Date(p.transaction_date).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className={cn(
                                                            "uppercase text-[10px]",
                                                            p.payment_type === 'deduction' && "bg-destructive/10 text-destructive border-destructive"
                                                        )}>
                                                            {p.payment_type || 'Advance'}
                                                        </Badge>
                                                        {p.deduction_reason && (
                                                            <div className="text-[10px] text-muted-foreground mt-1 max-w-[120px] truncate">
                                                                {p.deduction_reason}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="uppercase text-[10px]">
                                                            {p.method}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-destructive">₹{p.amount.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
};

export default LabourLedger;
