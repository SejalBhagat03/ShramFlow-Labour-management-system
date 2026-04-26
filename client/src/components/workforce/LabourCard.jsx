import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    MapPin, 
    Phone, 
    MoreVertical, 
    Mail, 
    MessageCircle,
    IndianRupee,
    Pencil,
    Trash2,
    Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { generateWhatsAppLink, whatsappTemplates } from '@/utils/whatsapp';
import { TrustBadge } from './TrustBadge';

const AVATAR_COLORS = [
    { bg: 'bg-indigo-100/50', text: 'text-indigo-600' },
    { bg: 'bg-rose-100/50', text: 'text-rose-600' },
    { bg: 'bg-amber-100/50', text: 'text-amber-600' },
    { bg: 'bg-sky-100/50', text: 'text-sky-600' },
    { bg: 'bg-violet-100/50', text: 'text-violet-600' },
    { bg: 'bg-emerald-100/50', text: 'text-emerald-600' },
];

const getAvatarColor = (name) => {
    const index = name.length % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
};

export const LabourCard = ({ labour, lang, onEdit, onDelete }) => {
    const navigate = useNavigate();
    const colors = getAvatarColor(labour.name);

    return (
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm hover:border-emerald-200 transition-all group relative">
            {/* Top Row: Avatar & More Menu */}
            <div className="flex items-start justify-between mb-4">
                <div className="relative">
                    <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border border-border shadow-sm",
                        colors.bg,
                        colors.text
                    )}>
                        {labour.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Status Dot */}
                    <div className={cn(
                        "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white",
                        labour.status === 'active' ? "bg-emerald-500" : "bg-red-500"
                    )} />
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl shadow-xl border-border p-1">
                        <DropdownMenuItem onClick={() => navigate(`/labourers/${labour.id}`)} className="rounded-lg gap-2 font-medium">
                            <Eye className="h-4 w-4" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(labour)} className="rounded-lg gap-2 font-medium">
                            <Pencil className="h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/payments?labour=${labour.id}`)} className="rounded-lg gap-2 font-medium">
                            <IndianRupee className="h-4 w-4" /> Make Payment
                        </DropdownMenuItem>
                        <div className="h-px bg-border my-1" />
                        <DropdownMenuItem onClick={() => onDelete?.(labour)} className="rounded-lg gap-2 font-medium text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Identity Section */}
            <div className="mb-4">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-foreground text-lg tracking-tight truncate">
                        {lang === 'hi' && labour.name_hindi ? labour.name_hindi : labour.name}
                    </h3>
                    <TrustBadge score={labour.trust_score || 0} />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                    Labourer • {labour.phone || 'No Contact'}
                </p>
            </div>

            {/* Info Box */}
            <div className="bg-muted/30 rounded-xl p-4 mb-4 grid grid-cols-2 gap-4 border border-border/50">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Site</p>
                    <p className="text-xs font-bold text-foreground truncate">
                        {labour.location || 'General'}
                    </p>
                </div>
                <div className="space-y-1 border-l border-border pl-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Daily Rate</p>
                    <p className="text-xs font-bold text-foreground">
                        ₹{labour.daily_rate || 500}
                    </p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-xl h-9 font-bold text-xs border-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                    onClick={() => navigate(`/labourers/${labour.id}`)}
                >
                    View Details
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100"
                    onClick={() => window.open(generateWhatsAppLink(labour.phone, whatsappTemplates.paymentConfirmation({ name: labour.name })), '_blank')}
                >
                    <MessageCircle className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};
