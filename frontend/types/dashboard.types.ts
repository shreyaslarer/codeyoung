/**
 * TypeScript types for the Codeyoung Scheduling Verification & Management Dashboard.
 * Mode: Operate (high scanability, precise technical constraints, invariant tracking).
 */

export interface MentorBadgeInfo {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly track: 'CODING' | 'MATH' | 'SCIENCE' | 'ENGLISH' | 'ROBOTICS' | 'FINANCE' | 'DEFAULT';
}

export interface BookingActivityItem {
  readonly id: string;
  readonly parentName: string;
  readonly parentEmail: string;
  readonly parentLocalTime: string;
  readonly timezone: string;
  readonly timezoneDetail: string;
  readonly mentor: MentorBadgeInfo;
  readonly slotIst: string;
  readonly status: 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';
  readonly classUrl: string;
}

export interface MetricCardData {
  readonly id: string;
  readonly title: string;
  readonly value: string | number;
  readonly total?: string | number;
  readonly subtext: string;
  readonly iconName: 'calendar' | 'users' | 'pie' | 'zap';
  readonly indicatorColor?: string;
}

export interface MentorAllocationItem {
  readonly mentorCode: string;
  readonly mentorName: string;
  readonly assignedCount: number;
  readonly maxCapacity: number;
  readonly isFull: boolean;
}

export interface AvailableMentorQueueItem {
  readonly mentorCode: string;
  readonly mentorName: string;
  readonly assignedCount: number;
  readonly maxCapacity: number;
}

export interface DashboardVerificationSummary {
  readonly seededMentorsCount: number;
  readonly dailyCapPerMentor: number;
  readonly allocationStrategy: string;
  readonly dbConstraint: string;
}

export type DashboardNavTab = 'overview' | 'mentors' | 'bookings';

export interface MentorFleetItem extends MentorAllocationItem {
  readonly mentorId: string;
  readonly track: string;
  readonly email?: string;
}

export interface DashboardInvariants {
  readonly collisions: number;
  readonly maxDelta: number;
  readonly dbMutex: string;
  readonly loadBalancer: string;
}

export interface DashboardStatsApiResponse {
  readonly metrics: MetricCardData[];
  readonly mentorAllocations: MentorAllocationItem[];
  readonly allMentors: MentorFleetItem[];
  readonly nextAvailableMentors: AvailableMentorQueueItem[];
  readonly activities: BookingActivityItem[];
  readonly invariants: DashboardInvariants;
  readonly summary: DashboardVerificationSummary;
  readonly syncedAt: string;
  readonly selectedDate?: string;
  readonly source?: 'mongodb_live' | 'local_cache';
}

