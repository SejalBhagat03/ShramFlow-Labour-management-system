import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLabourAssignments } from '@/hooks/useLabourAssignments';
import { useUpdateLabourClaim } from '@/hooks/useUpdateLabourClaim';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wallet, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useLabourFinancials } from '@/hooks/useLabourFinancials';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
/**
 * Labour dashboard v2 allows a labourer to view assigned work,
 * submit labour_claims and see confirmed work/payment.
 */
const LabourDashboardV2 = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { assignments = [], isLoading } = useLabourAssignments({ labourerId: user?.id });
    const { data: financials, isLoading: isFinLoading } = useLabourFinancials();
    const updateClaimMutation = useUpdateLabourClaim();

    // local state for form values per assignment id
    const [claimValues, setClaimValues] = useState({});

    useEffect(() => {
        // when assignments load, ensure we have an entry for each
        const initial = {};
        assignments.forEach(a => {
            initial[a.id] = a.labour_claim || '';
        });
        setClaimValues(initial);
    }, [assignments]);

    const handleChange = (id, value) => {
        // allow only numbers
        const num = (value || '').replace(/[^0-9]/g, '');
        setClaimValues(prev => ({ ...prev, [id]: num }));
    };

    const handleSubmit = (a) => {
        const val = Number(claimValues[a.id] || 0);
        if (val > a.assigned_quantity) {
            alert('Cannot claim more than assigned quantity');
            return;
        }
        updateClaimMutation.mutate({ assignmentId: a.id, claim: val });
    };

    const pending = assignments.filter(a => a.status !== 'confirmed');
    const confirmed = assignments.filter(a => a.status === 'confirmed');

    return (
        <AppLayout>
            <div className="space-y-4 md:space-y-6">
                <div className="relative -mt-6 lg:-mt-10 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-white/10 border-b">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Assignments</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t("yourAssignments")}</h1>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base font-medium">Track your work and submit claims</p>
                    </div>
                </div>

                {/* Financial Overview Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                    <Card className="bg-success/5 border-none rounded-2xl shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-success/70 tracking-wider">Total Earned</p>
                                <h3 className="text-xl font-bold text-foreground">
                                    {isFinLoading ? "..." : `₹${(financials?.totalEarned || 0).toLocaleString()}`}
                                </h3>
                            </div>
                            <TrendingUp className="h-8 w-8 text-success/20" />
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-500/5 border-none rounded-2xl shadow-sm">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-blue-600/70 tracking-wider">Total Paid</p>
                                <h3 className="text-xl font-bold text-foreground">
                                    {isFinLoading ? "..." : `₹${(financials?.totalPaid || 0).toLocaleString()}`}
                                </h3>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-blue-500/20" />
                        </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-none rounded-2xl shadow-sm border-l-4 border-l-primary">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-primary tracking-wider">Current Balance</p>
                                <h3 className="text-xl font-bold text-foreground">
                                    {isFinLoading ? "..." : `₹${(financials?.balance || 0).toLocaleString()}`}
                                </h3>
                            </div>
                            <Wallet className="h-8 w-8 text-primary/20" />
                        </CardContent>
                    </Card>
                </div>
                {isLoading ? (
                    <p>Loading...</p>
                ) : assignments.length === 0 ? (
                    <p>No assignments yet.</p>
                ) : (
                    <>
                        {/* pending / claim table */}
                        <div className="bg-card p-3 md:p-5 rounded-2xl border shadow-sm space-y-3">
                            <h2 className="text-sm md:text-base font-semibold text-foreground">{t("pendingClaimableWork")}</h2>
                            <div className="overflow-x-auto -mx-1 px-1">
                                <table className="w-full text-xs md:text-sm table-auto border-collapse">
                                    <thead>
                                        <tr className="text-left bg-muted/30">
                                            <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("workEntry")}</th>
                                            <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("assigned")}</th>
                                            <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("yourClaim")}</th>
                                            <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("status")}</th>
                                            <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pending.map(a => (
                                            <tr key={a.id} className="border-t hover:bg-muted/10 transition-colors">
                                                <td className="p-2 md:p-3">
                                                    <div className="font-semibold text-foreground text-xs">
                                                        {a.work_order?.work_type}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        ({a.work_order?.total_quantity} {a.work_order?.unit})
                                                    </div>
                                                </td>
                                                <td className="p-2 md:p-3 whitespace-nowrap text-xs">
                                                    {a.assigned_quantity} {a.work_order?.unit}
                                                </td>
                                                <td className="p-2 md:p-3">
                                                    <Input
                                                        className="w-full md:w-24 text-xs h-8"
                                                        type="number"
                                                        value={claimValues[a.id] || ''}
                                                        onChange={(e) => handleChange(a.id, e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2 md:p-3">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                        a.status === 'pending' ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                                                    )}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                                <td className="p-2 md:p-3">
                                                    <Button
                                                        size="sm"
                                                        className="w-full md:w-auto h-8 text-xs font-bold"
                                                        onClick={() => handleSubmit(a)}
                                                        disabled={updateClaimMutation.isLoading}
                                                    >
                                                        {updateClaimMutation.isLoading ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            t("submit")
                                                        )}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* confirmed section */}
                        {confirmed.length > 0 && (
                            <div className="bg-card p-4 md:p-6 rounded-2xl border shadow-sm space-y-3">
                                <h2 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                                    {t("confirmedWorkPayment")}
                                </h2>
                                <div className="overflow-x-auto -mx-0">
                                    <table className="w-full text-xs md:text-sm table-auto border-collapse min-w-[400px]">
                                        <thead>
                                            <tr className="text-left bg-muted/30">
                                                <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("workEntry")}</th>
                                                <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("labourerClaimed")}</th>
                                                <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("unit")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {confirmed.map(a => (
                                                <tr key={a.id} className="border-t hover:bg-muted/10 transition-colors">
                                                    <td className="p-2 md:p-3 font-semibold text-xs">{a.work_order?.work_type}</td>
                                                    <td className="p-2 md:p-3 text-xs">{a.labour_claim}</td>
                                                    <td className="p-2 md:p-3 text-xs">{a.work_order?.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
};

export default LabourDashboardV2;
