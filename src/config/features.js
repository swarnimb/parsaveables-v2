/**
 * Feature Flags Configuration
 * Toggle features on/off across the entire app
 *
 * To enable PULP economy when ready:
 * 1. Set pulpEconomy: true
 * 2. Commit and push
 * 3. Vercel will rebuild with features enabled
 */

export const features = {
  // PULP Economy (betting, challenges, advantages)
  pulpEconomy: false, // Set to true when ready to launch
}

/**
 * Helper hook for checking feature flags in components
 */
export function useFeatureFlag(flag) {
  return features[flag] ?? false
}
