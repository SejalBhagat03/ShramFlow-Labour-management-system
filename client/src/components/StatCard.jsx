import { cn } from "@/lib/utils";

/**
 * StatCard component for displaying key performance indicators and statistics.
 * Features various visual variants and optional trend indicators.
 *
 * @param {Object} props - Component properties.
 * @param {string} props.title - The statistic title.
 * @param {string|number} props.value - The statistic value.
 * @param {React.ElementType} props.icon - Lucide icon component.
 * @param {Object} [props.trend] - Optional trend data (positive/negative value).
 * @param {string} [props.variant="default"] - Visual variant (default, primary, warning, success).
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {JSX.Element} The StatCard component.
 */
export const StatCard = ({ title, value, icon: Icon, trend, variant = "default", className }) => {
    const variants = {
        default: "bg-card gradient-card border-border/50",
        primary: "gradient-primary border-primary/20",
        warning: "bg-gradient-to-br from-warning/5 via-warning/10 to-warning/5 border-warning/30",
        success: "bg-gradient-to-br from-success/5 via-success/10 to-success/5 border-success/30",
    };

    const iconVariants = {
        default: "bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-glow-sm",
        primary: "bg-primary-foreground/20 text-primary-foreground backdrop-blur-sm",
        warning: "bg-gradient-to-br from-warning/25 to-warning/10 text-warning",
        success: "bg-gradient-to-br from-success/25 to-success/10 text-success",
    };

    const textVariants = {
        default: "text-foreground",
        primary: "text-primary-foreground",
        warning: "text-foreground",
        success: "text-foreground",
    };

    return (
        <div
            className={cn(
                "relative group rounded-2xl border p-5 shadow-card transition-all duration-300",
                "hover:shadow-lg hover:-translate-y-0.5",
                "animate-fade-in overflow-hidden",
                variants[variant],
                className,
            )}
        >
            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                    <p
                        className={cn(
                            "text-sm font-medium tracking-wide",
                            variant === "primary" ? "text-primary-foreground/80" : "text-muted-foreground",
                        )}
                    >
                        {title}
                    </p>
                    <p className={cn("text-3xl font-bold tracking-tight", textVariants[variant])}>{value}</p>
                    {trend && (
                        <div
                            className={cn(
                                "inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                                trend.positive ? "text-success bg-success/10" : "text-destructive bg-destructive/10",
                            )}
                        >
                            <span className="text-sm">{trend.positive ? "↑" : "↓"}</span>
                            {Math.abs(trend.value)}% from yesterday
                        </div>
                    )}
                </div>
                <div
                    className={cn(
                        "rounded-xl p-3.5 transition-transform duration-300 group-hover:scale-110",
                        iconVariants[variant],
                    )}
                >
                    <Icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
            </div>
        </div>
    );
};
