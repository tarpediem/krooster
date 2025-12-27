'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLeaveRequests,
  createLeaveRequest,
  approveLeave,
  rejectLeave,
  getLeaveBalance,
  GetLeaveParams,
} from '@/lib/api';
import type { CreateLeaveData } from '@/lib/types';

export function useLeaveRequests(params: GetLeaveParams = {}) {
  return useQuery({
    queryKey: ['leave', params],
    queryFn: () => getLeaveRequests(params),
  });
}

export function useLeaveBalance(employeeId: number) {
  return useQuery({
    queryKey: ['leave-balance', employeeId],
    queryFn: () => getLeaveBalance(employeeId),
    enabled: !!employeeId,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeaveData) => createLeaveRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, validatedBy }: { id: number; validatedBy?: string }) =>
      approveLeave(id, validatedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      rejectLeave(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave'] });
    },
  });
}
