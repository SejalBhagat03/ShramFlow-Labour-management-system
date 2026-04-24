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

    return (
        <div
            className={cn(
                "bg-white rounded-xl border border-border p-4 shadow-sm transition-all duration-200 hover:shadow-md cursor-pointer",
                className,
            )}
            onClick={() => onView?.(labour)}
        >
            <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-emerald-50 text-emerald-600 font-bold text-xs">
                        {getInitials(labour.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h3 className="font-semibold text-foreground truncate">
                                {lang === "hi" ? labour.nameHindi : labour.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                                    {t(labour.role?.toLowerCase())}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span>{labour.phone}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <span className="text-sm font-bold text-foreground">₹{labour.dailyRate}</span>
                                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">per day</p>
                            </div>
                            
                            <Badge variant={labour.status === "active" ? "success" : "secondary"} className="h-5 text-[10px] px-2">
                                {labour.status === "active" ? t("active") : t("inactive")}
                            </Badge>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
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
                    </div>
                </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{labour.location}</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    {/* Add any other small metadata here if needed */}
                </div>
            </div>
        </div>
    );
};
