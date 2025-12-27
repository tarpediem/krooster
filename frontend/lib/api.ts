import type {
  Employee,
  CreateEmployeeData,
  Shift,
  CreateShiftData,
  LeaveRequest,
  CreateLeaveData,
  LeaveBalance,
  AIResponse,
  GeneratedSchedule,
  APIResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678/webhook';

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
  const result = await fetchAPI<GeneratedSchedule>('/api/ai/generate-schedule', {
    method: 'POST',
    body: JSON.stringify({
      start_date: startDate,
      end_date: endDate,
      requirements,
      create_shifts: createShifts,
    }),
  });
  return result;
}
