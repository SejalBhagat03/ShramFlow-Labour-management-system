import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
    const { t } = useTranslation();
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
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 md:space-y-6">
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-white/10 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">{t("accessControl")}</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                                <Shield className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                                {t("roleManagement")}
                            </h1>
                            <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base font-medium">
                                {t("roleManagementDesc")} • {t("regionalAdministration")}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 bg-background/50 backdrop-blur-md p-1.5 rounded-xl border shadow-sm">
                            <div className="px-3 py-1 border-r last:border-0 text-center">
                                <p className="text-lg font-black text-foreground">{usersWithRoles.length}</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Total</p>
                            </div>
                            <div className="px-3 py-1 border-r last:border-0 text-blue-600 text-center">
                                <p className="text-lg font-black">{supervisorCount}</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Admins</p>
                            </div>
                            <div className="px-3 py-1 text-green-600 text-center">
                                <p className="text-lg font-black">{labourCount}</p>
                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Labour</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-6">

                    {/* User Management List Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("allUsers")}</CardTitle>
                            <CardDescription>{t("clickToChangeRole")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* Search Filter Input */}
                            <div className="mb-4">
                                <div className="relative max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t("searchByNameOrPhone")}
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
                                                <TableHead>{t("fullName")}</TableHead>
                                                <TableHead>{t("phone")}</TableHead>
                                                <TableHead>{t("currentRole")}</TableHead>
                                                <TableHead className="text-right">{t("actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredUsers.map((userWithRole) => {
                                                const isCurrentUser = userWithRole.user_id === user?.id;

                                                return (
                                                    <TableRow key={userWithRole.id}>
                                                        <TableCell className="font-medium">
                                                            {userWithRole.profile?.full_name || t("unknown")}
                                                            {isCurrentUser && <span className="ml-2 text-xs text-muted-foreground">({t("you")})</span>}
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
                                                                title={isCurrentUser ? t("cannotChangeOwnRole") : t("changeRole")}
                                                            >
                                                                {t("changeRole")}
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
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader className="p-4 md:px-6 md:pt-6 border-b">
                                <DialogTitle className="flex items-center gap-2 text-lg">
                                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                                    {t("confirmRoleChange")}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    {t("roleChangeWarning")}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="overflow-y-auto max-h-[60vh] p-4 md:p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t("user")}</Label>
                                    <p className="text-sm font-bold text-foreground">{selectedUser?.profile?.full_name || t("unknownUser")}</p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">{t("currentRole")}</Label>
                                    <div>
                                        <Badge
                                            variant="secondary"
                                            className={cn(
                                                "text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider",
                                                selectedUser?.role === "supervisor"
                                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                                    : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                            )}
                                        >
                                            {selectedUser?.role === "supervisor" ? "Supervisor" : "Labour"}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="newRole" className="text-xs font-semibold">{t("newRole")}</Label>
                                    <Select value={newRole} onValueChange={(v) => setNewRole(v)}>
                                        <SelectTrigger id="newRole" className="h-9 text-sm font-semibold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="supervisor">Supervisor</SelectItem>
                                            <SelectItem value="labour">Labour</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {newRole === "supervisor" && (
                                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                                            <span className="font-bold">Warning:</span> Supervisors have full access to manage labourers, work entries, payments, and other users' roles.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="sticky bottom-0 bg-white border-t pt-3 pb-2 px-4 md:px-6 flex justify-end gap-3 z-10">
                                <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
                                    {t("cancel")}
                                </Button>
                                <Button size="sm" onClick={confirmRoleChange} disabled={updateRoleMutation.isPending} className="gradient-primary px-6">
                                    {updateRoleMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            {t("updating")}
                                        </>
                                    ) : (
                                        t("confirmChange")
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </AppLayout>
    );
};

export default RoleManagement;
