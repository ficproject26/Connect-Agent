/**
 * Shared date & time utilities used across dashboard views.
 */

/**
 * Returns a time-of-day greeting string.
 * Morning (before 12), Afternoon (12–17), Evening (after 17).
 */
export const getGreeting = (): string => {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Returns the current date formatted as:
 * "WEDNESDAY, 14 JULY 2026"
 */
export const getFormattedDate = (): string => {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
};
