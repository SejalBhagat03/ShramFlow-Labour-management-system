/**
 * @file validations.js
 * @description Centralized validation logic for ShramFlow.
 */

export const validatePhone = (phone) => {
    if (!phone) return { isValid: false, message: "Phone number is required" };
    const phoneRegex = /^[6-9]\d{9}$/; // Indian 10-digit mobile logic
    if (!phoneRegex.test(phone)) {
        return { isValid: false, message: "Enter a valid 10-digit Indian mobile number" };
    }
    return { isValid: true };
};

export const validateAmount = (amount, min = 0, max = 1000000) => {
    const num = Number(amount);
    if (isNaN(num)) return { isValid: false, message: "Must be a valid number" };
    if (num < min) return { isValid: false, message: `Amount cannot be less than ₹${min}` };
    if (num > max) return { isValid: false, message: `Amount exceeds maximum limit (₹${max.toLocaleString()})` };
    return { isValid: true };
};

export const validateDate = (dateString) => {
    if (!dateString) return { isValid: false, message: "Date is required" };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { isValid: false, message: "Invalid date format" };
    
    const now = new Date();
    if (date > now) return { isValid: false, message: "Future dates are not allowed" };
    
    return { isValid: true };
};

export const validateLabourer = (data) => {
    const errors = {};
    
    if (!data.name?.trim()) errors.name = "Name is required";
    
    const phoneVal = validatePhone(data.phone);
    if (!phoneVal.isValid) errors.phone = phoneVal.message;
    
    const rateVal = validateAmount(data.daily_rate, 100, 5000);
    if (!rateVal.isValid) errors.daily_rate = rateVal.message;
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

export const validatePayment = (data) => {
    const errors = {};
    
    if (!data.labourer_id) errors.labourer_id = "Please select a labourer";
    
    const amountVal = validateAmount(data.amount, 1, 50000);
    if (!amountVal.isValid) errors.amount = amountVal.message;
    
    const dateVal = validateDate(data.date);
    if (!dateVal.isValid) errors.date = dateVal.message;
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
