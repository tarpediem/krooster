'use client';

import { useState, useMemo, useEffect } from 'react';
import { useShifts, useCreateShift, useCancelShift } from '@/hooks/useShifts';
import { useEmployees } from '@/hooks/useEmployees';
import { useGenerateSchedule } from '@/hooks/useAI';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  X,
  Sparkles,
  CheckCircle2,
  LayoutGrid,
  List,
  CalendarDays,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  subWeeks,
  subMonths,
  isSameDay,
  isSameMonth,
  parseISO,
  getDay,
  eachDayOfInterval,
} from 'date-fns';
import { toast } from 'sonner';
import type { Shift, CreateShiftData } from '@/lib/types';
import { POSITION_COLORS } from '@/lib/types';

const RESTAURANTS = [
  { id: 1, name: 'Hua Hin', color: 'bg-blue-500' },
  { id: 2, name: 'Sathorn', color: 'bg-orange-500' },
];

const POSITIONS = ['kitchen', 'service', 'bar', 'dishwasher', 'cashier'];

type ViewMode = 'week' | 'month' | 'day';

const GENERATION_STEPS = [
  { label: 'Fetching employees...', duration: 2 },
  { label: 'Checking leave requests...', duration: 3 },
  { label: 'Analyzing availability...', duration: 5 },
  { label: 'AI generating schedule...', duration: 180 },
  { label: 'Creating shifts...', duration: 5 },
];

