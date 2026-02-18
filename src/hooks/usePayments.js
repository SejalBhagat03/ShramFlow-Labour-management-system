import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const usePayments = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const {
        data: payments = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ["payments", user?.id],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await supabase
                .from("payments")
                .select(`
          *,
          labourer:labourers(name, name_hindi)
        `)
                .order("date", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    const createPayment = useMutation({
        mutationFn: async (formData) => {
            if (!user) throw new Error("Not authenticated");

            const { data, error } = await supabase
                .from("payments")
                .insert({
                    supervisor_id: user.id,
                    labourer_id: formData.labourer_id,
                    amount: formData.amount,
                    method: formData.method,
                    date: formData.date,
                    status: formData.status,
                    notes: formData.notes || null,
                })
                .select()
                .single();

            if (error) throw error;

            // Add activity
            await supabase.from("activities").insert({
                supervisor_id: user.id,
                type: "payment",
                message: `Payment of ₹${formData.amount.toLocaleString()} created`,
                message_hindi: `₹${formData.amount.toLocaleString()} का भुगतान बनाया गया`,
                icon: "💰",
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
            toast({
                title: "Payment Created",
                description: "The payment has been created successfully.",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const markAsPaid = useMutation({
        mutationFn: async (id) => {
            if (!user) throw new Error("Not authenticated");

            const payment = payments.find((p) => p.id === id);

            const { data, error } = await supabase.from("payments").update({ status: "paid" }).eq("id", id).select().single();

            if (error) throw error;

            // Add activity
            if (payment) {
                await supabase.from("activities").insert({
                    supervisor_id: user.id,
                    type: "payment",
                    message: `Payment of ₹${payment.amount.toLocaleString()} marked as paid`,
                    message_hindi: `₹${payment.amount.toLocaleString()} का भुगतान पूर्ण हुआ`,
                    icon: "✅",
                });
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
            toast({
                title: "Payment Marked as Paid",
                description: "The payment status has been updated.",
            });
        },
    });

    const totalPaid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payments.filter((p) => p.status === "unpaid").reduce((sum, p) => sum + p.amount, 0);

    return {
        payments,
        isLoading,
        error,
        createPayment,
        markAsPaid,
        totalPaid,
        totalPending,
    };
};
