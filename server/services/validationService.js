/**
 * ValidationService
 * Handles fraud detection and data validation.
 */
exports.validateWorkEntry = (entry, history) => {
    const flags = [];

    // Example fraud check: repeated area patterns
    const identicalAreaDays = history.filter(h => h.task_type === entry.task_type && h.meters === entry.meters).length;
    if (identicalAreaDays >= 3) {
        flags.push('REPEATED_AREA_PATTERN');
    }

    return {
        isValid: flags.length === 0,
        flags
    };
};
