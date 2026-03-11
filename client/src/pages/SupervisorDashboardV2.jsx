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
    // --- form state for new order ---
    const [workType, setWorkType] = useState('');
    const [totalQty, setTotalQty] = useState('');
    const [unit, setUnit] = useState('');

    // --- selected order & labourers ---
    const { workOrders, isLoading: loadingOrders } = useWorkOrders();
    const { labourers, isLoading: loadingLabourers } = useLabourers();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedLabourers, setSelectedLabourers] = useState([]);

    const { assignments, isLoading: loadingAssignments } = useLabourAssignments({ orderId: selectedOrder?.id });

    const createOrderMutation = useCreateWorkOrder();
    const createAssignmentsMutation = useCreateAssignments();
    const confirmWorkMutation = useConfirmWork();

    // when orders load, pick the most recent if none selected
    useEffect(() => {
        if (!selectedOrder && workOrders.length > 0) {
            setSelectedOrder(workOrders[0]);
        }
    }, [workOrders, selectedOrder]);

    const handleOrderSubmit = (e) => {
        e.preventDefault();
        if (!workType || !totalQty || !unit) return;
        createOrderMutation.mutate({ work_type: workType, total_quantity: Number(totalQty), unit });
        // clear form on success using onSuccess callback above; mutation itself resets nothing
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
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-4 md:space-y-6">
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 -mt-6 lg:-mt-10 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-white/10 border-b">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Supervisor Hub</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t("supervisorDashboard")}</h1>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base font-medium">Manage work orders and assignments</p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-4 md:gap-8">
                    {/* create work order */}
                    <div className="bg-card p-4 md:p-6 rounded-2xl border shadow-sm space-y-4">
                        <h2 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {t("createNewWorkOrder")}
                        </h2>
                    <form onSubmit={handleOrderSubmit} className="space-y-3">
                        <div>
                            <Label htmlFor="workType">Work type</Label>
                            <Input
                                id="workType"
                                value={workType}
                                onChange={(e) => setWorkType(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Label htmlFor="totalQty">Total quantity</Label>
                                <Input
                                    id="totalQty"
                                    type="number"
                                    value={totalQty}
                                    onChange={(e) => setTotalQty(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="unit">Unit</Label>
                                <Input
                                    id="unit"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={createOrderMutation.isLoading} className="w-full">
                            {createOrderMutation.isLoading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                            ) : (
                                'Create'
                            )}
                        </Button>
                    </form>
                </div>

                {/* select existing order */}
                <div className="bg-card p-4 md:p-6 rounded-2xl border shadow-sm space-y-4">
                    <h2 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-success" />
                        {t("currentWorkOrders")}
                    </h2>
                    {loadingOrders ? (
                        <p>{t("loading")}</p>
                    ) : workOrders.length === 0 ? (
                        <p>{t("noOrdersYet")}</p>
                    ) : (
                        <ul className="space-y-2">
                            {workOrders.map(order => (
                                <li key={order.id}>
                                    <button
                                        className={`w-full text-left p-3 rounded-xl border transition-all ${selectedOrder?.id === order.id ? 'bg-primary/10 border-primary/20 ring-1 ring-primary/20' : 'bg-card border-border hover:bg-muted/50'}`}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        <div className="font-semibold text-foreground">{order.work_type}</div>
                                        <div className="text-xs text-muted-foreground">{order.total_quantity} {order.unit}</div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

                {/* assignment section */}
                {selectedOrder && (
                    <div className="bg-card p-3 md:p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-3">{t("assignLabourersFor", { name: selectedOrder.work_type })}</h2>
                        <div className="space-y-3">
                            {loadingLabourers ? (
                                <p>{t("loading")}</p>
                            ) : labourers.length === 0 ? (
                                <p>{t("noLabourersAvailable")}</p>
                            ) : (
                                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
                                    {labourers.map(l => (
                                        <label key={l.id} className="flex items-center p-2 rounded-lg border border-border bg-muted/5 cursor-pointer hover:bg-muted/10 transition-colors">
                                            <input
                                                type="checkbox"
                                                className="mr-3 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={selectedLabourers.includes(l.id)}
                                                onChange={() => toggleLabourer(l.id)}
                                            />
                                            <span className="text-sm font-medium">{l.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button
                            className="mt-3 w-full"
                            onClick={handleAssign}
                            disabled={createAssignmentsMutation.isLoading || selectedLabourers.length === 0}
                        >
                            {createAssignmentsMutation.isLoading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("saving")}</>
                            ) : (
                                t("assignSelected")
                            )}
                        </Button>

                        {/* claims table */}
                        <div className="mt-8">
                            <h3 className="font-semibold mb-3">{t("currentAssignmentsClaims")}</h3>
                            {loadingAssignments ? (
                                <p className="text-center py-4 text-xs text-muted-foreground">{t("loading")}</p>
                            ) : assignments.length === 0 ? (
                                <p className="text-center py-4 text-xs text-muted-foreground italic">{t("noData")}</p>
                            ) : (
                                <div className="overflow-x-auto -mx-0">
                                    <table className="w-full table-auto text-xs md:text-sm border-collapse min-w-[500px]">
                                        <thead>
                                            <tr className="text-left bg-muted/30">
                                                <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("labourer")}</th>
                                                <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("assigned")}</th>
                                                <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("yourClaim")}</th>
                                                <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("status")}</th>
                                                <th className="p-2 md:p-3 border-b text-[10px] uppercase font-bold tracking-wider">{t("actions")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignments.map(a => (
                                                <tr key={a.id} className="border-t hover:bg-muted/10 transition-colors">
                                                    <td className="p-2 md:p-3 font-medium text-xs">{a.labourer?.name || '—'}</td>
                                                    <td className="p-2 md:p-3 whitespace-nowrap text-xs">
                                                        {a.assigned_quantity} {selectedOrder.unit}
                                                    </td>
                                                    <td className="p-2 md:p-3 text-xs">{a.labour_claim}</td>
                                                    <td className="p-2 md:p-3">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                            a.status === 'claimed' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {a.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 md:p-3">
                                                        {a.status === 'claimed' ? (
                                                            <Button
                                                                size="sm"
                                                                className="h-8 rounded-lg text-xs font-bold"
                                                                onClick={() => confirmWorkMutation.mutate(a.id)}
                                                            >
                                                                Confirm
                                                            </Button>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
};

export default SupervisorDashboardV2;
