import { useState, useEffect } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationService } from "@/services/notificationService";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ApproveAdvanceDialog } from "./ApproveAdvanceDialog";

export function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Initial fetch
        const fetchNotifications = async () => {
            try {
                const data = await notificationService.getNotifications(user.id);
                if (data) {
                    setNotifications(data);
                    setUnreadCount(data.filter((n) => !n.read).length);
                }
            } catch (error) {
                if (import.meta.env.DEV) console.error("Failed to load notifications", error);
            }
        };

        fetchNotifications();

        // Real-time subscription
        const channel = notificationService.subscribeToNotifications(user.id, (payload) => {
            // Add new notification to top
            setNotifications((prev) => [payload.new, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Optional: Play a sound or show a toast
            const audio = new Audio("/notification.mp3"); // Ensure this file exists or use a reliable URL
            audio.play().catch(e => {
                if (import.meta.env.DEV) console.log("Audio play failed", e);
            });
        });

        return () => {
            channel.unsubscribe();
        };
    }, [user]);

    const handleMarkAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            if (import.meta.env.DEV) console.error("Failed to mark as read", error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            if (!user) return;
            await notificationService.markAllAsRead(user.id);
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            if (import.meta.env.DEV) console.error("Failed to mark all as read", error);
        }
    };

    const [actingNotification, setActingNotification] = useState(null);
    const [approvalRequest, setApprovalRequest] = useState(null);
    const [isApproveOpen, setIsApproveOpen] = useState(false);

    const handleApproveClick = (notification, e) => {
        e.stopPropagation(); // Prevent marking as read or closing dropdown immediately
        // Construct request object from metadata
        if (notification.metadata?.request_id) {
            setActingNotification(notification);
            setApprovalRequest({
                id: notification.metadata.request_id,
                amount: notification.metadata.amount,
                labourer: { name: notification.metadata.labourer_name || 'Unknown' }
            });
            setIsApproveOpen(true);
            setIsOpen(false); // Close dropdown
        }
    };

    const handleApprovalSuccess = () => {
        // Mark the specific acting notification as read/handled
        if (actingNotification) {
            handleMarkAsRead(actingNotification.id);
        }
        setApprovalRequest(null);
        setActingNotification(null);
    };

    return (
        <>
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                        <Bell className={cn("h-5 w-5", unreadCount > 0 && "text-primary animate-pulse")} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-bounce" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                    <div className="flex items-center justify-between px-2 py-1.5">
                        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-6 px-2 text-muted-foreground hover:text-primary"
                                onClick={handleMarkAllRead}
                            >
                                Mark all read
                            </Button>
                        )}
                    </div>
                    <DropdownMenuSeparator />
                    <div className="max-h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                                No notifications
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className={cn(
                                        "flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-accent relative",
                                        !notification.read ? "bg-muted/40" : "opacity-70 grayscale-[0.3]"
                                    )}
                                    onClick={() => handleMarkAsRead(notification.id)}
                                >
                                    <div className="flex w-full justify-between gap-2">
                                        <span className={cn("font-medium text-sm", !notification.read && "text-primary")}>
                                            {notification.title}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {notification.message}
                                    </p>

                                    {/* Action Buttons for Payment Requests */}
                                    {notification.type === 'payment_request' && notification.metadata?.request_id && (
                                        <div className="mt-2 flex gap-2 w-full">
                                            {notification.read ? (
                                                <Badge variant="outline" className="w-full justify-center bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-1">
                                                    <Check className="h-3 w-3" /> Approved & Handled
                                                </Badge>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="w-full text-xs h-7 bg-emerald-600 hover:bg-emerald-700"
                                                    onClick={(e) => handleApproveClick(notification, e)}
                                                >
                                                    Approve
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {!notification.read && (
                                        <div className="w-2 h-2 rounded-full bg-primary absolute right-2 top-1/2 -translate-y-1/2 opacity-50" />
                                    )}
                                </DropdownMenuItem>
                            ))
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <ApproveAdvanceDialog
                open={isApproveOpen}
                onOpenChange={setIsApproveOpen}
                request={approvalRequest}
                onSuccess={handleApprovalSuccess}
            />
        </>
    );
}
