import type { Passenger } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface PassengerValidationResult {
  isValid: boolean;
  errors: Record<string, string>; // field -> error message
}

/**
 * Validates passport number format
 * Basic validation - checks for alphanumeric characters and length
 */
export function validatePassportNumber(passportNumber: string): string | null {
  if (!passportNumber) {
    return 'Passport number is required for international flights';
  }

  // Remove spaces and check length (most passports are 6-9 characters)
  const cleaned = passportNumber.replace(/\s/g, '');
  if (cleaned.length < 6 || cleaned.length > 9) {
    return 'Passport number should be 6-9 characters';
  }

  // Check if alphanumeric
  if (!/^[A-Z0-9]+$/i.test(cleaned)) {
    return 'Passport number should only contain letters and numbers';
  }

  return null;
}

/**
 * Validates date of birth
 * - Must be a valid date
 * - Must be at least 18 years ago for adults (or allow children if specified)
 * - Must not be in the future
 */
export function validateDateOfBirth(dateOfBirth: string, allowChildren = true): string | null {
  if (!dateOfBirth) {
    return 'Date of birth is required';
  }

  const dob = new Date(dateOfBirth);
  const today = new Date();

  if (isNaN(dob.getTime())) {
    return 'Invalid date format';
  }

  if (dob > today) {
    return 'Date of birth cannot be in the future';
  }

  // Calculate age
  const age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

  if (!allowChildren && age < 18) {
    return 'Passenger must be at least 18 years old';
  }

  if (age > 120) {
    return 'Please enter a valid date of birth';
  }

  return null;
}

/**
 * Validates passport expiry date
 * - Must be a valid date
 * - Must be at least 6 months in the future (common requirement for international travel)
 * - Must not be already expired
 */
export function validatePassportExpiry(expiryDate: string): string | null {
  if (!expiryDate) {
    return 'Passport expiry date is required';
  }

  const expiry = new Date(expiryDate);
  const today = new Date();

  if (isNaN(expiry.getTime())) {
    return 'Invalid date format';
  }

  if (expiry < today) {
    return 'Passport has already expired';
  }

  // Check if passport expires within 6 months
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

  if (expiry < sixMonthsFromNow) {
    return 'Passport must be valid for at least 6 months';
  }

  return null;
}

/**
 * Validates name field
 * - Must not be empty
 * - Must contain only letters, spaces, hyphens, and apostrophes
 * - Must be at least 2 characters
 */
export function validateName(name: string, fieldName: string): string | null {
  if (!name) {
    return `${fieldName} is required`;
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }

  // Allow letters, spaces, hyphens, and apostrophes (for names like O'Brien, Mary-Jane)
  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return `${fieldName} should only contain letters, spaces, hyphens, and apostrophes`;
  }

  return null;
}

/**
 * Validates passport country code
 * - Must be a 2-letter ISO country code
 */
export function validateCountryCode(countryCode: string): string | null {
  if (!countryCode) {
    return 'Passport country is required';
  }

  const cleaned = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cleaned)) {
    return 'Country code must be 2 letters (e.g., US, GB, CA)';
  }

  return null;
}

/**
 * Validates an entire passenger object
 * Returns validation result with all errors
 */
export function validatePassenger(passenger: Passenger, passengerIndex: number): PassengerValidationResult {
  const errors: Record<string, string> = {};
  const prefix = passengerIndex > 0 ? `passenger${passengerIndex}_` : '';

  // Validate first name
  const firstNameError = validateName(passenger.firstName, 'First name');
  if (firstNameError) {
    errors[`${prefix}firstName`] = firstNameError;
  }

  // Validate last name
  const lastNameError = validateName(passenger.lastName, 'Last name');
  if (lastNameError) {
    errors[`${prefix}lastName`] = lastNameError;
  }

  // Validate date of birth
  const dobError = validateDateOfBirth(passenger.dateOfBirth);
  if (dobError) {
    errors[`${prefix}dateOfBirth`] = dobError;
  }

  // Validate passport fields (optional, but if provided, must be valid)
  if (passenger.passportNumber) {
    const passportError = validatePassportNumber(passenger.passportNumber);
    if (passportError) {
      errors[`${prefix}passportNumber`] = passportError;
    }
  }

  if (passenger.passportExpiry) {
    const expiryError = validatePassportExpiry(passenger.passportExpiry);
    if (expiryError) {
      errors[`${prefix}passportExpiry`] = expiryError;
    }
  }

  if (passenger.passportCountry) {
    const countryError = validateCountryCode(passenger.passportCountry);
    if (countryError) {
      errors[`${prefix}passportCountry`] = countryError;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates all passengers in an array
 */
export function validateAllPassengers(passengers: Passenger[]): PassengerValidationResult {
  const allErrors: Record<string, string> = {};

  passengers.forEach((passenger, index) => {
    const result = validatePassenger(passenger, index);
    Object.assign(allErrors, result.errors);
  });

  return {
    isValid: Object.keys(allErrors).length === 0,
    errors: allErrors,
  };
}
