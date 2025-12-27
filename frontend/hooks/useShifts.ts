'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShifts, createShift, updateShift, cancelShift, GetShiftsParams } from '@/lib/api';
import type { CreateShiftData } from '@/lib/types';

export function useShifts(params: GetShiftsParams = {}) {
  return useQuery({
    queryKey: ['shifts', params],
    queryFn: () => getShifts(params),
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShiftData) => createShift(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateShiftData> }) =>
      updateShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useCancelShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cancelShift(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}
