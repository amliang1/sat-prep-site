export const USER_ROLES = ["STUDENT", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SECTIONS = ["MATH", "READING_WRITING"] as const;
export type Section = (typeof SECTIONS)[number];

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const EVENT_TYPES = [
  "PAGE_VIEW",
  "QUESTION_VIEW",
  "QUESTION_ANSWERED",
  "SESSION_STARTED",
  "SESSION_COMPLETED",
  "LOGIN"
] as const;
export type EventType = (typeof EVENT_TYPES)[number];
