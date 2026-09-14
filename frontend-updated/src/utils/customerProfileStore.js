// Stores the customer's own profile (identity + default site/company details)
// separately from any individual application. This is what "New Application"
// pre-fills from, so the customer doesn't retype their name/address every time.
//
// Backed by a fast localStorage cache for instant, synchronous reads (same
// as before), while every write is also persisted to MongoDB via the
// backend API in the background.

import { fetchProfile, putProfile } from '../services/customerProfileService';

const PROFILE_KEY = 'customerProfile';

const emptyProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  companyName: '',
  companyNumber: '',
  companyPropertyNumber: '',
  companyStreetName: '',
  companyTown: '',
  companyPostcode: '',
  propertyNumber: '',
  streetName: '',
  town: '',
  postcode: '',
};

export function getProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...emptyProfile, ...JSON.parse(raw) };
  } catch (e) {
    // fall through to defaults
  }
  // First time in: seed from the lightweight `user` record set at login,
  // so at least name/email are pre-filled even before the customer has
  // saved a full profile via Settings or a first application.
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user')) || {};
  } catch (e) {
    user = {};
  }
  return {
    ...emptyProfile,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    email: user.email || '',
  };
}

export function saveProfile(profile) {
  const merged = { ...getProfile(), ...profile };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));

  // Keep the lightweight `user` record (used for the sidebar avatar/greeting)
  // in sync with name + email.
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem('user')) || {};
  } catch (e) {
    user = {};
  }
  localStorage.setItem(
    'user',
    JSON.stringify({ ...user, firstName: merged.firstName, lastName: merged.lastName, email: merged.email })
  );

  putProfile(merged).catch((err) =>
    console.warn('Could not save profile to server:', err.message)
  );

  return merged;
}

/**
 * Pull the signed-in account's profile from MongoDB and replace the local
 * cache with it. Call this right after login (before navigating to a
 * dashboard) so the first render already shows the account's real saved
 * details instead of stale local data.
 */
export async function syncProfileFromServer() {
  try {
    const res = await fetchProfile();
    const merged = { ...emptyProfile, ...res.data.profile };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
    return merged;
  } catch (err) {
    console.warn('Could not sync profile from server:', err.message);
    return getProfile();
  }
}

// True once we have enough identity info to treat the applicant's name/email
// as "known" and lock those fields on the New Application form.
export function hasIdentity(profile) {
  return Boolean(profile.firstName && profile.lastName && profile.email && profile.phone);
}
