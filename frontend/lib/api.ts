import type {
  Employee,
  CreateEmployeeData,
  Shift,
  CreateShiftData,
  Mission,
  CreateMissionData,
  MissionStatus,
  LeaveRequest,
  CreateLeaveData,
  LeaveBalance,
  AIResponse,
  GeneratedSchedule,
  APIResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678/webhook';
const SCHEDULE_PROXY = process.env.NEXT_PUBLIC_SCHEDULE_PROXY_URL || 'http://localhost:5680';

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || 'API request failed');
  }

  return response.json();
}

// ============ EMPLOYEES ============

export async function getEmployees(): Promise<Employee[]> {
  const result = await fetchAPI<APIResponse<Employee[]>>('/api/employees');
  return result.data || [];
}

export async function createEmployee(data: CreateEmployeeData): Promise<Employee> {
  const result = await fetchAPI<APIResponse<Employee>>('/api/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data!;
}

export async function updateEmployee(id: number, data: Partial<CreateEmployeeData>): Promise<Employee> {
  const result = await fetchAPI<APIResponse<Employee>>(`/api/employees/update?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return result.data!;
}

export async function deleteEmployee(id: number): Promise<void> {
  await fetchAPI(`/api/employees/delete?id=${id}`, {
    method: 'DELETE',
  });
}

export async function swapDaysOff(
  employee1: { id: number; days_off: number[] | null },
  employee2: { id: number; days_off: number[] | null }
): Promise<{ emp1: Employee; emp2: Employee }> {
  // Swap days_off between two employees
  const [emp1, emp2] = await Promise.all([
    updateEmployee(employee1.id, { days_off: employee2.days_off }),
    updateEmployee(employee2.id, { days_off: employee1.days_off }),
  ]);
  return { emp1, emp2 };
}

// ============ SHIFTS ============

export interface GetShiftsParams {
  date?: string;
  date_from?: string;
  date_to?: string;
  restaurant_id?: number;
  employee_id?: number;
}

export async function getShifts(params: GetShiftsParams = {}): Promise<Shift[]> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  const endpoint = query ? `/api/shifts?${query}` : '/api/shifts';

  const result = await fetchAPI<APIResponse<Shift[]>>(endpoint);
  return result.data || [];
}

export async function createShift(data: CreateShiftData): Promise<Shift> {
  const result = await fetchAPI<APIResponse<Shift>>('/api/shifts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data!;
}

export async function updateShift(id: number, data: Partial<CreateShiftData>): Promise<Shift> {
  const result = await fetchAPI<APIResponse<Shift>>(`/api/shifts/update?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return result.data!;
}

export async function cancelShift(id: number): Promise<void> {
  await fetchAPI(`/api/shifts/delete?id=${id}`, {
    method: 'DELETE',
  });
}

// ============ RESTAURANTS ============

import type { Restaurant } from './types';

export async function getRestaurants(): Promise<Restaurant[]> {
  const result = await fetchAPI<APIResponse<Restaurant[]>>('/api/restaurants');
  return result.data || [];
}

export async function updateRestaurant(id: number, data: Partial<Restaurant>): Promise<Restaurant> {
  const result = await fetchAPI<APIResponse<Restaurant>>(`/api/restaurants/update?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return result.data!;
}

// ============ MISSIONS ============

export interface GetMissionsParams {
  employee_id?: number;
  status?: MissionStatus;
  destination_restaurant_id?: number;
  date_from?: string;
  date_to?: string;
}

export async function getMissions(params: GetMissionsParams = {}): Promise<Mission[]> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  const endpoint = query ? `/api/missions?${query}` : '/api/missions';

  const result = await fetchAPI<APIResponse<Mission[]>>(endpoint);
  return result.data || [];
}

export async function createMission(data: CreateMissionData): Promise<Mission> {
  const result = await fetchAPI<APIResponse<Mission>>('/api/missions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data!;
}

export async function updateMission(id: number, data: Partial<CreateMissionData & { status: MissionStatus }>): Promise<Mission> {
  const result = await fetchAPI<APIResponse<Mission>>(`/api/missions/update?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return result.data!;
}

export async function deleteMission(id: number): Promise<void> {
  await fetchAPI(`/api/missions/delete?id=${id}`, {
    method: 'DELETE',
  });
}

export async function acceptMission(id: number): Promise<Mission> {
  return updateMission(id, { status: 'accepted' });
}

export async function refuseMission(id: number): Promise<Mission> {
  return updateMission(id, { status: 'refused' });
}

export async function completeMission(id: number): Promise<Mission> {
  return updateMission(id, { status: 'completed' });
}

// ============ LEAVE REQUESTS ============

export interface GetLeaveParams {
  employee_id?: number;
  status?: string;
  type?: string;
}

export async function getLeaveRequests(params: GetLeaveParams = {}): Promise<LeaveRequest[]> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  const endpoint = query ? `/api/leave?${query}` : '/api/leave';

  const result = await fetchAPI<APIResponse<LeaveRequest[]>>(endpoint);
  return result.data || [];
}

export async function createLeaveRequest(data: CreateLeaveData): Promise<LeaveRequest> {
  const result = await fetchAPI<APIResponse<LeaveRequest>>('/api/leave', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return result.data!;
}

export async function approveLeave(id: number, approvedBy?: string): Promise<LeaveRequest> {
  const result = await fetchAPI<APIResponse<LeaveRequest>>(`/api/leave/approve?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify({ approved_by: approvedBy || 'Manager' }),
  });
  return result.data!;
}

export async function rejectLeave(id: number, reason?: string): Promise<LeaveRequest> {
  const result = await fetchAPI<APIResponse<LeaveRequest>>(`/api/leave/reject?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify({ reason: reason || 'Request denied' }),
  });
  return result.data!;
}

export async function getLeaveBalance(employeeId: number): Promise<LeaveBalance> {
  const result = await fetchAPI<APIResponse<LeaveBalance>>(`/api/leave/balance?employee_id=${employeeId}`);
  return result.data!;
}

// ============ AI ASSISTANT ============

export async function askAI(question: string): Promise<AIResponse> {
  const result = await fetchAPI<AIResponse>('/api/ai/ask', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
  return result;
}

export async function generateSchedule(
  startDate: string,
  endDate: string,
  requirements?: string,
  createShifts: boolean = false
): Promise<GeneratedSchedule> {
  // Use Claude Code proxy for schedule generation (no API key needed)
  const url = `${SCHEDULE_PROXY}/api/generate-schedule`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      week_start: startDate,
      requirements,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || 'Schedule generation failed');
  }

  const result = await response.json();

  // Parse the result from Claude proxy format
  return {
    success: result.success || !result.is_error,
    shifts_created: result.shifts_created || 0,
    period: { start: startDate, end: endDate },
    planning: [],
    alerts: [],
    suggestions: [result.message || result.result || 'Schedule generated'],
  };
}

// ============ ADMIN ============

export interface AdminStats {
  employee_count: number;
  shift_count: number;
  leave_count: number;
  last_backup?: string;
}

export interface LLMConfig {
  provider: 'cerebras' | 'ollama';
  model: string;
  api_url: string;
}

export async function getAdminStats(): Promise<AdminStats> {
  const result = await fetchAPI<{ success: boolean; stats: { employees: { total: number }; shifts: { total: number }; absences: { total: number } } }>('/api/admin/stats');
  if (result.stats) {
    return {
      employee_count: result.stats.employees?.total || 0,
      shift_count: result.stats.shifts?.total || 0,
      leave_count: result.stats.absences?.total || 0,
    };
  }
  return { employee_count: 0, shift_count: 0, leave_count: 0 };
}

export async function getLLMConfig(): Promise<LLMConfig> {
  const result = await fetchAPI<APIResponse<LLMConfig>>('/api/admin/llm-config');
  return result.data || { provider: 'ollama', model: 'mistral', api_url: 'http://host.docker.internal:11434' };
}

export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  await fetchAPI('/api/admin/llm-config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function testLLMConnection(): Promise<{ success: boolean; message: string }> {
  const result = await fetchAPI<{ success: boolean; message: string }>('/api/admin/test-llm', {
    method: 'POST',
  });
  return result;
}

export async function backupDatabase(): Promise<Blob> {
  const url = `${API_BASE}/api/admin/backup`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to create backup');
  }
  return response.blob();
}

