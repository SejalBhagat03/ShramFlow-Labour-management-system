const supabase = require('../config/supabase');
const { GoogleGenerativeAI } = require("@google/generative-ai");

class ReconciliationService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    }

    /**
     * Reconciles a batch of submitted work entries (claims) against historical data and standard parameters.
     * @param {Array} claims - Array of submitted work entries
     * @param {string} orgId - Organization ID
     * @returns {Promise<Array>} Reconciled results with trust scores and adjustment recommendations
     */
    async reconcileClaims(claims, orgId) {
        if (!claims || claims.length === 0) return [];

        // Fetch labourers related to claims for context
        const labourerIds = [...new Set(claims.map(c => c.labourer_id))];
        
        // Get historical approved work for these labourers to calculate trust score and average output
        const { data: history } = await supabase
            .from('work_entries')
            .select('labourer_id, meters, work_done')
            .in('labourer_id', labourerIds)
            .eq('status', 'approved')
            .eq('organization_id', orgId);

        // Calculate averages
        const stats = {};
        if (history) {
            history.forEach(h => {
                const id = h.labourer_id;
                const value = Number(h.meters || h.work_done || 0);
                if (!stats[id]) stats[id] = { totalWork: 0, count: 0 };
                stats[id].totalWork += value;
                stats[id].count += 1;
            });
        }

        const enrichedClaims = claims.map(claim => {
            const stat = stats[claim.labourer_id];
            const avgWork = stat && stat.count > 0 ? (stat.totalWork / stat.count) : 0;
            return {
                ...claim,
                historicalAvgDailyWork: avgWork
            };
        });

        // Use AI to analyze
        const prompt = `
You are an AI Reconciliation Engine for a construction management app.
Analyze the following labour work claims. 
For each claim, you have the claimed amount (meters or work_done) and the labourer's historical average daily work (historicalAvgDailyWork).

Calculate a "trustScore" (0-100) based on how realistic the claim is compared to the historical average and typical human limits (e.g., digging 50m in a day is unlikely).
If the claim is highly suspicious or impossible, suggest an "adjustedAmount" that is more realistic, and set a "flag" describing the issue (e.g., "Extremely high claim compared to average").
If the claim is reasonable, adjustedAmount should be equal to the claimed amount, and flag should be null.

Input Claims Data (JSON):
${JSON.stringify(enrichedClaims.map(c => ({
    id: c.id,
    labourerId: c.labourer_id,
    claimedWork: c.meters || c.work_done || 0,
    historicalAvg: c.historicalAvgDailyWork
})), null, 2)}

Output ONLY a JSON array of objects with keys: "id", "trustScore", "adjustedAmount", "flag".
Do not include markdown blocks.
`;

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(prompt);
            let text = await result.response.text();
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            const aiAnalysis = JSON.parse(text);

            // Merge back into claims
            return claims.map(claim => {
                const analysis = aiAnalysis.find(a => a.id === claim.id);
                return {
                    ...claim,
                    reconciliation: analysis ? {
                        trustScore: analysis.trustScore,
                        adjustedAmount: analysis.adjustedAmount,
                        flag: analysis.flag
                    } : null
                };
            });

        } catch (error) {
            console.error('[ReconciliationService] AI Error:', error);
            // Fallback rule-based logic
            return claims.map(claim => {
                const stat = stats[claim.labourer_id];
                const avgWork = stat && stat.count > 0 ? (stat.totalWork / stat.count) : 0;
                const claimed = Number(claim.meters || claim.work_done || 0);
                
                let trustScore = 100;
                let flag = null;
                let adjustedAmount = claimed;

                if (avgWork > 0 && claimed > avgWork * 1.5) {
                    trustScore = 50;
                    flag = "Claim is 50% higher than historical average";
                    adjustedAmount = avgWork * 1.2; // Cap at 20% above average
                } else if (claimed > 30) { // Arbitrary hard limit for fallback
                    trustScore = 30;
                    flag = "Exceeds absolute daily maximum limits";
                    adjustedAmount = 25;
                }

                return {
                    ...claim,
                    reconciliation: { trustScore, adjustedAmount, flag }
                };
            });
        }
    }
}

module.exports = new ReconciliationService();
