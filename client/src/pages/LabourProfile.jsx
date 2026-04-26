import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
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
    TrendingUp,
    ShieldAlert,
    Wallet,
    IndianRupee,
    MapPin,
    CheckCircle2,
    Clock,
    Sparkles,
    Trash2,
    Pencil,
    Activity,
    Users,
    Percent
} from 'lucide-react';
import { labourerService } from '@/services/labourerService';
import { LabourLedger } from '@/components/LabourLedger';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { cn } from '@/lib/utils';
import { useLabourers } from '@/hooks/useLabourers';
import { generateWhatsAppLink, whatsappTemplates } from '@/utils/whatsapp';

const WhatsAppIcon = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
);

const LabourProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const [labour, setLabour] = useState(null);
    const [balance, setBalance] = useState(0);
    const [stats, setStats] = useState({ total_earned: 0, total_paid: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const { getLabourBalance, getLabourStats, deleteLabourer } = useLabourers();

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const [labourData, bal, st] = await Promise.all([
                    labourerService.getLabourerById(id),
                    getLabourBalance(id),
                    getLabourStats(id)
                ]);
                setLabour(labourData);
                setBalance(bal);
                setStats(st);
            } catch (error) {
                console.error("Failed to fetch labourer profile:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, [id]);

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete this labourer's record?`)) {
            deleteLabourer.mutate(id, {
                onSuccess: () => navigate('/labourers')
            });
        }
    };

    if (isLoading) {
        return (
            <AppLayout title="Profile">
                <div className="max-w-7xl mx-auto p-6 space-y-6">
                    <div className="flex gap-6">
                        <Skeleton className="h-[400px] w-80 rounded-3xl" />
                        <div className="flex-1 space-y-6">
                            <Skeleton className="h-32 rounded-3xl" />
                            <Skeleton className="h-64 rounded-3xl" />
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!labour) return (
        <AppLayout title="Error">
            <div className="text-center py-20 space-y-4 bg-white/50 backdrop-blur-sm rounded-3xl m-6 border border-dashed">
                <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto" />
                <h2 className="text-2xl font-bold text-slate-800">Labourer Not Found</h2>
                <Button variant="outline" onClick={() => navigate('/labourers')} className="rounded-xl px-8">Return to Directory</Button>
            </div>
        </AppLayout>
    );

    const isPending = balance > 0;

    return (
        <AppLayout title={`${labour.name}'s Profile`}>
            <div className="max-w-7xl mx-auto px-6 py-6 pb-24">
                {/* Compact Action Header */}
                <div className="flex items-center justify-between mb-6">
                    <Button 
                        variant="ghost" 
                        onClick={() => navigate('/labourers')}
                        className="rounded-xl hover:bg-white text-slate-500 font-bold px-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to List
                    </Button>
                    
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            className="bg-white rounded-xl border-none shadow-sm font-bold text-xs"
                            onClick={() => navigate(`/settings?edit=${id}`)}
                        >
                            <Pencil className="h-3.5 w-3.5 mr-2" />
                            Edit Profile
                        </Button>
                        <Button 
                            variant="outline" 
                            className="bg-rose-50 border-none text-rose-600 hover:bg-rose-100 rounded-xl shadow-sm font-bold text-xs"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Profile Card & Quick Info */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
                            <div className="h-24 bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400" />
                            <div className="px-6 pb-8 -mt-12 text-center">
                                <div className="relative inline-block mb-4">
                                    <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-2xl">
                                        <div className="w-full h-full rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-3xl">
                                            {labour.name.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1">
                                        <TrustScoreBadge labourerId={id} size="md" className="border-4 border-white rounded-full bg-white shadow-lg" />
                                    </div>
                                </div>
                                
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                                    {lang === 'hi' && labour.name_hindi ? labour.name_hindi : labour.name}
                                </h2>
                                <Badge className="bg-emerald-50 text-emerald-600 border-none px-3 py-0.5 rounded-full font-black text-[10px] uppercase tracking-widest mb-6">
                                    {labour.role || 'Staff'} • {labour.status}
                                </Badge>

                                <div className="space-y-3 pt-6 border-t border-slate-50">
                                    <Button 
                                        className="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white font-bold h-11 rounded-xl shadow-lg shadow-emerald-500/10 border-none"
                                        onClick={() => window.open(generateWhatsAppLink(labour.phone, whatsappTemplates.workAssignment(labour.name, 'Site A', 'Today')), '_blank')}
                                    >
                                        <WhatsAppIcon className="h-5 w-5 mr-2" />
                                        Message WhatsApp
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="w-full bg-slate-50 border-none text-slate-600 hover:bg-slate-100 font-bold h-11 rounded-xl"
                                        onClick={() => window.open(`tel:${labour.phone}`)}
                                    >
                                        <Phone className="h-4 w-4 mr-2" />
                                        Call {labour.phone || 'N/A'}
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Vital Statistics Card */}
                        <Card className="rounded-3xl border-none shadow-lg bg-white p-6 space-y-6">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Financial Vitality</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-blue-50 text-blue-600"><Briefcase className="h-4 w-4" /></div>
                                            <span className="text-xs font-bold text-slate-500">Daily Wage</span>
                                        </div>
                                        <span className="font-black text-slate-900">₹{labour.daily_rate}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-purple-50 text-purple-600"><Percent className="h-4 w-4" /></div>
                                            <span className="text-xs font-bold text-slate-500">Meter Rate</span>
                                        </div>
                                        <span className="font-black text-slate-900">₹{labour.rate_per_meter || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-amber-50 text-amber-600"><MapPin className="h-4 w-4" /></div>
                                            <span className="text-xs font-bold text-slate-500">Location</span>
                                        </div>
                                        <span className="font-black text-slate-900 text-right text-xs truncate max-w-[120px]">{labour.location || 'Not Set'}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Main Content Area */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Financial Settlement Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className={cn(
                                "rounded-[2.5rem] border-none shadow-xl p-8 relative overflow-hidden",
                                isPending ? "bg-white" : "bg-white"
                            )}>
                                <div className={cn(
                                    "absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full",
                                    balance >= 0 ? "bg-emerald-400/20" : "bg-rose-400/20"
                                )} />
                                
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Net Settlement</p>
                                <div className="flex items-baseline gap-2 mb-4">
                                    <span className={cn(
                                        "text-4xl font-black tracking-tight",
                                        balance >= 0 ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        ₹{Math.abs(balance).toLocaleString()}
                                    </span>
                                    <span className="text-xs font-bold text-slate-400">
                                        {balance >= 0 ? "Pending Payout" : "Total Advance"}
                                    </span>
                                </div>
                                
                                <Button 
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 px-6 rounded-xl border-none shadow-lg shadow-slate-900/20"
                                    onClick={() => navigate('/payments')}
                                >
                                    <IndianRupee className="h-3.5 w-3.5 mr-2" />
                                    Process Payment
                                </Button>
                            </Card>

                            <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-white flex flex-col justify-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Lifetime Business</p>
                                <div className="flex gap-8">
                                    <div>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">₹{stats.total_earned.toLocaleString()}</p>
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Gross Earnings</p>
                                    </div>
                                    <div className="w-px h-10 bg-slate-100" />
                                    <div>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight">₹{stats.total_paid.toLocaleString()}</p>
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">Net Settled</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        {/* Interactive Tabs */}
                        <Tabs defaultValue="ledger" className="w-full">
                            <TabsList className="bg-slate-100 p-1.5 rounded-2xl border-none w-fit mb-8 h-12 shadow-inner">
                                <TabsTrigger value="ledger" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-600">
                                    <Wallet className="h-3.5 w-3.5 mr-2" />
                                    Ledger
                                </TabsTrigger>
                                <TabsTrigger value="history" className="rounded-xl px-8 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600">
                                    <Activity className="h-3.5 w-3.5 mr-2" />
                                    Activity
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="ledger" className="mt-0 focus-visible:ring-0">
                                <LabourLedger labourerId={id} />
                            </TabsContent>

                            <TabsContent value="history" className="mt-0 focus-visible:ring-0">
                                <Card className="rounded-[2.5rem] border-none shadow-xl p-8 bg-white">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            <Sparkles className="h-5 w-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 tracking-tight">System Audit Trail</h3>
                                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Security & Modification Log</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-50">
                                        <div className="relative pl-12">
                                            <div className="absolute left-0 top-1 h-9 w-9 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center z-10 shadow-sm">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase mb-0.5">{new Date(labour.created_at).toLocaleDateString()}</p>
                                            <p className="font-black text-slate-800 text-sm tracking-tight">System Initialization</p>
                                            <p className="text-[10px] font-medium text-slate-400">Worker profile created in database</p>
                                        </div>
                                        <div className="relative pl-12 opacity-50">
                                            <div className="absolute left-0 top-1 h-9 w-9 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center z-10">
                                                <Clock className="h-4 w-4 text-slate-300" />
                                            </div>
                                            <p className="text-[10px] font-black text-slate-300 uppercase mb-0.5">Automated</p>
                                            <p className="font-black text-slate-800 text-sm tracking-tight">No modifications detected</p>
                                            <p className="text-[10px] font-medium text-slate-400">All audit logs are current</p>
                                        </div>
                                    </div>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default LabourProfile;
