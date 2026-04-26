import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Search,
    Plus,
    Calendar,
    MapPin,
    IndianRupee,
    Briefcase,
    MoreVertical,
    Clock,
    CheckCircle2,
    Target,
    Zap,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjects } from '@/hooks/useProjects';
import { useNavigate } from 'react-router-dom';
import { useFocusProject } from '@/hooks/useFocusProject';

const Projects = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { projects, isLoading, createProject } = useProjects();
    const [formData, setFormData] = useState({ 
        name: '', 
        description: '', 
        budget: '', 
        site_location: '', 
        start_date: '', 
        end_date: '',
        work_type: 'Solar Installation',
        rate_type: 'per_meter',
        default_rate: '',
        total_work_target: ''
    });

    const resetForm = () => {
        setFormData({ 
            name: '', description: '', budget: '', site_location: '', start_date: '', end_date: '',
            work_type: 'Solar Installation', rate_type: 'per_meter', default_rate: '', total_work_target: ''
        });
    };

    const navigate = useNavigate();
    const { setFocus } = useFocusProject();

    const handleSave = () => {
        if (!formData.name) return;
        createProject.mutate(formData, {
            onSuccess: (newProject) => {
                if (newProject && newProject.id) {
                    setFocus(newProject.id);
                    setIsAddModalOpen(false);
                    resetForm();
                    toast({
                        title: "Project Ready",
                        description: `Redirecting to record first entries for ${newProject.name}...`
                    });
                    setTimeout(() => navigate('/work-entries'), 800);
                }
            }
        });
    };

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        p.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground tracking-tight">Projects</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage construction sites and budgets</p>
                    </div>
                    <Button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-xl"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                    </Button>
                </div>

                {/* Filters */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
                        className="pl-10 h-10 bg-white border-border rounded-xl text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-border animate-pulse rounded-2xl" />)
                    ) : filteredProjects.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white border-2 border-dashed border-border rounded-2xl">
                            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <h3 className="text-lg font-bold text-foreground">No projects found</h3>
                            <p className="text-sm text-muted-foreground mt-1">Try starting a new project above.</p>
                        </div>
                    ) : (
                        filteredProjects.map((project) => (
                            <div key={project.id} className="bg-white rounded-2xl border border-border p-6 shadow-sm hover:border-emerald-200 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                        <Briefcase className="h-5 w-5" />
                                    </div>
                                    <Badge variant="outline" className={cn(
                                        "rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                        project.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-muted text-muted-foreground border-transparent"
                                    )}>
                                        {project.status}
                                    </Badge>
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-1">{project.name}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 h-10">{project.description || 'No description provided'}</p>
                                
                                <div className="space-y-3 pt-4 border-t border-border border-dashed">
                                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <IndianRupee className="h-3 w-3" />
                                            <span>Budget</span>
                                        </div>
                                        <span className="text-foreground">₹{Number(project.budget || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="h-3 w-3" />
                                            <span>Location</span>
                                        </div>
                                        <span className="text-foreground truncate max-w-[120px]">{project.site_location || 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3 w-3" />
                                            <span>Timeline</span>
                                        </div>
                                        <span className="text-foreground">{project.start_date || 'TBD'}</span>
                                    </div>
                                </div>

                                <Button 
                                    variant="outline" 
                                    className="w-full mt-6 rounded-xl border-border font-bold text-xs h-9 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                >
                                    View Details
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                {/* Modal */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
                        {/* Premium Header Banner */}
                        <div className="bg-emerald-600 px-8 py-10 text-white relative overflow-hidden flex-shrink-0">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                    <Briefcase className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black tracking-tight">Initialize New Project</DialogTitle>
                                    <DialogDescription className="text-emerald-100 font-medium text-sm mt-0.5">
                                        Define site logistics, budget constraints, and delivery targets.
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-8 space-y-8 bg-white flex-grow overflow-y-auto custom-scrollbar">
                            {/* Project Identity */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="h-4 w-4 text-emerald-500" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Project Identity</h3>
                                </div>
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Project Designation</Label>
                                        <Input 
                                            placeholder="e.g. Skyline Towers Block A" 
                                            value={formData.name} 
                                            onChange={e => setFormData({...formData, name: e.target.value})} 
                                            className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Operational Scope</Label>
                                        <Textarea 
                                            placeholder="Brief overview of the project scope..." 
                                            value={formData.description} 
                                            onChange={e => setFormData({...formData, description: e.target.value})} 
                                            className="rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-medium text-slate-700 min-h-[100px]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Logistics & Budget */}
                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-2 mb-2">
                                    <MapPin className="h-4 w-4 text-emerald-500" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Logistics & Budget</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Allocation Budget (₹)</Label>
                                        <Input 
                                            type="number" 
                                            placeholder="0" 
                                            value={formData.budget} 
                                            onChange={e => setFormData({...formData, budget: e.target.value})} 
                                            className="h-12 rounded-xl bg-emerald-50/50 border-none focus-visible:ring-emerald-500 transition-all font-black text-emerald-900 text-lg"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Site Location</Label>
                                        <Input 
                                            placeholder="City / Area" 
                                            value={formData.site_location} 
                                            onChange={e => setFormData({...formData, site_location: e.target.value})} 
                                            className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Vertical Sector</Label>
                                        <Select value={formData.work_type} onValueChange={v => setFormData({...formData, work_type: v})}>
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none focus:ring-emerald-500 font-bold text-slate-900">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-none shadow-xl font-bold">
                                                <SelectItem value="Solar Installation">Solar Installation</SelectItem>
                                                <SelectItem value="Wiring">Wiring</SelectItem>
                                                <SelectItem value="Digging">Digging</SelectItem>
                                                <SelectItem value="Pole Installation">Pole Installation</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Production Target</Label>
                                        <Input 
                                            type="number"
                                            placeholder="0" 
                                            value={formData.total_work_target} 
                                            onChange={e => setFormData({...formData, total_work_target: e.target.value})} 
                                            className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Chronology */}
                            <div className="space-y-4 pt-4 border-t border-slate-50 pb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-emerald-500" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Timeline Chronology</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Kick-off Date</Label>
                                        <Input 
                                            type="date" 
                                            value={formData.start_date} 
                                            onChange={e => setFormData({...formData, start_date: e.target.value})} 
                                            className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Estimated Completion</Label>
                                        <Input 
                                            type="date" 
                                            value={formData.end_date} 
                                            onChange={e => setFormData({...formData, end_date: e.target.value})} 
                                            className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
                            <Button 
                                variant="ghost" 
                                className="h-12 px-6 rounded-xl font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest text-[10px]" 
                                onClick={() => setIsAddModalOpen(false)}
                            >
                                Cancel Setup
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-10 rounded-2xl font-black shadow-xl shadow-emerald-600/20 active:scale-95 transition-all text-sm tracking-tight"
                                onClick={handleSave} 
                                disabled={!formData.name || createProject.isPending}
                            >
                                {createProject.isPending ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    "Establish Project"
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default Projects;
