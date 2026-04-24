import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';
/**
 * PaymentService
 * Handles communication with the local Express backend for Razorpay payments.
 */



export const paymentService = {
    /**
     * Create a new Razorpay order
     * @param {number} amount
     * @param {string} labourerId
     * @param {string} supervisorId
     * @returns {Promise<Object>}
     */
    async createOrder(amount, labourerId, supervisorId) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${API_BASE}/api/payment/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount,
                    labourer_id: labourerId,
                    supervisor_id: supervisorId,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create order');
            }

            return await response.json();
        } catch (error) {
            if (import.meta.env.DEV) console.error('Create Order Error:', error);
            throw error;
        }
    },

    /**
     * Verify the Razorpay payment signature
     * @param {Object} razorpayResponse
     * @returns {Promise<Object>}
     */
    async verifyPayment(razorpayResponse) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${API_BASE}/api/payment/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    razorpay_order_id: razorpayResponse.razorpay_order_id,
                    razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                    razorpay_signature: razorpayResponse.razorpay_signature,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Payment verification failed');
            }

            return await response.json();
        } catch (error) {
            if (import.meta.env.DEV) console.error('Verify Payment Error:', error);
            throw error;
        }
    },
    /**
     * Create a manual payment (Cash, Bank, UPI manual)
     * @param {Object} paymentData
     * @returns {Promise<Object>}
     */
    async createManualPayment(paymentData) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${API_BASE}/api/payment/manual`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(paymentData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to record manual payment');
            }

            return await response.json();
        } catch (error) {
            if (import.meta.env.DEV) console.error('Create Manual Payment Error:', error);
            throw error;
        }
    },

    /**
     * Bulk settle all approved entries for a labourer
     * @param {string} labourerId
     * @param {number} amount
     * @param {string} method
     */
    async bulkSettleEntries(labourerId, amount, method = 'cash') {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const response = await fetch(`${API_BASE}/api/payment/bulk-settle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ labourer_id: labourerId, amount, method }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Bulk settlement failed');
        }

        return await response.json();
    },
};
