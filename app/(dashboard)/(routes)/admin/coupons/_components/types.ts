export type CouponListItem = {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  currency: string;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  maxRedemptions: number | null;
  maxRedemptionsPerUser: number | null;
  applicableCourseIds: string[];
  campaignToken: string | null;
  autoApply: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  _count: { redemptions: number };
};

export type CourseOption = {
  id: string;
  title: string;
};
