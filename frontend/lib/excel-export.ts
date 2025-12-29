import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Shift, Restaurant, Employee } from './types';

interface ExportOptions {
  shifts: Shift[];
  restaurants: Restaurant[];
  employees: Employee[];
  dateFrom: Date;
  dateTo: Date;
  viewMode: 'week' | 'month';
}

// Color palette
const COLORS = {
  // Restaurant colors
  huaHin: {
    header: 'FF1E88E5',      // Blue
    light: 'FFE3F2FD',       // Light blue
    medium: 'FF90CAF9',      // Medium blue
  },
  sathorn: {
    header: 'FF43A047',      // Green
    light: 'FFE8F5E9',       // Light green
    medium: 'FFA5D6A7',      // Medium green
  },
  // Shift type colors
  morning: 'FFFFF3E0',       // Light orange
  afternoon: 'FFE8EAF6',     // Light purple
  // General
  headerBg: 'FF1A237E',      // Dark blue
  headerText: 'FFFFFFFF',    // White
  weekendBg: 'FFF5F5F5',     // Light gray
  border: 'FFB0BEC5',        // Gray border
  today: 'FFFFEB3B',         // Yellow highlight
};

const getRestaurantColor = (restaurantName: string) => {
  if (restaurantName.toLowerCase().includes('hua hin') || restaurantName.toLowerCase().includes('la mer')) {
    return COLORS.huaHin;
  }
  return COLORS.sathorn;
};

const getShiftTypeColor = (startTime: string) => {
  const hour = parseInt(startTime.split(':')[0]);
  return hour < 14 ? COLORS.morning : COLORS.afternoon;
};

export async function exportScheduleToExcel(options: ExportOptions) {
  const { shifts, restaurants, employees, dateFrom, dateTo, viewMode } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Krooster Schedule';
  workbook.created = new Date();

  // Create employee lookup
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  // Generate dates array
  const dates: Date[] = [];
  let currentDate = new Date(dateFrom);
  while (currentDate <= dateTo) {
    dates.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }

  // Sheet 1: Combined Schedule Grid
  const gridSheet = workbook.addWorksheet('Schedule Grid', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 2 }]
  });

  createGridView(gridSheet, shifts, restaurants, dates);

  // Sheet 2: Per Restaurant Detail
  for (const restaurant of restaurants) {
    const restoShifts = shifts.filter(s => s.restaurant_id === restaurant.id);
    const sheetName = restaurant.name.substring(0, 31); // Excel limit
    const sheet = workbook.addWorksheet(sheetName);
    createRestaurantSheet(sheet, restoShifts, restaurant, dates, employeeMap);
  }

  // Sheet 3: Employee Hours Summary
  const summarySheet = workbook.addWorksheet('Hours Summary');
  createHoursSummary(summarySheet, shifts, employees, restaurants, dateFrom, dateTo);

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const filename = `schedule_${format(dateFrom, 'yyyy-MM-dd')}_to_${format(dateTo, 'yyyy-MM-dd')}.xlsx`;
  saveAs(blob, filename);
}

