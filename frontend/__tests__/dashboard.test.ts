import { describe, it, expect } from "vitest";
import {
  DASHBOARD_METRICS,
  SCHEDULING_ACTIVITIES,
  MENTOR_ALLOCATIONS,
  NEXT_AVAILABLE_MENTORS,
  VERIFICATION_SUMMARY,
} from "@/constants/dashboard.constants";

describe("Internal Scheduling Verification Dashboard", () => {
  it("should have correct core metrics math and invariants", () => {
    const bookingsMetric = DASHBOARD_METRICS.find((m) => m.id === "bookings");
    const mentorsMetric = DASHBOARD_METRICS.find((m) => m.id === "mentors");
    const classesMetric = DASHBOARD_METRICS.find((m) => m.id === "classes");
    const capacityMetric = DASHBOARD_METRICS.find((m) => m.id === "capacity");

    expect(bookingsMetric?.value).toBe(7);
    expect(mentorsMetric?.value).toBe(5);
    expect(mentorsMetric?.total).toBe(10);
    expect(classesMetric?.value).toBe(7);
    expect(classesMetric?.total).toBe(20);
    expect(capacityMetric?.value).toBe(13);

    // Invariant: classes (7) + remaining capacity (13) == 20 total daily capacity
    expect(Number(classesMetric?.value) + Number(capacityMetric?.value)).toBe(20);
  });

  it("should verify mentor allocation rules (max 2 classes per mentor/day)", () => {
    MENTOR_ALLOCATIONS.forEach((m) => {
      expect(m.assignedCount).toBeLessThanOrEqual(m.maxCapacity);
      expect(m.maxCapacity).toBe(2);
      if (m.assignedCount === m.maxCapacity) {
        expect(m.isFull).toBe(true);
      } else {
        expect(m.isFull).toBe(false);
      }
    });

    const totalAllocated = MENTOR_ALLOCATIONS.reduce((acc, m) => acc + m.assignedCount, 0);
    expect(totalAllocated).toBe(7);
  });

  it("should verify next available queue contains zero-load mentors", () => {
    expect(NEXT_AVAILABLE_MENTORS.length).toBeGreaterThan(0);
    NEXT_AVAILABLE_MENTORS.forEach((m) => {
      expect(m.assignedCount).toBe(0);
      expect(m.maxCapacity).toBe(2);
    });
  });

  it("should verify all scheduling activities have valid cross-border fields", () => {
    expect(SCHEDULING_ACTIVITIES.length).toBe(7);
    SCHEDULING_ACTIVITIES.forEach((activity) => {
      expect(activity.id).toMatch(/^BK-\d{4}$/);
      expect(activity.parentName.trim().length).toBeGreaterThan(0);
      expect(activity.parentEmail).toContain("@");
      expect(activity.parentLocalTime).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
      expect(activity.timezone).toBeTruthy();
      expect(activity.mentor.name).toBeTruthy();
      expect(activity.slotIst).toContain("IST");
      expect(activity.status).toBe("Confirmed");
      expect(activity.classUrl).toBeDefined();
      expect(activity.classUrl).toMatch(/^https:\/\/meet\.codeyoung\.(com|dev)\/trial\/room-cy-\d{4}$/);
    });
  });

  it("should verify that each scheduled mentor can be resolved to their exact class meeting URL", () => {
    // Mentor 02 has 2 bookings
    const mentor02Bookings = SCHEDULING_ACTIVITIES.filter((a) => a.mentor.code === "02");
    expect(mentor02Bookings.length).toBe(2);
    mentor02Bookings.forEach((b) => {
      expect(b.classUrl).toBeTruthy();
      expect(b.classUrl).toContain("room-cy-");
    });

    // Mentor 07 has 1 booking
    const mentor07Bookings = SCHEDULING_ACTIVITIES.filter((a) => a.mentor.code === "07");
    expect(mentor07Bookings.length).toBe(1);
    expect(mentor07Bookings[0].classUrl).toBe("https://meet.codeyoung.com/trial/room-cy-1024");
  });

  it("should verify system verification summary rules", () => {
    expect(VERIFICATION_SUMMARY.seededMentorsCount).toBe(10);
    expect(VERIFICATION_SUMMARY.dailyCapPerMentor).toBe(2);
    expect(VERIFICATION_SUMMARY.allocationStrategy).toContain("Least-booked");
    expect(VERIFICATION_SUMMARY.dbConstraint).toContain("exclusion constraint");
  });

  it("should return valid fallback or live payload from GET /api/dashboard/stats route", async () => {
    const { GET } = await import("@/app/api/dashboard/stats/route");
    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("metrics");
    expect(data).toHaveProperty("mentorAllocations");
    expect(data).toHaveProperty("allMentors");
    expect(data).toHaveProperty("nextAvailableMentors");
    expect(data).toHaveProperty("activities");
    expect(data).toHaveProperty("invariants");
    expect(data).toHaveProperty("summary");
    expect(Array.isArray(data.metrics)).toBe(true);
    expect(data.metrics.length).toBe(4);
    expect(Array.isArray(data.allMentors)).toBe(true);
    expect(data.allMentors.length).toBe(10);
  });
});

