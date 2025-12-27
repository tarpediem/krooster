'use client';

import { useState, useMemo } from 'react';
import { useShifts, useCreateShift, useCancelShift } from '@/hooks/useShifts';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  X,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { Shift, CreateShiftData } from '@/lib/types';
import { POSITION_COLORS, STATUS_COLORS } from '@/lib/types';

const RESTAURANTS = [
  { id: 1, name: 'Hua Hin', color: 'bg-blue-500' },
  { id: 2, name: 'Sathorn', color: 'bg-orange-500' },
];

const POSITIONS = ['kitchen', 'service', 'bar', 'dishwasher', 'cashier'];

function ShiftCard({ shift, onCancel }: { shift: Shift; onCancel: (id: number) => void }) {
  const positionColor = POSITION_COLORS[shift.position] || POSITION_COLORS.default;

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

export default function CalendarPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedRestaurant, setSelectedRestaurant] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState('');
  const [dialogRestaurant, setDialogRestaurant] = useState(1);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const { data: shifts, isLoading: shiftsLoading } = useShifts({
    date_from: format(weekStart, 'yyyy-MM-dd'),
    date_to: format(weekEnd, 'yyyy-MM-dd'),
  });

  const { data: employees } = useEmployees();
  const createShift = useCreateShift();
  const cancelShift = useCancelShift();

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

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

  const openAddDialog = (date: Date, restaurantId: number) => {
    setDialogDate(format(date, 'yyyy-MM-dd'));
    setDialogRestaurant(restaurantId);
    setDialogOpen(true);
  };

  const displayedRestaurants = selectedRestaurant
    ? RESTAURANTS.filter((r) => r.id === selectedRestaurant)
    : RESTAURANTS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Weekly Schedule</h1>
          <p className="text-muted-foreground">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
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
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`text-center p-2 rounded-lg ${
                    isSameDay(day, new Date()) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
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
                  {weekDays.map((day) => {
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
