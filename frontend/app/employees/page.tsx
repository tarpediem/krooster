'use client';

import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from '@/hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Search, Phone, MapPin, Loader2, UserX, Upload, Download, FileSpreadsheet, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Employee, CreateEmployeeData, EmploymentType, ShiftPreference } from '@/lib/types';
import { swapDaysOff } from '@/lib/api';
import { DAYS_OF_WEEK, EMPLOYMENT_TYPE_LABELS, EMPLOYMENT_TYPE_COLORS, SHIFT_PREFERENCE_LABELS, SHIFT_PREFERENCE_ICONS } from '@/lib/types';

const POSITIONS = ['kitchen', 'service', 'bar', 'steward', 'cashier', 'runner', 'security', 'manager'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['full_time', 'part_time', 'extra'];
const SHIFT_PREFERENCES: ShiftPreference[] = ['morning', 'afternoon', 'flexible'];
const RESTAURANTS = [
  { id: 1, name: 'Hua Hin' },
  { id: 2, name: 'Sathorn' },
];

// CSV TEMPLATE WITH ALL POSSIBLE VALUES:
// restaurant: "Hua Hin" or "Sathorn" (or "A la mer" / "Kosmo")
// is_mobile: true/false (can work at both locations)
// positions: kitchen, service, bar, steward, cashier, runner, security, manager (comma-separated in quotes)
// employment_type: full_time, part_time, extra
// days_off: Monday, Tuesday, etc. (comma-separated for multiple days, e.g. "Monday,Thursday")
// max_hours_per_week: number (mainly for part_time, leave empty for full_time)
const CSV_TEMPLATE = `first_name,last_name,phone,email,restaurant,is_mobile,positions,employment_type,days_off,max_hours_per_week
# FULL-TIME EXAMPLES (regular staff)
Som,Chai,081-111-1111,som@kosmo.com,Hua Hin,false,"kitchen,service",full_time,,
Narin,Kaew,081-222-2222,narin@kosmo.com,Hua Hin,true,"service,bar,cashier",full_time,Sunday,
Pim,Siri,081-333-3333,pim@kosmo.com,Sathorn,false,manager,full_time,Monday,
# EMPLOYEES WITH 2 DAYS OFF (work more hours other days)
Lek,Student,082-444-4444,lek@email.com,Hua Hin,false,service,full_time,"Monday,Thursday",
Fah,Helper,082-555-5555,fah@email.com,Sathorn,false,"runner,steward",full_time,"Saturday,Sunday",
# PART-TIME EXAMPLES (limited hours per week)
Ton,Part,083-666-6666,ton@email.com,Hua Hin,false,service,part_time,Wednesday,20
# EXTRA EXAMPLES (on-call staff)
Dao,OnCall,083-777-7777,dao@email.com,Sathorn,true,"kitchen,steward",extra,,`;

function parseCSV(text: string): CreateEmployeeData[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const employees: CreateEmployeeData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;

    // Handle quoted fields (for positions like "kitchen,service")
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });

    // Map restaurant name to ID
    let restaurantId = 1;
    const restName = row.restaurant?.toLowerCase();
    if (restName?.includes('sathorn') || restName === '2') {
      restaurantId = 2;
    } else if (restName?.includes('hua') || restName === '1') {
      restaurantId = 1;
    }

    // Parse positions
    const positionsStr = row.positions || '';
    const positions = positionsStr
      .split(',')
      .map(p => p.trim().toLowerCase())
      .filter(p => POSITIONS.includes(p));

    // Parse employment type
    const empType = row.employment_type?.toLowerCase() || 'full_time';
    const validEmpTypes = ['full_time', 'part_time', 'extra'];
    const employment_type = validEmpTypes.includes(empType) ? empType as EmploymentType : 'full_time';

    // Parse days off (Monday=0, Sunday=6) - supports multiple days and fixed_day_off column
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const daysOffStr = (row.days_off || row.fixed_day_off || '').toLowerCase();
    let days_off: number[] | null = null;
    if (daysOffStr) {
      const dayStrings = daysOffStr.split(',').map(d => d.trim());
      const parsedDays = dayStrings
        .map(dayStr => dayNames.findIndex(d => d.startsWith(dayStr.substring(0, 3))))
        .filter(idx => idx !== -1);
      if (parsedDays.length > 0) days_off = parsedDays;
    }

    // Parse preferred shift (supports AM/PM and morning/afternoon/flexible)
    const shiftStr = (row.preferred_shift || row.prefered_shift || '').toLowerCase();
    let preferred_shift: ShiftPreference = 'flexible';
    if (shiftStr === 'am' || shiftStr === 'morning') preferred_shift = 'morning';
    else if (shiftStr === 'pm' || shiftStr === 'afternoon') preferred_shift = 'afternoon';

    // Parse max hours per week
    const maxHours = parseInt(row.max_hours_per_week || '', 10);
    const max_hours_per_week = !isNaN(maxHours) && maxHours > 0 ? maxHours : null;

    employees.push({
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      phone: row.phone || '',
      email: row.email || '',
      restaurant_id: restaurantId,
      is_mobile: row.is_mobile?.toLowerCase() === 'true' || row.is_mobile === '1',
      positions: positions.length > 0 ? positions : ['service'],
      employment_type,
      preferred_shift,
      days_off,
      max_hours_per_week,
    });
  }

  return employees.filter(e => e.first_name); // last_name is optional
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'employees_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ImportCSVDialog({
  onImport,
  isLoading,
}: {
  onImport: (employees: CreateEmployeeData[]) => Promise<void>;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<CreateEmployeeData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setError('No valid employees found in CSV');
          setPreview([]);
        } else {
          setError(null);
          setPreview(parsed);
        }
      } catch (err) {
        setError('Failed to parse CSV file');
        setPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    await onImport(preview);
    setOpen(false);
    setPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Employees from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium">Download Template</p>
              <p className="text-sm text-muted-foreground">
                Get a CSV template with the correct format
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Template
            </Button>
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              ref={fileInputRef}
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-1"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <Label>Preview ({preview.length} employees)</Label>
              <div className="mt-2 max-h-48 overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Restaurant</th>
                      <th className="text-left p-2">Positions</th>
                      <th className="text-left p-2">Mobile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((emp, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{emp.first_name} {emp.last_name}</td>
                        <td className="p-2">{RESTAURANTS.find(r => r.id === emp.restaurant_id)?.name}</td>
                        <td className="p-2">{emp.positions?.join(', ')}</td>
                        <td className="p-2">{emp.is_mobile ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={preview.length === 0 || isLoading}
              className="flex-1"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import {preview.length} Employee{preview.length !== 1 ? 's' : ''}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SwapDaysOffDialog({
  employees,
  onSwapComplete,
}: {
  employees: Employee[];
  onSwapComplete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [employee1Id, setEmployee1Id] = useState<number | null>(null);
  const [employee2Id, setEmployee2Id] = useState<number | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const employee1 = employees.find(e => e.id === employee1Id);
  const employee2 = employees.find(e => e.id === employee2Id);

  const formatDays = (days: number[] | null | undefined) => {
    if (!days || days.length === 0) return 'None';
    return days.map(d => DAYS_OF_WEEK[d]).join(', ');
  };

  const handleSwap = async () => {
    if (!employee1 || !employee2) return;

    setIsSwapping(true);
    try {
      await swapDaysOff(
        { id: employee1.id, days_off: employee1.days_off ?? null },
        { id: employee2.id, days_off: employee2.days_off ?? null }
      );
      toast.success(`Swapped days off between ${employee1.first_name} and ${employee2.first_name}`);
      setOpen(false);
      setEmployee1Id(null);
      setEmployee2Id(null);
      onSwapComplete();
    } catch (error: any) {
      toast.error(error.message || 'Failed to swap days off');
    } finally {
      setIsSwapping(false);
    }
  };

  // Filter out employees without days off for selection
  const employeesWithDaysOff = employees.filter(e => e.days_off && e.days_off.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Swap Days Off
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            Swap Days Off Between Employees
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select two employees to swap their days off. The schedule will automatically adapt.
          </p>

          {employeesWithDaysOff.length < 2 ? (
            <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
              Need at least 2 employees with days off to swap.
            </div>
          ) : (
            <>
              {/* Employee 1 Selection */}
              <div>
                <Label htmlFor="emp1">First Employee</Label>
                <select
                  id="emp1"
                  value={employee1Id ?? ''}
                  onChange={(e) => setEmployee1Id(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                >
                  <option value="">Select employee...</option>
                  {employeesWithDaysOff
                    .filter(e => e.id !== employee2Id)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} - Off: {formatDays(e.days_off)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Employee 2 Selection */}
              <div>
                <Label htmlFor="emp2">Second Employee</Label>
                <select
                  id="emp2"
                  value={employee2Id ?? ''}
                  onChange={(e) => setEmployee2Id(e.target.value ? Number(e.target.value) : null)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background mt-1"
                >
                  <option value="">Select employee...</option>
                  {employeesWithDaysOff
                    .filter(e => e.id !== employee1Id)
                    .map(e => (
                      <option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} - Off: {formatDays(e.days_off)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Preview */}
              {employee1 && employee2 && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="font-medium text-sm">Preview:</p>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{employee1.first_name}</span>
                      <div className="text-muted-foreground">
                        {formatDays(employee1.days_off)} → {formatDays(employee2.days_off)}
                      </div>
                    </div>
                    <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-right">
                      <span className="font-medium">{employee2.first_name}</span>
                      <div className="text-muted-foreground">
                        {formatDays(employee2.days_off)} → {formatDays(employee1.days_off)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSwap}
                  disabled={!employee1 || !employee2 || isSwapping}
                  className="flex-1"
                >
                  {isSwapping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Swap Days Off
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const employmentType = employee.employment_type || 'full_time';
  const employmentColor = EMPLOYMENT_TYPE_COLORS[employmentType] || 'bg-gray-500';

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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold truncate">
                {employee.first_name} {employee.last_name}
              </h3>
              <Badge className={`text-xs text-white ${employmentColor}`}>
                {EMPLOYMENT_TYPE_LABELS[employmentType]}
              </Badge>
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
            {employee.days_off && employee.days_off.length > 0 && (
              <div className="mt-1 text-sm text-muted-foreground">
                Off: <span className="font-medium">{employee.days_off.map(d => DAYS_OF_WEEK[d]).join(', ')}</span>
              </div>
            )}
            {employee.preferred_shift && employee.preferred_shift !== 'flexible' && (
              <div className="mt-1 text-sm text-muted-foreground">
                Shift: <span className="font-medium">{SHIFT_PREFERENCE_ICONS[employee.preferred_shift]} {SHIFT_PREFERENCE_LABELS[employee.preferred_shift]}</span>
              </div>
            )}
            {employee.employment_type === 'part_time' && employee.max_hours_per_week && (
              <div className="mt-1 text-sm text-muted-foreground">
                Max: <span className="font-medium">{employee.max_hours_per_week}h/week</span>
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
    employment_type: employee?.employment_type || 'full_time',
    preferred_shift: employee?.preferred_shift || 'flexible',
    days_off: employee?.days_off ?? null,
    max_hours_per_week: employee?.max_hours_per_week ?? null,
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
          <Label htmlFor="last_name">Last Name (optional)</Label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
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

      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <Label htmlFor="employment_type">Employment Type</Label>
          <select
            id="employment_type"
            value={formData.employment_type || 'full_time'}
            onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as EmploymentType })}
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
          >
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>{EMPLOYMENT_TYPE_LABELS[type]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label>Preferred Shift</Label>
        <div className="flex gap-2 mt-2">
          {SHIFT_PREFERENCES.map((pref) => (
            <button
              key={pref}
              type="button"
              onClick={() => setFormData({ ...formData, preferred_shift: pref })}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                formData.preferred_shift === pref
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {SHIFT_PREFERENCE_ICONS[pref]} {SHIFT_PREFERENCE_LABELS[pref]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Days Off (select 1 or 2)</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {DAYS_OF_WEEK.map((day, index) => {
            const isSelected = formData.days_off?.includes(index) ?? false;
            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  const current = formData.days_off || [];
                  if (isSelected) {
                    const newDays = current.filter(d => d !== index);
                    setFormData({ ...formData, days_off: newDays.length > 0 ? newDays : null });
                  } else if (current.length < 2) {
                    setFormData({ ...formData, days_off: [...current, index] });
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {day.substring(0, 3)}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formData.days_off?.length === 2 ? '2 days off - employee works more hours on other days' : 'Click to select days off'}
        </p>
      </div>

      {formData.employment_type === 'part_time' && (
        <div>
          <Label htmlFor="max_hours">Max Hours/Week</Label>
          <Input
            id="max_hours"
            type="number"
            min="1"
            max="40"
            value={formData.max_hours_per_week || ''}
            onChange={(e) => setFormData({ ...formData, max_hours_per_week: e.target.value ? Number(e.target.value) : null })}
            placeholder="e.g., 20"
          />
        </div>
      )}

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
  const queryClient = useQueryClient();
  const { data: employees, isLoading, error } = useEmployees();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  const handleSwapComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  };

  const [search, setSearch] = useState('');
  const [filterRestaurant, setFilterRestaurant] = useState<number | null>(null);
  const [filterEmploymentType, setFilterEmploymentType] = useState<EmploymentType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const filteredEmployees = employees?.filter((emp) => {
    const matchesSearch =
      emp.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(search.toLowerCase());
    const matchesRestaurant = filterRestaurant === null || emp.restaurant_id === filterRestaurant;
    const matchesEmploymentType = filterEmploymentType === null || emp.employment_type === filterEmploymentType;
    return matchesSearch && matchesRestaurant && matchesEmploymentType;
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

  const [importing, setImporting] = useState(false);

  const handleImportCSV = async (employees: CreateEmployeeData[]) => {
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const emp of employees) {
      try {
        await createMutation.mutateAsync(emp);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setImporting(false);

    if (errorCount === 0) {
      toast.success(`Successfully imported ${successCount} employee${successCount !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`Imported ${successCount}, failed ${errorCount}`);
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
        <div className="flex gap-2 flex-wrap">
          <ImportCSVDialog onImport={handleImportCSV} isLoading={importing} />
          {employees && employees.length > 0 && (
            <SwapDaysOffDialog employees={employees} onSwapComplete={handleSwapComplete} />
          )}
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
          value={filterEmploymentType ?? ''}
          onChange={(e) => setFilterEmploymentType(e.target.value === '' ? null : e.target.value as EmploymentType)}
          className="h-10 px-3 rounded-md border border-input bg-background"
        >
          <option value="">All Types</option>
          {EMPLOYMENT_TYPES.map((type) => (
            <option key={type} value={type}>{EMPLOYMENT_TYPE_LABELS[type]}</option>
          ))}
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
