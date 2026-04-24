const razorpay = require('razorpay');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const { logAudit } = require('../utils/logger');

const rzp = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.createOrder = async (req, res, next) => {
    try {
        const { amount, labourer_id, supervisor_id } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const options = {
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
        };

        const order = await rzp.orders.create(options);

        const { error: dbError } = await supabase
            .from('payments')
            .insert({
                organization_id: req.orgId,
                labourer_id,
                supervisor_id,
                amount,
                method: 'razorpay',
                razorpay_order_id: order.id,
                status: 'pending',
                transaction_date: new Date().toISOString().split('T')[0]
            });

        if (dbError) throw dbError;

        res.status(201).json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency
        });

    } catch (error) {
        next(error);
    }
};

exports.verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isValid = expectedSignature === razorpay_signature;
        const status = isValid ? 'paid' : 'failed';

        const { data: paymentRecord } = await supabase
            .from('payments')
            .select('id, amount, supervisor_id')
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('organization_id', req.orgId)
            .single();

        const { data: updatedPayment, error: updateError } = await supabase
            .from('payments')
            .update({
                status,
                razorpay_payment_id,
                payment_verified_at: isValid ? new Date().toISOString() : null
            })
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('organization_id', req.orgId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Log audit
        await logAudit({
            req,
            action: 'VERIFY_PAYMENT',
            entityType: 'Payment',
            entityId: updatedPayment.id,
            newValue: updatedPayment
        });

        if (isValid && paymentRecord) {
            await supabase.from('activities').insert({
                organization_id: req.orgId,
                supervisor_id: paymentRecord.supervisor_id,
                type: 'payment',
                message: `Online payment of ₹${paymentRecord.amount} verified`,
                message_hindi: `₹${paymentRecord.amount} का ऑनलाइन भुगतान सत्यापित हुआ`,
                icon: '💳'
            });
        }

        res.status(200).json({ success: isValid });

    } catch (error) {
        next(error);
    }
};

exports.createManualPayment = async (req, res, next) => {
    try {
        const { amount, labourer_id, supervisor_id, method, transaction_date } = req.body;

        if (!amount || !labourer_id || !method) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('payments')
            .insert({
                organization_id: req.orgId,
                labourer_id,
                supervisor_id,
                amount,
                method,
                status: 'paid',
                transaction_date: transaction_date || new Date().toISOString().split('T')[0],
                payment_verified_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Log audit
        await logAudit({
            req,
            action: 'CREATE_MANUAL_PAYMENT',
            entityType: 'Payment',
            entityId: data.id,
            newValue: data
        });

        await supabase.from('activities').insert({
            organization_id: req.orgId,
            supervisor_id,
            type: 'payment',
            message: `Manual payment (${method}) of ₹${amount} recorded`,
            message_hindi: `₹${amount} का मैनुअल भुगतान (${method}) रिकॉर्ड किया गया`,
            icon: '💰'
        });

        res.status(201).json(data);
    } catch (error) {
        next(error);
    }
};

/**
 * autoSettlePayments
 * Groups approved entries by labourer and project, creates a payment record, and marks entries as paid.
 */
exports.autoSettlePayments = async (req, res, next) => {
    try {
        const { project_id, global = false, method = 'cash' } = req.body;

        // 1. Fetch approved work entries that aren't paid yet
        let query = supabase
            .from('work_entries')
            .select('*')
            .eq('organization_id', req.orgId)
            .eq('status', 'approved')
            .is('payment_id', null);

        if (!global && project_id) {
            query = query.eq('project_id', project_id);
        } else if (!global && !project_id) {
            return res.status(400).json({ error: 'project_id required for project-based settlement' });
        }

        const { data: entries, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        if (!entries || entries.length === 0) {
            return res.status(200).json({ message: 'No pending entries to settle', count: 0 });
        }

        // 2. Group by labourer
        const labourerGroups = {};
        entries.forEach(e => {
            if (!labourerGroups[e.labourer_id]) {
                labourerGroups[e.labourer_id] = {
                    total: 0,
                    entryIds: [],
                    projectIds: new Set()
                };
            }
            labourerGroups[e.labourer_id].total += (Number(e.amount) || 0);
            labourerGroups[e.labourer_id].entryIds.push(e.id);
            if (e.project_id) labourerGroups[e.labourer_id].projectIds.add(e.project_id);
        });

        // 3. Process each group
        const results = [];
        for (const [labourerId, group] of Object.entries(labourerGroups)) {
            // Create payment record
            const { data: payment, error: pError } = await supabase
                .from('payments')
                .insert({
                    organization_id: req.orgId,
                    labourer_id: labourerId,
                    project_id: global ? null : Array.from(group.projectIds)[0], // Use major project if global
                    amount: group.total,
                    method,
                    status: 'paid',
                    transaction_date: new Date().toISOString().split('T')[0],
                    paid_at: new Date().toISOString()
                })
                .select()
                .single();

            if (pError) {
                console.error(`[AutoSettle] Failed for labourer ${labourerId}:`, pError);
                continue;
            }

            // Update work entries with payment_id and status
            await supabase
                .from('work_entries')
                .update({ 
                    payment_id: payment.id,
                    status: 'paid'
                })
                .in('id', group.entryIds);

            results.push({ labourerId, amount: group.total, payment_id: payment.id });
        }

        res.json({
            success: true,
            settled_count: results.length,
            total_entries: entries.length,
            details: results
        });
    } catch (error) {
        console.error('[AutoSettle] Controller Error:', error);
        next(error);
    }
};

module.exports = exports;
