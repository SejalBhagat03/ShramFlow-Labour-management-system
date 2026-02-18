import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Hook to get a labourer's trust score and badge
export const useLabourerTrustScore = (labourerId) => {
    return useQuery({
        queryKey: ["labourer_trust", labourerId],
        queryFn: async () => {
            if (!labourerId) return null;

            const { data, error } = await supabase
                .from("labourers")
                .select("trust_score, trust_badge")
                .eq("id", labourerId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!labourerId,
    });
};

// Hook to get trust score history for a labourer
export const useTrustScoreHistory = (labourerId) => {
    return useQuery({
        queryKey: ["trust_score_history", labourerId],
        queryFn: async () => {
            if (!labourerId) return [];

            const { data, error } = await supabase
                .from("trust_score_history")
                .select("*")
                .eq("labourer_id", labourerId)
                .order("created_at", { ascending: false })
                .limit(20);

            if (error) throw error;
            return data;
        },
        enabled: !!labourerId,
    });
};

// Helper function to get badge styling
export const getTrustBadgeStyle = (badge) => {
    switch (badge) {
        case "trusted":
            return {
                bg: "bg-success/10",
                text: "text-success",
                border: "border-success/20",
                icon: "⭐",
                label: { en: "Trusted", hi: "विश्वसनीय" },
            };
        case "needs_review":
            return {
                bg: "bg-destructive/10",
                text: "text-destructive",
                border: "border-destructive/20",
                icon: "⚠️",
                label: { en: "Needs Review", hi: "जाँच जरूरी" },
            };
        default:
            return {
                bg: "bg-muted",
                text: "text-muted-foreground",
                border: "border-border",
                icon: "●",
                label: { en: "Normal", hi: "सामान्य" },
            };
    }
};

// Helper function to get change type description
export const getChangeTypeDescription = (type, lang = "en") => {
    const descriptions = {
        claim_confirmed: { en: "Work confirmed", hi: "काम की पुष्टि" },
        claim_disputed: { en: "Work disputed", hi: "काम पर विवाद" },
        fraud_flagged: { en: "Flagged for fraud", hi: "धोखाधड़ी के लिए चिह्नित" },
        dispute_resolved: { en: "Dispute resolved", hi: "विवाद सुलझाया" },
        manual_adjustment: { en: "Manual adjustment", hi: "मैन्युअल समायोजन" },
    };

    return descriptions[type]?.[lang] || type;
};
