import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppLayout } from "@/components/AppLayout";
import { useWorkEntries } from "@/hooks/useWorkEntries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, X, MessageSquare, Calendar, MapPin, User, Loader2 } from "lucide-react";

const Flagged = () => {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [comment, setComment] = useState("");

    const { workEntries, isLoading, approveWorkEntry } = useWorkEntries();
    const flaggedEntries = workEntries.filter((e) => e.status === "flagged");

    const handleResolve = (entryId) => {
        // Just generic resolve for now, could be a specific status
        approveWorkEntry.mutate(entryId);
    };

    const handleFalsePositive = (entryId) => {
        approveWorkEntry.mutate(entryId);
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 md:space-y-6">
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-white/10 border-b text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                                <span className="text-[10px] uppercase font-bold tracking-wider text-white/70">Security & Fraud Review</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-white flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 md:h-6 md:w-6 text-destructive" />
                                {t("flaggedReview")}
                            </h1>
                            <p className="text-white/80 mt-1 text-xs sm:text-sm md:text-base font-medium">
                                {isLoading ? 'System check in progress...' : `${flaggedEntries.length} items require immediate attention`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-6">

                    {/* Alert Banner */}
                    {flaggedEntries.length > 0 && (
                        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-medium text-foreground">Fraud Detection Active</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    These entries were flagged by our automated fraud detection system. Please review each entry carefully
                                    before taking action.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Flagged Entries */}
                    <div className="space-y-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : flaggedEntries.map((entry, index) => (
                            <div
                                key={entry.id}
                                className="bg-card rounded-xl border border-destructive/20 p-5 shadow-card animate-slide-up"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="flex flex-col lg:flex-row gap-4">
                                    {/* Entry Details */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-foreground">{entry.labourer?.name || 'Labourer'}</h3>
                                                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                                        Flagged
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-primary font-medium mt-1">{entry.task_type}</p>
                                            </div>
                                            <p className="text-xl font-bold text-foreground">₹{(entry.amount || 0).toLocaleString()}</p>
                                        </div>

                                        <p className="text-sm text-muted-foreground">{entry.description}</p>

                                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {entry.date}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="h-3.5 w-3.5" />
                                                {entry.location || 'Site'}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <User className="h-3.5 w-3.5" />
                                                {entry.meters || entry.hours || 0} units reported
                                            </div>
                                        </div>

                                        {/* Flag Reason */}
                                        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                                            <div className="flex items-center gap-2 text-destructive mb-1">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span className="font-medium text-sm">{t("reason")}</span>
                                            </div>
                                            <p className="text-sm text-foreground">{entry.flag_reason || 'Automated fraud detection'}</p>
                                        </div>

                                        {/* Add Comment */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <MessageSquare className="h-4 w-4" />
                                                <span>{t("addComment")}</span>
                                            </div>
                                            <Textarea
                                                placeholder="Add a note about your decision..."
                                                className="min-h-20"
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex lg:flex-col gap-2 lg:w-40">
                                        <Button className="flex-1 bg-success hover:bg-success/90" onClick={() => handleFalsePositive(entry.id)} disabled={approveWorkEntry.isLoading}>
                                            {approveWorkEntry.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                            {t("falsePositive")}
                                        </Button>
                                        <Button variant="outline" className="flex-1" onClick={() => handleResolve(entry.id)}>
                                            {t("resolve")}
                                        </Button>
                                        <Button variant="destructive" className="flex-1">
                                            <X className="h-4 w-4 mr-2" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {flaggedEntries.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="h-8 w-8 text-success" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">All Clear!</h3>
                            <p className="text-muted-foreground mt-1">No flagged entries to review.</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
};

export default Flagged;
