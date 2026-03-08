// Voice Service for Hindi/English text-to-speech guidance
// Designed for low-literacy rural users

// Pre-defined voice messages for various actions
export const voiceMessages = {
    // Work Wizard Steps
    startWork: {
        en: "Tap the green button to start your work",
        hi: "हरा बटन दबाओ, काम शुरू करो",
    },
    takeBeforePhoto: {
        en: "Now take a photo of your work area before starting",
        hi: "अब काम शुरू करने से पहले जगह की फोटो लो",
    },
    finishWork: {
        en: "When your work is done, tap the blue button",
        hi: "काम खत्म होने पर नीला बटन दबाओ",
    },
    takeAfterPhoto: {
        en: "Take a photo of your completed work",
        hi: "अब अपने किये गए काम की फोटो लो",
    },
    enterMeters: {
        en: "Use plus and minus buttons to enter how many meters you dug",
        hi: "प्लस माइनस बटन से बताओ कितने मीटर खोदा",
    },
    submitSuccess: {
        en: "Your work has been recorded. Well done!",
        hi: "तुम्हारा काम दर्ज हो गया। शाबाश!",
    },

    // Confirmations
    confirmWork: {
        en: "Tap green to confirm, or red to dispute",
        hi: "हरा बटन मतलब सही है, लाल बटन मतलब गलत है",
    },
    confirmed: {
        en: "Work confirmed successfully",
        hi: "काम की पुष्टि हो गई",
    },
    disputed: {
        en: "Dispute has been recorded",
        hi: "विवाद दर्ज हो गया",
    },

    // Location
    locationCaptured: {
        en: "Your location has been recorded",
        hi: "तुम्हारी जगह दर्ज हो गई",
    },
    captureLocation: {
        en: "Tap to capture your current location",
        hi: "अपनी जगह दर्ज करने के लिए दबाओ",
    },

    // Errors
    errorOccurred: {
        en: "Something went wrong. Please try again",
        hi: "कुछ गड़बड़ हो गई। फिर से कोशिश करो",
    },
    noInternet: {
        en: "No internet. Your work will be saved and sent later",
        hi: "इंटरनेट नहीं है। काम बाद में भेजा जाएगा",
    },
    synced: {
        en: "All your work has been sent to the office",
        hi: "सारा काम ऑफिस भेज दिया गया",
    },

    // General
    welcome: {
        en: "Welcome to ShramFlow",
        hi: "श्रमफ्लो में स्वागत है",
    },
    loading: {
        en: "Please wait",
        hi: "थोड़ा रुको",
    },
};

class VoiceService {
    constructor() {
        this.synth = null;
        this.currentLang = "hi";
        this.isMuted = false;
        this.voices = [];
        this.voicesLoaded = false;

        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            this.synth = window.speechSynthesis;
            this.loadVoices();

            // Chrome needs this event
            if (this.synth.onvoiceschanged !== undefined) {
                this.synth.onvoiceschanged = () => this.loadVoices();
            }
        }
    }

    loadVoices() {
        if (this.synth) {
            this.voices = this.synth.getVoices();
            this.voicesLoaded = true;
        }
    }

    getVoice(lang) {
        if (!this.voicesLoaded) {
            this.loadVoices();
        }

        const langCode = lang === "hi" ? "hi" : "en";

        // Try to find a voice for the language
        let voice = this.voices.find((v) => v.lang.startsWith(langCode));

        // Fallback to any Hindi voice
        if (!voice && lang === "hi") {
            voice = this.voices.find((v) => v.lang.includes("hi") || v.name.includes("Hindi"));
        }

        // Final fallback to default
        return voice || this.voices[0] || null;
    }

    setLanguage(lang) {
        this.currentLang = lang;
    }

    setMuted(muted) {
        this.isMuted = muted;
        if (muted && this.synth) {
            this.synth.cancel();
        }
    }

    isSpeaking() {
        return this.synth?.speaking || false;
    }

    stop() {
        this.synth?.cancel();
    }

    async speak(key, lang) {
        const useLang = lang || this.currentLang;
        const message = voiceMessages[key]?.[useLang];

        if (!message) {
            console.warn(`Voice message not found for key: ${key}`);
            return;
        }

        return this.speakText(message, useLang);
    }

    async speakText(text, lang) {
        return new Promise((resolve) => {
            if (!this.synth || this.isMuted) {
                resolve();
                return;
            }

            // Cancel any ongoing speech
            this.synth.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            const useLang = lang || this.currentLang;

            utterance.lang = useLang === "hi" ? "hi-IN" : "en-IN";
            utterance.rate = 0.9; // Slightly slower for clarity
            utterance.pitch = 1;
            utterance.volume = 1;

            const voice = this.getVoice(useLang);
            if (voice) {
                utterance.voice = voice;
            }

            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();

            this.synth.speak(utterance);
        });
    }

    // Trigger haptic feedback if supported
    vibrate(pattern = 50) {
        if ("vibrate" in navigator) {
            navigator.vibrate(pattern);
        }
    }

    // Success feedback: short vibrate + speak
    async successFeedback(key) {
        this.vibrate([50, 50, 50]);
        await this.speak(key);
    }

    // Error feedback: long vibrate + speak
    async errorFeedback(key = "errorOccurred") {
        this.vibrate(200);
        await this.speak(key);
    }
}

// Singleton instance
export const voiceService = new VoiceService();
