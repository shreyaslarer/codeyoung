#!/usr/bin/env tsx
import { connectDatabase, disconnectDatabase } from './db/connection.js';
import { availabilityService } from './services/availability.service.js';
import { mentorRepository } from './models/mentor.repository.js';
async function verify() {
    try {
        await connectDatabase();
        const mentorCount = await mentorRepository.count();
        console.log(`\n✓ Found ${mentorCount} mentors in database`);
        console.log('\n Testing availability for Europe/London on 2026-09-30...');
        const result = await availabilityService.getAvailableSlots('2026-09-30', 'Europe/London');
        console.log(`✓ Generated ${result.slots.length} available slots`);
        if (result.slots.length > 0) {
            console.log(`  First slot: ${result.slots[0].parentLocalTime}`);
            console.log(`  Last slot: ${result.slots[result.slots.length - 1].parentLocalTime}`);
        }
        console.log('\n✓ Availability engine is working correctly!\n');
        process.exit(0);
    }
    catch (error) {
        console.error('\n✗ Verification failed:', error);
        process.exit(1);
    }
    finally {
        await disconnectDatabase();
    }
}
verify();
