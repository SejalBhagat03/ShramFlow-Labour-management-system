import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Bell, Shield, Globe, Camera, Save } from "lucide-react";

/**
 * Settings page component for managing user profile and application preferences.
 * Includes sections for profile details, language choice, notifications, and fraud detection levels.
 *
 * @returns {JSX.Element} The Settings page component.
 */
const Settings = () => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const setLang = (newLang) => i18n.changeLanguage(newLang);
    const { user } = useAuth();
    const { toast } = useToast();

    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [phone, setPhone] = React.useState('');

    React.useEffect(() => {
        if (user) {
            const names = user.name?.split(" ") || [];
            setFirstName(names[0] || '');
            setLastName(names.slice(1).join(" ") || '');
            setPhone(user.phone || '');
        }
    }, [user]);

    /**
     * Handles saving the modified settings/preferences.
     */
    const handleSave = async () => {
        try {
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
            if (authError || !authUser) throw new Error("Not authenticated");

            const fullName = `${firstName} ${lastName}`.trim();

            const { error: upsertError } = await supabase
                .from("profiles")
                .upsert({
                    id: authUser.id,
                    user_id: authUser.id,
                    full_name: fullName,
                    first_name: firstName,
                    last_name: lastName,
                    phone: phone
                }, { onConflict: 'user_id' });

            if (upsertError) throw upsertError;

            // Update auth metadata to keep session in sync with DB
            await supabase.auth.updateUser({
                data: {
                    full_name: fullName,
                    phone: phone
                }
            });

            toast({
                title: "Settings Saved",
                description: "Your profile has been updated successfully.",
            });
        } catch (error) {
            console.error("Save error:", error.message);
            toast({
                title: "Error Saving Settings",
                description: error.message || "An error occurred while saving.",
                variant: "destructive"
            });
        }
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 space-y-3 md:space-y-6">
                <div className="relative -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6 pt-6 lg:pt-8 pb-8 gradient-hero rounded-b-3xl border-white/10 border-b">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-soft" />
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">Workspace Preferences</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-3">
                            {t("settings")}
                        </h1>
                        <p className="text-muted-foreground mt-1 text-xs sm:text-sm md:text-base font-medium">
                            Manage your account, security, and application preferences
                        </p>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="space-y-4 md:space-y-6 max-w-4xl">

                    {/* Profile Card */}
                    <div className="bg-card rounded-2xl border p-4 md:p-6 shadow-sm space-y-4 md:space-y-6">
                        <div className="flex items-center gap-2 text-sm md:text-lg font-semibold border-b pb-3 -mx-4 px-4 md:-mx-6 md:px-6">
                            <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                            {t("profile")}
                        </div>

                        {/* User Avatar and Meta Info */}
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-primary/20 shadow-sm">
                                    <AvatarFallback className="bg-primary/10 text-primary text-lg md:text-xl font-bold">
                                        {user?.name
                                            ?.split(" ")
                                            .map((n) => n[0])
                                            .join("")}
                                    </AvatarFallback>
                                </Avatar>
                                <Button size="icon" variant="outline" className="absolute -bottom-1 -right-1 h-7 w-7 md:h-8 md:w-8 rounded-full bg-background shadow-sm hover:bg-muted transition-colors">
                                    <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                </Button>
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground text-sm md:text-base">{user?.name}</h3>
                                <p className="text-xs text-muted-foreground capitalize flex items-center gap-1.5 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                    {user?.role}
                                </p>
                            </div>
                        </div>

                        {/* Profile Form Inputs */}
                        <div className="grid gap-3 md:gap-4">
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] md:text-xs uppercase font-bold tracking-wider text-muted-foreground/80">First Name</Label>
                                    <Input 
                                        value={firstName} 
                                        onChange={(e) => setFirstName(e.target.value)} 
                                        className="h-9 text-xs md:text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] md:text-xs uppercase font-bold tracking-wider text-muted-foreground/80">Last Name</Label>
                                    <Input 
                                        value={lastName} 
                                        onChange={(e) => setLastName(e.target.value)} 
                                        className="h-9 text-xs md:text-sm" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] md:text-xs uppercase font-bold tracking-wider text-muted-foreground/80">Phone Number</Label>
                                <Input 
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)} 
                                    className="h-9 text-xs md:text-sm" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] md:text-xs uppercase font-bold tracking-wider text-muted-foreground/80">Email</Label>
                                <Input 
                                    type="email" 
                                    value={user?.email || ""} 
                                    disabled 
                                    className="h-9 text-xs md:text-sm bg-muted cursor-not-allowed" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Language Preferences Card */}
                    <div className="bg-card rounded-2xl border p-4 md:p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-sm md:text-lg font-semibold border-b pb-3 -mx-4 px-4 md:-mx-6 md:px-6">
                            <Globe className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                            {t("language")}
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-foreground text-xs md:text-sm">App Language</p>
                                <p className="text-[10px] md:text-xs text-muted-foreground">Choose your preferred language</p>
                            </div>
                            <Select value={lang} onValueChange={(value) => setLang(value)}>
                                <SelectTrigger className="w-32 md:w-40 h-9 text-xs md:text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-xl">
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Notification Settings Card */}
                    <div className="bg-card rounded-2xl border p-4 md:p-6 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 text-sm md:text-lg font-semibold border-b pb-3 -mx-4 px-4 md:-mx-6 md:px-6">
                            <Bell className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                            {t("notifications")}
                        </div>

                        <div className="space-y-4 md:space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-foreground text-xs md:text-sm">Push Notifications</p>
                                    <p className="text-[10px] md:text-xs text-muted-foreground">Receive alerts on your device</p>
                                </div>
                                <Switch defaultChecked className="scale-75 md:scale-100" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-foreground text-xs md:text-sm">Flagged Entry Alerts</p>
                                    <p className="text-[10px] md:text-xs text-muted-foreground">Get notified when entries are flagged</p>
                                </div>
                                <Switch defaultChecked className="scale-75 md:scale-100" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-foreground text-xs md:text-sm">Payment Reminders</p>
                                    <p className="text-[10px] md:text-xs text-muted-foreground">Remind about pending payments</p>
                                </div>
                                <Switch defaultChecked className="scale-75 md:scale-100" />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-foreground text-xs md:text-sm">Daily Summary</p>
                                    <p className="text-[10px] md:text-xs text-muted-foreground">Receive daily work summary</p>
                                </div>
                                <Switch className="scale-75 md:scale-100" />
                            </div>
                        </div>
                    </div>

                    {/* Fraud Detection/Threshold Card (Supervisor Specific) */}
                    <div className="bg-card rounded-2xl border p-4 md:p-6 shadow-sm space-y-4 md:space-y-6">
                        <div className="flex items-center gap-2 text-sm md:text-lg font-semibold border-b pb-3 -mx-4 px-4 md:-mx-6 md:px-6">
                            <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                            {t("fraudThreshold")}
                        </div>

                        <div className="space-y-5 md:space-y-6">
                            <div className="space-y-2 md:space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-foreground text-xs md:text-sm">Maximum Meters per Day</p>
                                    <span className="text-xs font-bold text-primary">100m</span>
                                </div>
                                <Slider defaultValue={[100]} max={200} step={10} className="py-2" />
                                <p className="text-[10px] md:text-xs text-muted-foreground">Flag entries where meters exceed this threshold</p>
                            </div>

                            <div className="space-y-2 md:space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-foreground text-xs md:text-sm">Maximum Hours per Day</p>
                                    <span className="text-xs font-bold text-primary">12h</span>
                                </div>
                                <Slider defaultValue={[12]} max={24} step={1} className="py-2" />
                                <p className="text-[10px] md:text-xs text-muted-foreground">Flag entries where hours exceed this threshold</p>
                            </div>

                            <div className="space-y-2 md:space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-foreground text-xs md:text-sm">Deviation Sensitivity</p>
                                    <span className="text-xs font-bold text-primary">Medium</span>
                                </div>
                                <Slider defaultValue={[50]} max={100} step={10} className="py-2" />
                                <p className="text-[10px] md:text-xs text-muted-foreground">Higher sensitivity flags more entries for review</p>
                            </div>
                        </div>
                    </div>

                    {/* Global Save Button */}
                    <Button className="w-full h-11 md:h-12 gradient-primary shadow-glow font-bold text-sm md:text-base rounded-xl" onClick={handleSave}>
                        <Save className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
};

export default Settings;
