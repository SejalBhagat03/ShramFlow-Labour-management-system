/**
 * SmartAnalyticsService
 * Provides intelligent logic for trust scoring, fraud detection, and reliability indexing.
 */
export const smartAnalyticsService = {
    /**
     * Calculates a trust score for a work entry (0-100)
     * @param {Object} entry - The work entry object
     * @param {Object[]} history - Recent work history of the labourer
     * @returns {Object} { score: number, flags: string[] }
     */
    calculateTrustScore(entry, history = []) {
        let score = 0;
        const flags = [];

        // 1. Time-based scoring (Realistic working hours: 6 AM to 8 PM)
        const hour = new Date(entry.created_at || new Date()).getHours();
        if (hour >= 6 && hour <= 20) {
            score += 30;
        } else {
            flags.push("Entry at unusual hour");
        }

        // 2. Submission speed (Same day submission)
        const entryDate = entry.date;
        const today = new Date().toISOString().split('T')[0];
        if (entryDate === today) {
            score += 10;
        }

        // 3. Area Match (This requires comparing with a supervisor estimate if provided)
        // For simplicity, we assume matching an estimate adds 40.
        // If meters are reasonable (e.g. 1-100m for a single day)
        if (entry.meters && entry.meters > 0 && entry.meters <= 150) {
            score += 40;
        } else if (entry.meters > 150) {
            flags.push("High area volume detected");
        }

        // 4. Default baseline for existence
        score += 20;

        return { score: Math.min(score, 100), flags };
    },

    /**
     * Detects suspicious patterns across multiple entries
     * @param {Object} newEntry 
     * @param {Object[]} history 
     * @returns {string[]} Detected pattern warnings
     */
    detectFraudPatterns(newEntry, history = []) {
        const warnings = [];

        // Pattern 1: Exact same area for 3+ days
        const identicalAreaDays = history
            .filter(h => h.task_type === newEntry.task_type && h.meters === newEntry.meters)
            .length;

        if (identicalAreaDays >= 3) {
            warnings.push("Repeated area pattern detected");
        }

        // Pattern 2: Duplicates
        const isDuplicate = history.some(h =>
            h.date === newEntry.date &&
            h.labourer_id === newEntry.labourer_id &&
            h.task_type === newEntry.task_type
        );
        if (isDuplicate) {
            warnings.push("Potential duplicate entry");
        }

        return warnings;
    },

    /**
     * Updates the labourer's reliability score in the database
     */
    async updateReliabilityIndex(labourerId, entryScore) {
        // Fetch current score
        const { data: labourer } = await supabase
            .from('labourers')
            .select('trust_score')
            .eq('id', labourerId)
            .single();

        if (!labourer) return;

        // Weighted moving average (New score is 20% weight)
        const currentScore = labourer.trust_score || 70; // Start at 70 if null
        const newTotalScore = Math.round((currentScore * 0.8) + (entryScore * 0.2));

        // Determine badge
        let badge = 'normal';
        if (newTotalScore >= 85) badge = 'trusted';
        if (newTotalScore < 50) badge = 'needs_review';

        await supabase
            .from('labourers')
            .update({
                trust_score: newTotalScore,
                trust_badge: badge
            })
            .eq('id', labourerId);
    }
};

