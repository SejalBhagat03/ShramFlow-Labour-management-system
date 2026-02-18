import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from "date-fns";

export function useDailyLogs(selectedDate) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const userRole = user?.role;

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ["daily-logs", user?.id, selectedDate?.toISOString()],
        queryFn: async () => {
            let query = supabase.from("daily_logs").select("*").order("created_at", { ascending: false });

            if (selectedDate) {
                const dateStr = selectedDate.toISOString().split("T")[0];
                query = query.eq("date", dateStr);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    const createLog = useMutation({
        mutationFn: async (formData) => {
            const { data, error } = await supabase
                .from("daily_logs")
                .insert({
                    user_id: user.id,
                    date: formData.date,
                    title: formData.title,
                    description: formData.description || null,
                    image_url: formData.image_url || null,
                    log_type: formData.log_type,
                    labourer_id: formData.labourer_id || null,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
            toast.success("Log entry added successfully");
        },
        onError: (error) => {
            toast.error("Failed to add log entry: " + error.message);
        },
    });

    const deleteLog = useMutation({
        mutationFn: async (id) => {
            const { error } = await supabase.from("daily_logs").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["daily-logs"] });
            toast.success("Log entry deleted");
        },
        onError: (error) => {
            toast.error("Failed to delete: " + error.message);
        },
    });

    const uploadImage = async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage.from("daily-logs").upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("daily-logs").getPublicUrl(fileName);
        return data.publicUrl;
    };

    return {
        logs,
        isLoading,
        createLog,
        deleteLog,
        uploadImage,
        userRole,
    };
}

export function useDailyLogCounts(month) {
    const { user } = useAuth();

    const { data: logCountsByDate = {}, isLoading: isLoadingCounts } = useQuery({
        queryKey: ["daily-logs-counts", user?.id, format(month, "yyyy-MM")],
        queryFn: async () => {
            const startDate = format(startOfMonth(month), "yyyy-MM-dd");
            const endDate = format(endOfMonth(month), "yyyy-MM-dd");

            const { data, error } = await supabase
                .from("daily_logs")
                .select("date")
                .gte("date", startDate)
                .lte("date", endDate);

            if (error) throw error;

            // Count logs per date
            const counts = {};
            data?.forEach((log) => {
                counts[log.date] = (counts[log.date] || 0) + 1;
            });
            return counts;
        },
        enabled: !!user,
    });

    return { logCountsByDate, isLoadingCounts };
}
