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
    Users
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
                <div className="max-w-6xl mx-auto p-4 space-y-6">
                    <Skeleton className="h-12 w-48 rounded-2xl" />
                    <Skeleton className="h-[250px] rounded-[2.5rem]" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-32 rounded-3xl" />
                        <Skeleton className="h-32 rounded-3xl" />
                        <Skeleton className="h-32 rounded-3xl" />
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!labour) return (
        <AppLayout title="Error">
            <div className="text-center py-20 space-y-4">
                <ShieldAlert className="h-16 w-16 text-rose-500 mx-auto" />
                <h2 className="text-2xl font-bold">Labourer Not Found</h2>
                <Button onClick={() => navigate('/labourers')}>Return to Directory</Button>
            </div>
        </AppLayout>
    );

    return (
        <AppLayout title="Labour Profile">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6 pb-20">
                {/* Immersive Header Card */}
                <div className="relative -mx-4 px-6 pt-8 pb-12 gradient-dark rounded-b-[3rem] shadow-2xl border-b border-white/5">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        {/* Avatar & Basic Info */}
                        <div className="relative group">
                            <div className="w-28 h-28 md:w-36 md:h-36 rounded-[2.5rem] bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center font-black text-white text-4xl shadow-2xl overflow-hidden ring-4 ring-white/5 transition-transform hover:scale-105">
                                {labour.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-2 -right-2">
                                <TrustScoreBadge labourerId={id} size="lg" className="border-4 border-slate-900 rounded-full" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-3 py-0.5 font-black text-[10px] uppercase tracking-widest">
                                        {labour.status}
                                    </Badge>
                                    <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">Joined {new Date(labour.created_at).toLocaleDateString()}</span>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">
                                    {lang === 'hi' && labour.name_hindi ? labour.name_hindi : labour.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 text-white/60 text-sm font-medium pt-1">
                                    <div className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {labour.phone || 'N/A'}</div>
                                    <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {labour.location || 'Central Depot'}</div>
                                    <div className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Helper Category</div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                <Button 
                                    className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-6 rounded-2xl h-12 shadow-xl"
                                    onClick={() => navigate(`/settings?edit=${id}`)}
                                >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Profile
                                </Button>
                                <Button 
                                    className="bg-[#25D366] hover:bg-[#20bd5c] text-white font-bold px-6 rounded-2xl h-12 shadow-xl border-none"
                                    onClick={() => window.open(generateWhatsAppLink(labour.phone, whatsappTemplates.workAssignment(labour.name, 'Site A', 'Today')), '_blank')}
                                >
                                    <WhatsAppIcon className="h-5 w-5 mr-2" />
                                    WhatsApp
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold px-6 rounded-2xl h-12"
                                    onClick={() => window.open(`tel:${labour.phone}`)}
                                >
                                    <Phone className="h-4 w-4 mr-2" />
                                    Direct Call
                                </Button>
                            </div>
                        </div>

                        {/* Net Balance Card */}
                        <div className="w-full md:w-72 bg-white/10 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/20 shadow-2xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Current Settlement</p>
                            <div className="space-y-1">
                                <p className={cn(
                                    "text-4xl font-black leading-none",
                                    balance >= 0 ? "text-emerald-400 font-glow-emerald" : "text-rose-400 font-glow-rose"
                                )}>
                                    ₹{Math.abs(balance).toLocaleString()}
                                </p>
                                <p className="text-xs text-white/60 font-medium">
                                    {balance >= 0 ? "Pending Company Payout" : "Total Advance Debt"}
                                </p>
                            </div>
                            <Button 
                                className="w-full mt-6 bg-white/20 hover:bg-white/30 text-white font-bold h-11 rounded-xl border-none backdrop-blur-md"
                                onClick={() => navigate('/payments')}
                            >
                                <IndianRupee className="h-4 w-4 mr-2" />
                                Settle Now
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Secondary Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 -mt-6">
                    <Card className="bg-card rounded-3xl shadow-lg border-none overflow-hidden group">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <Activity className="h-4 w-4 text-muted-foreground/30 group-hover:animate-pulse" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Lifetime Earnings</p>
                            <p className="text-2xl font-black text-emerald-900">₹{stats.total_earned.toLocaleString()}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card rounded-3xl shadow-lg border-none overflow-hidden group">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <Clock className="h-4 w-4 text-muted-foreground/30" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Standard Wage</p>
                            <p className="text-2xl font-black text-slate-900">₹{labour.daily_rate}/d</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-card rounded-3xl shadow-lg border-none overflow-hidden group">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600">
                                    <Percent className="h-5 w-5" />
                                </div>
                                <ShieldAlert className="h-4 w-4 text-muted-foreground/30" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 mb-1">Meter Base Pay</p>
                            <p className="text-2xl font-black text-slate-900">₹{labour.rate_per_meter || 0}/m</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-rose-50 rounded-3xl shadow-lg border-rose-100 border overflow-hidden group cursor-pointer hover:bg-rose-100/50 transition-colors" onClick={handleDelete}>
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2.5 rounded-2xl bg-rose-500 text-white">
                                    <Trash2 className="h-5 w-5" />
                                </div>
                                <ShieldAlert className="h-4 w-4 text-rose-300" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Termination Zone</p>
                            <p className="text-xl font-black text-rose-900">Remove Staff</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Tabs Area */}
                <Tabs defaultValue="ledger" className="w-full space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <TabsList className="bg-muted/40 p-1 rounded-2xl border w-fit">
                            <TabsTrigger value="ledger" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Wallet className="h-4 w-4 mr-2" />
                                Financial Ledger
                            </TabsTrigger>
                            <TabsTrigger value="performance" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Activity className="h-4 w-4 mr-2" />
                                Performance
                            </TabsTrigger>
                            <TabsTrigger value="history" className="rounded-xl px-6 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <Clock className="h-4 w-4 mr-2" />
                                History
                            </TabsTrigger>
                        </TabsList>
                        
                        <div className="flex items-center gap-2">
                             <Button variant="outline" size="sm" className="rounded-xl font-bold bg-white text-xs">
                                <ArrowLeft className="h-3 w-3 mr-1" /> Back to List
                             </Button>
                        </div>
                    </div>

                    <TabsContent value="ledger" className="space-y-6 mt-0">
                        <LabourLedger labourerId={id} />
                    </TabsContent>

                    <TabsContent value="performance" className="space-y-6 mt-0">
                        <Card className="rounded-[2.5rem] border shadow-xl overflow-hidden min-h-[300px] flex items-center justify-center bg-slate-50">
                            <div className="text-center space-y-3 opacity-40">
                                <TrendingUp className="h-12 w-12 mx-auto" />
                                <p className="font-black uppercase tracking-widest text-xs">Analytics Coming Soon</p>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history" className="space-y-6 mt-0">
                        <Card className="rounded-[2.5rem] border shadow-xl p-8 bg-slate-50">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <Sparkles className="h-5 w-5 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 tracking-tight">Activity Log</h3>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Audit trail of worker changes</p>
                                </div>
                            </div>
                            
                            <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                                <div className="relative pl-12">
                                    <div className="absolute left-0 top-1 h-9 w-9 bg-white border-2 border-primary rounded-full flex items-center justify-center z-10">
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Today, 04:30 PM</p>
                                    <p className="font-bold text-slate-800">Profile Updated by Supervisor</p>
                                    <p className="text-[10px] font-medium text-slate-500">Wage rate increased by 10%</p>
                                </div>
                                <div className="relative pl-12">
                                    <div className="absolute left-0 top-1 h-9 w-9 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center z-10">
                                        <Wallet className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Yesterday</p>
                                    <p className="font-bold text-slate-800">Payment Processed</p>
                                    <p className="text-[10px] font-medium text-slate-500">Settlement of ₹12,400 completed</p>
                                </div>
                            </div>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
};

export default LabourProfile;
