'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ShiftSwapRequest, CreateShiftSwapData, APIResponse } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678/webhook';

// Fetch all shift swap requests
async function fetchShiftSwaps(): Promise<ShiftSwapRequest[]> {
  const response = await fetch(`${API_URL}/api/shift-swaps`);
  if (!response.ok) {
    throw new Error('Failed to fetch shift swaps');
  }
  const data: APIResponse<ShiftSwapRequest[]> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch shift swaps');
  }
  return data.data || [];
}

// Create a new shift swap request
async function createShiftSwap(swapData: CreateShiftSwapData): Promise<ShiftSwapRequest> {
  const response = await fetch(`${API_URL}/api/shift-swaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(swapData),
  });
  if (!response.ok) {
    throw new Error('Failed to create shift swap request');
  }
  const data: APIResponse<ShiftSwapRequest> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to create shift swap request');
  }
  return data.data!;
}

// Approve a shift swap (swaps the shifts automatically)
async function approveShiftSwap(id: number, approvedBy?: string): Promise<ShiftSwapRequest> {
  const response = await fetch(`${API_URL}/api/shift-swaps/approve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, approved_by: approvedBy }),
  });
  if (!response.ok) {
    throw new Error('Failed to approve shift swap');
  }
  const data: APIResponse<ShiftSwapRequest> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to approve shift swap');
  }
  return data.data!;
}

// Reject a shift swap
async function rejectShiftSwap(id: number, approvedBy?: string): Promise<ShiftSwapRequest> {
  const response = await fetch(`${API_URL}/api/shift-swaps/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, approved_by: approvedBy }),
  });
  if (!response.ok) {
    throw new Error('Failed to reject shift swap');
  }
  const data: APIResponse<ShiftSwapRequest> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to reject shift swap');
  }
  return data.data!;
}

// Cancel a shift swap request
async function cancelShiftSwap(id: number): Promise<ShiftSwapRequest> {
  const response = await fetch(`${API_URL}/api/shift-swaps/cancel?id=${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to cancel shift swap');
  }
  const data: APIResponse<ShiftSwapRequest> = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to cancel shift swap');
  }
  return data.data!;
}

// React Query hooks
export function useShiftSwaps() {
  return useQuery({
    queryKey: ['shift-swaps'],
    queryFn: fetchShiftSwaps,
  });
}

export function useCreateShiftSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createShiftSwap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
    },
  });
}

export function useApproveShiftSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approvedBy }: { id: number; approvedBy?: string }) =>
      approveShiftSwap(id, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] }); // Refresh shifts after swap
    },
  });
}

export function useRejectShiftSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approvedBy }: { id: number; approvedBy?: string }) =>
      rejectShiftSwap(id, approvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
    },
  });
}

export function useCancelShiftSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelShiftSwap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-swaps'] });
    },
  });
}