function createGridView(
  sheet: ExcelJS.Worksheet,
  shifts: Shift[],
  restaurants: Restaurant[],
  dates: Date[]
) {
  // Title row
  sheet.mergeCells(1, 1, 1, dates.length + 1);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = '📅 SCHEDULE OVERVIEW';
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.headerText } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Date header row
  const headerRow = sheet.getRow(2);
  headerRow.getCell(1).value = 'Restaurant';
  headerRow.getCell(1).font = { bold: true, color: { argb: COLORS.headerText } };
  headerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };

  dates.forEach((date, idx) => {
    const cell = headerRow.getCell(idx + 2);
    const dayName = format(date, 'EEE');
    const dayNum = format(date, 'd');
    cell.value = `${dayName}\n${dayNum}`;
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Highlight weekends
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3949AB' } };
    }

    // Highlight today
    if (isSameDay(date, new Date())) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.today } };
      cell.font = { bold: true, color: { argb: '000000' } };
    }
  });
  headerRow.height = 35;

  // Set column widths
  sheet.getColumn(1).width = 25;
  dates.forEach((_, idx) => {
    sheet.getColumn(idx + 2).width = 18;
  });

  // Restaurant rows
  let rowIndex = 3;
  for (const restaurant of restaurants) {
    const colors = getRestaurantColor(restaurant.name);

    // Restaurant header
    const restoRow = sheet.getRow(rowIndex);
    sheet.mergeCells(rowIndex, 1, rowIndex, dates.length + 1);
    restoRow.getCell(1).value = `🏪 ${restaurant.name.toUpperCase()}`;
    restoRow.getCell(1).font = { bold: true, size: 12, color: { argb: COLORS.headerText } };
    restoRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.header } };
    restoRow.height = 25;
    rowIndex++;

    // Morning shift row
    const morningRow = sheet.getRow(rowIndex);
    morningRow.getCell(1).value = '☀️ Morning (10:00-18:00)';
    morningRow.getCell(1).font = { bold: true };
    morningRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.morning } };

    dates.forEach((date, idx) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayShifts = shifts.filter(s =>
        s.restaurant_id === restaurant.id &&
        s.date.substring(0, 10) === dateStr &&
        parseInt(s.start_time.split(':')[0]) < 14
      );

      const cell = morningRow.getCell(idx + 2);
      cell.value = dayShifts.map(s => s.employee_first_name || 'TBD').join('\n');
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.light } };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    });
    morningRow.height = 60;
    rowIndex++;

    // Afternoon shift row
    const afternoonRow = sheet.getRow(rowIndex);
    afternoonRow.getCell(1).value = '🌙 Afternoon (15:00-23:00)';
    afternoonRow.getCell(1).font = { bold: true };
    afternoonRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.afternoon } };

    dates.forEach((date, idx) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayShifts = shifts.filter(s =>
        s.restaurant_id === restaurant.id &&
        s.date.substring(0, 10) === dateStr &&
        parseInt(s.start_time.split(':')[0]) >= 14
      );

      const cell = afternoonRow.getCell(idx + 2);
      cell.value = dayShifts.map(s => s.employee_first_name || 'TBD').join('\n');
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.medium } };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    });
    afternoonRow.height = 60;
    rowIndex++;

    // Spacer row
    rowIndex++;
  }
}

function createRestaurantSheet(
  sheet: ExcelJS.Worksheet,
  shifts: Shift[],
  restaurant: Restaurant,
  dates: Date[],
  employeeMap: Map<number, Employee>
) {
  const colors = getRestaurantColor(restaurant.name);

  // Title
  sheet.mergeCells(1, 1, 1, 6);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `📋 ${restaurant.name} - Detailed Schedule`;
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.headerText } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.header } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Headers
  const headers = ['Date', 'Day', 'Employee', 'Shift', 'Position', 'Status'];
  const headerRow = sheet.getRow(2);
  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { horizontal: 'center' };
  });
  headerRow.height = 25;

  // Set column widths
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 10;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 18;
  sheet.getColumn(5).width = 12;
  sheet.getColumn(6).width = 12;

  // Data rows
  let rowIndex = 3;
  const sortedShifts = [...shifts].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.start_time.localeCompare(b.start_time);
  });

  for (const shift of sortedShifts) {
    const row = sheet.getRow(rowIndex);
    const shiftDate = parseISO(shift.date);
    const isMorning = parseInt(shift.start_time.split(':')[0]) < 14;

    row.getCell(1).value = format(shiftDate, 'dd/MM');
    row.getCell(2).value = format(shiftDate, 'EEE');
    row.getCell(3).value = shift.employee_first_name || 'TBD';
    row.getCell(4).value = `${shift.start_time.substring(0, 5)} - ${shift.end_time.substring(0, 5)}`;
    row.getCell(5).value = shift.position || 'service';
    row.getCell(6).value = shift.status || 'scheduled';

    // Alternate row colors
    const bgColor = isMorning ? COLORS.morning : COLORS.afternoon;
    for (let col = 1; col <= 6; col++) {
      row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      row.getCell(col).border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    }

    // Highlight weekends
    const dayOfWeek = shiftDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      row.getCell(2).font = { bold: true, color: { argb: 'FFD32F2F' } };
    }

    rowIndex++;
  }

  // Summary at bottom
  rowIndex += 2;
  sheet.getRow(rowIndex).getCell(1).value = '📊 Summary';
  sheet.getRow(rowIndex).getCell(1).font = { bold: true, size: 12 };
  rowIndex++;
  sheet.getRow(rowIndex).getCell(1).value = `Total Shifts: ${shifts.length}`;
  rowIndex++;
  sheet.getRow(rowIndex).getCell(1).value = `Morning Shifts: ${shifts.filter(s => parseInt(s.start_time.split(':')[0]) < 14).length}`;
  rowIndex++;
  sheet.getRow(rowIndex).getCell(1).value = `Afternoon Shifts: ${shifts.filter(s => parseInt(s.start_time.split(':')[0]) >= 14).length}`;
}

