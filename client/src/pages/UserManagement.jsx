import React, { useState } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { useTranslation } from 'react-i18next';
import { 
    Users, 
    Shield, 
    Search, 
    MoreVertical, 
    Trash2, 
    UserPlus,
    UserCheck,
    UserX,
    Filter,
    ArrowRightLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/features/shared/components/Pagination';

const UserManagement = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // Fetch Users
    const { data, isLoading } = useQuery({
        queryKey: ['users', page, search],
        queryFn: async () => {
            const response = await axios.get(`/api/users?page=${page}&search=${search}`);
            return response.data;
        },
        keepPreviousData: true
    });

    const users = data?.users || [];
    const pagination = data?.pagination || { total: 0, totalPages: 1 };

    // Mutation: Update Role
    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }) => {
            await axios.patch(`/api/users/${userId}/role`, { role });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            toast.success("User role updated successfully");
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || "Failed to update role");
        }
    });

    // Mutation: Delete User
    const deleteUserMutation = useMutation({
        mutationFn: async (userId) => {
            await axios.delete(`/api/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            toast.success("User deleted successfully");
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || "Failed to delete user");
        }
    });

    const handleRoleChange = (userId, newRole) => {
        updateRoleMutation.mutate({ userId, role: newRole });
    };

    const handleDeleteUser = (userId) => {
        if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            deleteUserMutation.mutate(userId);
        }
    };

    const RoleBadge = ({ role }) => {
        const variants = {
            superadmin: 'bg-rose-500/10 text-rose-600 border-rose-200',
            supervisor: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
            labour: 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
        };
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${variants[role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {role}
            </span>
        );
    };

    return (
        <AppLayout>
            <div className="space-y-8 animate-fade-in pb-10">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-3 border border-rose-200/50 backdrop-blur-md">
                            <Shield className="h-3 w-3" />
                            System Authority
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                            User <span className="text-rose-600">Access Control</span>
                        </h1>
                        <p className="text-slate-500 text-xs md:text-sm font-medium mt-3 flex items-center gap-2">
                            <Users className="h-4 w-4 text-rose-500 shrink-0" />
                            Manage software permissions and administrative roles across the platform.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button className="w-full lg:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black h-11 px-6 rounded-2xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite Admin
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <div className="sm:col-span-1 lg:col-span-3 relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-rose-600 transition-colors" />
                        <Input
                            placeholder="Search by name or email..."
                            className="pl-12 h-12 bg-white border-slate-100 rounded-[1.25rem] text-sm font-medium shadow-soft focus:border-rose-500 focus:ring-rose-500/10 transition-all w-full"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>
                    <div className="glass-strong p-4 rounded-[1.25rem] flex items-center gap-3 shadow-soft border border-white/50">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                            <Filter className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Users</p>
                            <p className="text-lg font-black text-slate-900 truncate">{pagination.total}</p>
                        </div>
                    </div>
                </div>

                {/* Table - Responsive View */}
                <div className="glass-strong rounded-[2rem] shadow-soft overflow-hidden border border-white/40">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                                    <TableHead className="pl-6 md:pl-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity</TableHead>
                                    <TableHead className="py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Role</TableHead>
                                    <TableHead className="hidden md:table-cell py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization</TableHead>
                                    <TableHead className="hidden lg:table-cell py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</TableHead>
                                    <TableHead className="pr-6 md:pr-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={5} className="py-8 px-6 md:px-8"><Skeleton className="h-10 w-full rounded-xl" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : users.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center opacity-30">
                                                <UserX className="h-12 w-12 mb-4" />
                                                <p className="font-black text-sm uppercase tracking-widest">No matching users found</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="pl-6 md:pl-8 py-5">
                                                <div className="flex flex-col">
                                                    <p className="font-black text-slate-900 text-sm tracking-tight truncate max-w-[120px] md:max-w-none">{u.name}</p>
                                                    <p className="text-[10px] md:text-[11px] text-slate-400 font-medium truncate max-w-[120px] md:max-w-none">{u.email}</p>
                                                </div>
                                            </td>
                                            <td className="py-5 text-center">
                                                <RoleBadge role={u.role} />
                                            </td>
                                            <td className="hidden md:table-cell py-5">
                                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                                    {u.organization_id ? `${u.organization_id.substring(0, 8)}...` : 'N/A'}
                                                </span>
                                            </td>
                                            <td className="hidden lg:table-cell py-5">
                                                <span className="text-[11px] font-bold text-slate-400">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="pr-6 md:pr-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-1 md:gap-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 md:h-9 px-2 md:px-3 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all">
                                                                <ArrowRightLeft className="h-3 md:h-3.5 w-3 md:w-3.5 mr-1 md:mr-2" />
                                                                <span className="hidden xs:inline">Role</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-2 w-48">
                                                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-2">Select Access Level</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleRoleChange(u.id, 'superadmin')} className="rounded-xl focus:bg-rose-50 focus:text-rose-600 text-[10px] font-black uppercase tracking-widest p-3">
                                                                <Shield className="h-3.5 w-3.5 mr-2" />
                                                                Super Admin
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleRoleChange(u.id, 'supervisor')} className="rounded-xl focus:bg-indigo-50 focus:text-indigo-600 text-[10px] font-black uppercase tracking-widest p-3">
                                                                <UserCheck className="h-3.5 w-3.5 mr-2" />
                                                                Supervisor
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleRoleChange(u.id, 'labour')} className="rounded-xl focus:bg-emerald-50 focus:text-emerald-600 text-[10px] font-black uppercase tracking-widest p-3">
                                                                <Users className="h-3.5 w-3.5 mr-2" />
                                                                Labour
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 md:h-9 w-8 md:w-9 rounded-lg md:rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        onClick={() => handleDeleteUser(u.id)}
                                                    >
                                                        <Trash2 className="h-3.5 md:h-4 w-3.5 md:w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <Pagination 
                    currentPage={page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                    isLoading={isLoading}
                />
            </div>
        </AppLayout>
    );
};

export default UserManagement;
