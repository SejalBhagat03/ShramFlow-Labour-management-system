import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    User,
    Phone,
    Calendar,
    Briefcase,
    DollarSign,
    TrendingUp,
    ShieldAlert,
    Wallet
} from 'lucide-react';
import { labourerService } from '@/services/labourerService';
import { LabourLedger } from '@/components/LabourLedger';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';

const LabourProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [labour, setLabour] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLabour = async () => {
            try {
                const data = await labourerService.getLabourerById(id);
                setLabour(data);
            } catch (error) {
                console.error("Failed to fetch labourer:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLabour();
    }, [id]);

    if (isLoading) {
        return (
            <AppLayout>
                <div className="max-w-6xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-48" />
                    <Skeleton className="h-48 rounded-xl" />
                    <Skeleton className="h-96 rounded-xl" />
                </div>
            </AppLayout>
        );
    }

    if (!labour) return <div>Labourer not found</div>;

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/labourers')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">{t('labourDirectory')}</h1>
                        <p className="text-muted-foreground">Manage labourer profile and finances</p>
                    </div>
                </div>

                {/* Profile Summary */}
                <Card className="shadow-card border-2">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-8 w-8 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">{labour.name}</h2>
                                        <p className="text-muted-foreground">{labour.name_hindi || ''}</p>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        {labour.phone || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Calendar className="h-4 w-4" />
                                        Joined: {new Date(labour.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge className={labour.status === 'active' ? 'bg-success' : 'bg-muted'}>
                                            {labour.status}
                                        </Badge>
                                        <TrustScoreBadge labourerId={labour.id} size="sm" />
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                                    <div className="flex items-center gap-2 text-primary mb-2">
                                        <Briefcase className="h-5 w-5" />
                                        <p className="text-sm font-medium">Daily Rate</p>
                                    </div>
                                    <p className="text-2xl font-black">₹{labour.daily_rate}</p>
                                </div>
                                <div className="bg-success/5 rounded-xl p-4 border border-success/20">
                                    <div className="flex items-center gap-2 text-success mb-2">
                                        <TrendingUp className="h-5 w-5" />
                                        <p className="text-sm font-medium">Rate Per Meter</p>
                                    </div>
                                    <p className="text-2xl font-black">₹{labour.rate_per_meter || 0}</p>
                                </div>
                                <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/20 relative overflow-hidden">
                                    <div className="absolute top-2 right-2 opacity-10">
                                        <ShieldAlert className="h-12 w-12 text-destructive" />
                                    </div>
                                    <div className="flex items-center gap-2 text-destructive mb-2">
                                        <ShieldAlert className="h-5 w-5" />
                                        <p className="text-sm font-medium">Fraud Score</p>
                                    </div>
                                    <p className="text-2xl font-black">{labour.fraud_score || 0}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabs for Details */}
                <Tabs defaultValue="ledger" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                        <TabsTrigger value="ledger">
                            <Wallet className="h-4 w-4 mr-2" />
                            Financial Ledger
                        </TabsTrigger>
                        <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>

                    <TabsContent value="ledger" className="mt-6">
                        <LabourLedger labourerId={id} />
                    </TabsContent>

                    <TabsContent value="details" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Raw Data</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                                    {JSON.stringify(labour, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
};

export default LabourProfile;
