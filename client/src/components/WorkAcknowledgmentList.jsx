import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useMyAcknowledgments, useAcknowledgeWork } from "@/hooks/useWorkClaims";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Calendar, Ruler } from "lucide-react";

export const WorkAcknowledgmentList = ({
    labourerId,
}) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const { data: acknowledgments = [], isLoading } = useMyAcknowledgments(labourerId);
    const acknowledgeWork = useAcknowledgeWork();

    const [selectedAck, setSelectedAck] = useState(null);
    const [disputeReason, setDisputeReason] = useState("");
    const [showDisputeDialog, setShowDisputeDialog] = useState(false);

    const handleConfirm = async (ackId) => {
        await acknowledgeWork.mutateAsync({
            acknowledgmentId: ackId,
            labourerId,
            status: "confirmed",
        });
    };

    const handleDispute = async () => {
        if (!selectedAck || !disputeReason.trim()) return;

        await acknowledgeWork.mutateAsync({
            acknowledgmentId: selectedAck.id,
            labourerId,
            status: "disputed",
            disputeReason: disputeReason.trim(),
        });

        setShowDisputeDialog(false);
        setSelectedAck(null);
        setDisputeReason("");
    };

    const openDisputeDialog = (ack) => {
        setSelectedAck(ack);
        setShowDisputeDialog(true);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (acknowledgments.length === 0) {
        return null;
    }

    return (
        <>
            <Card className="shadow-card border-warning/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning" />
                        {t("pendingConfirmations")}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        {t("confirmSupervisorEntries")}
                    </p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {acknowledgments.map((ack) => {
                        const workEntry = ack.daily_work_register;

                        return (
                            <div key={ack.id} className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {new Date(workEntry?.date).toLocaleDateString("en-IN", {
                                                weekday: "short",
                                                day: "numeric",
                                                month: "short",
                                            })}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Ruler className="h-4 w-4 text-primary" />
                                            <span className="text-lg font-bold">{workEntry?.meters || 0}m</span>
                                            <span className="text-muted-foreground">→</span>
                                            <span className="text-lg font-bold text-success">
                                                ₹{Number(workEntry?.calculated_amount || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                        {t("pending")}
                                    </Badge>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-success hover:bg-success/90"
                                        onClick={() => handleConfirm(ack.id)}
                                        disabled={acknowledgeWork.isPending}
                                    >
                                        {acknowledgeWork.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                {t("confirm")}
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={() => openDisputeDialog(ack)}
                                        disabled={acknowledgeWork.isPending}
                                    >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        {t("dispute")}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* Dispute Dialog */}
            <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader className="p-4 md:px-6 md:pt-6 border-b">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            {t("raiseDispute")}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {t("disputeDescription")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="overflow-y-auto max-h-[60vh] p-4 md:p-6 space-y-4">
                        {selectedAck && (
                            <div className="p-3 rounded-xl bg-muted/50 border border-border/40">
                                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 mb-1">{t("supervisorRecorded")}</p>
                                <p className="font-bold text-lg">{selectedAck.daily_work_register?.meters || 0}m</p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">{t("reason")}</Label>
                            <Textarea
                                placeholder={t("resolutionNotesPlaceholder")}
                                value={disputeReason}
                                onChange={(e) => setDisputeReason(e.target.value)}
                                className="min-h-[100px] text-sm resize-none"
                            />
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-white border-t pt-3 pb-2 px-4 md:px-6 flex justify-end gap-3 z-10">
                        <Button variant="outline" size="sm" onClick={() => setShowDisputeDialog(false)}>
                            {t("cancel")}
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleDispute}
                            className="px-6"
                            disabled={!disputeReason.trim() || acknowledgeWork.isPending}
                        >
                            {acknowledgeWork.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                t("submitDispute")
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
