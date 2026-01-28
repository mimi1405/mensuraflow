/**
 * Cutout Naming Utilities
 *
 * Purpose: Handles automatic generation of unique cutout names:
 * - Generates sequential names in the format ./.<nn>
 * - Ensures uniqueness within a plan
 * - Zero-pads numbers to 2 digits
 *
 * This is a simple utility module separated for clarity and maintainability.
 */

import { Cutout } from '../../types';

/**
 * Generates a unique cutout name for a plan
 * Format: ./.<nn> where nn is zero-padded to 2 digits
 */
export function generateCutoutName(existingCutouts: Cutout[], planId: string): string {
  const planCutouts = existingCutouts.filter(c => c.plan_id === planId);
  const nextNumber = planCutouts.length + 1;
  return `./.${nextNumber.toString().padStart(2, '0')}`;
}
