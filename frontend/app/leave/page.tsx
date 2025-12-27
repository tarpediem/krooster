'use client';

import { useState } from 'react';
import { useLeaveRequests, useApproveLeave, useRejectLeave, useCreateLeaveRequest } from '@/hooks/useLeave';
import { useEmployees } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Check,
  X,
  Plus,
  Loader2,
  CalendarOff,
  Calendar,
  User,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import type { LeaveRequest, CreateLeaveData } from '@/lib/types';

const LEAVE_TYPES = [
  { value: 'paid_leave', label: 'Paid Leave', color: 'bg-green-500' },
  { value: 'unpaid_leave', label: 'Unpaid Leave', color: 'bg-yellow-500' },
  { value: 'sick_leave', label: 'Sick Leave', color: 'bg-red-500' },
  { value: 'training', label: 'Training', color: 'bg-blue-500' },
];

const STATUS_CONFIG = {
  requested: { color: 'bg-yellow-500', label: 'Pending' },
  approved: { color: 'bg-green-500', label: 'Approved' },
  rejected: { color: 'bg-red-500', label: 'Rejected' },
};

function LeaveRequestCard({
  request,
  onApprove,
  onReject,
  isLoading,
}: {
  request: LeaveRequest;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  isLoading: boolean;
}) {
  const leaveType = LEAVE_TYPES.find((t) => t.value === request.type);
  const status = STATUS_CONFIG[request.status as keyof typeof STATUS_CONFIG];
  const days = differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">
                {request.employee_first_name} {request.employee_last_name}
              </span>
              <Badge className={status.color}>{status.label}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(parseISO(request.start_date), 'MMM d')} - {format(parseISO(request.end_date), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{days} day{days > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className={`${leaveType?.color} text-white`}>
                {leaveType?.label}
              </Badge>
              {request.comment && (
                <span className="text-sm text-muted-foreground truncate">
                  "{request.comment}"
                </span>
              )}
            </div>
          </div>

          {request.status === 'requested' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => onApprove(request.id)}
                disabled={isLoading}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onReject(request.id)}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NewLeaveRequestForm({
  employees,
  onSubmit,
  onCancel,
  isLoading,
}: {
  employees: any[];
  onSubmit: (data: CreateLeaveData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateLeaveData>({
    employee_id: 0,
    type: 'paid_leave',
    start_date: '',
    end_date: '',
    comment: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.employee_id === 0) {
      toast.error('Please select an employee');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error('Please select dates');
      return;
    }
    onSubmit(formData);
  };

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
          {employees?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.first_name} {e.last_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label>Leave Type</Label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full h-10 px-3 rounded-md border border-input bg-background"
        >
          {LEAVE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>
        <div>
          <Label>End Date</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Comment (optional)</Label>
        <Textarea
          value={formData.comment}
          onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
          placeholder="Reason for leave..."
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Request
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function LeavePage() {
  const { data: leaveRequests, isLoading } = useLeaveRequests();
  const { data: employees } = useEmployees();
  const approveMutation = useApproveLeave();
  const rejectMutation = useRejectLeave();
  const createMutation = useCreateLeaveRequest();
  const [dialogOpen, setDialogOpen] = useState(false);

  const pendingRequests = leaveRequests?.filter((r) => r.status === 'requested') || [];
  const approvedRequests = leaveRequests?.filter((r) => r.status === 'approved') || [];
  const rejectedRequests = leaveRequests?.filter((r) => r.status === 'rejected') || [];

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ id });
      toast.success('Leave request approved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Reason for rejection (optional):');
    try {
      await rejectMutation.mutateAsync({ id, reason: reason || undefined });
      toast.success('Leave request rejected');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject');
    }
  };

  const handleCreate = async (data: CreateLeaveData) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Leave request submitted');
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    }
  };

  const isActing = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">
            {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Leave Request</DialogTitle>
            </DialogHeader>
            <NewLeaveRequestForm
              employees={employees || []}
              onSubmit={handleCreate}
              onCancel={() => setDialogOpen(false)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Requests Alert */}
      {pendingRequests.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">
                {pendingRequests.length} request{pendingRequests.length > 1 ? 's' : ''} awaiting approval
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingRequests.length > 0 && (
              <Badge className="ml-2 bg-yellow-500">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved
            {approvedRequests.length > 0 && (
              <Badge variant="outline" className="ml-2">{approvedRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected
            {rejectedRequests.length > 0 && (
              <Badge variant="outline" className="ml-2">{rejectedRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <CalendarOff className="h-12 w-12 mb-2" />
              <p>No pending requests</p>
            </div>
          ) : (
            pendingRequests.map((request) => (
              <LeaveRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
                isLoading={isActing}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4 mt-4">
          {approvedRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Check className="h-12 w-12 mb-2" />
              <p>No approved requests</p>
            </div>
          ) : (
            approvedRequests.map((request) => (
              <LeaveRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
                isLoading={isActing}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4 mt-4">
          {rejectedRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <X className="h-12 w-12 mb-2" />
              <p>No rejected requests</p>
            </div>
          ) : (
            rejectedRequests.map((request) => (
              <LeaveRequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
                isLoading={isActing}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
