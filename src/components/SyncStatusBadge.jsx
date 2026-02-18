import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Wifi, WifiOff, CloudUpload, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const SyncStatusBadge = ({ showDetails = false, className }) => {
    const { lang } = useLanguage();
    const { isOnline, pendingCount, failedCount, isSyncing, syncNow } = useOfflineSync();

    const labels = {
        online: { en: "Online", hi: "ऑनलाइन" },
        offline: { en: "Offline", hi: "ऑफ़लाइन" },
        syncing: { en: "Syncing...", hi: "सिंक हो रहा..." },
        pending: { en: "Pending", hi: "लंबित" },
        synced: { en: "Synced", hi: "सिंक हुआ" },
        failed: { en: "Failed", hi: "विफल" },
        tapToSync: { en: "Tap to sync", hi: "सिंक करने के लिए दबाएं" },
    };

    // Determine status
    const hasIssues = pendingCount > 0 || failedCount > 0;

    if (!showDetails) {
        // Compact badge view
        return (
            <Badge
                variant="outline"
                className={cn(
                    "flex items-center gap-1 px-2 py-1",
                    isOnline
                        ? hasIssues
                            ? "bg-warning/10 text-warning border-warning/20"
                            : "bg-success/10 text-success border-success/20"
                        : "bg-destructive/10 text-destructive border-destructive/20",
                    className,
                )}
            >
                {isSyncing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : isOnline ? (
                    hasIssues ? (
                        <CloudUpload className="h-3 w-3" />
                    ) : (
                        <CheckCircle className="h-3 w-3" />
                    )
                ) : (
                    <WifiOff className="h-3 w-3" />
                )}
                <span className="text-xs">
                    {isSyncing
                        ? labels.syncing[lang]
                        : isOnline
                            ? hasIssues
                                ? `${pendingCount + failedCount} ${labels.pending[lang]}`
                                : labels.synced[lang]
                            : labels.offline[lang]}
                </span>
            </Badge>
        );
    }

    // Detailed view with sync button
    return (
        <div className={cn("rounded-lg border p-3 space-y-2", className)}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isOnline ? (
                        <Wifi className="h-4 w-4 text-success" />
                    ) : (
                        <WifiOff className="h-4 w-4 text-destructive" />
                    )}
                    <span className="font-medium text-sm">{isOnline ? labels.online[lang] : labels.offline[lang]}</span>
                </div>

                {isOnline && hasIssues && (
                    <Button size="sm" variant="outline" onClick={syncNow} disabled={isSyncing} className="h-7 text-xs">
                        {isSyncing ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                            <CloudUpload className="h-3 w-3 mr-1" />
                        )}
                        {labels.tapToSync[lang]}
                    </Button>
                )}
            </div>

            {(pendingCount > 0 || failedCount > 0) && (
                <div className="flex items-center gap-3 text-xs">
                    {pendingCount > 0 && (
                        <div className="flex items-center gap-1 text-warning">
                            <CloudUpload className="h-3 w-3" />
                            <span>
                                {pendingCount} {labels.pending[lang]}
                            </span>
                        </div>
                    )}
                    {failedCount > 0 && (
                        <div className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            <span>
                                {failedCount} {labels.failed[lang]}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {!isOnline && (
                <p className="text-xs text-muted-foreground">
                    {lang === "hi"
                        ? "चिंता मत करो, तुम्हारा काम सुरक्षित है। इंटरनेट आने पर भेज दिया जाएगा।"
                        : "Don't worry, your work is saved. It will sync when you're back online."}
                </p>
            )}
        </div>
    );
};
