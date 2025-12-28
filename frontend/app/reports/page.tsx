'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Loader2,
  Clock,
  Users,
  Coffee,
  Building2,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getEmployeeHours, type EmployeeHoursData } from '@/lib/api';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeHoursData[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [restaurantFilter, setRestaurantFilter] = useState<string>('all');
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setIsLoading(true);
    try {
      const restaurantId = restaurantFilter === 'all' ? undefined : parseInt(restaurantFilter);
      const result = await getEmployeeHours(dateFrom, dateTo, restaurantId);
      setEmployees(result.employees || []);
      setPeriod(result.period);
    } catch (error) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load employee hours report');
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilter() {
    loadReport();
  }

  function handleExportCSV() {
    if (employees.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Employee', 'Restaurant', 'Total Shifts', 'Total Hours', 'Break Minutes', 'Net Hours'];
    const rows = employees.map(e => [
      `${e.first_name} ${e.last_name}`,
      e.restaurant || 'Unassigned',
      e.total_shifts,
      e.total_hours,
      e.total_break_minutes,
      e.net_hours,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-hours-${dateFrom}-to-${dateTo}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Report exported');
  }

  // Calculate totals
  const totalShifts = employees.reduce((sum, e) => sum + e.total_shifts, 0);
  const totalHours = employees.reduce((sum, e) => sum + parseFloat(e.total_hours), 0);
  const totalNetHours = employees.reduce((sum, e) => sum + parseFloat(e.net_hours), 0);
  const totalBreakMinutes = employees.reduce((sum, e) => sum + e.total_break_minutes, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Employee Hours Report</h1>
        </div>
        <p className="text-muted-foreground">
          View worked hours by employee for a custom date range
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurant">Restaurant</Label>
              <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All restaurants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All restaurants</SelectItem>
                  <SelectItem value="1">A la mer by Kosmo</SelectItem>
                  <SelectItem value="2">Kosmo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleFilter} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="mr-2 h-4 w-4" />
                )}
                Apply Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Shifts</p>
                <p className="text-2xl font-bold">{totalShifts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Hours</p>
                <p className="text-2xl font-bold">{totalNetHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Coffee className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Break Time</p>
                <p className="text-2xl font-bold">{Math.round(totalBreakMinutes / 60)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Employee Hours</CardTitle>
            <CardDescription>
              {period && `Period: ${period.from} to ${period.to}`}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={handleExportCSV} disabled={employees.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No data found for the selected period</p>
              <p className="text-sm text-muted-foreground">Try adjusting the date range or filters</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead className="text-right">Shifts</TableHead>
                    <TableHead className="text-right">Gross Hours</TableHead>
                    <TableHead className="text-right">Breaks</TableHead>
                    <TableHead className="text-right">Net Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {employee.restaurant || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{employee.total_shifts}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{employee.total_hours}h</TableCell>
                      <TableCell className="text-right">
                        {employee.total_break_minutes}min
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={parseFloat(employee.net_hours) > 40 ? 'text-orange-600' : ''}>
                          {employee.net_hours}h
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
