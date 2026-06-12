/**
 * Calculate working days between two dates (excludes Sundays only).
 * @param {string} startDateStr - ISO date string (e.g., '2024-01-15')
 * @param {string} endDateStr - ISO date string (e.g., '2024-01-20')
 * @returns {number} Number of working days (inclusive of start and end)
 */
function calculateWorkingDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) {
    return 0;
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }

  if (startDate > endDate) {
    return 0;
  }

  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    // getDay() returns 0 for Sunday
    if (current.getDay() !== 0) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

module.exports = { calculateWorkingDays };
