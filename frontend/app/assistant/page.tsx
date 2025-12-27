'use client';

import { useState, useRef, useEffect } from 'react';
import { useAIChat, useGenerateSchedule } from '@/hooks/useAI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Calendar,
  Trash2,
  AlertTriangle,
  Users,
  Clock,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { toast } from 'sonner';
import type { AIMessage } from '@/lib/types';

const SUGGESTED_QUESTIONS = [
  {
    icon: AlertTriangle,
    label: 'Understaffed days',
    question: 'Are there any understaffed days this week?',
  },
  {
    icon: Users,
    label: 'Available employees',
    question: 'Who is available to work this weekend?',
  },
  {
    icon: Clock,
    label: 'Overtime check',
    question: 'Which employees are approaching overtime this week?',
  },
  {
    icon: Calendar,
    label: 'Leave conflicts',
    question: 'Are there any scheduling conflicts with approved leave?',
  },
];

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        {message.timestamp && (
          <p className={`text-xs mt-1 ${isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {format(new Date(message.timestamp), 'h:mm a')}
          </p>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function GenerateScheduleDialog({
  onGenerate,
  isLoading,
}: {
  onGenerate: (startDate: string, endDate: string, requirements?: string, createShifts?: boolean) => void;
  isLoading: boolean;
}) {
  const nextWeekStart = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });

  const [startDate, setStartDate] = useState(format(nextWeekStart, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(nextWeekEnd, 'yyyy-MM-dd'));
  const [requirements, setRequirements] = useState('');
  const [createShifts, setCreateShifts] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(startDate, endDate, requirements || undefined, createShifts);
    setDialogOpen(false);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Schedule
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Schedule Generator
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>Special Requirements (optional)</Label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="e.g., Need extra staff on Saturday, John requested morning shifts..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create_shifts"
              checked={createShifts}
              onChange={(e) => setCreateShifts(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="create_shifts" className="font-normal">
              Automatically create shifts (otherwise just get suggestions)
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Schedule
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AssistantPage() {
  const { messages, sendMessage, clearMessages, isLoading } = useAIChat();
  const generateSchedule = useGenerateSchedule();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const handleQuickQuestion = (question: string) => {
    if (!isLoading) {
      sendMessage(question);
    }
  };

  const handleGenerateSchedule = async (
    startDate: string,
    endDate: string,
    requirements?: string,
    createShifts?: boolean
  ) => {
    try {
      await generateSchedule.mutateAsync({
        startDate,
        endDate,
        requirements,
        createShifts,
      });

      // Ask AI to summarize the schedule
      sendMessage(`I just generated a schedule for ${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}. Please review it and let me know if there are any issues.`);

      toast.success('Schedule generated! Check the calendar for details.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate schedule');
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground">
            Ask questions about schedules, staffing, and more
          </p>
        </div>
        <div className="flex gap-2">
          <GenerateScheduleDialog
            onGenerate={handleGenerateSchedule}
            isLoading={generateSchedule.isPending}
          />
          {messages.length > 0 && (
            <Button variant="outline" size="icon" onClick={clearMessages}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Suggested Questions */}
      {messages.length === 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <Button
                  key={q.label}
                  variant="outline"
                  className="h-auto py-3 px-4 justify-start gap-2 text-left"
                  onClick={() => handleQuickQuestion(q.question)}
                  disabled={isLoading}
                >
                  <q.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{q.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-center">
                Hi! I'm your scheduling assistant. Ask me anything about
                <br />
                shifts, employees, leave requests, or scheduling.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble key={index} message={message} />
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Input Area */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about schedules, staffing, leave..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
