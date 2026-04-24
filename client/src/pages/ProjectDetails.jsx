import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { useProjectPulse } from '@/hooks/useProjectPulse';
import { useActivities } from '@/hooks/useActivities';
import { ActivityFeed } from '@/components/ActivityFeed';
import { motion } from 'framer-motion';
import { 
    Zap, 
    ArrowLeft, 
    Users, 
    Calendar, 
    MapPin, 
    IndianRupee, 
    TrendingUp, 
    Plus,
    Clock,
    AlertCircle,
    Target,
    Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/StatCard';
import { useFocusProject } from '@/hooks/useFocusProject';

const ProjectDetails = () => {
    const { id } = useParams();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setFocus } = useFocusProject();

    // Use Pulse hook to get all projects (we filter for ours to get real-time stats)
    const { data: allProjects = [], isLoading: projectsLoading } = useProjectPulse();
    
    // Get Activities filtered for this project (we can pass a filter param later)
    const { activities = [], isLoading: activitiesLoading } = useActivities(20);

    const project = useMemo(() => {
        return allProjects.find(p => p.id === id);
    }, [allProjects, id]);

    const projectActivities = useMemo(() => {
        return activities.filter(a => a.project_id === id);
    }, [activities, id]);

    if (projectsLoading) {
        return (
            <AppLayout>
                <div className="p-8 space-y-6">
                    <div className="h-12 w-64 bg-muted animate-pulse rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="h-32 bg-muted animate-pulse rounded-3xl" />
                        <div className="h-32 bg-muted animate-pulse rounded-3xl" />
                        <div className="h-32 bg-muted animate-pulse rounded-3xl" />
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!project) {
        return (
            <AppLayout>
                <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                    <h2 className="text-xl font-bold">Project Not Found</h2>
                    <Button onClick={() => navigate('/projects')}>Back to Projects</Button>
                </div>
            </AppLayout>
        );
    }

    const budgetStatus = project.budget ? (project.budget_used / project.budget) : 0;
    const isOverBudget = budgetStatus > 1;

    return (
        <AppLayout>
            <div className="min-h-[calc(100vh-4rem)] p-3 md:p-6 lg:p-8 space-y-6 md:space-y-8 bg-background relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-64 -mt-64" />

                {/* Header Navigation */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full h-10 w-10 bg-background/50 backdrop-blur-sm border"
                            onClick={() => navigate('/projects')}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="h-3.5 w-3.5 text-primary fill-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Site Command</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">{project.name}</h1>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button 
                            className="rounded-xl gradient-primary shadow-glow font-bold"
                            onClick={() => {
                                setFocus(project.id);
                                navigate('/work-entries');
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Record Today's Work
                        </Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6 md:gap-8 relative z-10">
                    {/* Left: Project Stats & Pulse */}
                    <div className="lg:col-span-2 space-y-6 md:space-y-8">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard 
                                title="On-Site Today" 
                                value={project.active_today || 0} 
                                icon={Users} 
                                className="glass-strong border-none" 
                            />
                            <StatCard 
                                title="Work Progress" 
                                value={`${(project.progress_percent || 0).toFixed(1)}%`} 
                                icon={Target} 
                                variant={project.progress_percent >= 100 ? "success" : "default"}
                                className="glass-strong border-none" 
                            />
                            <StatCard 
                                title="Efficiency" 
                                value={`${((project.total_work_done || 0) / (Math.max(1, Math.ceil((new Date() - new Date(project.start_date)) / (1000*60*60*24))))).toFixed(1)} u/d`} 
                                icon={TrendingUp} 
                                className="glass-strong border-none" 
                            />
                            <StatCard 
                                title="Last Entry" 
                                value={project.last_entry_date ? new Date(project.last_entry_date).toLocaleDateString() : 'N/A'} 
                                icon={Clock} 
                                className="glass-strong border-none" 
                            />
                        </div>

                        {/* Project Details Card */}
                        <Card className="glass border-none shadow-2xl rounded-[2rem] overflow-hidden">
                            <CardHeader className="border-b border-white/5 bg-white/5">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-primary" />
                                    Site Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8 space-y-8">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-primary/10 rounded-xl">
                                                <MapPin className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Site Location</p>
                                                <p className="font-semibold">{project.site_location || 'Not Specified'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-primary/10 rounded-xl">
                                                <Calendar className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Duration</p>
                                                <p className="font-semibold text-sm">
                                                    {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Start TBD'}
                                                    {' — '}
                                                    {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Active'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center px-1">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest underline decoration-primary/30 underline-offset-4">Work Progress</p>
                                                    <span className="text-sm font-bold">
                                                        {project.total_work_done || 0} / {project.total_work_target || 0} {project.rate_type === 'per_meter' ? 'm' : 'days'}
                                                    </span>
                                                </div>
                                                <Progress 
                                                    value={Math.min(project.progress_percent || 0, 100)} 
                                                    className="h-3 md:h-4 bg-muted/30"
                                                    indicatorClassName={cn(
                                                        "transition-all duration-1000",
                                                        project.progress_percent >= 100 ? "bg-success shadow-glow-success" : project.progress_percent > 80 ? "bg-amber-500" : "bg-primary"
                                                    )}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center px-1">
                                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest underline decoration-primary/30 underline-offset-4">Budget Utilization</p>
                                                    <span className={cn("text-sm font-bold", isOverBudget ? "text-destructive" : "text-primary")}>
                                                        ₹{project.budget_used?.toLocaleString() || 0} / ₹{project.budget?.toLocaleString() || '∞'}
                                                    </span>
                                                </div>
                                                <Progress 
                                                    value={Math.min(budgetStatus * 100, 100)} 
                                                    className="h-3 md:h-4 bg-muted/30"
                                                    indicatorClassName={cn(
                                                        "transition-all duration-1000",
                                                        isOverBudget ? "bg-destructive shadow-glow-destructive" : "bg-primary"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>
   </div>
                                </div>

                                {project.description && (
                                    <div className="mt-8 pt-8 border-t border-white/5">
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Project Scope</p>
                                        <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-2xl italic">
                                            "{project.description}"
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Site Activity */}
                    <div className="space-y-6 overflow-hidden">
                        <div className="glass-strong rounded-[2.5rem] p-6 h-full border-none shadow-2xl flex flex-col max-h-[80vh]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <h3 className="font-bold text-foreground">Recent Activity</h3>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            </div>
                            
                            <div className="flex-1 overflow-y-auto pr-2 scrollbar-none">
                                {activitiesLoading ? (
                                    <div className="space-y-4">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div key={i} className="h-16 bg-muted/20 rounded-2xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : projectActivities.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                                        <Zap className="h-10 w-10 mb-4 stroke-1" />
                                        <p className="text-sm">No activity recorded for this site yet.</p>
                                    </div>
                                ) : (
                                    <ActivityFeed 
                                        activities={projectActivities.map(a => ({
                                            ...a,
                                            messageHindi: a.message_hindi || a.message,
                                            timestamp: a.created_at
                                        }))} 
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default ProjectDetails;
