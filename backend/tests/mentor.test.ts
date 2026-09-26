import { describe, it, expect, beforeEach } from 'vitest';
import { mentorService } from '../src/services/mentor.service.js';
import { mentorRepository } from '../src/repositories/mentor.repository.js';
import { Mentor } from '../src/models/mentor.schema.js';

describe('Mentor Domain', () => {
  describe('MentorRepository', () => {
    it('should retrieve all active mentors', async () => {
      const activeMentors = await mentorRepository.findActiveMentors();
      
      expect(activeMentors.length).toBeGreaterThan(0);
      activeMentors.forEach(mentor => {
        expect(mentor.active).toBe(true);
        expect(mentor.name).toBeDefined();
        expect(mentor.email).toBeDefined();
        expect(mentor.timezone).toBeDefined();
      });
    });

    it('should exclude inactive mentors from active mentor query', async () => {
      // First, deactivate one mentor temporarily
      const testMentor = await Mentor.findOne({ active: true });
      if (!testMentor) {
        throw new Error('No active mentor found for test');
      }

      const originalStatus = testMentor.active;
      testMentor.active = false;
      await testMentor.save();

      try {
        const activeMentors = await mentorRepository.findActiveMentors();
        const inactiveMentorInResults = activeMentors.find(
          m => m._id.toString() === testMentor._id.toString()
        );
        
        expect(inactiveMentorInResults).toBeUndefined();
      } finally {
        // Restore original status
        testMentor.active = originalStatus;
        await testMentor.save();
      }
    });

    it('should retrieve a mentor by valid ID', async () => {
      const allMentors = await mentorRepository.findAll();
      const firstMentor = allMentors[0];
      
      const foundMentor = await mentorRepository.findById(firstMentor._id);
      
      expect(foundMentor).not.toBeNull();
      expect(foundMentor?._id.toString()).toBe(firstMentor._id.toString());
      expect(foundMentor?.name).toBe(firstMentor.name);
      expect(foundMentor?.email).toBe(firstMentor.email);
    });

    it('should return null for non-existent mentor ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const mentor = await mentorRepository.findById(nonExistentId);
      
      expect(mentor).toBeNull();
    });

    it('should return null for invalid mentor ID format', async () => {
      const invalidId = 'invalid-id-format';
      const mentor = await mentorRepository.findById(invalidId);
      
      expect(mentor).toBeNull();
    });

    it('should count active mentors correctly', async () => {
      const count = await mentorRepository.countActiveMentors();
      const activeMentors = await mentorRepository.findActiveMentors();
      
      expect(count).toBe(activeMentors.length);
      expect(count).toBeGreaterThan(0);
    });
  });

  describe('MentorService', () => {
    it('should return active mentors with public information only', async () => {
      const mentors = await mentorService.getActiveMentors();
      
      expect(mentors.length).toBeGreaterThan(0);
      
      mentors.forEach(mentor => {
        expect(mentor).toHaveProperty('id');
        expect(mentor).toHaveProperty('name');
        expect(mentor).toHaveProperty('email');
        expect(mentor).toHaveProperty('timezone');
        expect(mentor).toHaveProperty('isActive');
        
        // Should not expose internal database fields
        expect(mentor).not.toHaveProperty('_id');
        expect(mentor).not.toHaveProperty('__v');
        expect(mentor).not.toHaveProperty('createdAt');
        expect(mentor).not.toHaveProperty('updatedAt');
        
        expect(mentor.isActive).toBe(true);
        expect(typeof mentor.id).toBe('string');
        expect(mentor.id.length).toBeGreaterThan(0);
      });
    });

    it('should return a mentor by ID with public information', async () => {
      const allMentors = await mentorService.getActiveMentors();
      const firstMentorId = allMentors[0].id;
      
      const mentor = await mentorService.getMentorById(firstMentorId);
      
      expect(mentor).not.toBeNull();
      expect(mentor?.id).toBe(firstMentorId);
      expect(mentor?.name).toBeDefined();
      expect(mentor?.email).toBeDefined();
      expect(mentor?.timezone).toBeDefined();
      expect(mentor?.isActive).toBe(true);
    });

    it('should return null for non-existent mentor ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const mentor = await mentorService.getMentorById(nonExistentId);
      
      expect(mentor).toBeNull();
    });

    it('should return null for invalid mentor ID format', async () => {
      const invalidId = 'invalid-id';
      const mentor = await mentorService.getMentorById(invalidId);
      
      expect(mentor).toBeNull();
    });
  });

  describe('Database Integrity', () => {
    it('should verify 10 mentors exist in the database', async () => {
      const allMentors = await mentorRepository.findAll();
      expect(allMentors.length).toBe(10);
    });

    it('should verify all 10 mentors are active', async () => {
      const activeMentors = await mentorRepository.findActiveMentors();
      expect(activeMentors.length).toBe(10);
    });

    it('should verify mentor schema contains required fields', async () => {
      const mentor = await Mentor.findOne();
      
      expect(mentor).not.toBeNull();
      expect(mentor?.name).toBeDefined();
      expect(mentor?.email).toBeDefined();
      expect(mentor?.timezone).toBe('Asia/Kolkata');
      expect(mentor?.active).toBeDefined();
      expect(mentor?.workingHoursStart).toBe('09:00');
      expect(mentor?.workingHoursEnd).toBe('18:00');
      expect(mentor?.createdAt).toBeDefined();
      expect(mentor?.updatedAt).toBeDefined();
    });
  });
});
