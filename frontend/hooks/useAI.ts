'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { askAI, generateSchedule } from '@/lib/api';
import type { AIMessage } from '@/lib/types';

export function useAIChat() {
  const [messages, setMessages] = useState<AIMessage[]>([]);

  const mutation = useMutation({
    mutationFn: (question: string) => askAI(question),
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
      // Add AI response
      const aiMessage: AIMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: response.timestamp,
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
  });
}
