import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubmitWorkClaim, useTodayClaim, uploadWorkEvidence } from "@/hooks/useWorkClaims";
import { Camera, MapPin, Ruler, Upload, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const WorkClaimForm = ({ labourerId, userId }) => {
    const { t } = useTranslation();
    const [meters, setMeters] = useState("");
    const [notes, setNotes] = useState("");
    const [photoFile, setPhotoFile] = useState(null);
    const [photoAfterFile, setPhotoAfterFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoAfterPreview, setPhotoAfterPreview] = useState(null);
    const [location, setLocation] = useState(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    const today = new Date().toISOString().split("T")[0];
    const { data: todayClaim, isLoading: claimLoading } = useTodayClaim(labourerId);
    const submitClaim = useSubmitWorkClaim();

    // Load existing claim data
    useEffect(() => {
        if (todayClaim) {
            setMeters(todayClaim.claimed_meters.toString());
            setNotes(todayClaim.notes || "");
            if (todayClaim.photo_url) setPhotoPreview(todayClaim.photo_url);
            if (todayClaim.before_photo_url) setPhotoPreview(todayClaim.before_photo_url);
            if (todayClaim.after_photo_url) setPhotoAfterPreview(todayClaim.after_photo_url);
            if (todayClaim.latitude && todayClaim.longitude) {
                setLocation({
                    lat: todayClaim.latitude,
                    lng: todayClaim.longitude,
                    name: todayClaim.location_name || "Saved location",
                });
            }
        }
    }, [todayClaim]);

    const handlePhotoChange = (e, type) => {
        const file = e.target.files?.[0];
        if (file) {
            if (type === "before") {
                setPhotoFile(file);
                setPhotoPreview(URL.createObjectURL(file));
            } else {
                setPhotoAfterFile(file);
                setPhotoAfterPreview(URL.createObjectURL(file));
            }
        }
    };

    const getLocation = () => {
        setIsGettingLocation(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    // Try to get location name via reverse geocoding
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                        );
                        const data = await response.json();
                        setLocation({
                            lat: latitude,
                            lng: longitude,
                            name: data.display_name?.split(",").slice(0, 3).join(",") || "Location captured",
                        });
                    } catch {
                        setLocation({
                            lat: latitude,
                            lng: longitude,
                            name: "Location captured",
                        });
                    }
                    setIsGettingLocation(false);
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setIsGettingLocation(false);
                },
                { enableHighAccuracy: true },
            );
        } else {
            setIsGettingLocation(false);
        }
    };

    const handleSubmit = async () => {
        if (!meters || Number(meters) <= 0) return;

        setIsUploadingPhoto(true);
        try {
            let photoUrl = todayClaim?.photo_url || null;
            let beforePhotoUrl = todayClaim?.before_photo_url || null;
            let afterPhotoUrl = todayClaim?.after_photo_url || null;

            // Upload photos if new ones selected
            if (photoFile) {
                beforePhotoUrl = await uploadWorkEvidence(photoFile, userId, "before");
            }
            if (photoAfterFile) {
                afterPhotoUrl = await uploadWorkEvidence(photoAfterFile, userId, "after");
            }

            await submitClaim.mutateAsync({
                labourer_id: labourerId,
                date: today,
                claimed_meters: Number(meters),
                photo_url: photoUrl,
                before_photo_url: beforePhotoUrl,
                after_photo_url: afterPhotoUrl,
                latitude: location?.lat || null,
                longitude: location?.lng || null,
                location_name: location?.name || null,
                notes: notes || null,
            });
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const isSubmitting = submitClaim.isPending || isUploadingPhoto;
    const hasExistingClaim = !!todayClaim;

    if (claimLoading) {
        return (
            <Card>
                <CardContent className="p-6 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-card">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Ruler className="h-5 w-5 text-primary" />
                        {t("submitWorkClaim")}
                    </CardTitle>
                    {hasExistingClaim && (
                        <Badge
                            variant="outline"
                            className={cn(
                                todayClaim.status === "matched"
                                    ? "bg-success/10 text-success border-success/20"
                                    : todayClaim.status === "disputed"
                                        ? "bg-destructive/10 text-destructive border-destructive/20"
                                        : "bg-warning/10 text-warning border-warning/20",
                            )}
                        >
                            {todayClaim.status === "matched" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {todayClaim.status === "disputed" && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {todayClaim.status}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Meters Input */}
                <div className="space-y-2">
                    <Label htmlFor="meters" className="flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        {t("metersDigToday")} *
                    </Label>
                    <Input
                        id="meters"
                        type="number"
                        placeholder="e.g., 150"
                        value={meters}
                        onChange={(e) => setMeters(e.target.value)}
                        className="text-lg font-semibold"
                        min="0"
                        step="0.5"
                    />
                </div>

                {/* Location */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {t("location")}
                    </Label>
                    {location ? (
                        <div className="p-3 rounded-lg bg-success/10 border border-success/20 flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-foreground">{location.name}</p>
                                <p className="text-muted-foreground text-xs">
                                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={getLocation}
                            disabled={isGettingLocation}
                        >
                            {isGettingLocation ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <MapPin className="h-4 w-4 mr-2" />
                            )}
                            {t("captureLocation")}
                        </Button>
                    )}
                </div>

                {/* Photo Evidence */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                            <Camera className="h-4 w-4" />
                            {t("beforePhoto")}
                        </Label>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => handlePhotoChange(e, "before")}
                            />
                            {photoPreview ? (
                                <div className="relative aspect-square rounded-lg overflow-hidden border">
                                    <img src={photoPreview} alt="Before" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <Camera className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{t("uploadPhoto")}</span>
                                </div>
                            )}
                        </label>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm">
                            <Camera className="h-4 w-4" />
                            {t("afterPhoto")}
                        </Label>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={(e) => handlePhotoChange(e, "after")}
                            />
                            {photoAfterPreview ? (
                                <div className="relative aspect-square rounded-lg overflow-hidden border">
                                    <img src={photoAfterPreview} alt="After" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <Camera className="h-6 w-6 text-white" />
                                    </div>
                                </div>
                            ) : (
                                <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors">
                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">{t("uploadPhoto")}</span>
                                </div>
                            )}
                        </label>
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                    <Label htmlFor="notes">{t("notesOptional")}</Label>
                    <Textarea
                        id="notes"
                        placeholder={t("notesPlaceholder")}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                    />
                </div>

                {/* Submit Button */}
                <Button
                    className="w-full h-12 text-lg gradient-primary shadow-glow"
                    onClick={handleSubmit}
                    disabled={!meters || Number(meters) <= 0 || isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            {t("saving")}
                        </>
                    ) : hasExistingClaim ? (
                        <>
                            <CheckCircle className="h-5 w-5 mr-2" />
                            {t("updateClaim")}
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-5 w-5 mr-2" />
                            {t("submitClaim")}
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
};
