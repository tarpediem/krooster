// Restaurant types
export interface Restaurant {
  id: number;
  name: string;
  location: string;
  address?: string;
  opening_hours: string;
  closing_hours: string;
  closed_dates?: string[];
}

// Employment types
export type EmploymentType = 'full_time' | 'part_time' | 'extra';
export type ShiftPreference = 'morning' | 'afternoon' | 'flexible';

// Day of week (0=Monday, 6=Sunday)
export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

// Employee types
export interface Employee {
  id: number;
  last_name: string;
  first_name: string;
  phone?: string;
  email?: string;
  restaurant_id: number;
  restaurant_name?: string;
  is_mobile: boolean;
  positions: string[];
  active: boolean;
  hire_date?: string;
  days_off?: number[] | null; // Array of 0-6 (Mon-Sun), e.g. [0, 3] for Mon & Thu
  preferred_shift?: ShiftPreference;
  employment_type: EmploymentType;
  max_hours_per_week?: number | null;
  created_at?: string;
}

export interface CreateEmployeeData {
  last_name: string;
  first_name: string;
  phone?: string;
  email?: string;
  restaurant_id: number;
  is_mobile?: boolean;
  positions?: string[];
  hire_date?: string;
  active?: boolean;
  days_off?: number[] | null;
  preferred_shift?: ShiftPreference;
  employment_type?: EmploymentType;
  max_hours_per_week?: number | null;
}

// Shift preference labels
export const SHIFT_PREFERENCE_LABELS: Record<ShiftPreference, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  flexible: 'Flexible',
};

export const SHIFT_PREFERENCE_ICONS: Record<ShiftPreference, string> = {
  morning: '☀️',
  afternoon: '🌙',
  flexible: '🔄',
};

// Employment type labels
export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  extra: 'Extra',
};

export const EMPLOYMENT_TYPE_COLORS: Record<EmploymentType, string> = {
  full_time: 'bg-green-500',
  part_time: 'bg-blue-500',
  extra: 'bg-orange-500',
};

// Shift types
export interface Shift {
  id: number;
  employee_id: number;
  employee_last_name?: string;
  employee_first_name?: string;
  restaurant_id: number;
  restaurant_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_duration?: number;
  position: string;
  is_mission: boolean;
  status: 'scheduled' | 'confirmed' | 'cancelled';
  notes?: string;
}

export interface CreateShiftData {
  employee_id: number;
  restaurant_id: number;
  date: string;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_duration?: number;
  position: string;
  is_mission?: boolean;
  notes?: string;
}

// Mission types (mobile employees working at other restaurant)
export type MissionStatus = 'proposed' | 'accepted' | 'refused' | 'completed';

export interface Mission {
  id: number;
  employee_id: number;
  employee_first_name?: string;
  employee_last_name?: string;
  origin_restaurant_id: number;
  origin_restaurant_name?: string;
  destination_restaurant_id: number;
  destination_restaurant_name?: string;
  start_date: string;
  end_date: string;
  status: MissionStatus;
  accommodation_planned: boolean;
  notes?: string;
  created_at?: string;
}

export interface CreateMissionData {
  employee_id: number;
  origin_restaurant_id: number;
  destination_restaurant_id: number;
  start_date: string;
  end_date: string;
  accommodation_planned?: boolean;
  notes?: string;
}

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  proposed: 'Proposed',
  accepted: 'Accepted',
  refused: 'Refused',
  completed: 'Completed',
};

export const MISSION_STATUS_COLORS: Record<MissionStatus, string> = {
  proposed: 'bg-yellow-500',
  accepted: 'bg-green-500',
  refused: 'bg-red-500',
  completed: 'bg-blue-500',
};

// Leave/Absence types
export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee_last_name?: string;
  employee_first_name?: string;
  type: 'paid_leave' | 'unpaid_leave' | 'sick_leave' | 'training';
  start_date: string;
  end_date: string;
  status: 'requested' | 'approved' | 'rejected';
  comment?: string;
  validated_by?: string;
  validation_date?: string;
  days_requested?: number;
}

export interface CreateLeaveData {
  employee_id: number;
  type: string;
  start_date: string;
  end_date: string;
  comment?: string;
}

export interface LeaveBalance {
  employee_id: number;
  last_name: string;
  first_name: string;
  days_accrued: number;
  days_taken: number;
  available_balance: number;
  year: number;
}

// AI types
export interface AIAction {
  type: 'add_employee' | 'remove_employee';
  data: {
    // For add_employee
    first_name?: string;
    last_name?: string;
    restaurant_id?: number;
    is_mobile?: boolean;
    positions?: string[];
    // For remove_employee
    id?: number;
  };
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: AIAction;
}

export interface AIResponse {
  success: boolean;
  question: string;
  response: string;
  model: string;
  timestamp: string;
  action?: AIAction;
}

export interface GeneratedSchedule {
  success: boolean;
  period: { start: string; end: string };
  planning: ScheduleDay[];
  alerts: string[];
  suggestions: string[];
  shifts_created?: number;
}

export interface ScheduleDay {
  date: string;
  restaurant: string;
  shifts: {
    employee_id: number;
    employee_name: string;
    start_time: string;
    end_time: string;
    break_start?: string;
    position: string;
    is_mission: boolean;
  }[];
}

// API Response wrapper
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Position colors for UI
export const POSITION_COLORS: Record<string, string> = {
  kitchen: 'bg-orange-500',
  service: 'bg-blue-500',
  bar: 'bg-purple-500',
  steward: 'bg-gray-500',
  cashier: 'bg-green-500',
  runner: 'bg-cyan-500',
  security: 'bg-red-500',
  manager: 'bg-indigo-500',
  default: 'bg-slate-500',
};

// Status colors
export const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-yellow-500',
  confirmed: 'bg-green-500',
  cancelled: 'bg-red-500',
  requested: 'bg-yellow-500',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
};
