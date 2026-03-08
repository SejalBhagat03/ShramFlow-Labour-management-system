import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLabourAssignments } from '@/hooks/useLabourAssignments';
import { useUpdateLabourClaim } from '@/hooks/useUpdateLabourClaim';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

/**
 * Labour dashboard v2 allows a labourer to view assigned work,
 * submit labour_claims and see confirmed work/payment.
 */
const LabourDashboardV2 = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { assignments = [], isLoading } = useLabourAssignments({ labourerId: user?.id });
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
        const num = value.replace(/[^0-9]/g, '');
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
            <div className="space-y-8 p-4">
                <h1 className="text-xl font-bold">{t("yourAssignments")}</h1>
                {isLoading ? (
                    <p>Loading...</p>
                ) : assignments.length === 0 ? (
                    <p>No assignments yet.</p>
                ) : (
                    <>
                        {/* pending / claim table */}
                        <div className="bg-card p-4 rounded-lg shadow">
                            <h2 className="font-semibold mb-2">{t("pendingClaimableWork")}</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm table-auto">
                                    <thead>
                                        <tr className="text-left">
                                            <th className="p-2">{t("workEntry")}</th>
                                            <th className="p-2">{t("assigned")}</th>
                                            <th className="p-2">{t("yourClaim")}</th>
                                            <th className="p-2">{t("status")}</th>
                                            <th className="p-2">{t("actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pending.map(a => (
                                            <tr key={a.id} className="border-t">
                                                <td className="p-2">
                                                    {a.work_order?.work_type} ({a.work_order?.total_quantity} {a.work_order?.unit})
                                                </td>
                                                <td className="p-2">
                                                    {a.assigned_quantity} {a.work_order?.unit}
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        className="w-24"
                                                        type="number"
                                                        value={claimValues[a.id] || ''}
                                                        onChange={(e) => handleChange(a.id, e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2 capitalize">{a.status}</td>
                                                <td className="p-2">
                                                    <Button
                                                        size="sm"
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
                            <div className="bg-card p-4 rounded-lg shadow">
                                <h2 className="font-semibold mb-2">{t("confirmedWorkPayment")}</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm table-auto">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="p-2">{t("workEntry")}</th>
                                                <th className="p-2">{t("labourerClaimed")}</th>
                                                <th className="p-2">{t("unit")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {confirmed.map(a => (
                                                <tr key={a.id} className="border-t">
                                                    <td className="p-2">
                                                        {a.work_order?.work_type}
                                                    </td>
                                                    <td className="p-2">{a.labour_claim}</td>
                                                    <td className="p-2">{a.work_order?.unit}</td>
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
