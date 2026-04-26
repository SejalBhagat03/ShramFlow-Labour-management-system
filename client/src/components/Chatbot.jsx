import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, Send, Bot, User, Loader2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "shramflow_chat_history";
const VOICE_ENABLED_KEY = "shramflow_voice_enabled";


// Detect if text is primarily Hindi
const isHindiText = (text) => {
    if (!text) return false;
    const hindiPattern = /[\u0900-\u097F]/;
    const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = text.replace(/\s/g, "").length || 1;
    return hindiPattern.test(text) && hindiChars / totalChars > 0.3;
};

// Get available Hindi voice
const getHindiVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find((v) => v.lang.startsWith("hi")) || null;
};

// Get available English voice
const getEnglishVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    return voices.find((v) => v.lang.startsWith("en")) || null;
};

export const Chatbot = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(() => {
        const saved = localStorage.getItem(VOICE_ENABLED_KEY);
        return saved !== "false";
    });
    const [voicesLoaded, setVoicesLoaded] = useState(false);

    const scrollAreaRef = useRef(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);
    const synthRef = useRef(null);

    const { t, i18n } = useTranslation();
    const lang = i18n.language;

    // Check for speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechSupported = !!SpeechRecognition;
    const synthSupported = "speechSynthesis" in window;

    // Load voices
    useEffect(() => {
        if (synthSupported) {
            const loadVoices = () => {
                window.speechSynthesis.getVoices();
                setVoicesLoaded(true);
            };
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, [synthSupported]);

    // Save voice preference
    useEffect(() => {
        localStorage.setItem(VOICE_ENABLED_KEY, voiceEnabled.toString());
    }, [voiceEnabled]);

    // Load chat history from localStorage
    useEffect(() => {
        const savedHistory = localStorage.getItem(STORAGE_KEY);
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                setMessages(parsed.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })));
            } catch (e) {
                if (import.meta.env.DEV) console.error("Failed to parse chat history:", e);
            }
        } else {
            setMessages([
                {
                    id: "greeting",
                    role: "assistant",
                    content: t("chatGreeting"),
                    timestamp: new Date(),
                },
            ]);
        }
    }, [t.greeting]);

    // Save chat history to localStorage
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        }
    }, [messages]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, isLoading]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            if (synthSupported) {
                window.speechSynthesis.cancel();
            }
        };
    }, [synthSupported]);

    // Speak text function
    const speakText = useCallback(
        (text) => {
            if (!synthSupported || !voiceEnabled) return;

            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            const isHindi = isHindiText(text);

            if (isHindi) {
                const hindiVoice = getHindiVoice();
                if (hindiVoice) {
                    utterance.voice = hindiVoice;
                    utterance.lang = "hi-IN";
                }
            } else {
                const englishVoice = getEnglishVoice();
                if (englishVoice) {
                    utterance.voice = englishVoice;
                    utterance.lang = "en-US";
                }
            }

            utterance.rate = 0.9;
            utterance.pitch = 1;

            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);

            synthRef.current = utterance;
            window.speechSynthesis.speak(utterance);
        },
        [synthSupported, voiceEnabled],
    );

    // Stop speaking
    const stopSpeaking = useCallback(() => {
        if (synthSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [synthSupported]);

    // Toggle voice output
    const toggleVoice = () => {
        if (isSpeaking) {
            stopSpeaking();
        }
        setVoiceEnabled(!voiceEnabled);
    };

    // Start listening
    const startListening = useCallback(() => {
        if (!speechSupported || isLoading) return;

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = lang === "hi" ? "hi-IN" : "en-US";
            // Enable both languages for auto-detection
            recognition.lang = "hi-IN";

            recognition.onstart = () => {
                setIsListening(true);
            };

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map((result) => result[0].transcript)
                    .join("");
                setInputValue(transcript);
            };

            recognition.onerror = (event) => {
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (error) {
            setIsListening(false);
        }
    }, [speechSupported, isLoading, lang, SpeechRecognition]);

    // Stop listening
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    }, []);

    // Toggle listening
    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const sendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: inputValue.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        // Detect language from user input for response
        const detectedLang = isHindiText(userMessage.content) ? "hi" : "en";

        try {
            const apiMessages = messages
                .filter((m) => m.id !== "greeting")
                .slice(-9)
                .concat(userMessage)
                .map((m) => ({ role: m.role, content: m.content }));

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    messages: apiMessages,
                    userRole: user?.role || "labour",
                    language: i18n.language, // Use software language instead of detected lang
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to communicate with chat service");
            }

            const data = await response.json();

            const assistantContent = data.message || t("chatError");
            const assistantMessage = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: assistantContent,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // Speak the response if voice is enabled
            if (voiceEnabled && voicesLoaded) {
                setTimeout(() => speakText(assistantContent), 100);
            }
        } catch (error) {
            if (import.meta.env.DEV) console.error("Chat error:", error);
            const errorMessage = {
                id: `error-${Date.now()}`,
                role: "assistant",
                content: t("chatError"),
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearHistory = () => {
        stopSpeaking();
        localStorage.removeItem(STORAGE_KEY);
        setMessages([
            {
                id: "greeting",
                role: "assistant",
                content: t.greeting,
                timestamp: new Date(),
            },
        ]);
    };

    // Replay last assistant message
    // Handle chips
    const handleQuickAction = (action) => {
        if (action.action === 'send') {
            setInputValue(action.text);
            // We can't call sendMessage directly easily without a small refactor or using a timeout
            setTimeout(() => {
                inputRef.current?.focus();
            }, 10);
        } else if (action.action === 'nav') {
            navigate(action.url);
            setIsOpen(false);
        }
    };

    const quickActions = [
        { id: 1, label: "Add Work", text: "How to add new work entry?", action: 'send' },
        { id: 2, label: "Payments", text: "Show me recent payments", action: 'send' },
        { id: 3, label: "Recycle Bin", url: "/recycle-bin", action: 'nav' },
    ];

    return (
        <>
            {/* Floating Chat Button */}
            <Button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 h-14 w-14 md:h-16 md:w-16 rounded-full shadow-lg",
                    "bg-primary hover:bg-primary/90 text-primary-foreground",
                    "transition-all duration-300 hover:scale-110",
                    isOpen && "scale-0 opacity-0",
                )}
                size="icon"
                aria-label="Open chat assistant"
            >
                <MessageCircle className="h-6 w-6 md:h-7 md:w-7" />
            </Button>

            {/* Chat Modal */}
            <div
                className={cn(
                    "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[350px] md:w-[380px] max-w-[calc(100vw-32px)]",
                    "rounded-2xl bg-card border shadow-2xl",
                    "transition-all duration-300 origin-bottom-right",
                    isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none",
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 md:p-4 border-b bg-primary rounded-t-2xl">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                            <Bot className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm md:text-base text-primary-foreground">{t("chatTitle")}</h3>
                            <p className="text-[10px] md:text-xs text-primary-foreground/70">
                                {isListening ? t("listening") : isLoading ? t("typing") : "Online"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Voice Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleVoice}
                            className={cn("text-primary-foreground hover:bg-primary-foreground/20", !voiceEnabled && "opacity-50")}
                            title={voiceEnabled ? "Mute voice" : "Enable voice"}
                        >
                            {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                stopSpeaking();
                                setIsOpen(false);
                            }}
                            className="text-primary-foreground hover:bg-primary-foreground/20"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Messages */}
                <ScrollArea ref={scrollAreaRef} className="h-[380px] p-4">
                    <div className="space-y-4">
                        <AnimatePresence>
                        {messages.map((message) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                className={cn("flex gap-2", message.role === "user" ? "flex-row-reverse" : "flex-row")}
                            >
                                <div
                                    className={cn(
                                        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
                                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                                    )}
                                >
                                    {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </div>
                                <div className="flex flex-col gap-1 max-w-[75%]">
                                    <div
                                        className={cn(
                                            "rounded-2xl px-4 py-3 text-[14px] md:text-[15px] leading-relaxed shadow-sm",
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                : "bg-muted text-foreground rounded-tl-sm border border-border/50",
                                        )}
                                    >
                                        {message.content}
                                    </div>
                                    {/* Replay button for assistant messages */}
                                    {message.role === "assistant" && synthSupported && message.id !== "greeting" && (
                                        <button
                                            onClick={() => replayMessage(message.content)}
                                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors self-start ml-1"
                                        >
                                            <Volume2 className="h-3 w-3" />
                                            {isSpeaking ? "Stop" : "Play"}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                        </AnimatePresence>
                        {isLoading && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-2"
                            >
                                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                                    <Bot className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            </motion.div>
                        )}
                    </div>
                </ScrollArea>

                {/* Quick Actions */}
                <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
                    {quickActions.map(action => (
                        <button
                            key={action.id}
                            onClick={() => handleQuickAction(action)}
                            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] md:text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-all border border-primary/20 shadow-sm"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>

                {/* Input */}
                <div className="p-4 border-t">
                    <div className="flex gap-2 items-center">
                        {/* Mic Button */}
                        {speechSupported && (
                            <Button
                                onClick={toggleListening}
                                disabled={isLoading}
                                size="icon"
                                variant={isListening ? "default" : "outline"}
                                className={cn(
                                    "rounded-full h-12 w-12 flex-shrink-0 transition-all",
                                    isListening && "bg-red-500 hover:bg-red-600 animate-pulse",
                                )}
                                title={isListening ? t("listening") : t("speakNow")}
                            >
                                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </Button>
                        )}
                        <Input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={isListening ? t("speakNow") : t("chatPlaceholder")}
                            disabled={isLoading}
                            className="flex-1 rounded-full bg-muted border-0 h-12 text-base px-5"
                        />
                        <Button
                            onClick={sendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            size="icon"
                            className="rounded-full h-12 w-12 flex-shrink-0"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                    <button
                        onClick={clearHistory}
                        className="w-full text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
                    >
                        {t("clearHistory")}
                    </button>
                </div>
            </div>
        </>
    );
};
