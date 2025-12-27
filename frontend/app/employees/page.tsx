'use client';

import { useState } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, Phone, Mail, MapPin, Briefcase, Loader2, UserX } from 'lucide-react';
import { toast } from 'sonner';
import type { Employee, CreateEmployeeData } from '@/lib/types';

const POSITIONS = ['kitchen', 'service', 'bar', 'dishwasher', 'cashier'];
const RESTAURANTS = [
  { id: 1, name: 'Hua Hin' },
  { id: 2, name: 'Sathorn' },
];

function EmployeeCard({
  employee,
  onEdit,
  onDelete
}: {
  employee: Employee;
  onEdit: (e: Employee) => void;
  onDelete: (id: number) => void;
}) {
  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onEdit(employee)}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {employee.first_name} {employee.last_name}
              </h3>
              {employee.is_mobile && (
                <Badge variant="secondary" className="text-xs">Mobile</Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {employee.restaurant_name || `Restaurant ${employee.restaurant_id}`}
            </div>
            {employee.phone && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {employee.phone}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {employee.positions?.map((pos) => (
                <Badge key={pos} variant="outline" className="text-xs capitalize">
                  {pos}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmployeeForm({
  employee,
  onSave,
  onCancel,
  isLoading,
}: {
  employee?: Employee | null;
  onSave: (data: CreateEmployeeData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateEmployeeData>({
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    phone: employee?.phone || '',
    email: employee?.email || '',
    restaurant_id: employee?.restaurant_id || 1,
    is_mobile: employee?.is_mobile || false,
    positions: employee?.positions || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const togglePosition = (pos: string) => {
    setFormData((prev) => ({
      ...prev,
      positions: prev.positions?.includes(pos)
        ? prev.positions.filter((p) => p !== pos)
        : [...(prev.positions || []), pos],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">First Name</Label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="last_name">Last Name</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="restaurant">Restaurant</Label>
        <select
          id="restaurant"
          value={formData.restaurant_id}
          onChange={(e) => setFormData({ ...formData, restaurant_id: Number(e.target.value) })}
          className="w-full h-10 px-3 rounded-md border border-input bg-background"
        >
          {RESTAURANTS.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_mobile"
          checked={formData.is_mobile}
          onChange={(e) => setFormData({ ...formData, is_mobile: e.target.checked })}
          className="h-4 w-4"
        />
        <Label htmlFor="is_mobile">Mobile Employee (can work at both locations)</Label>
      </div>

      <div>
        <Label>Positions</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {POSITIONS.map((pos) => (
            <Badge
              key={pos}
              variant={formData.positions?.includes(pos) ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => togglePosition(pos)}
            >
              {pos}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {employee ? 'Update' : 'Create'} Employee
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function EmployeesPage() {
  const { data: employees, isLoading, error } = useEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const [search, setSearch] = useState('');
  const [filterRestaurant, setFilterRestaurant] = useState<number | null>(null);
  const [filterMobile, setFilterMobile] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const filteredEmployees = employees?.filter((emp) => {
    const matchesSearch =
      emp.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRestaurant = filterRestaurant === null || emp.restaurant_id === filterRestaurant;
    const matchesMobile = filterMobile === null || emp.is_mobile === filterMobile;
    return matchesSearch && matchesRestaurant && matchesMobile;
  });

  const handleSave = async (data: CreateEmployeeData) => {
    try {
      if (selectedEmployee) {
        await updateMutation.mutateAsync({ id: selectedEmployee.id, data });
        toast.success('Employee updated successfully');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Employee created successfully');
      }
      setDialogOpen(false);
      setSelectedEmployee(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save employee');
    }
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to deactivate this employee?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Employee deactivated');
      } catch (error: any) {
        toast.error(error.message || 'Failed to deactivate employee');
      }
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Failed to load employees: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">
            {employees?.length || 0} staff members
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedEmployee(null);
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
            </DialogHeader>
            <EmployeeForm
              employee={selectedEmployee}
              onSave={handleSave}
              onCancel={() => {
                setDialogOpen(false);
                setSelectedEmployee(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterRestaurant ?? ''}
          onChange={(e) => setFilterRestaurant(e.target.value ? Number(e.target.value) : null)}
          className="h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="">All Restaurants</option>
          {RESTAURANTS.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select
          value={filterMobile === null ? '' : filterMobile.toString()}
          onChange={(e) => setFilterMobile(e.target.value === '' ? null : e.target.value === 'true')}
          className="h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="">All Types</option>
          <option value="true">Mobile Only</option>
          <option value="false">Local Only</option>
        </select>
      </div>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredEmployees?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <UserX className="h-12 w-12 mb-4" />
          <p>No employees found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees?.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
