import moment from 'moment';

export interface ShopHours {
  daysOpen: number[]; // Array of numbers, 0=Sun, 1=Mon, ..., 6=Sat
  openHour: number; // Integer, 0-23, opening hour (e.g. 9)
  closeHour: number; // Integer, 0-23, closing hour (e.g. 18)
}

/**
 * Checks if the shop is open for the given date/time according to shopHours.
 * @param date - The date/time to check
 * @param shopHours - The shop hours configuration
 * @returns true if the shop is open at the given date/time
 */
export const isShopOpen = (date: Date, shopHours: ShopHours): boolean => {
  const momentDate = moment(date);
  const dayOfWeek = momentDate.day(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const hour = momentDate.hour();

  // Check if the day is in the daysOpen array
  if (!shopHours.daysOpen.includes(dayOfWeek)) {
    return false;
  }

  // Check if the hour is within shop hours
  // Handle edge case where closeHour might be less than openHour (next day close)
  if (shopHours.closeHour >= shopHours.openHour) {
    // Same day close (normal case)
    return hour >= shopHours.openHour && hour < shopHours.closeHour;
  } else {
    // Next day close (e.g., 22:00 to 6:00)
    return hour >= shopHours.openHour || hour < shopHours.closeHour;
  }
};

/**
 * Gets the next shop opening time from the given date.
 * @param date - The starting date
 * @param shopHours - The shop hours configuration
 * @returns Date of the next shop opening time
 */
export const getNextShopOpen = (date: Date, shopHours: ShopHours): Date => {
  const momentDate = moment(date);

  // If already open, return the current time
  if (isShopOpen(date, shopHours)) {
    return date;
  }

  // Start looking from the current day
  let searchDate = momentDate.clone();

  // Look ahead up to 7 days to find the next open day
  for (let i = 0; i < 7; i++) {
    const dayOfWeek = searchDate.day();

    if (shopHours.daysOpen.includes(dayOfWeek)) {
      // This day is open, set to opening hour
      const openTime = searchDate
        .clone()
        .hour(shopHours.openHour)
        .minute(0)
        .second(0)
        .millisecond(0);

      // If it's the same day and we haven't passed opening time yet, return opening time
      if (i === 0 && moment(date).isBefore(openTime)) {
        return openTime.toDate();
      }

      // If it's a future day or we've passed opening time today, return opening time
      if (i > 0) {
        return openTime.toDate();
      }
    }

    // Move to next day
    searchDate.add(1, 'day');
  }

  // Fallback: should not reach here if at least one day is open
  return searchDate.toDate();
};

/**
 * Gets the shop closing time for the given date.
 * @param date - The date to check
 * @param shopHours - The shop hours configuration
 * @returns Date of shop closing time, or null if shop is not open on this day
 */
export const getShopCloseForDay = (date: Date, shopHours: ShopHours): Date | null => {
  const momentDate = moment(date);
  const dayOfWeek = momentDate.day();

  if (!shopHours.daysOpen.includes(dayOfWeek)) {
    return null;
  }

  const closeTime = momentDate.clone().hour(shopHours.closeHour).minute(0).second(0).millisecond(0);

  // If closeHour is less than openHour, it means it closes next day
  if (shopHours.closeHour < shopHours.openHour) {
    closeTime.add(1, 'day');
  }

  return closeTime.toDate();
};

/**
 * Checks if a given day of the week is a shop open day.
 * @param dayOfWeek - Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 * @param shopHours - The shop hours configuration
 * @returns true if the shop is open on this day of the week
 */
export const isShopOpenDay = (dayOfWeek: number, shopHours: ShopHours): boolean => {
  return shopHours.daysOpen.includes(dayOfWeek);
};

/**
 * Default shop hours for new tenants (Monday to Friday, 9 AM to 6 PM).
 */
export const DEFAULT_SHOP_HOURS: ShopHours = {
  daysOpen: [1, 2, 3, 4, 5], // Monday to Friday
  openHour: 9,
  closeHour: 18,
};
