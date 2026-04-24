import React, { useState } from 'react';
import { Bell, Mail, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const getIcon = (type) => {
    switch (type) {
        case 'success': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
        case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
        case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
        default: return <Info className="h-4 w-4 text-primary" />;
    }
};

export const NotificationBell = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    const handleNotificationClick = (n) => {
        if (!n.read) markAsRead.mutate(n.id);
        if (n.action_url) {
            navigate(n.action_url);
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-primary/5 transition-colors">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in zoom-in duration-300 shadow-glow">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 rounded-2xl shadow-2xl glass-strong border-white/20" align="end">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="font-bold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[10px] h-7 px-2 hover:bg-primary/10 text-primary font-bold"
                            onClick={() => markAllAsRead.mutate()}
                        >
                            Mark all as read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-80">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                            <Mail className="h-8 w-8 text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">All caught up!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={cn(
                                        "p-4 cursor-pointer transition-colors hover:bg-primary/5 group relative",
                                        !n.read && "bg-primary/10"
                                    )}
                                >
                                    {!n.read && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                                    )}
                                    <div className="flex gap-3">
                                        <div className="mt-0.5">
                                            {getIcon(n.type)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className={cn("text-xs leading-none", !n.read ? "font-bold" : "font-medium")}>
                                                {n.title}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                                                {n.message}
                                            </p>
                                            <p className="text-[9px] text-muted-foreground/60 uppercase font-bold tracking-tighter">
                                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t border-white/5 bg-muted/20">
                    <Button variant="ghost" className="w-full h-8 text-[10px] font-bold text-muted-foreground hover:text-foreground">
                        View All Activity
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};
