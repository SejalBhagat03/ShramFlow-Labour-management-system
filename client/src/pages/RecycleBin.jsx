import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from '@/components/AppLayout';
import { useTrash } from '@/hooks/useTrash';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
    Trash2, 
    RefreshCcw, 
    Trash, 
    User, 
    ClipboardList, 
    CreditCard, 
    Calendar,
    AlertCircle,
    Search,
    Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * RecycleBin component for managing deleted items.
 * Allows supervisors to restore or permanently delete records.
 */
const RecycleBin = () => {
    const { t } = useTranslation();
    const { trashItems, isLoading, restoreItem, permanentDelete } = useTrash();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');

    const filteredItems = useMemo(() => {
        return trashItems.filter(item => {
            const matchesSearch = item.entity_type.toLowerCase().includes(search.toLowerCase()) ||
                                (item.data?.name?.toLowerCase().includes(search.toLowerCase())) ||
                                (item.data?.task_type?.toLowerCase().includes(search.toLowerCase()));
            const matchesType = filterType === 'all' || item.entity_type === filterType;
            return matchesSearch && matchesType;
        });
    }, [trashItems, search, filterType]);

    const entityTypes = [...new Set(trashItems.map(item => item.entity_type))];

    const getIcon = (type) => {
        switch (type) {
            case 'Labourer': return <User className="h-4 w-4" />;
            case 'WorkEntry': return <ClipboardList className="h-4 w-4" />;
            case 'Payment': return <CreditCard className="h-4 w-4" />;
            default: return <Trash2 className="h-4 w-4" />;
        }
    };

    const handleRestore = (id) => {
        if (confirm('Are you sure you want to restore this item?')) {
            restoreItem.mutate(id);
        }
    };

    const handleDelete = (id) => {
        if (confirm('WARNING: This will permanently delete the record. This action cannot be undone!')) {
            permanentDelete.mutate(id);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Header */}
                <div className="pt-6 pb-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-xl bg-destructive/10 text-destructive">
                            <Trash2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Recycle Bin</h1>
                            <p className="text-muted-foreground text-sm">
                                Manage deleted records. Items can be restored or permanently removed.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-2xl border shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search in trash..."
                            className="pl-10 rounded-xl"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant={filterType === 'all' ? 'default' : 'outline'}
                            size="sm"
                            className="rounded-lg"
                            onClick={() => setFilterType('all')}
                        >
                            All
                        </Button>
                        {entityTypes.map(type => (
                            <Button
                                key={type}
                                variant={filterType === type ? 'default' : 'outline'}
                                size="sm"
                                className="rounded-lg"
                                onClick={() => setFilterType(type)}
                            >
                                {type}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="p-12 text-center space-y-3">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                                <Trash className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                            <h3 className="text-lg font-medium">Your Recycle Bin is empty</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">
                                Items you delete from the directory will appear here for 30 days.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {filteredItems.map((item) => (
                                <div key={item.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                                            {getIcon(item.entity_type)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold truncate">
                                                    {item.data?.name || item.data?.task_type || 'Unnamed Record'}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] py-0 h-4">
                                                    {item.entity_type}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Deleted {new Date(item.deleted_at).toLocaleDateString()}
                                                </div>
                                                <div className="hidden sm:flex items-center gap-1">
                                                    <AlertCircle className="h-3 w-3" />
                                                    ID: {item.entity_id.slice(0, 8)}...
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        className="h-9 w-9 rounded-full text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleRestore(item.id)}
                                                    >
                                                        <RefreshCcw className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Restore</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        size="icon" 
                                                        className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Permanent Delete</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
};

export default RecycleBin;
