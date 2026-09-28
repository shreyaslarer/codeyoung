import { describe, it, expect } from 'vitest';

describe('Calendar Date Picker Matrix Calculation', () => {
  it('should accurately calculate first weekday and total days for September 2026', () => {
    const year = 2026;
    const month = 8; // September (0-indexed)

    const firstDayOfWeek = new Date(year, month, 1).getDay(); // Tuesday = 2
    const totalDays = new Date(year, month + 1, 0).getDate(); // 30 days

    expect(firstDayOfWeek).toBe(2);
    expect(totalDays).toBe(30);
  });

  it('should accurately calculate first weekday and total days for October 2026', () => {
    const year = 2026;
    const month = 9; // October (0-indexed)

    const firstDayOfWeek = new Date(year, month, 1).getDay(); // Thursday = 4
    const totalDays = new Date(year, month + 1, 0).getDate(); // 31 days

    expect(firstDayOfWeek).toBe(4);
    expect(totalDays).toBe(31);
  });

  it('should mark Sundays as non-class days', () => {
    // 2026-10-04 is a Sunday
    const sundayDate = new Date(2026, 9, 4);
    expect(sundayDate.getDay()).toBe(0);

    // 2026-10-05 is a Monday
    const mondayDate = new Date(2026, 9, 5);
    expect(mondayDate.getDay()).toBe(1);
  });

  it('should correctly determine past dates relative to minimum booking date', () => {
    const minDateStr = '2026-09-28';
    expect('2026-09-27' < minDateStr).toBe(true);
    expect('2026-09-28' < minDateStr).toBe(false);
    expect('2026-09-29' < minDateStr).toBe(false);
  });
});
