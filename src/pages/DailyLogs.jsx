import { useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, isSameDay } from "date-fns";

const DailyLogs = () => {
    const { t } = useLanguage();

    const logTypes = [
        { value: "diary", label: t("diaryRecord"), icon: FileText },
        { value: "site_photo", label: t("sitePhoto"), icon: MapPin },
        { value: "proof", label: t("workProof"), icon: ImageIcon },
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

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview
        const reader = new FileReader();
        reader.onload = (e) => setPreviewImage(e.target?.result);
        reader.readAsDataURL(file);

        // Upload
        setIsUploading(true);
        try {
            const url = await uploadImage(file);
            setFormData({ ...formData, image_url: url });
        } catch (error) {
            console.error("Upload failed:", error);
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

    const getLogTypeInfo = (type) => {
        return logTypes.find((t) => t.value === type) || logTypes[3];
    };

    const navigateDate = (direction) => {
        setSelectedDate((prev) => (direction === "prev" ? subDays(prev, 1) : addDays(prev, 1)));
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <CalendarDays className="h-6 w-6 text-primary" />
                            {t("dailyLogs")}
                        </h1>
                        <p className="text-muted-foreground mt-1">{t("dailyLogsSubtitle")}</p>
                    </div>
                    <Button className="gradient-primary shadow-glow" onClick={() => setIsAddModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("addEntry")}
                    </Button>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center justify-between bg-card rounded-xl border p-4 shadow-card">
                    <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="min-w-[200px]">
                                <CalendarDays className="h-4 w-4 mr-2" />
                                {format(selectedDate, "EEEE, dd MMM yyyy")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="center">
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
                        onClick={() => navigateDate("next")}
                        disabled={isSameDay(selectedDate, new Date())}
                    >
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>

                {/* Today Quick Button */}
                {!isSameDay(selectedDate, new Date()) && (
                    <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                        {t("goToToday")}
                    </Button>
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
                        {logs.map((log, index) => {
                            const typeInfo = getLogTypeInfo(log.log_type);
                            const TypeIcon = typeInfo.icon;

                            return (
                                <div
                                    key={log.id}
                                    className="bg-card rounded-xl border overflow-hidden shadow-card hover:shadow-lg transition-all duration-200 animate-slide-up"
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    {log.image_url && (
                                        <div className="aspect-video relative overflow-hidden bg-muted">
                                            <img src={log.image_url} alt={log.title} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <Badge variant="secondary" className="gap-1">
                                                <TypeIcon className="h-3 w-3" />
                                                {typeInfo.label}
                                            </Badge>
                                            {userRole === "supervisor" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => deleteLog.mutate(log.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-foreground">{log.title}</h3>
                                        {log.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-2">{log.description}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), "hh:mm a")}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add Entry Modal */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{t("addDailyLog")}</DialogTitle>
                            <DialogDescription>
                                {t("addDailyLogDesc")} {format(selectedDate, "dd MMM yyyy")}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            {/* Image Upload */}
                            <div className="space-y-2">
                                <Label>{t("photoOptional")}</Label>
                                <div
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                                        "hover:border-primary hover:bg-primary/5",
                                        previewImage && "border-primary",
                                    )}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            <p className="text-sm text-muted-foreground">{t("uploading")}</p>
                                        </div>
                                    ) : previewImage ? (
                                        <div className="relative">
                                            <img src={previewImage} alt="Preview" className="max-h-48 mx-auto rounded-lg object-cover" />
                                            <p className="text-xs text-muted-foreground mt-2">{t("clickToChange")}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">{t("clickToUpload")}</p>
                                            <p className="text-xs text-muted-foreground">{t("photoTypes")}</p>
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

                            {/* Log Type */}
                            <div className="space-y-2">
                                <Label>{t("type")}</Label>
                                <Select
                                    value={formData.log_type}
                                    onValueChange={(value) => setFormData({ ...formData, log_type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {logTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                <div className="flex items-center gap-2">
                                                    <type.icon className="h-4 w-4" />
                                                    {type.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Title */}
                            <div className="space-y-2">
                                <Label>{t("title")} *</Label>
                                <Input
                                    placeholder={t("titlePlaceholder")}
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label>{t("notesOptional")}</Label>
                                <Textarea
                                    placeholder={t("notesPlaceholder")}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                                {t("cancel")}
                            </Button>
                            <Button
                                className="gradient-primary"
                                onClick={handleSave}
                                disabled={!formData.title || createLog.isPending || isUploading}
                            >
                                {createLog.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        {t("saving")}
                                    </>
                                ) : (
                                    t("saveEntry")
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default DailyLogs;
