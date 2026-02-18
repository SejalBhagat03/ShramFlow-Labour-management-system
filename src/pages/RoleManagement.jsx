import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Users, Search, Loader2, UserCog, AlertTriangle } from "lucide-react";

/**
 * RoleManagement page component for supervisors to manage user roles within the application.
 * Allows switching users between 'supervisor' and 'labour' roles.
 *
 * @returns {JSX.Element} The RoleManagement page component.
 */
const RoleManagement = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState(null);
    const [newRole, setNewRole] = useState("labour");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    /**
     * Fetches all users with their associated roles and profiles from Supabase.
     */
    const { data: usersWithRoles = [], isLoading } = useQuery({
        queryKey: ["users-with-roles"],
        queryFn: async () => {
            // Get all user roles
            const { data: roles, error: rolesError } = await supabase.from("user_roles").select("*");

            if (rolesError) throw rolesError;

            // Get all profiles
            const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*");

            if (profilesError) throw profilesError;

            // Combine roles with profiles data
            const usersWithRolesMapped = roles.map((role) => {
                const profile = profiles.find((p) => p.user_id === role.user_id);
                return {
                    id: role.id,
                    user_id: role.user_id,
                    role: role.role,
                    profile: profile
                        ? {
                            full_name: profile.full_name,
                            phone: profile.phone,
                        }
                        : null,
                };
            });

            return usersWithRolesMapped;
        },
        enabled: !!user && user.role === "supervisor",
    });

    /**
     * Mutation to update a user's role in the database.
     */
    const updateRoleMutation = useMutation({
        mutationFn: async ({ userId, role }) => {
            const { error } = await supabase.from("user_roles").update({ role }).eq("user_id", userId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
            toast({
                title: "Role Updated",
                description: `User role has been changed to ${newRole}`,
            });
            setIsDialogOpen(false);
            setSelectedUser(null);
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    /**
     * Initiates the role change process by opening a confirmation dialog.
     *
     * @param {Object} userWithRole - The user whose role is to be changed.
     */
    const handleRoleChangeInitiation = (userWithRole) => {
        setSelectedUser(userWithRole);
        setNewRole(userWithRole.role === "supervisor" ? "labour" : "supervisor");
        setIsDialogOpen(true);
    };

    /**
     * Confirms and executes the role change.
     */
    const confirmRoleChange = () => {
        if (selectedUser) {
            updateRoleMutation.mutate({ userId: selectedUser.user_id, role: newRole });
        }
    };

    /**
     * Filter users based on search term for name or phone number.
     */
    const filteredUsers = usersWithRoles.filter((u) => {
        const name = u.profile?.full_name?.toLowerCase() || "";
        const phone = u.profile?.phone?.toLowerCase() || "";
        const search = searchTerm.toLowerCase();
        return name.includes(search) || phone.includes(search);
    });

    // Calculate user counts by role for dashboard view
    const supervisorCount = usersWithRoles.filter((u) => u.role === "supervisor").length;
    const labourCount = usersWithRoles.filter((u) => u.role === "labour").length;

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        Role Management
                    </h1>
                    <p className="text-muted-foreground">Manage user roles and permissions securely</p>
                </div>

                {/* Stats Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{usersWithRoles.length}</p>
                                    <p className="text-sm text-muted-foreground">Total Users</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                    <UserCog className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{supervisorCount}</p>
                                    <p className="text-sm text-muted-foreground">Supervisors</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{labourCount}</p>
                                    <p className="text-sm text-muted-foreground">Labour Users</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* User Management List Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>All Users</CardTitle>
                        <CardDescription>Click on a user's role to change it</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Search Filter Input */}
                        <div className="mb-4">
                            <div className="relative max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or phone..."
                                    className="pl-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                {searchTerm ? "No users found matching your search" : "No users found"}
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Current Role</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((userWithRole) => {
                                            const isCurrentUser = userWithRole.user_id === user?.id;

                                            return (
                                                <TableRow key={userWithRole.id}>
                                                    <TableCell className="font-medium">
                                                        {userWithRole.profile?.full_name || "Unknown"}
                                                        {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">(You)</span>}
                                                    </TableCell>
                                                    <TableCell>{userWithRole.profile?.phone || "—"}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={userWithRole.role === "supervisor" ? "default" : "secondary"}
                                                            className={
                                                                userWithRole.role === "supervisor"
                                                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                                                    : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                                            }
                                                        >
                                                            {userWithRole.role === "supervisor" ? "Supervisor" : "Labour"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRoleChangeInitiation(userWithRole)}
                                                            disabled={isCurrentUser}
                                                            title={isCurrentUser ? "You cannot change your own role" : "Change role"}
                                                        >
                                                            Change Role
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Role Change Confirmation Dialog */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Confirm Role Change
                            </DialogTitle>
                            <DialogDescription>
                                You are about to change the role for this user. This will affect their access permissions.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>User</Label>
                                <p className="text-foreground font-medium">{selectedUser?.profile?.full_name || "Unknown User"}</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Current Role</Label>
                                <Badge
                                    variant="secondary"
                                    className={
                                        selectedUser?.role === "supervisor"
                                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                            : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                    }
                                >
                                    {selectedUser?.role === "supervisor" ? "Supervisor" : "Labour"}
                                </Badge>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="newRole">New Role</Label>
                                <Select value={newRole} onValueChange={(v) => setNewRole(v)}>
                                    <SelectTrigger id="newRole">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                        <SelectItem value="labour">Labour</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {newRole === "supervisor" && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <p className="text-sm text-amber-700 dark:text-amber-400">
                                        <strong>Warning:</strong> Supervisors have full access to manage labourers, work entries, payments,
                                        and can change other users' roles.
                                    </p>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={confirmRoleChange} disabled={updateRoleMutation.isPending} className="gradient-primary">
                                {updateRoleMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Confirm Change"
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
};

export default RoleManagement;
