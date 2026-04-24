/**
 * Reusable utility for WhatsApp Click-to-Chat functionality.
 * This method is free and production-safe as it uses standard wa.me redirects.
 */

/**
 * Formats a phone number to international format (e.g., 91XXXXXXXXXX).
 * Assumes Indian numbers if the length is 10 and no country code is provided.
 * 
 * @param {string} phone - Raw phone number string.
 * @returns {string} - Formatted phone number.
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it's a 10-digit number, prepend 91 (India)
    if (cleaned.length === 10) {
        return `91${cleaned}`;
    }
    
    // If it already starts with 91 and has 12 digits, return as is
    return cleaned;
};

/**
 * Generates a WhatsApp Click-to-Chat link.
 * 
 * @param {string} phone - Destination phone number.
 * @param {string} message - Pre-filled message text.
 * @returns {string} - The wa.me URL.
 */
export const generateWhatsAppLink = (phone, message) => {
    const formattedPhone = formatPhoneNumber(phone);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

/**
 * Common message templates for ShramFlow.
 */
export const whatsappTemplates = {
    bookingConfirmation: (name, date, location) => 
        `Hello ${name},\nYour booking is confirmed ✅\n\n📅 Date: ${date}\n📍 Location: ${location}\n\nThank you!`,
    
    workAssignment: (workerName, site, date) => 
        `Hello ${workerName},\nYou have been assigned work today.\n\n📍 Location: ${site}\n📅 Date: ${date}\n\nPlease report on time.`,
    
    paymentConfirmation: ({ name, amount, date }) =>
        `Hello ${name},\nYour payment has been processed successfully 💸\n\n${amount ? `💰 Amount: ₹${amount}\n` : ''}${date ? `📅 Date: ${date}\n` : ''}\nThank you for your hard work!`
};
