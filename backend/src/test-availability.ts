#!/usr/bin/env tsx

import { connectDatabase, disconnectDatabase } from './db/connection.js';
import { availabilityService } from './services/availability.service.js';

async function testAvailability() {
  try {
    await connectDatabase();

    console.log('\n' + '='.repeat(70));
    console.log('Testing Availability Engine with Different Timezones');
    console.log('='.repeat(70) + '\n');

    const testDate = '2026-09-30';
    const timezones = [
      'Europe/London',
      'America/New_York',
      'Asia/Kolkata',
      'Asia/Tokyo',
      'Australia/Sydney',
    ];

    for (const timezone of timezones) {
      console.log(`\nTimezone: ${timezone}`);
      console.log('-'.repeat(70));

      const result = await availabilityService.getAvailableSlots(testDate, timezone);

      console.log(`Date: ${result.parentDate}`);
      console.log(`Total slots available: ${result.slots.length}`);

      if (result.slots.length > 0) {
        console.log('\nFirst 5 slots:');
        result.slots.slice(0, 5).forEach((slot, index) => {
          console.log(`  ${index + 1}. ${slot.parentLocalTime} (${slot.startInstant})`);
        });

        if (result.slots.length > 5) {
          console.log(`  ... and ${result.slots.length - 5} more slots`);
        }
      } else {
        console.log('No slots available for this date/timezone combination');
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✓ Availability engine test completed');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

testAvailability();
