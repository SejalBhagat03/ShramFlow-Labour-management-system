import { supabase } from '@/lib/supabase';

/**
 * LogSyncService
 * Automatically synchronizes work entries into the Daily Logs table.
 */
export const logSyncService = {
    /**
     * Generates a daily log from a single work entry
     */
    async syncWorkToLog(workEntry, analytics) {
        const { score, flags } = analytics;

        const trustLabel = score >= 80 ? "High" : score >= 50 ? "Medium" : "Low";
        const badgeEmoji = score >= 80 ? "🟢" : score >= 50 ? "🟡" : "🔴";

        const { error } = await supabase.from('daily_logs').insert({
            user_id: workEntry.supervisor_id,
            labourer_id: workEntry.labourer_id,
            date: workEntry.date,
            title: `Work Recorded: ${workEntry.task_type}`,
            description: `Automated Log: ${workEntry.meters || workEntry.hours || 'Unit'} work registered.\nTrust: ${trustLabel} (${score}%)\n${flags.length ? 'Flags: ' + flags.join(', ') : 'No flags'}`,
            log_type: 'proof',
            metadata: {
                work_entry_id: workEntry.id,
                trust_score: score,
                flags: flags,
                badge: badgeEmoji
            }
        });

        if (error) {
            if (import.meta.env.DEV) console.error("Failed to sync log:", error);
        }
        await this.updateDailySummary(workEntry.date, workEntry.supervisor_id);
    },

    /**
     * Generates a summary log for group work
     */
    async syncGroupWorkToLog(bulkEntries, totalArea) {
        if (!bulkEntries.length) return;
        const main = bulkEntries[0];

        const { error } = await supabase.from('daily_logs').insert({
            user_id: main.supervisor_id,
            date: main.date,
            title: `Group Work Summary: ${main.task_type}`,
            description: `Aggregated Log: ${totalArea}m completed by ${bulkEntries.length} labourers at ${main.location || 'site'}.`,
            log_type: 'diary',
            metadata: {
                group_id: main.group_id,
                labourer_count: bulkEntries.length,
                total_area: totalArea
            }
        });

        if (error) {
            if (import.meta.env.DEV) console.error("Failed to sync group log:", error);
        }
        await this.updateDailySummary(main.date, main.supervisor_id);
    },

    /**
     * Updates/Creates a comprehensive daily summary log
     */
    async updateDailySummary(date, supervisorId) {
        // 1. Fetch all work entries for this day
        const { data: entries } = await supabase
            .from('work_entries')
            .select('meters, hours, id, status')
            .eq('date', date)
            .eq('supervisor_id', supervisorId);

        if (!entries || entries.length === 0) return;

        const totalArea = entries.reduce((sum, e) => sum + (e.meters || 0), 0);
        const totalEntries = entries.length;
        const flaggedCount = entries.filter(e => e.status === 'flagged').length;

        const summaryTitle = `Daily Summary - ${date}`;
        const summaryDesc = `• Total Work Entries: ${totalEntries}\n• Total Area: ${totalArea}m\n• Active Flagged Logs: ${flaggedCount}`;

        // 2. Check if summary already exists
        const { data: existing } = await supabase
            .from('daily_logs')
            .select('id')
            .eq('date', date)
            .eq('log_type', 'summary')
            .single();

        if (existing) {
            await supabase.from('daily_logs').update({
                title: summaryTitle,
                description: summaryDesc,
                metadata: { totalArea, totalEntries, flaggedCount }
            }).eq('id', existing.id);
        } else {
            await supabase.from('daily_logs').insert({
                user_id: supervisorId,
                date: date,
                title: summaryTitle,
                description: summaryDesc,
                log_type: 'summary',
                metadata: { totalArea, totalEntries, flaggedCount }
            });
        }
    }
};

