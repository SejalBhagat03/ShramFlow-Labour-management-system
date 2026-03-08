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

    const typeColors = {
        work: 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40',
        payment: 'bg-gradient-to-br from-success/10 to-success/5 border-success/20 hover:border-success/40',
        flag: 'bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20 hover:border-warning/40',
        labour: 'bg-gradient-to-br from-accent to-accent/50 border-accent-foreground/10 hover:border-accent-foreground/20',
    };

    const dotColors = {
        work: 'bg-primary',
        payment: 'bg-success',
        flag: 'bg-warning',
        labour: 'bg-accent-foreground',
    };

    return (
        <div className={cn('space-y-4', className)}>
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-foreground">{t('activityFeed')}</h3>
                <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
            </div>

            <div className="space-y-3">
                {activities.map((activity, index) => (
                    <div
                        key={activity.id}
                        className={cn(
                            'group relative flex items-start gap-4 rounded-xl border p-4',
                            'transition-all duration-300 hover:shadow-md hover:-translate-y-0.5',
                            'animate-slide-up cursor-default',
                            typeColors[activity.type]
                        )}
                        style={{ animationDelay: `${index * 60}ms` }}
                    >
                        {/* Activity indicator line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Icon with pulse effect */}
                        <div className="relative">
                            <span className="text-2xl filter drop-shadow-sm">{activity.icon}</span>
                            <div className={cn(
                                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-card',
                                dotColors[activity.type]
                            )} />
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                            <p className="text-sm font-medium text-foreground leading-relaxed">
                                {lang === 'hi' ? activity.messageHindi : activity.message}
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">
                                {formatTime(activity.timestamp)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
