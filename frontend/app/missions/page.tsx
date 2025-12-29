'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMissions, useCreateMission, useUpdateMission, useDeleteMission, useAcceptMission, useRefuseMission, useCompleteMission } from '@/hooks/useMissions';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Loader2, Plane, MapPin, Calendar, Check, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Mission, CreateMissionData, MissionStatus } from '@/lib/types';
import { MISSION_STATUS_LABELS, MISSION_STATUS_COLORS } from '@/lib/types';

const RESTAURANTS = [
  { id: 1, name: 'Hua Hin' },
  { id: 2, name: 'Sathorn' },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDurationDays(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function MissionCard({
  mission,
  onAccept,
  onRefuse,
  onComplete,
  onDelete,
  isUpdating,
}: {
  mission: Mission;
  onAccept: (id: number) => void;
  onRefuse: (id: number) => void;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
  isUpdating: boolean;
}) {
  const duration = getDurationDays(mission.start_date, mission.end_date);
  const statusColor = MISSION_STATUS_COLORS[mission.status] || 'bg-gray-500';
  const isPast = new Date(mission.end_date) < new Date();
  const isOngoing = new Date(mission.start_date) <= new Date() && new Date(mission.end_date) >= new Date();

  return (
    <Card className={`hover:shadow-lg transition-shadow ${isPast && mission.status !== 'completed' ? 'opacity-60' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Employee Name */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">
                {mission.employee_first_name} {mission.employee_last_name}
              </h3>
              <Badge className={`text-xs text-white ${statusColor}`}>
                {MISSION_STATUS_LABELS[mission.status]}
              </Badge>
              {isOngoing && mission.status === 'accepted' && (
                <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                  Ongoing
                </Badge>
              )}
            </div>

            {/* Route */}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{mission.origin_restaurant_name || `Restaurant ${mission.origin_restaurant_id}`}</span>
              <Plane className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">
                {mission.destination_restaurant_name || `Restaurant ${mission.destination_restaurant_id}`}
              </span>
            </div>

            {/* Dates */}
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(mission.start_date)} - {formatDate(mission.end_date)}
              </span>
              <Badge variant="outline" className="text-xs">
                {duration} day{duration !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Accommodation */}
            {mission.accommodation_planned && (
              <div className="mt-1 text-sm text-muted-foreground">
                Accommodation provided
              </div>
            )}

            {/* Notes */}
            {mission.notes && (
              <div className="mt-2 text-sm text-muted-foreground italic">
                {mission.notes}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1">
            {mission.status === 'proposed' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => onAccept(mission.id)}
                  disabled={isUpdating}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => onRefuse(mission.id)}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
            {mission.status === 'accepted' && isPast && (
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
                onClick={() => onComplete(mission.id)}
                disabled={isUpdating}
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            {(mission.status === 'proposed' || mission.status === 'refused') && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700"
                onClick={() => onDelete(mission.id)}
                disabled={isUpdating}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateMissionDialog({
  employees,
  onCreate,
  isCreating,
}: {
  employees: { id: number; first_name: string; last_name: string; restaurant_id: number; is_mobile: boolean }[];
  onCreate: (data: CreateMissionData) => void;
  isCreating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateMissionData>({
    employee_id: 0,
    origin_restaurant_id: 1,
    destination_restaurant_id: 2,
    start_date: '',
    end_date: '',
    accommodation_planned: true,
    notes: '',
  });

  // Only mobile employees can go on missions
  const mobileEmployees = employees.filter(e => e.is_mobile);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.start_date || !formData.end_date) {
      toast.error('Please fill all required fields');
      return;
    }
    if (formData.origin_restaurant_id === formData.destination_restaurant_id) {
      toast.error('Origin and destination must be different');
      return;
    }
    onCreate(formData);
    setOpen(false);
    setFormData({
      employee_id: 0,
      origin_restaurant_id: 1,
      destination_restaurant_id: 2,
      start_date: '',
      end_date: '',
      accommodation_planned: true,
      notes: '',
    });
  };

  const handleEmployeeChange = (employeeId: number) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      // Auto-set origin to employee's restaurant, destination to the other
      const destId = employee.restaurant_id === 1 ? 2 : 1;
      setFormData({
        ...formData,
        employee_id: employeeId,
        origin_restaurant_id: employee.restaurant_id,
        destination_restaurant_id: destId,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Mission
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Create Mission
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mobileEmployees.length === 0 ? (
            <div className="p-4 bg-yellow-50 rounded-lg flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span>No mobile employees available. Mark employees as "Mobile" to assign missions.</span>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="employee">Employee (Mobile only)</Label>
                <select
                  id="employee"
                  value={formData.employee_id || ''}
                  onChange={(e) => handleEmployeeChange(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                  required
                >
                  <option value="">Select employee...</option>
                  {mobileEmployees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.first_name} {e.last_name} ({RESTAURANTS.find(r => r.id === e.restaurant_id)?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origin">From</Label>
                  <select
                    id="origin"
                    value={formData.origin_restaurant_id}
                    onChange={(e) => setFormData({ ...formData, origin_restaurant_id: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                  >
                    {RESTAURANTS.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="destination">To</Label>
                  <select
                    id="destination"
                    value={formData.destination_restaurant_id}
                    onChange={(e) => setFormData({ ...formData, destination_restaurant_id: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                  >
                    {RESTAURANTS.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    min={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="accommodation"
                  checked={formData.accommodation_planned}
                  onChange={(e) => setFormData({ ...formData, accommodation_planned: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="accommodation">Accommodation provided</Label>
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special instructions..."
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isCreating} className="flex-1">
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Mission
                </Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function MissionsPage() {
  const { data: missions, isLoading, error } = useMissions();
  const { data: employees } = useEmployees();
  const createMutation = useCreateMission();
  const acceptMutation = useAcceptMission();
  const refuseMutation = useRefuseMission();
  const completeMutation = useCompleteMission();
  const deleteMutation = useDeleteMission();

  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'all'>('all');

  const filteredMissions = missions?.filter(m =>
    statusFilter === 'all' || m.status === statusFilter
  );

  const handleCreate = async (data: CreateMissionData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Mission created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create mission');
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await acceptMutation.mutateAsync(id);
      toast.success('Mission accepted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to accept mission');
    }
  };

  const handleRefuse = async (id: number) => {
    try {
      await refuseMutation.mutateAsync(id);
      toast.success('Mission refused');
    } catch (error: any) {
      toast.error(error.message || 'Failed to refuse mission');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await completeMutation.mutateAsync(id);
      toast.success('Mission marked as completed');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete mission');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this mission?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Mission deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete mission');
    }
  };

  const isUpdating = acceptMutation.isPending || refuseMutation.isPending || completeMutation.isPending || deleteMutation.isPending;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />
        <p className="text-muted-foreground">Mission management not available yet</p>
        <p className="text-sm text-muted-foreground">The API endpoint needs to be configured in n8n</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="h-6 w-6" />
            Missions
          </h1>
          <p className="text-muted-foreground">
            {missions?.length || 0} mission{(missions?.length || 0) !== 1 ? 's' : ''} - Mobile employees working at other locations
          </p>
        </div>
        <CreateMissionDialog
          employees={employees || []}
          onCreate={handleCreate}
          isCreating={createMutation.isPending}
        />
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        {(['proposed', 'accepted', 'completed', 'refused'] as MissionStatus[]).map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {MISSION_STATUS_LABELS[status]}
          </Button>
        ))}
      </div>

      {/* Missions List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredMissions?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Plane className="h-12 w-12 mb-4" />
          <p>No missions found</p>
          <p className="text-sm">Create a mission to send mobile employees to another restaurant</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMissions?.map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onAccept={handleAccept}
              onRefuse={handleRefuse}
              onComplete={handleComplete}
              onDelete={handleDelete}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
