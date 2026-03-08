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
            <div className="space-y-8 p-4">
                {/* create order form */}
                <div className="bg-card p-4 rounded-lg shadow">
                    <h2 className="text-lg font-semibold mb-2">{t("createWorkOrder")}</h2>
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
                <div>
                    <h2 className="text-lg font-semibold mb-2">{t("currentWorkOrders")}</h2>
                    {loadingOrders ? (
                        <p>{t("loading")}</p>
                    ) : workOrders.length === 0 ? (
                        <p>{t("noOrdersYet")}</p>
                    ) : (
                        <ul className="space-y-1">
                            {workOrders.map(order => (
                                <li key={order.id}>
                                    <button
                                        className={`w-full text-left p-2 rounded ${selectedOrder?.id === order.id ? 'bg-primary/10' : ''}`}
                                        onClick={() => setSelectedOrder(order)}
                                    >
                                        {order.work_type} — {order.total_quantity} {order.unit}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* assignment section */}
                {selectedOrder && (
                    <div className="bg-card p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold mb-2">{t("assignLabourersFor", { name: selectedOrder.work_type })}</h2>
                        <div className="space-y-2">
                            {loadingLabourers ? (
                                <p>{t("loading")}</p>
                            ) : labourers.length === 0 ? (
                                <p>{t("noLabourersAvailable")}</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {labourers.map(l => (
                                        <label key={l.id} className="flex items-center">
                                            <input
                                                type="checkbox"
                                                className="mr-2"
                                                checked={selectedLabourers.includes(l.id)}
                                                onChange={() => toggleLabourer(l.id)}
                                            />
                                            {l.name}
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
                        <div className="mt-6">
                            <h3 className="font-semibold mb-1">{t("currentAssignmentsClaims")}</h3>
                            {loadingAssignments ? (
                                <p>{t("loading")}</p>
                            ) : assignments.length === 0 ? (
                                <p>{t("noData")}</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto text-sm">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="p-2">{t("labourer")}</th>
                                                <th className="p-2">{t("assigned")}</th>
                                                <th className="p-2">{t("yourClaim")}</th>
                                                <th className="p-2">{t("status")}</th>
                                                <th className="p-2">{t("actions")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {assignments.map(a => (
                                                <tr key={a.id} className="border-t">
                                                    <td className="p-2">{a.labourer?.name || '—'}</td>
                                                    <td className="p-2">
                                                        {a.assigned_quantity} {selectedOrder.unit}
                                                    </td>
                                                    <td className="p-2">{a.labour_claim}</td>
                                                    <td className="p-2 capitalize">{a.status}</td>
                                                    <td className="p-2">
                                                        {a.status === 'claimed' ? (
                                                            <Button
                                                                size="sm"
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