function createHoursSummary(
  sheet: ExcelJS.Worksheet,
  shifts: Shift[],
  employees: Employee[],
  restaurants: Restaurant[],
  dateFrom: Date,
  dateTo: Date
) {
  // Title
  sheet.mergeCells(1, 1, 1, 6);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `📊 Hours Summary - ${format(dateFrom, 'MMM d')} to ${format(dateTo, 'MMM d, yyyy')}`;
  titleCell.font = { bold: true, size: 14, color: { argb: COLORS.headerText } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Headers
  const headers = ['Employee', 'Restaurant', 'Shifts', 'Total Hours', 'Avg/Day', 'Type'];
  const headerRow = sheet.getRow(2);
  headers.forEach((header, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { horizontal: 'center' };
  });
  headerRow.height = 25;

  // Column widths
  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 25;
  sheet.getColumn(3).width = 10;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 10;
  sheet.getColumn(6).width = 12;

  // Calculate hours per employee
  const employeeHours = new Map<number, { shifts: number; hours: number }>();

  for (const shift of shifts) {
    if (!shift.employee_id) continue;

    const startHour = parseInt(shift.start_time.split(':')[0]);
    const endHour = parseInt(shift.end_time.split(':')[0]);
    const hours = endHour - startHour;

    const current = employeeHours.get(shift.employee_id) || { shifts: 0, hours: 0 };
    current.shifts++;
    current.hours += hours;
    employeeHours.set(shift.employee_id, current);
  }

  // Sort employees by hours (descending)
  const sortedEmployees = [...employees]
    .filter(e => employeeHours.has(e.id))
    .sort((a, b) => {
      const hoursA = employeeHours.get(a.id)?.hours || 0;
      const hoursB = employeeHours.get(b.id)?.hours || 0;
      return hoursB - hoursA;
    });

  let rowIndex = 3;
  for (const employee of sortedEmployees) {
    const data = employeeHours.get(employee.id)!;
    const restaurant = restaurants.find(r => r.id === employee.restaurant_id);
    const avgPerDay = data.shifts > 0 ? (data.hours / data.shifts).toFixed(1) : '0';

    const row = sheet.getRow(rowIndex);
    row.getCell(1).value = employee.first_name + (employee.last_name ? ' ' + employee.last_name : '');
    row.getCell(2).value = restaurant?.name || 'N/A';
    row.getCell(3).value = data.shifts;
    row.getCell(4).value = data.hours;
    row.getCell(5).value = avgPerDay;
    row.getCell(6).value = employee.employment_type || 'full_time';

    // Color code by hours (green = good, yellow = warning, red = overtime)
    const colors = getRestaurantColor(restaurant?.name || '');
    const hoursBg = data.hours > 48 ? 'FFFFCDD2' : data.hours > 40 ? 'FFFFF9C4' : colors.light;

    for (let col = 1; col <= 6; col++) {
      row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hoursBg } };
      row.getCell(col).border = {
        top: { style: 'thin', color: { argb: COLORS.border } },
        bottom: { style: 'thin', color: { argb: COLORS.border } },
        left: { style: 'thin', color: { argb: COLORS.border } },
        right: { style: 'thin', color: { argb: COLORS.border } },
      };
    }

    // Highlight overtime
    if (data.hours > 48) {
      row.getCell(4).font = { bold: true, color: { argb: 'FFD32F2F' } };
    }

    rowIndex++;
  }

  // Legend
  rowIndex += 2;
  sheet.getRow(rowIndex).getCell(1).value = '🔵 Legend:';
  sheet.getRow(rowIndex).getCell(1).font = { bold: true };
  rowIndex++;

  const legendItems = [
    { color: 'FFE8F5E9', text: 'Normal hours (≤40h)' },
    { color: 'FFFFF9C4', text: 'Warning (40-48h)' },
    { color: 'FFFFCDD2', text: 'Overtime (>48h)' },
  ];

  for (const item of legendItems) {
    const row = sheet.getRow(rowIndex);
    row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.color } };
    row.getCell(1).value = '';
    row.getCell(2).value = item.text;
    rowIndex++;
  }
}
