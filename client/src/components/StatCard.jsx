import React from "react";
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
export const StatCard = React.memo(({ title, value, icon: Icon, trend, className }) => {
    return (
        <div
            className={cn(
                "bg-white rounded-2xl border border-border p-6 shadow-sm transition-all duration-200 hover:border-emerald-200",
                className,
            )}
        >
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {title}
                    </p>
                    <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
                    
                    {trend && (
                        <div className="mt-2 flex items-center gap-1.5">
                            <span className={cn(
                                "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                                trend.positive ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                            )}>
                                {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}%
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">vs last week</span>
                        </div>
                    )}
                </div>
                
                <div className="rounded-xl p-2 bg-emerald-50 text-emerald-600">
                    <Icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
            </div>
        </div>
    );
});
