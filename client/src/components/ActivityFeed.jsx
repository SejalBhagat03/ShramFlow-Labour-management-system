import { cn } from '@/lib/utils';
import { useTranslation } from "react-i18next";

export const ActivityFeed = ({ activities, className }) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor(diff / (1000 * 60));

        if (minutes < 60) return `${minutes}${t("m_ago")}`;
        if (hours < 24) return `${hours}${t("h_ago")}`;
        return date.toLocaleDateString();
    };

    const typeConfig = {
        work: { dot: 'bg-emerald-500', border: 'hover:border-emerald-200' },
        payment: { dot: 'bg-emerald-600', border: 'hover:border-emerald-200' },
        flag: { dot: 'bg-amber-500', border: 'hover:border-amber-200' },
        labour: { dot: 'bg-blue-500', border: 'hover:border-blue-200' },
    };

    return (
        <div className={cn('space-y-3', className)}>
            {activities.map((activity, index) => (
                <div
                    key={activity.id}
                    className={cn(
                        'flex items-start gap-4 rounded-xl border border-border bg-white p-4',
                        'transition-all duration-200 hover:shadow-sm',
                        typeConfig[activity.type]?.border || 'hover:border-emerald-200'
                    )}
                >
                    <div className="relative pt-1 shrink-0">
                        <span className="text-xl">{activity.icon}</span>
                        <div className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-white',
                            typeConfig[activity.type]?.dot || 'bg-emerald-500'
                        )} />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">
                            {lang === 'hi' ? activity.messageHindi : activity.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-wider">
                            {formatTime(activity.timestamp)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};
