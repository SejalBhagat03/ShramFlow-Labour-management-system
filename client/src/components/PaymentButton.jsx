import React, { useState } from 'react';
import { paymentService } from '@/services/paymentService';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Loader2, CreditCard } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * PaymentButton
 * A reusable component to handle Razorpay payment flow.
 */
const PaymentButton = ({
    amount,
    labourerId,
    supervisorId,
    onSuccess,
    onFailure,
    onBeforeOpen,
    labourerName = 'Labourer',
    buttonText = 'Pay Now',
    orderId = null,
    className = ''
}) => {
    const [loading, setLoading] = useState(false);
    const queryClient = useQueryClient();

    const handlePayment = async () => {
        if (!amount || amount <= 0) {
            toast.error('Invalid payment amount');
            return;
        }

        setLoading(true);
        try {
            let finalOrderId = orderId;
            let finalAmount = amount * 100; // Default to paise

            if (!finalOrderId) {
                // 1. Create order on backend
                const orderData = await paymentService.createOrder(amount, labourerId, supervisorId);
                finalOrderId = orderData.order_id;
                finalAmount = orderData.amount;
            }

            // 2. Configure Razorpay options
            const options = {
                key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: finalAmount,
                currency: 'INR',
                name: 'ShramFlow',
                description: `Payment for ${labourerName}`,
                order_id: finalOrderId,
                handler: async function (response) {
                    setLoading(true);
                    try {
                        // 3. Verify payment on backend
                        const verification = await paymentService.verifyPayment(response);
                        if (verification.success) {
                            toast.success('Payment Successful!');
                            // Invalidate queries to refresh UI
                            queryClient.invalidateQueries({ queryKey: ["payments"] });
                            queryClient.invalidateQueries({ queryKey: ["activities"] });
                            queryClient.invalidateQueries({ queryKey: ["dashboard_stats"] });

                            if (onSuccess) onSuccess(verification);
                        } else {
                            toast.error('Payment verification failed');
                            if (onFailure) onFailure();
                        }
                    } catch (err) {
                        toast.error('Error verifying payment');
                        if (onFailure) onFailure(err);
                    } finally {
                        setLoading(false);
                    }
                },
                prefill: {
                    name: labourerName,
                },
                theme: {
                    color: '#10b981', // Tailwind green-500
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                    }
                }
            };

            // 3. Close parent modal if needed before opening Razorpay
            if (onBeforeOpen) {
                onBeforeOpen();
            }

            // 4. Open Razorpay modal
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function (response) {
                toast.error('Payment failed: ' + response.error.description);
                if (onFailure) onFailure(response.error);
                setLoading(false);
            });
            rzp.open();

        } catch (error) {
            toast.error(error.message || 'Error initiating payment');
            setLoading(false);
        }
    };

    return (
        <Button
            onClick={handlePayment}
            disabled={loading}
            className={`flex items-center gap-2 ${className}`}
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <CreditCard className="h-4 w-4" />
            )}
            {loading ? 'Processing...' : buttonText}
        </Button>
    );
};

export default PaymentButton;
