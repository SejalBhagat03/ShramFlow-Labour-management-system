import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Shield, Star, AlertTriangle } from "lucide-react";
import { useLabourerTrustScore, getTrustBadgeStyle } from "@/hooks/useTrustScore";

/**
 * TrustScoreBadge component for displaying a labourer's trust and reliability metrics.
 * Supports simple badges or full progress indicators with multi-language support.
 *
 * @param {Object} props - Component properties.
 * @param {string} props.labourerId - Unique identifier for the labourer.
 * @param {boolean} [props.showScore=false] - Whether to show the numeric trust score.
 * @param {boolean} [props.showProgress=false] - Whether to show the progress bar variant.
 * @param {string} [props.size="md"] - Size variant (sm, md, lg).
 * @param {string} [props.className] - Additional CSS classes.
 * @returns {JSX.Element|null} The TrustScoreBadge component.
 */
export const TrustScoreBadge = ({
    labourerId,
    showScore = false,
    showProgress = false,
    size = "md",
    className,
}) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const { data: trustData } = useLabourerTrustScore(labourerId);

    if (!trustData) return null;

    const style = getTrustBadgeStyle(trustData.trust_badge);
    const Icon = trustData.trust_badge === "trusted" ? Star : trustData.trust_badge === "needs_review" ? AlertTriangle : Shield;

    const sizeClasses = {
        sm: "text-xs px-1.5 py-0.5",
        md: "text-sm px-2 py-1",
        lg: "text-base px-3 py-1.5",
    };

    const iconSizes = {
        sm: "h-3 w-3",
        md: "h-4 w-4",
        lg: "h-5 w-5",
    };

    if (showProgress) {
        return (
            <div className={cn("space-y-1", className)}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Icon className={cn(iconSizes[size], style.text)} />
                        <span className={cn("font-medium", style.text)}>{t(style.label_key)}</span>
                    </div>
                    {showScore && <span className={cn("font-bold", style.text)}>{trustData.trust_score}%</span>}
                </div>
                <Progress
                    value={trustData.trust_score}
                    className={cn(
                        "h-2",
                        trustData.trust_badge === "trusted" && "[&>div]:bg-success",
                        trustData.trust_badge === "needs_review" && "[&>div]:bg-destructive",
                        trustData.trust_badge === "normal" && "[&>div]:bg-primary",
                    )}
                />
            </div>
        );
    }

    return (
        <Badge
            variant="outline"
            className={cn("flex items-center gap-1", style.bg, style.text, style.border, sizeClasses[size], className)}
        >
            <Icon className={iconSizes[size]} />
            <span>{t(style.label_key)}</span>
            {showScore && <span className="font-bold ml-1">{trustData.trust_score}</span>}
        </Badge>
    );
};
