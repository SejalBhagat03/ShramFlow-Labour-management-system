import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import { ledgerService } from '@/services/ledgerService';
import { Skeleton } from '@/components/ui/skeleton';

export const LabourLedger = ({ labourerId }) => {
    const [entries, setEntries] = useState([]);
    const [balance, setBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLedger = async () => {
            if (!labourerId) return;
            try {
                const [ledgerData, balanceData] = await Promise.all([
                    ledgerService.getLedger(labourerId),
                    ledgerService.getBalance(labourerId)
                ]);
                setEntries(ledgerData);
                setBalance(balanceData);
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

    return (
        <div className="space-y-6">
            {/* Balance Card */}
            <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6 flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Net Payable Balance</p>
                        <h2 className="text-3xl font-bold text-primary">₹{balance.toLocaleString()}</h2>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Wallet className="h-6 w-6 text-primary" />
                    </div>
                </CardContent>
            </Card>

            {/* History Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {entries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    entries.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">
                                                {new Date(entry.created_at).toLocaleDateString()}
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </TableCell>
                                            <TableCell>{entry.description}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={entry.transaction_type === 'CREDIT'
                                                        ? 'bg-success/10 text-success border-success/20'
                                                        : 'bg-destructive/10 text-destructive border-destructive/20'}
                                                >
                                                    {entry.transaction_type === 'CREDIT' ? (
                                                        <><ArrowUpRight className="h-3 w-3 mr-1" /> Work Done</>
                                                    ) : (
                                                        <><ArrowDownLeft className="h-3 w-3 mr-1" /> Payment</>
                                                    )}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-bold ${entry.transaction_type === 'CREDIT' ? 'text-success' : 'text-destructive'
                                                }`}>
                                                {entry.transaction_type === 'CREDIT' ? '+' : '-'}₹{Number(entry.amount).toLocaleString()}
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