function ShiftCard({ shift, onCancel, compact = false }: { shift: Shift; onCancel: (id: number) => void; compact?: boolean }) {
  const positionColor = POSITION_COLORS[shift.position] || POSITION_COLORS.default;

  if (compact) {
    return (
      <div className="text-xs p-1 rounded bg-muted truncate" title={`${shift.employee_first_name} ${shift.employee_last_name} - ${shift.position}`}>
        <span className={`inline-block w-2 h-2 rounded-full ${positionColor} mr-1`} />
        {shift.employee_first_name?.[0]}{shift.employee_last_name?.[0]}
      </div>
    );
  }

  return (
    <div className="group relative rounded-md border bg-card p-2 text-xs shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-1">
        <Badge className={`${positionColor} text-[10px] px-1 py-0`}>
          {shift.position}
        </Badge>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel(shift.id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
      <div className="mt-1 font-medium truncate">
        {shift.employee_first_name} {shift.employee_last_name?.[0]}.
      </div>
      <div className="text-muted-foreground flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}
      </div>
      {shift.is_mission && (
        <Badge variant="outline" className="mt-1 text-[10px]">Mission</Badge>
      )}
    </div>
  );
}

function AddShiftDialog({
  date,
  restaurantId,
  employees,
  onAdd,
  isLoading,
}: {
  date: string;
  restaurantId: number;
  employees: any[];
  onAdd: (data: CreateShiftData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateShiftData>({
    employee_id: 0,
    restaurant_id: restaurantId,
    date,
    start_time: '10:00',
    end_time: '18:00',
    position: 'service',
    is_mission: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.employee_id === 0) {
      toast.error('Please select an employee');
      return;
    }
    onAdd(formData);
  };

  const availableEmployees = employees?.filter(
    (e) => e.restaurant_id === restaurantId || e.is_mobile
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Employee</Label>
        <select
          value={formData.employee_id}
          onChange={(e) => setFormData({ ...formData, employee_id: Number(e.target.value) })}
          className="w-full h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value={0}>Select employee...</option>
          {availableEmployees?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.first_name} {e.last_name} {e.is_mobile && e.restaurant_id !== restaurantId ? '(Mobile)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Time</Label>
          <Input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>
        <div>
          <Label>End Time</Label>
          <Input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Position</Label>
        <select
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-input bg-background capitalize"
        >
          {POSITIONS.map((p) => (
            <option key={p} value={p} className="capitalize">{p}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_mission"
          checked={formData.is_mission}
          onChange={(e) => setFormData({ ...formData, is_mission: e.target.checked })}
          className="h-4 w-4"
        />
        <Label htmlFor="is_mission">This is a mission (employee traveling from other location)</Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Add Shift
      </Button>
    </form>
  );
}

function GenerateScheduleDialog({
  onGenerate,
  isLoading,
  defaultStartDate,
}: {
  onGenerate: (startDate: string, endDate: string, requirements?: string, createShifts?: boolean) => Promise<void>;
  isLoading: boolean;
  defaultStartDate: Date;
}) {
  const nextWeekStart = startOfWeek(addWeeks(defaultStartDate, 1), { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addWeeks(defaultStartDate, 1), { weekStartsOn: 1 });

  const [startDate, setStartDate] = useState(format(nextWeekStart, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(nextWeekEnd, 'yyyy-MM-dd'));
  const [requirements, setRequirements] = useState('');
  const [createShifts, setCreateShifts] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generating) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [generating]);

  useEffect(() => {
    if (!generating) return;
    let accumulated = 0;
    for (let i = 0; i < GENERATION_STEPS.length; i++) {
      accumulated += GENERATION_STEPS[i].duration;
      if (elapsedTime < accumulated) {
        setCurrentStep(i);
        return;
      }
    }
    setCurrentStep(GENERATION_STEPS.length - 1);
  }, [elapsedTime, generating]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setElapsedTime(0);
    setCurrentStep(0);

    try {
      await onGenerate(startDate, endDate, requirements || undefined, createShifts);
      setDialogOpen(false);
    } finally {
      setGenerating(false);
    }
  };

  const progressPercent = Math.min(((elapsedTime / 195) * 100), 95);

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => !generating && setDialogOpen(open)}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Schedule
        </Button>
      </DialogTrigger>
      <DialogContent className={generating ? 'sm:max-w-md' : ''}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Schedule Generator
          </DialogTitle>
        </DialogHeader>

        {generating ? (
          <div className="space-y-6 py-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-muted flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <div
                  className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
                  style={{ animationDuration: '2s' }}
                />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                {GENERATION_STEPS[currentStep]?.label || 'Processing...'}
              </p>
              <p className="text-sm text-muted-foreground">
                Elapsed time: {formatTime(elapsedTime)}
              </p>
            </div>
            <div className="space-y-2">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                This usually takes 10-30 seconds
              </p>
            </div>
            <div className="space-y-2 pt-2">
              {GENERATION_STEPS.map((step, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 text-sm ${
                    index < currentStep ? 'text-green-600' : index === currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : index === currentStep ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-current" />
                  )}
                  {step.label.replace('...', '')}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
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
                id="create_shifts_gen"
                checked={createShifts}
                onChange={(e) => setCreateShifts(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="create_shifts_gen" className="font-normal">
                Automatically create shifts
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Schedule
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState('');
  const [dialogRestaurant, setDialogRestaurant] = useState(1);

  const generateSchedule = useGenerateSchedule();

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return { start: currentDate, end: currentDate };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
    }
  }, [currentDate, viewMode]);

  const { data: shifts, isLoading: shiftsLoading } = useShifts({
    date_from: format(dateRange.start, 'yyyy-MM-dd'),
    date_to: format(dateRange.end, 'yyyy-MM-dd'),
  });

  const { data: employees } = useEmployees();
  const createShift = useCreateShift();
  const cancelShift = useCancelShift();

  const navigate = (direction: 'prev' | 'next') => {
    const modifier = direction === 'next' ? 1 : -1;
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, modifier));
        break;
      case 'week':
        setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
        break;
    }
  };

  const getShiftsForDayAndRestaurant = (date: Date, restaurantId: number) => {
    return shifts?.filter((s) => {
      const shiftDate = parseISO(s.date);
      return isSameDay(shiftDate, date) && s.restaurant_id === restaurantId;
    }) || [];
  };

  const handleAddShift = async (data: CreateShiftData) => {
    try {
      await createShift.mutateAsync(data);
      toast.success('Shift added successfully');
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add shift');
    }
  };

  const handleCancelShift = async (id: number) => {
    if (confirm('Cancel this shift?')) {
      try {
        await cancelShift.mutateAsync(id);
        toast.success('Shift cancelled');
      } catch (error: any) {
        toast.error(error.message || 'Failed to cancel shift');
      }
    }
  };

  const handleGenerateSchedule = async (
    startDate: string,
    endDate: string,
    requirements?: string,
    createShifts?: boolean
  ) => {
    try {
      const result = await generateSchedule.mutateAsync({
        startDate,
        endDate,
        requirements,
        createShifts,
      });
      const shiftsCount = result.shifts_created || 0;
      toast.success(`Generated ${shiftsCount} shifts!`);
      // Navigate to the start date
      setCurrentDate(parseISO(startDate));
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate schedule');
      throw error;
    }
  };

  const openAddDialog = (date: Date, restaurantId: number) => {
    setDialogDate(format(date, 'yyyy-MM-dd'));
    setDialogRestaurant(restaurantId);
    setDialogOpen(true);
  };

  const displayedRestaurants = selectedRestaurant
    ? RESTAURANTS.filter((r) => r.id === selectedRestaurant)
    : RESTAURANTS;

  // Get days to display
  const daysToDisplay = useMemo(() => {
    if (viewMode === 'day') return [currentDate];
    if (viewMode === 'week') {
      return Array.from({ length: 7 }, (_, i) => addDays(dateRange.start, i));
    }
    // Month view - get all days including padding
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate, viewMode, dateRange.start]);

  const getTitle = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'week':
        return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground">{getTitle()}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex border rounded-lg p-1">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="gap-1"
            >
              <List className="h-4 w-4" />
              Day
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="gap-1"
            >
              <CalendarDays className="h-4 w-4" />
              Week
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="gap-1"
            >
              <LayoutGrid className="h-4 w-4" />
              Month
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Generate Schedule */}
          <GenerateScheduleDialog
            onGenerate={handleGenerateSchedule}
            isLoading={generateSchedule.isPending}
            defaultStartDate={currentDate}
          />
        </div>
      </div>

      {/* Restaurant Filter */}
      <div className="flex gap-2">
        <Button
          variant={selectedRestaurant === null ? 'default' : 'outline'}
          onClick={() => setSelectedRestaurant(null)}
          size="sm"
        >
          All
        </Button>
        {RESTAURANTS.map((r) => (
          <Button
            key={r.id}
            variant={selectedRestaurant === r.id ? 'default' : 'outline'}
            onClick={() => setSelectedRestaurant(r.id)}
            size="sm"
          >
            <MapPin className="mr-1 h-3 w-3" />
            {r.name}
          </Button>
        ))}
      </div>

      {/* Calendar Grid */}
      {shiftsLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'day' ? (
        /* Day View */
        <div className="space-y-4">
          {displayedRestaurants.map((restaurant) => (
            <Card key={restaurant.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className={`w-3 h-3 rounded-full ${restaurant.color}`} />
                  {restaurant.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getShiftsForDayAndRestaurant(currentDate, restaurant.id).length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">No shifts scheduled</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {getShiftsForDayAndRestaurant(currentDate, restaurant.id).map((shift) => (
                        <ShiftCard key={shift.id} shift={shift} onCancel={handleCancelShift} />
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => openAddDialog(currentDate, restaurant.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shift
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : viewMode === 'month' ? (
        /* Month View */
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysToDisplay.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const allShifts = displayedRestaurants.flatMap((r) =>
                  getShiftsForDayAndRestaurant(day, r.id)
                );

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[80px] border rounded p-1 ${
                      !isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-card'
                    } ${isToday ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => {
                      setCurrentDate(day);
                      setViewMode('day');
                    }}
                  >
                    <div className="text-xs font-medium mb-1">{format(day, 'd')}</div>
                    <div className="space-y-0.5">
                      {allShifts.slice(0, 3).map((shift) => (
                        <ShiftCard key={shift.id} shift={shift} onCancel={handleCancelShift} compact />
                      ))}
                      {allShifts.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{allShifts.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Week View */
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {daysToDisplay.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`text-center p-2 rounded-lg cursor-pointer transition-colors ${
                    isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                  }`}
                  onClick={() => {
                    setCurrentDate(day);
                    setViewMode('day');
                  }}
                >
                  <div className="text-xs font-medium">{format(day, 'EEE')}</div>
                  <div className="text-lg font-bold">{format(day, 'd')}</div>
                </div>
              ))}
            </div>

            {/* Restaurant Rows */}
            {displayedRestaurants.map((restaurant) => (
              <div key={restaurant.id} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${restaurant.color}`} />
                  <h3 className="font-semibold">{restaurant.name}</h3>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {daysToDisplay.map((day) => {
                    const dayShifts = getShiftsForDayAndRestaurant(day, restaurant.id);
                    return (
                      <div
                        key={day.toISOString()}
                        className="min-h-[120px] border rounded-lg p-2 bg-card"
                      >
                        <div className="space-y-1">
                          {dayShifts.map((shift) => (
                            <ShiftCard
                              key={shift.id}
                              shift={shift}
                              onCancel={handleCancelShift}
                            />
                          ))}
                        </div>
                        <button
                          onClick={() => openAddDialog(day, restaurant.id)}
                          className="w-full mt-2 p-1 border-2 border-dashed rounded text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          <Plus className="h-4 w-4 mx-auto" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Shift Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Shift - {dialogDate && format(parseISO(dialogDate), 'EEEE, MMM d')}
              <span className="text-muted-foreground ml-2">
                @ {RESTAURANTS.find((r) => r.id === dialogRestaurant)?.name}
              </span>
            </DialogTitle>
          </DialogHeader>
          <AddShiftDialog
            date={dialogDate}
            restaurantId={dialogRestaurant}
            employees={employees || []}
            onAdd={handleAddShift}
            isLoading={createShift.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
