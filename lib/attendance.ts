export type AttendanceWindow = 'EARLY' | 'WINDOW_1' | 'WINDOW_2' | 'LOCKED';

/**
 * Calculates the current attendance window based on session start time and current time.
 * @param scheduledAt Session start time
 * @param now Current time
 * @returns AttendanceWindow
 */
export function getAttendanceWindow(scheduledAt: Date, now: Date): AttendanceWindow {
  const diffMinutes = (now.getTime() - scheduledAt.getTime()) / (1000 * 60);

  if (diffMinutes < 0) return 'EARLY';
  if (diffMinutes <= 13) return 'WINDOW_1'; // start to +13 mins
  if (diffMinutes <= 18) return 'WINDOW_2'; // +13 to +18 mins
  return 'LOCKED'; // after +18 mins
}

/**
 * Determines if we've reached the 15-minute mark where auto-submission happens.
 */
export function isPastAutoSubmitTime(scheduledAt: Date, now: Date): boolean {
  const diffMinutes = (now.getTime() - scheduledAt.getTime()) / (1000 * 60);
  return diffMinutes >= 15;
}
