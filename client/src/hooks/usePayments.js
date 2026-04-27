import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { paymentService } from "@/services/paymentService";

export const usePayments = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const {
        data: payments = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ["payments", user?.id, user?.role],
        queryFn: async () => {
            if (!user) return [];

            let query = supabase
                .from("payments")
                .select(`
                  id,
                  amount,
                  status,
                  method,
                  transaction_date,
                  razorpay_order_id,
                  razorpay_payment_id,
                  created_at,
                  labourer:labourers(id, name, name_hindi)
                `);

            if (user.role === 'labourer') {
                // Fetch labourer record first to get the internal UUID
                const { data: labourer } = await supabase
                    .from('labourers')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (labourer) {
                    query = query.eq("labourer_id", labourer.id);
                } else {
                    return []; // Non-labourer user?
                }
            } else {
                query = query.eq("supervisor_id", user.id);
            }

            const { data, error } = await query.order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!user,
    });

    const createManualPayment = useMutation({
        mutationFn: async (paymentData) => {
            return await paymentService.createManualPayment({
                ...paymentData,
                supervisor_id: user.id
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["payments"] });
            queryClient.invalidateQueries({ queryKey: ["activities"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });
            queryClient.invalidateQueries({ queryKey: ["labour_balance"] });
            queryClient.invalidateQueries({ queryKey: ["labour_stats"] });
            toast({
                title: "Payment Recorded",
                description: "Manual payment has been recorded successfully.",
            });
        },
        onError: (err) => {
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive"
            });
        }
    });

    const totalPaid = payments
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalPending = payments
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
        payments,
        isLoading,
        error,
        createManualPayment,
        totalPaid,
        totalPending,
    };
};