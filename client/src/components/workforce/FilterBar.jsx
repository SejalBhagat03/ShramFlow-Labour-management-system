import React from 'react';
import { Search, Activity, MapPin, ArrowUpDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export const FilterBar = ({ 
    search, 
    setSearch, 
    statusFilter, 
    setStatusFilter, 
    locationFilter, 
    setLocationFilter, 
    sortOption, 
    setSortOption,
    locations 
}) => {
    return (
        <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search labourers..."
                    className="pl-10 h-10 bg-white border-border rounded-xl text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 h-10 bg-white border-border rounded-xl text-xs font-medium">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-36 h-10 bg-white border-border rounded-xl text-xs font-medium">
                        <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Sites</SelectItem>
                        {locations.map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-36 h-10 bg-white border-border rounded-xl text-xs font-medium">
                        <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="recent">Recent</SelectItem>
                        <SelectItem value="rating">Top Rated</SelectItem>
                        <SelectItem value="rate">Daily Rate</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
};
