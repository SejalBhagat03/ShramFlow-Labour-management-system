import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { useDailyLogs, useDailyLogCounts } from "@/hooks/useDailyLogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    CalendarDays,
    Plus,
    Image as ImageIcon,
    FileText,
    MapPin,
    Clock,
    Trash2,
    Upload,
    Loader2,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    ClipboardCheck,
    Camera,
    Briefcase,
    IndianRupee
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, isSameDay } from "date-fns";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const DailyLogs = () => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;

    const logTypes = [
        { value: "diary", label: t("diaryRecord"), icon: FileText },
        { value: "site_photo", label: t("sitePhoto"), icon: Camera },
        { value: "proof", label: t("workProof"), icon: ClipboardCheck },
        { value: "summary", label: "Daily Summary", icon: TrendingUp },
        { value: "general", label: t("general"), icon: Clock },
    ];

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const fileInputRef = useRef(null);

    const { logs, isLoading, createLog, deleteLog, uploadImage, userRole } = useDailyLogs(selectedDate);
    const { logCountsByDate } = useDailyLogCounts(calendarMonth);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        title: "",
        description: "",
        image_url: "",
        log_type: "general",
    });

    // 3-in-1 Connection: Fetch Work Entries for this day to show a summary
    const { data: workEntries = [], isLoading: isLoadingEntries } = useQuery({
        queryKey: ['work_entries_summary', selectedDate.toISOString().split('T')[0]],
        queryFn: async () => {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('work_entries')
                .select('*, labourers(name), projects(name)')
                .eq('date', dateStr)
                .neq('status', 'rejected');
            if (error) throw error;
            return data;
        }
    });

    const dailySummary = {
        totalLabourers: new Set(workEntries.map(e => e.labourer_id)).size,
        totalMeters: workEntries.reduce((sum, e) => sum + (Number(e.meters) || 0), 0),
        totalAmount: workEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        activeProjects: new Set(workEntries.map(e => e.projects?.name).filter(Boolean)).size
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => setPreviewImage(e.target?.result);
        reader.readAsDataURL(file);

        setIsUploading(true);
        try {
            const url = await uploadImage(file);
            setFormData({ ...formData, image_url: url });
        } catch (error) {
            if (import.meta.env.DEV) console.error("Upload failed:", error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.title) return;
        await createLog.mutateAsync({
            ...formData,
            date: selectedDate.toISOString().split("T")[0],
        });
        setIsAddModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            date: new Date().toISOString().split("T")[0],
            title: "",
            description: "",
            image_url: "",
            log_type: "general",
        });
        setPreviewImage(null);
    };

    const navigateDate = (direction) => {
        setSelectedDate((prev) => (direction === "prev" ? subDays(prev, 1) : addDays(prev, 1)));
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'site_photo': return <Camera className="h-4 w-4" />;
            case 'proof': return <ClipboardCheck className="h-4 w-4" />;
            case 'summary': return <TrendingUp className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getLogTypeBadge = (type) => {
        const styles = {
            diary: 'bg-blue-100 text-blue-700 border-blue-200',
            site_photo: 'bg-purple-100 text-purple-700 border-purple-200',
            proof: 'bg-green-100 text-green-700 border-green-200',
            summary: 'bg-amber-100 text-amber-700 border-amber-200',
            general: 'bg-gray-100 text-gray-700 border-gray-200',
        };
        return (
            <Badge variant="outline" className={cn('capitalize text-[10px] px-1.5 h-5', styles[type] || styles.general)}>
                {type?.replace('_', ' ')}
            </Badge>
        );
    };

    const renderLogMetadata = (log) => {
        if (!log.metadata) return null;
        const { trust_score, flags, badge, totalArea, totalEntries, flaggedCount } = log.metadata;

        if (log.log_type === 'summary') {
            return (
                <div className="mt-3 grid grid-cols-3 gap-2 py-2 border-t border-dashed">
                    <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">Entries</p>
                        <p className="text-sm font-bold">{totalEntries}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">Area</p>
                        <p className="text-sm font-bold">{totalArea}m</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-muted-foreground uppercase">Alerts</p>
                        <p className={cn("text-sm font-bold", flaggedCount > 0 ? "text-destructive" : "text-success")}>
                            {flaggedCount}
                        </p>
                    </div>
                </div>
            );
        }

        if (trust_score !== undefined) {
            return (
                <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px]", trust_score >= 80 ? "text-success" : "text-warning")}>
                        Trust: {trust_score}% {badge}
                    </Badge>
                    {flags && flags.length > 0 && (
                        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                            {flags.map((f, i) => (
                                <Badge key={i} variant="secondary" className="text-[9px] bg-red-50 text-red-600 whitespace-nowrap">
                                    {f}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <AppLayout>
            <div className="space-y-3 md:space-y-6">
                {/* Immersive Page Header */}
                <div className="relative pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-b border-white/10">
                    <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 md:gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Attendance Hub</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">{t('dailyLogs')}</h1>
                            <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base font-medium">Record and track daily work and attendance</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Button variant="outline" className="py-2.5 px-4 rounded-xl bg-background/50 backdrop-blur-sm border-2 w-full sm:w-auto text-sm h-auto">
                                <FileText className="h-4 w-4 mr-2" />
                                {t('reports')}
                            </Button>
                            <Button className="py-2.5 px-4 rounded-xl gradient-primary shadow-glow font-bold w-full sm:w-auto text-sm md:text-base h-auto" onClick={() => setIsAddModalOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("addEntry")}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-4 md:space-y-6">
                    {/* Date Navigation */}
                    <div className="flex items-center justify-between bg-card rounded-2xl border p-3 md:p-4 shadow-sm">
                        <Button variant="ghost" size="icon" className="h-9 w-9 md:h-10 md:w-10 rounded-full" onClick={() => navigateDate("prev")}>
                            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="min-w-[150px] md:min-w-[220px] h-10 md:h-11 rounded-xl border-2 font-bold bg-background/50 backdrop-blur-sm text-xs md:text-sm">
                                    <CalendarDays className="h-3.5 w-3.5 mr-2 text-primary" />
                                    {format(selectedDate, "dd MMM yyyy")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-none" align="center">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => {
                                        if (date) setSelectedDate(date);
                                    }}
                                    onMonthChange={setCalendarMonth}
                                    className="pointer-events-auto"
                                    components={{
                                        DayButton: (props) => {
                                            const dateStr = format(props.day.date, "yyyy-MM-dd");
                                            const count = logCountsByDate[dateStr];
                                            return (
                                                <button
                                                    {...props}
                                                    className={cn(props.className, "relative flex flex-col items-center justify-center")}
                                                >
                                                    <span>{props.day.date.getDate()}</span>
                                                    {count && count > 0 && (
                                                        <span className="absolute -bottom-0.5 text-[8px] font-medium text-primary">{count}</span>
                                                    )}
                                                </button>
                                            );
                                        },
                                    }}
                                />
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() => navigateDate("next")}
                            disabled={isSameDay(selectedDate, new Date())}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Master Summary Card (The 3-in-1 Integration) */}
                    {(workEntries.length > 0) && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-emerald-600 p-4 rounded-2xl text-white shadow-lg shadow-emerald-600/20 relative overflow-hidden group hover:scale-[1.02] transition-transform">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8" />
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Active Sites</p>
                                <div className="flex items-end justify-between">
                                    <p className="text-2xl font-black">{dailySummary.activeProjects}</p>
                                    <Briefcase className="h-4 w-4 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm group hover:border-emerald-200 transition-colors">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Workforce</p>
                                <div className="flex items-end justify-between">
                                    <p className="text-2xl font-black text-slate-900">{dailySummary.totalLabourers}</p>
                                    <Users className="h-4 w-4 text-emerald-500 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm group hover:border-emerald-200 transition-colors">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Productivity</p>
                                <div className="flex items-end justify-between">
                                    <p className="text-2xl font-black text-slate-900">{dailySummary.totalMeters}<span className="text-xs font-bold ml-1 text-slate-400">m</span></p>
                                    <TrendingUp className="h-4 w-4 text-emerald-500 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-border shadow-sm group hover:border-emerald-200 transition-colors">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Daily Cost</p>
                                <div className="flex items-end justify-between">
                                    <p className="text-2xl font-black text-slate-900">₹{dailySummary.totalAmount.toLocaleString()}</p>
                                    <IndianRupee className="h-4 w-4 text-emerald-500 opacity-50" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Logs Grid */}
                    {isLoading ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-64 rounded-xl" />
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-16 bg-card rounded-xl border">
                            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">{t("noEntriesForDay")}</h3>
                            <p className="text-muted-foreground mb-4">{t("startByAdding")}</p>
                            <Button onClick={() => setIsAddModalOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t("addFirstEntry")}
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className={cn(
                                        "p-4 rounded-xl border bg-card transition-all hover:shadow-md",
                                        log.log_type === 'summary' && "bg-amber-50/50 border-amber-200 shadow-sm ring-1 ring-amber-200/50"
                                    )}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                                log.log_type === 'summary' ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                                            )}>
                                                {getLogIcon(log.log_type)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-semibold text-foreground truncate">{log.title}</h4>
                                                    {getLogTypeBadge(log.log_type)}
                                                </div>
                                                {log.image_url && (
                                                    <div className="aspect-video relative overflow-hidden bg-muted rounded-md mb-2">
                                                        <img src={log.image_url} alt={log.title} className="w-full h-full object-cover" loading="lazy" />
                                                    </div>
                                                )}
                                                {log.description && (
                                                    <p className="text-sm text-muted-foreground whitespace-pre-line">{log.description}</p>
                                                )}
                                                {renderLogMetadata(log)}
                                                <p className="text-[10px] text-muted-foreground mt-2">
                                                    {format(new Date(log.created_at), "hh:mm a")}
                                                </p>
                                            </div>
                                        </div>
                                        {userRole === "supervisor" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => deleteLog.mutate(log.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Entry Modal */}
                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-3xl max-h-[95vh] flex flex-col gap-0">
                            {/* Premium Header Banner */}
                            <div className="bg-emerald-600 px-8 py-8 text-white relative overflow-hidden flex-shrink-0">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                                        <Plus className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-2xl font-black tracking-tight">{t("addDailyLog")}</DialogTitle>
                                        <DialogDescription className="text-emerald-100 font-medium text-sm mt-0.5">
                                            {t("addDailyLogDesc")} {format(selectedDate, "dd MMM yyyy")}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 space-y-6 bg-white flex-1 overflow-y-auto custom-scrollbar min-h-0">
                                {/* Image Upload */}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("photoOptional")}</Label>
                                    <div
                                        className={cn(
                                            "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all",
                                            "hover:border-emerald-400 hover:bg-emerald-50/50",
                                            previewImage ? "border-emerald-500 bg-emerald-50/30" : "border-slate-100 bg-slate-50",
                                        )}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {isUploading ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                                <p className="text-xs font-bold text-slate-500">{t("uploading")}</p>
                                            </div>
                                        ) : previewImage ? (
                                            <div className="relative group">
                                                <img src={previewImage} alt="Preview" className="max-h-40 mx-auto rounded-xl shadow-lg transition-transform group-hover:scale-[1.02]" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                                    <Camera className="h-8 w-8 text-white" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                                                    <Upload className="h-6 w-6 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">{t("clickToUpload")}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{t("photoTypes")}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {/* Log Type */}
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("type")}</Label>
                                        <Select
                                            value={formData.log_type}
                                            onValueChange={(value) => setFormData({ ...formData, log_type: value })}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none focus:ring-emerald-500 font-bold text-slate-900 shadow-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-2xl border-none shadow-xl">
                                                {logTypes.map((type) => (
                                                    <SelectItem key={type.value} value={type.value} className="rounded-lg font-bold">
                                                        <div className="flex items-center gap-2">
                                                            <type.icon className="h-4 w-4 text-emerald-500" />
                                                            {type.label}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Title */}
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("title")} *</Label>
                                        <Input
                                            placeholder={t("titlePlaceholder")}
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="h-12 rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-bold text-slate-900 shadow-sm"
                                        />
                                    </div>

                                    {/* Description */}
                                    <div className="grid gap-2">
                                        <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("notesOptional")}</Label>
                                        <Textarea
                                            placeholder={t("notesPlaceholder")}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="min-h-[100px] rounded-xl bg-slate-50 border-none focus-visible:ring-emerald-500 transition-all font-medium text-slate-700 shadow-sm resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-shrink-0 z-20">
                                <Button 
                                    variant="ghost" 
                                    className="h-12 px-6 rounded-xl font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest text-[10px]" 
                                    onClick={() => setIsAddModalOpen(false)}
                                >
                                    {t("cancel")}
                                </Button>
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-10 rounded-2xl font-black shadow-xl shadow-emerald-600/20 active:scale-95 transition-all text-sm tracking-tight"
                                    onClick={handleSave}
                                    disabled={!formData.title || createLog.isPending || isUploading}
                                >
                                    {createLog.isPending ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        t("saveEntry")
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
};

export default DailyLogs;
