import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { voiceService } from "@/lib/voiceService";
import { SyncStatusBadge } from "@/components/SyncStatusBadge";
import {
    Play,
    Camera,
    CheckCircle,
    Plus,
    Minus,
    MapPin,
    Loader2,
    Volume2,
    VolumeX,
    RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const DailyWorkWizard = ({ labourerId, userId, onComplete }) => {
    const { t, i18n } = useTranslation();
    const lang = i18n.language;
    const [step, setStep] = useState("ready");
    const [meters, setMeters] = useState(0);
    const [beforePhoto, setBeforePhoto] = useState(null);
    const [afterPhoto, setAfterPhoto] = useState(null);
    const [beforePreview, setBeforePreview] = useState(null);
    const [afterPreview, setAfterPreview] = useState(null);
    const [location, setLocation] = useState(null);
    const [isCapturingLocation, setIsCapturingLocation] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [startTime, setStartTime] = useState(null);

    const beforePhotoRef = useRef(null);
    const afterPhotoRef = useRef(null);

    const { saveWorkClaim, isOnline } = useOfflineSync();

    // Set language for voice service
    useEffect(() => {
        voiceService.setLanguage(lang);
    }, [lang]);

    // Speak instruction when step changes
    useEffect(() => {
        const stepVoiceMap = {
            ready: "startWork",
            before_photo: "takeBeforePhoto",
            working: "finishWork",
            after_photo: "takeAfterPhoto",
            meters: "enterMeters",
            complete: "submitSuccess",
        };

        const voiceKey = stepVoiceMap[step];
        if (voiceKey && !isMuted) {
            voiceService.speak(voiceKey);
        }
    }, [step, isMuted]);

    // Toggle mute
    const toggleMute = () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        voiceService.setMuted(newMuted);
    };

    // Capture GPS location
    const captureLocation = useCallback(() => {
        if (!navigator.geolocation) return;

        setIsCapturingLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                    );
                    const data = await response.json();
                    setLocation({
                        lat: latitude,
                        lng: longitude,
                        name: data.display_name?.split(",").slice(0, 2).join(",") || "Location captured",
                    });
                } catch {
                    setLocation({
                        lat: latitude,
                        lng: longitude,
                        name: "Location captured",
                    });
                }

                setIsCapturingLocation(false);
                voiceService.vibrate(50);
                if (!isMuted) voiceService.speak("locationCaptured");
            },
            () => setIsCapturingLocation(false),
            { enableHighAccuracy: true },
        );
    }, [isMuted]);

    // Start work handler
    const handleStartWork = () => {
        captureLocation();
        setStartTime(new Date());
        setStep("before_photo");
        voiceService.vibrate(50);
    };

    // Photo handlers
    const handleBeforePhoto = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setBeforePhoto(file);
            setBeforePreview(URL.createObjectURL(file));
            setStep("working");
            voiceService.vibrate([50, 50]);
        }
    };

    const handleAfterPhoto = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setAfterPhoto(file);
            setAfterPreview(URL.createObjectURL(file));
            setStep("meters");
            voiceService.vibrate([50, 50]);
        }
    };

    // Finish work handler
    const handleFinishWork = () => {
        setStep("after_photo");
        voiceService.vibrate(50);
    };

    // Meter adjustment
    const adjustMeters = (amount) => {
        const newValue = Math.max(0, meters + amount);
        setMeters(newValue);
        voiceService.vibrate(30);
    };

    // Submit claim
    const handleSubmit = async () => {
        if (meters <= 0) return;

        setIsSubmitting(true);
        voiceService.vibrate(50);

        try {
            await saveWorkClaim({
                labourerId,
                date: new Date().toISOString().split("T")[0],
                claimedMeters: meters,
                photoFile: beforePhoto,
                photoAfterFile: afterPhoto,
                latitude: location?.lat,
                longitude: location?.lng,
                locationName: location?.name,
                notes: startTime ? `Started at ${startTime.toLocaleTimeString()}` : null,
            });

            setStep("complete");
            voiceService.successFeedback("submitSuccess");

            // Reset after animation
            setTimeout(() => {
                onComplete?.();
            }, 3000);
        } catch (error) {
            console.error("Failed to submit:", error);
            voiceService.errorFeedback("errorOccurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Reset wizard
    const resetWizard = () => {
        setStep("ready");
        setMeters(0);
        setBeforePhoto(null);
        setAfterPhoto(null);
        setBeforePreview(null);
        setAfterPreview(null);
        setLocation(null);
        setStartTime(null);
    };


    // Hidden file inputs
    const fileInputs = (
        <>
            <input
                ref={beforePhotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleBeforePhoto}
            />
            <input
                ref={afterPhotoRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleAfterPhoto}
            />
        </>
    );

    // Render based on step
    const renderStep = () => {
        switch (step) {
            case "ready":
                return (
                    <div className="flex flex-col items-center gap-6">
                        <Button
                            size="lg"
                            className="w-40 h-40 rounded-full text-2xl font-bold bg-success hover:bg-success/90 shadow-lg animate-pulse-soft"
                            onClick={handleStartWork}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <Play className="h-12 w-12" />
                                <span>{t("startWork")}</span>
                            </div>
                        </Button>
                        <SyncStatusBadge showDetails />
                    </div>
                );

            case "before_photo":
                return (
                    <div className="flex flex-col items-center gap-6">
                        <div className="text-center mb-4">
                            <Camera className="h-16 w-16 mx-auto text-primary mb-2" />
                            <p className="text-xl font-semibold">{t("beforePhoto")}</p>
                        </div>
                        <Button
                            size="lg"
                            className="w-40 h-40 rounded-full text-xl font-bold gradient-primary shadow-glow"
                            onClick={() => beforePhotoRef.current?.click()}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <Camera className="h-12 w-12" />
                                <span>{labels.takePhoto[lang]}</span>
                            </div>
                        </Button>
                        {location && (
                            <Badge className="bg-success/10 text-success border-success/20">
                                <MapPin className="h-3 w-3 mr-1" />
                                {t("locationCaptured")}
                            </Badge>
                        )}
                    </div>
                );

            case "working":
                return (
                    <div className="flex flex-col items-center gap-6">
                        {beforePreview && (
                            <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-success">
                                <img src={beforePreview} alt="Before" className="w-full h-full object-cover" />
                            </div>
                        )}
                        <div className="text-center">
                            <p className="text-lg text-muted-foreground animate-pulse">{t("working")}</p>
                            {startTime && <p className="text-sm text-muted-foreground mt-1">{startTime.toLocaleTimeString()}</p>}
                        </div>
                        <Button
                            size="lg"
                            className="w-40 h-40 rounded-full text-2xl font-bold bg-primary hover:bg-primary/90 shadow-lg"
                            onClick={handleFinishWork}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <CheckCircle className="h-12 w-12" />
                                <span>{t("finishWork")}</span>
                            </div>
                        </Button>
                    </div>
                );

            case "after_photo":
                return (
                    <div className="flex flex-col items-center gap-6">
                        <div className="text-center mb-4">
                            <Camera className="h-16 w-16 mx-auto text-primary mb-2" />
                            <p className="text-xl font-semibold">{t("afterPhoto")}</p>
                        </div>
                        <Button
                            size="lg"
                            className="w-40 h-40 rounded-full text-xl font-bold gradient-primary shadow-glow"
                            onClick={() => afterPhotoRef.current?.click()}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <Camera className="h-12 w-12" />
                                <span>{labels.takePhoto[lang]}</span>
                            </div>
                        </Button>
                    </div>
                );

            case "meters":
                return (
                    <div className="flex flex-col items-center gap-6">
                        <p className="text-xl font-semibold">{t("howManyMeters")}</p>

                        {/* Photo previews */}
                        <div className="flex gap-4">
                            {beforePreview && (
                                <div className="w-20 h-20 rounded-lg overflow-hidden border">
                                    <img src={beforePreview} alt="Before" className="w-full h-full object-cover" />
                                </div>
                            )}
                            {afterPreview && (
                                <div className="w-20 h-20 rounded-lg overflow-hidden border">
                                    <img src={afterPreview} alt="After" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>

                        {/* Meter counter */}
                        <div className="flex items-center gap-4">
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-20 h-20 rounded-full text-3xl font-bold border-2 hover:bg-destructive/10 hover:border-destructive"
                                onClick={() => adjustMeters(-10)}
                            >
                                <Minus className="h-10 w-10" />
                            </Button>

                            <div className="text-center min-w-[120px]">
                                <span className="text-5xl font-bold text-primary">{meters}</span>
                                <p className="text-lg text-muted-foreground">{t("meters")}</p>
                            </div>

                            <Button
                                size="lg"
                                variant="outline"
                                className="w-20 h-20 rounded-full text-3xl font-bold border-2 hover:bg-success/10 hover:border-success"
                                onClick={() => adjustMeters(10)}
                            >
                                <Plus className="h-10 w-10" />
                            </Button>
                        </div>

                        {/* Fine adjustment */}
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => adjustMeters(-1)} className="text-lg">
                                -1
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => adjustMeters(-5)} className="text-lg">
                                -5
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => adjustMeters(5)} className="text-lg">
                                +5
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => adjustMeters(1)} className="text-lg">
                                +1
                            </Button>
                        </div>

                        {/* Submit button */}
                        <Button
                            size="lg"
                            className="w-full h-16 text-2xl font-bold bg-success hover:bg-success/90 shadow-lg"
                            onClick={handleSubmit}
                            disabled={meters <= 0 || isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-8 w-8 animate-spin" />
                            ) : (
                                <>
                                    <CheckCircle className="h-8 w-8 mr-2" />
                                    {t("submit")}
                                </>
                            )}
                        </Button>

                        {!isOnline && (
                            <p className="text-sm text-warning text-center">
                                {t("offlineMessage")}
                            </p>
                        )}
                    </div>
                );

            case "complete":
                return (
                    <div className="flex flex-col items-center gap-6 animate-scale-in">
                        <div className="w-32 h-32 rounded-full bg-success/20 flex items-center justify-center">
                            <CheckCircle className="h-20 w-20 text-success animate-pulse" />
                        </div>
                        <p className="text-2xl font-bold text-success">{t("workSaved")}</p>
                        <p className="text-lg text-muted-foreground">
                            {meters} {t("metersRecorded")}
                        </p>
                        <Button variant="outline" size="lg" onClick={resetWizard} className="mt-4">
                            <RotateCcw className="h-5 w-5 mr-2" />
                            {t("newEntry")}
                        </Button>
                    </div>
                );
        }
    };

    return (
        <Card className="shadow-card overflow-hidden">
            <CardContent className="p-6">
                {/* Header with mute toggle and step indicator */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        {["ready", "before_photo", "working", "after_photo", "meters", "complete"].map((s, i) => (
                            <div
                                key={s}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    step === s
                                        ? "w-6 bg-primary"
                                        : ["ready", "before_photo", "working", "after_photo", "meters", "complete"].indexOf(step) > i
                                            ? "bg-success"
                                            : "bg-muted",
                                )}
                            />
                        ))}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleMute}
                        className={cn(isMuted && "text-muted-foreground")}
                    >
                        {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                    </Button>
                </div>

                {/* Step content */}
                <div className="min-h-[400px] flex items-center justify-center">{renderStep()}</div>

                {fileInputs}

                {/* Loading overlay for location */}
                {isCapturingLocation && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm">{t("gettingLocation")}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