export async function clearShifts(): Promise<void> {
  await fetchAPI('/api/admin/clear-shifts', { method: 'POST' });
}

export async function clearEmployees(): Promise<void> {
  await fetchAPI('/api/admin/clear-employees', { method: 'POST' });
}

export async function clearLeaves(): Promise<void> {
  await fetchAPI('/api/admin/clear-leaves', { method: 'POST' });
}

export async function resetDatabase(): Promise<void> {
  await fetchAPI('/api/admin/reset-db', { method: 'POST' });
}

export async function exportEmployeesCSV(): Promise<Blob> {
  const url = `${API_BASE}/api/admin/export/employees`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to export employees');
  }
  return response.blob();
}

export async function exportShiftsCSV(): Promise<Blob> {
  const url = `${API_BASE}/api/admin/export/shifts`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to export shifts');
  }
  return response.blob();
}

export async function exportLeavesCSV(): Promise<Blob> {
  const url = `${API_BASE}/api/admin/export/leaves`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to export leave requests');
  }
  return response.blob();
}

// ============ SHIFT RULES ============

export interface ShiftRule {
  value: string;
  description: string;
  updated_at: string;
}

export interface ShiftRules {
  [key: string]: ShiftRule;
}

export async function getShiftRules(): Promise<ShiftRules> {
  const result = await fetchAPI<{ success: boolean; rules: ShiftRules }>('/api/admin/rules');
  return result.rules || {};
}

export async function saveShiftRules(rules: Record<string, string>): Promise<void> {
  await fetchAPI('/api/admin/rules', {
    method: 'PUT',
    body: JSON.stringify({ rules }),
  });
}

// ============ EMPLOYEE HOURS REPORT ============

export interface EmployeeHoursData {
  id: number;
  first_name: string;
  last_name: string;
  restaurant: string;
  total_shifts: number;
  total_hours: string;
  total_break_minutes: number;
  net_hours: string;
}

export interface EmployeeHoursReport {
  success: boolean;
  period: { from: string; to: string };
  employees: EmployeeHoursData[];
  count: number;
}

export async function getEmployeeHours(dateFrom?: string, dateTo?: string, restaurantId?: number): Promise<EmployeeHoursReport> {
  const params = new URLSearchParams();
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);
  if (restaurantId) params.append('restaurant_id', String(restaurantId));

  const query = params.toString();
  const endpoint = query ? `/api/admin/employee-hours?${query}` : '/api/admin/employee-hours';

  const result = await fetchAPI<EmployeeHoursReport>(endpoint);
  return result;
}
