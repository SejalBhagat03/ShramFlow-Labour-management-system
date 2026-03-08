import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, MoreVertical, Edit, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const LabourCard = ({ labour, onEdit, onDelete, onView, className }) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;

    const getInitials = (name) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const roleColors = {
        Mason: "bg-primary/10 text-primary",
        Helper: "bg-muted text-muted-foreground",
        Painter: "bg-success/10 text-success",
        Electrician: "bg-warning/10 text-warning",
        Plumber: "bg-accent text-accent-foreground",
        Carpenter: "bg-secondary text-secondary-foreground",
    };

    return (
        <div
            className={cn(
                "bg-card rounded-xl border p-4 shadow-card transition-all duration-200 hover:shadow-lg cursor-pointer animate-scale-in",
                className,
            )}
            onClick={() => onView?.(labour)}
        >
            <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(labour.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="font-semibold text-foreground truncate">
                                {lang === "hi" ? labour.nameHindi : labour.name}
                            </h3>
                            <Badge variant="secondary" className={cn("mt-1 text-xs", roleColors[labour.role] || "bg-muted")}>
                                {t(labour.role?.toLowerCase())}
                            </Badge>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit?.(labour);
                                    }}
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t("edit")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete?.(labour);
                                    }}
                                    className="text-destructive"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t("delete")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{labour.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{labour.location}</span>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">₹{labour.dailyRate}/day</span>
                        <Badge variant={labour.status === "active" ? "default" : "secondary"}>
                            {labour.status === "active" ? t("active") : t("inactive")}
                        </Badge>
                    </div>
                </div>
            </div>
        </div>
    );
};
