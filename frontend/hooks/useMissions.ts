'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMissions, createMission, updateMission, deleteMission, acceptMission, refuseMission, completeMission } from '@/lib/api';
import type { CreateMissionData, MissionStatus } from '@/lib/types';

export function useMissions() {
  return useQuery({
    queryKey: ['missions'],
    queryFn: () => getMissions(),
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMissionData) => createMission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useUpdateMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateMissionData & { status: MissionStatus }> }) =>
      updateMission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useDeleteMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteMission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useAcceptMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => acceptMission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useRefuseMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => refuseMission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}

export function useCompleteMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => completeMission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
    },
  });
}
