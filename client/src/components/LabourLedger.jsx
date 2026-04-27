import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { ledgerService } from '@/services/ledgerService';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const LabourLedger = ({ labourerId }) => {
    const [entries, setEntries] = useState([]);
    const [summary, setSummary] = useState({ balance: 0, totalEarned: 0, totalPaid: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLedger = async () => {
            if (!labourerId) return;
            try {
                // We fetch the ledger from our new Transaction Engine via backend if possible, 
                // or calculate running balances manually here for transparency.
                const data = await ledgerService.getLedger(labourerId);
                
                // Calculate running balance ASC then reverse for DESC view
                let currentBal = 0;
                const withRunningBalance = [...data]
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                    .map(entry => {
                        if (entry.transaction_type === 'CREDIT') {
                            currentBal += Number(entry.amount);
                        } else {
                            currentBal -= Number(entry.amount);
                        }
                        return { ...entry, running_balance: currentBal };
                    })
                    .reverse();

                setEntries(withRunningBalance);
                setSummary({
                    balance: currentBal,
                    totalEarned: data.filter(e => e.transaction_type === 'CREDIT').reduce((a, b) => a + Number(b.amount), 0),
                    totalPaid: data.filter(e => e.transaction_type === 'DEBIT').reduce((a, b) => a + Number(b.amount), 0),
                });
            } catch (error) {
                console.error("Failed to fetch ledger:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLedger();
    }, [labourerId]);

    if (isLoading) {
        return <Skeleton className="h-[400px] w-full rounded-xl" />;
    }

    const getCategoryStyles = (category, type) => {
        if (type === 'CREDIT') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
        if (category === 'advance') return 'bg-amber-50 text-amber-700 border-amber-100';
        if (category === 'bonus') return 'bg-purple-50 text-purple-700 border-purple-100';
        if (category === 'deduction') return 'bg-rose-50 text-rose-700 border-rose-100';
        return 'bg-blue-50 text-blue-700 border-blue-100';
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-emerald-50/50 border-emerald-100">
                    <CardContent className="pt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Total Earned</p>
                        <h3 className="text-xl font-black text-emerald-900">₹{summary.totalEarned.toLocaleString()}</h3>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardContent className="pt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Total Paid</p>
                        <h3 className="text-xl font-black text-blue-900">₹{summary.totalPaid.toLocaleString()}</h3>
                    </CardContent>
                </Card>
                <Card className={cn(
                    "border-2",
                    summary.balance >= 0 ? "bg-slate-900 text-white border-slate-800" : "bg-rose-600 text-white border-rose-500"
                )}>
                    <CardContent className="pt-4">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                            {summary.balance >= 0 ? "Pending Dues" : "Advance Balance"}
                        </p>
                        <h3 className="text-xl font-black">₹{Math.abs(summary.balance).toLocaleString()}</h3>
                    </CardContent>
                </Card>
            </div>

            {/* History Table */}
            <Card className="border-none shadow-xl shadow-slate-200/50 overflow-hidden rounded-3xl">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-black text-slate-900">Unified Statement</CardTitle>
                        <Badge variant="outline" className="rounded-full bg-white font-bold text-[10px]">REAL-TIME AUDIT</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                        <Table>
                            <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="w-[120px] pl-8 font-black text-[10px] uppercase tracking-tighter">Timestamp</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-tighter">Activity Detail</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase tracking-tighter">Category</TableHead>
                                    <TableHead className="text-right font-black text-[10px] uppercase tracking-tighter">Impact</TableHead>
                                    <TableHead className="text-right pr-8 font-black text-[10px] uppercase tracking-tighter">Running Balance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-slate-400 py-20 font-bold italic">
                                            No financial activity recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    entries.map((entry) => (
                                        <TableRow key={entry.id} className="group hover:bg-slate-50 transition-colors border-slate-50">
                                            <TableCell className="pl-8 py-4">
                                                <div className="text-[11px] font-bold text-slate-900">
                                                    {new Date(entry.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-xs font-bold text-slate-700">{entry.description}</p>
                                                {entry.reference_id && (
                                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Ref: {entry.reference_id.slice(0, 8)}</p>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "rounded-full px-2 py-0 text-[8px] font-black uppercase tracking-widest border-none shadow-sm",
                                                        getCategoryStyles(entry.category, entry.transaction_type)
                                                    )}
                                                >
                                                    {entry.category || (entry.transaction_type === 'CREDIT' ? 'work' : 'payment')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-right font-black text-xs",
                                                entry.transaction_type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                                            )}>
                                                {entry.transaction_type === 'CREDIT' ? '+' : '-'}₹{Number(entry.amount).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <div className="text-xs font-black text-slate-900">₹{entry.running_balance.toLocaleString()}</div>
                                                <div className={cn(
                                                    "text-[8px] font-black uppercase tracking-tighter",
                                                    entry.running_balance >= 0 ? "text-emerald-500" : "text-rose-500"
                                                )}>
                                                    {entry.running_balance >= 0 ? "Receivable" : "Payable"}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};
