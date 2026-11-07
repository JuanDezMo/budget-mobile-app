// The person who uses this device (RN-42). Stored locally; the email is not verified.
export type Profile = {
  fullName: string;
  email: string;
  countryCode: string;
};

export type ProfileUpdate = Partial<Profile>;

export type { PinLockState } from '@/core/shared/pin-lock-state';

// Where the user is relative to the app door: registration (RN-42), PIN (RN-44) or inside.
export type AccessStatus = 'loading' | 'needsRegistration' | 'locked' | 'unlocked';
