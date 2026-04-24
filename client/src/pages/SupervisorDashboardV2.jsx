import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { useLabourers } from '@/hooks/useLabourers';
import { useLabourAssignments } from '@/hooks/useLabourAssignments';
import { useCreateWorkOrder } from '@/hooks/useCreateWorkOrder';
import { useCreateAssignments } from '@/hooks/useCreateAssignments';
import { useConfirmWork } from '@/hooks/useConfirmWork';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

/**
 * Supervisor v2 dashboard is a single page that allows a supervisor to
 * 1. create a work order
 * 2. select labourers and assign quantities equally
 * 3. view current claims and confirm them
 *
 * This is intentionally one-screen and mobile friendly.
 */
const SupervisorDashboardV2 = () => {
    const { t } = useTranslation();
    const [workType, setWorkType] = useState('');
    const [totalQty, setTotalQty] = useState('');
    const [unit, setUnit] = useState('');

    const { workOrders, isLoading: loadingOrders } = useWorkOrders();
    const { labourers, isLoading: loadingLabourers } = useLabourers();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedLabourers, setSelectedLabourers] = useState([]);

    const { assignments, isLoading: loadingAssignments } = useLabourAssignments({ orderId: selectedOrder?.id });

    const createOrderMutation = useCreateWorkOrder();
    const createAssignmentsMutation = useCreateAssignments();
    const confirmWorkMutation = useConfirmWork();

    useEffect(() => {
        if (!selectedOrder && workOrders.length > 0) {
            setSelectedOrder(workOrders[0]);
        }
    }, [workOrders, selectedOrder]);

    const handleOrderSubmit = (e) => {
        e.preventDefault();
        if (!workType || !totalQty || !unit) return;
        createOrderMutation.mutate({ work_type: workType, total_quantity: Number(totalQty), unit });
        setWorkType('');
        setTotalQty('');
        setUnit('');
    };

    const toggleLabourer = (id) => {
        setSelectedLabourers(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            return [...prev, id];
        });
    };

    const handleAssign = () => {
        if (!selectedOrder) return;
        if (selectedLabourers.length === 0) return;
        const total = selectedOrder.total_quantity;
        const per = Math.floor(total / selectedLabourers.length);
        const remainder = total - per * selectedLabourers.length;
        const payload = selectedLabourers.map((labId, idx) => ({
            labourer_id: labId,
            assigned_quantity: per + (idx === selectedLabourers.length - 1 ? remainder : 0)
        }));
        createAssignmentsMutation.mutate({ orderId: selectedOrder.id, assignments: payload });
    };

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("supervisorDashboard")}</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage work orders and assignments for your site.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Create Work Order */}
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Plus className="h-4 w-4" />
                            </div>
                            <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{t("createNewWorkOrder")}</h2>
                        </div>
                        
                        <form onSubmit={handleOrderSubmit} className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="workType" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Work type</Label>
                                <Input
                                    id="workType"
                                    value={workType}
                                    onChange={(e) => setWorkType(e.target.value)}
                                    placeholder="e.g. Masonry"
                                    className="rounded-xl h-11"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="totalQty" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total quantity</Label>
                                    <Input
                                        id="totalQty"
                                        type="number"
                                        value={totalQty}
                                        onChange={(e) => setTotalQty(e.target.value)}
                                        placeholder="0"
                                        className="rounded-xl h-11"
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="unit" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit</Label>
                                    <Input
                                        id="unit"
                                        value={unit}
                                        onChange={(e) => setUnit(e.target.value)}
                                        placeholder="meters"
                                        className="rounded-xl h-11"
                                        required
                                    />
                                </div>
                            </div>
                            <Button type="submit" disabled={createOrderMutation.isLoading} className="w-full h-11 rounded-xl font-bold">
                                {createOrderMutation.isLoading ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                                ) : (
                                    'Create Order'
                                )}
                            </Button>
                        </form>
                    </div>

                    {/* Existing Orders */}
                    <div className="bg-white p-6 rounded-2xl border border-border shadow-sm space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <ClipboardList className="h-4 w-4" />
                            </div>
                            <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{t("currentWorkOrders")}</h2>
                        </div>
                        
                        {loadingOrders ? (
                            <div className="space-y-3">
                                {[1, 2].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
                            </div>
                        ) : workOrders.length === 0 ? (
                            <div className="py-8 text-center border-2 border-dashed border-border rounded-2xl text-muted-foreground italic text-sm">
                                {t("noOrdersYet")}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {workOrders.map(order => (
                                    <button
                                        key={order.id}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group",
                                            selectedOrder?.id === order.id 
                                                ? "bg-emerald-50 border-emerald-200" 
                                                : "bg-white border-border hover:border-emerald-200"
                                        )}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <div>
                                            <div className="font-bold text-foreground text-sm">{order.work_type}</div>
                                            <div className="text-xs text-muted-foreground">{order.total_quantity} {order.unit}</div>
                                        </div>
                                        <div className={cn(
                                            "w-2 h-2 rounded-full",
                                            selectedOrder?.id === order.id ? "bg-emerald-600" : "bg-transparent group-hover:bg-emerald-200"
                                        )} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {selectedOrder && (
                    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/20">
                            <h2 className="text-lg font-bold text-foreground tracking-tight">
                                {t("assignLabourersFor", { name: selectedOrder.work_type })}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-1">Select workers and split the workload equally.</p>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            <div>
                                {loadingLabourers ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}
                                    </div>
                                ) : labourers.length === 0 ? (
                                    <p className="text-sm text-muted-foreground italic">{t("noLabourersAvailable")}</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {labourers.map(l => (
                                            <label 
                                                key={l.id} 
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                                                    selectedLabourers.includes(l.id)
                                                        ? "bg-emerald-50 border-emerald-200 shadow-sm"
                                                        : "bg-white border-border hover:border-emerald-200"
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
                                                    checked={selectedLabourers.includes(l.id)}
                                                    onChange={() => toggleLabourer(l.id)}
                                                />
                                                <span className="text-sm font-semibold text-foreground">{l.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button
                                className="h-12 px-8 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700"
                                onClick={handleAssign}
                                disabled={createAssignmentsMutation.isLoading || selectedLabourers.length === 0}
                            >
                                {createAssignmentsMutation.isLoading ? (
                                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("saving")}</>
                                ) : (
                                    t("assignSelected")
                                )}
                            </Button>

                            <div className="space-y-4">
                                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">{t("currentAssignmentsClaims")}</h3>
                                <div className="border border-border rounded-2xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("labourer")}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("assigned")}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("yourClaim")}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("status")}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("actions")}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {loadingAssignments ? (
                                                <tr><td colSpan="5" className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
                                            ) : assignments.length === 0 ? (
                                                <tr><td colSpan="5" className="text-center py-8 text-muted-foreground italic text-xs">{t("noData")}</td></tr>
                                            ) : (
                                                assignments.map(a => (
                                                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-foreground">{a.labourer?.name || '—'}</td>
                                                        <td className="px-6 py-4 text-muted-foreground">
                                                            {a.assigned_quantity} {selectedOrder.unit}
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-foreground">{a.labour_claim || '0'}</td>
                                                        <td className="px-6 py-4">
                                                            <Badge variant={a.status === 'claimed' ? 'success' : 'secondary'} className="text-[10px] h-5 uppercase">
                                                                {a.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {a.status === 'claimed' && (
                                                                <Button
                                                                    size="sm"
                                                                    className="h-8 rounded-lg font-bold"
                                                                    onClick={() => confirmWorkMutation.mutate(a.id)}
                                                                >
                                                                    Confirm
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default SupervisorDashboardV2;
