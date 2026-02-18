import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
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
    const { t, lang, setLang } = useLanguage();
    const { user } = useAuth();
    const { toast } = useToast();

    /**
     * Handles saving the modified settings/preferences.
     */
    const handleSave = () => {
        toast({
            title: "Settings Saved",
            description: "Your preferences have been updated successfully.",
        });
    };

    return (
        <AppLayout>
            <div className="space-y-6 max-w-2xl">
                {/* Page Header */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t("settings")}</h1>
                    <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
                </div>

                {/* Profile Card */}
                <div className="bg-card rounded-xl border p-6 shadow-card space-y-6">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <User className="h-5 w-5 text-primary" />
                        {t("profile")}
                    </div>

                    {/* User Avatar and Meta Info */}
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Avatar className="h-20 w-20 border-2 border-primary/20">
                                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                                    {user?.name
                                        ?.split(" ")
                                        .map((n) => n[0])
                                        .join("")}
                                </AvatarFallback>
                            </Avatar>
                            <Button size="icon" variant="outline" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full">
                                <Camera className="h-4 w-4" />
                            </Button>
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground">{user?.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
                        </div>
                    </div>

                    {/* Profile Form Inputs */}
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>First Name</Label>
                                <Input defaultValue="Rajesh" />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input defaultValue="Supervisor" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input defaultValue="+91 98765 00000" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" defaultValue="rajesh@example.com" />
                        </div>
                    </div>
                </div>

                {/* Language Preferences Card */}
                <div className="bg-card rounded-xl border p-6 shadow-card space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <Globe className="h-5 w-5 text-primary" />
                        {t("language")}
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-foreground">App Language</p>
                            <p className="text-sm text-muted-foreground">Choose your preferred language</p>
                        </div>
                        <Select value={lang} onValueChange={(value) => setLang(value)}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Notification Settings Card */}
                <div className="bg-card rounded-xl border p-6 shadow-card space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <Bell className="h-5 w-5 text-primary" />
                        {t("notifications")}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">Push Notifications</p>
                                <p className="text-sm text-muted-foreground">Receive alerts on your device</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">Flagged Entry Alerts</p>
                                <p className="text-sm text-muted-foreground">Get notified when entries are flagged</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">Payment Reminders</p>
                                <p className="text-sm text-muted-foreground">Remind about pending payments</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">Daily Summary</p>
                                <p className="text-sm text-muted-foreground">Receive daily work summary</p>
                            </div>
                            <Switch />
                        </div>
                    </div>
                </div>

                {/* Fraud Detection/Threshold Card (Supervisor Specific) */}
                <div className="bg-card rounded-xl border p-6 shadow-card space-y-4">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <Shield className="h-5 w-5 text-primary" />
                        {t("fraudThreshold")}
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-foreground">Maximum Meters per Day</p>
                                <span className="text-sm text-muted-foreground">100m</span>
                            </div>
                            <Slider defaultValue={[100]} max={200} step={10} />
                            <p className="text-xs text-muted-foreground">Flag entries where meters exceed this threshold</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-foreground">Maximum Hours per Day</p>
                                <span className="text-sm text-muted-foreground">12h</span>
                            </div>
                            <Slider defaultValue={[12]} max={24} step={1} />
                            <p className="text-xs text-muted-foreground">Flag entries where hours exceed this threshold</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-foreground">Deviation Sensitivity</p>
                                <span className="text-sm text-muted-foreground">Medium</span>
                            </div>
                            <Slider defaultValue={[50]} max={100} step={10} />
                            <p className="text-xs text-muted-foreground">Higher sensitivity flags more entries for review</p>
                        </div>
                    </div>
                </div>

                {/* Global Save Button */}
                <Button className="w-full gradient-primary shadow-glow" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                </Button>
            </div>
        </AppLayout>
    );
};

export default Settings;
