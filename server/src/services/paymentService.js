/**
 * PaymentService
 * Handles payment calculations and processing logic.
 */
exports.calculatePayment = (meters, ratePerMeter) => {
    if (!meters || !ratePerMeter) return 0;
    return meters * ratePerMeter;
};
