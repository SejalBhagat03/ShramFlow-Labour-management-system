import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Banknote, Smartphone, Building2 } from "lucide-react";
import { notificationService } from "@/services/notificationService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Dialog to approve an advance request and record the payment.
 */
export function ApproveAdvanceDialog({ open, onOpenChange, request, onSuccess }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [method, setMethod] = useState("cash");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

    if (!request) return null;

    // Extract amount from message or request object (if passed fully)
    // Assuming request object has { id, amount, labourer_name } or similar
    // For now, let's assume the notification object has metadata or we parse the message
    // ACTUALLY, the notification doesn't have the amount directly in structured form usually.
    // BUT we can pass the full request object if we fetched it, OR we can parse it.
    // Let's assume the parent component passes a `request` object that includes:
    // { id (notification_id), advanceRequestId, amount, labourerName }
    // IF we only have notification, we might need to fetch the request first.
    // Let's assume 'request' PROP here is the ADVANCE REQUEST object, NOT the notification.

    const handleApprove = async () => {
        setLoading(true);
        try {
            const result = await notificationService.approveAdvance({
                requestId: request.id, // This must be the advance_request ID
                paymentMethod: method,
                paymentDate: date,
                supervisorId: user.id
            });

            if (result.success) {
                toast({ title: "Approved", description: "Advance approved and payment recorded." });
                onSuccess?.();
                onOpenChange(false);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error("Approval failed:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to approve advance.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Approve Advance Request</DialogTitle>
                    <DialogDescription>
                        Confirm approval for <strong>{request.labourer?.name}</strong>.
                        This will automatically record a payment of <strong>₹{request.amount}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">
                                    <div className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Cash</div>
                                </SelectItem>
                                <SelectItem value="upi">
                                    <div className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> UPI</div>
                                </SelectItem>
                                <SelectItem value="bank">
                                    <div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Bank Transfer</div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Payment Date</Label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleApprove} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm & Pay
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
