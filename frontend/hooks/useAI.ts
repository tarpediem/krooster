'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { askAI, generateSchedule, createEmployee, deleteEmployee } from '@/lib/api';
import type { AIMessage, AIAction, AIResponse } from '@/lib/types';
import { toast } from 'sonner';

export function useAIChat() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const queryClient = useQueryClient();

  const executeAction = async (action: AIAction): Promise<string> => {
    switch (action.type) {
      case 'add_employee': {
        const data = action.data as {
          first_name: string;
          last_name: string;
          restaurant_id: number;
          is_mobile?: boolean;
          positions?: string[];
        };

        try {
          const result = await createEmployee({
            first_name: data.first_name,
            last_name: data.last_name,
            restaurant_id: data.restaurant_id,
            is_mobile: data.is_mobile ?? false,
            positions: data.positions ?? ['service'],
            active: true,
          });

          // Invalidate employees query to refresh the list
          queryClient.invalidateQueries({ queryKey: ['employees'] });

          toast.success(`Added ${data.first_name} ${data.last_name} successfully!`);
          return `Successfully added ${data.first_name} ${data.last_name} to the system.`;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to add employee';
          toast.error(message);
          return `Failed to add employee: ${message}`;
        }
      }

      case 'remove_employee': {
        const data = action.data as { id: number };

        try {
          await deleteEmployee(data.id);

          // Invalidate employees query to refresh the list
          queryClient.invalidateQueries({ queryKey: ['employees'] });

          toast.success('Employee removed successfully!');
          return `Successfully removed employee (ID: ${data.id}) from the system.`;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to remove employee';
          toast.error(message);
          return `Failed to remove employee: ${message}`;
        }
      }

      default:
        return `Unknown action type: ${action.type}`;
    }
  };

  const mutation = useMutation({
    mutationFn: async (question: string): Promise<AIResponse & { actionResult?: string }> => {
      const response = await askAI(question);

      // If there's an action, execute it
      if (response.action) {
        const actionResult = await executeAction(response.action);
        return { ...response, actionResult };
      }

      return response;
    },
    onMutate: (question) => {
      // Add user message immediately
      const userMessage: AIMessage = {
        role: 'user',
        content: question,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
    },
    onSuccess: (response) => {
      // Clean the response by removing action blocks from display
      let displayContent = response.response;
      displayContent = displayContent.replace(/```action[\s\S]*?```/g, '').trim();

      // If there was an action result, append it
      if (response.actionResult) {
        displayContent += `\n\n**Action Result:** ${response.actionResult}`;
      }

      // Add AI response
      const aiMessage: AIMessage = {
        role: 'assistant',
        content: displayContent,
        timestamp: response.timestamp,
        action: response.action,
      };
      setMessages((prev) => [...prev, aiMessage]);
    },
    onError: (error) => {
      // Add error message
      const errorMessage: AIMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const sendMessage = (question: string) => {
    mutation.mutate(question);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading: mutation.isPending,
  };
}

export function useGenerateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      startDate,
      endDate,
      requirements,
      createShifts,
    }: {
      startDate: string;
      endDate: string;
      requirements?: string;
      createShifts?: boolean;
    }) => generateSchedule(startDate, endDate, requirements, createShifts),
    onSuccess: () => {
      // Invalidate shifts so the calendar refetches
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}
