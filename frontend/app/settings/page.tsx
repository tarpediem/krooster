'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Settings2,
  Server,
  Activity,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  Cpu,
  Users,
  Calendar,
  CalendarOff,
  HardDrive,
  Zap,
  FileUp,
  RotateCcw,
  Clock,
  Timer,
  Coffee,
  Moon,
  UserCheck,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  getAdminStats,
  getLLMConfig,
  saveLLMConfig,
  testLLMConnection,
  backupDatabase,
  clearShifts,
  clearEmployees,
  clearLeaves,
  resetDatabase,
  exportEmployeesCSV,
  exportShiftsCSV,
  exportLeavesCSV,
  getShiftRules,
  saveShiftRules,
  type AdminStats,
  type LLMConfig,
  type ShiftRules,
} from '@/lib/api';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: 'ollama',
    model: 'mistral',
    api_url: 'http://host.docker.internal:11434',
  });
  const [cerebrasModels, setCerebrasModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shiftRules, setShiftRules] = useState<ShiftRules>({});
  const [editedRules, setEditedRules] = useState<Record<string, string>>({});
  const [isSavingRules, setIsSavingRules] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (llmConfig.provider === 'cerebras') {
      fetchCerebrasModels();
    }
  }, [llmConfig.provider]);

  async function fetchCerebrasModels() {
    setIsLoadingModels(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678/webhook'}/api/admin/cerebras-models`);
      const data = await response.json();
      if (data.success && data.models) {
        setCerebrasModels(data.models);
      }
    } catch (error) {
      console.error('Failed to fetch Cerebras models:', error);
      // Fallback to default models
      setCerebrasModels(['llama-3.3-70b', 'llama3.1-8b', 'qwen-3-32b']);
    } finally {
      setIsLoadingModels(false);
    }
  }

  async function loadData() {
    setIsLoading(true);
    try {
      const [statsData, configData, rulesData] = await Promise.all([
        getAdminStats().catch(() => ({ employee_count: 0, shift_count: 0, leave_count: 0 })),
        getLLMConfig().catch(() => ({ provider: 'ollama' as const, model: 'mistral', api_url: 'http://host.docker.internal:11434' })),
        getShiftRules().catch(() => ({})),
      ]);
      setStats(statsData);
      setLlmConfig(configData);
      setShiftRules(rulesData);
      // Initialize edited rules with current values
      const initialEdits: Record<string, string> = {};
      Object.entries(rulesData).forEach(([key, rule]) => {
        initialEdits[key] = rule.value;
      });
      setEditedRules(initialEdits);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSaveLLMConfig() {
    setIsSaving(true);
    try {
      await saveLLMConfig(llmConfig);
      toast.success('LLM configuration saved successfully');
    } catch (error) {
      toast.error('Failed to save LLM configuration');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTestConnection() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testLLMConnection();
      setTestResult(result);
      if (result.success) {
        toast.success('Connection successful');
      } else {
        toast.error(result.message || 'Connection failed');
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Connection test failed' });
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  }

  async function handleBackup() {
    try {
      const blob = await backupDatabase();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `krooster-backup-${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Database backup downloaded');
    } catch (error) {
      toast.error('Failed to create database backup');
    }
  }

  async function handleClearShifts() {
    try {
      await clearShifts();
      toast.success('All shifts cleared');
      loadData();
    } catch (error) {
      toast.error('Failed to clear shifts');
    }
  }

  async function handleClearEmployees() {
    try {
      await clearEmployees();
      toast.success('All employees cleared');
      loadData();
    } catch (error) {
      toast.error('Failed to clear employees');
    }
  }

  async function handleClearLeaves() {
    try {
      await clearLeaves();
      toast.success('All leave requests cleared');
      loadData();
    } catch (error) {
      toast.error('Failed to clear leave requests');
    }
  }

  async function handleResetDatabase() {
    try {
      await resetDatabase();
      toast.success('Database reset successfully');
      setResetConfirmText('');
      loadData();
    } catch (error) {
      toast.error('Failed to reset database');
    }
  }

  async function handleExportEmployees() {
    try {
      const blob = await exportEmployeesCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Employees exported');
    } catch (error) {
      toast.error('Failed to export employees');
    }
  }

  async function handleExportShifts() {
    try {
      const blob = await exportShiftsCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shifts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Shifts exported');
    } catch (error) {
      toast.error('Failed to export shifts');
    }
  }

  async function handleExportLeaves() {
    try {
      const blob = await exportLeavesCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave-requests-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Leave requests exported');
    } catch (error) {
      toast.error('Failed to export leave requests');
    }
  }

  async function handleSaveRules() {
    setIsSavingRules(true);
    try {
      await saveShiftRules(editedRules);
      toast.success('Shift rules saved successfully');
      loadData(); // Reload to get updated timestamps
    } catch (error) {
      toast.error('Failed to save shift rules');
    } finally {
      setIsSavingRules(false);
    }
  }

  function handleRuleChange(key: string, value: string) {
    setEditedRules(prev => ({ ...prev, [key]: value }));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.sql')) {
        toast.error('Please select a .sql file');
        return;
      }
      setRestoreFile(file);
      setRestoreResult(null);
    }
  }

  async function handleRestoreDatabase() {
    if (!restoreFile) {
      toast.error('Please select a backup file first');
      return;
    }

    setIsRestoring(true);
    setRestoreResult(null);

    try {
      const content = await restoreFile.text();

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5678/webhook'}/api/admin/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql_content: content }),
      });

      const data = await response.json();

      if (data.success) {
        setRestoreResult({ success: true, message: data.message || 'Database restored successfully' });
        toast.success('Database restored successfully!');
        setRestoreFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        loadData(); // Refresh stats
      } else {
        setRestoreResult({ success: false, message: data.error || 'Restore failed' });
        toast.error(data.error || 'Failed to restore database');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Restore failed';
      setRestoreResult({ success: false, message });
      toast.error('Failed to restore database');
    } finally {
      setIsRestoring(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings2 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Admin Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage database, LLM configuration, and system settings
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* System Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <CardTitle>System Status</CardTitle>
            </div>
            <CardDescription>Current database statistics and system information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border bg-gradient-to-br from-blue-500/5 to-blue-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Employees</span>
                </div>
                <p className="text-2xl font-bold">{stats?.employee_count || 0}</p>
              </div>
              <div className="rounded-lg border bg-gradient-to-br from-green-500/5 to-green-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Shifts</span>
                </div>
                <p className="text-2xl font-bold">{stats?.shift_count || 0}</p>
              </div>
              <div className="rounded-lg border bg-gradient-to-br from-orange-500/5 to-orange-500/10 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarOff className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-muted-foreground">Leave Requests</span>
                </div>
                <p className="text-2xl font-bold">{stats?.leave_count || 0}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">LLM Provider</span>
                </div>
                <Badge variant="secondary">{llmConfig.provider}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Model</span>
                </div>
                <Badge variant="outline">{llmConfig.model}</Badge>
              </div>
              {stats?.last_backup && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Last Backup</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{stats.last_backup}</span>
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={loadData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Stats
            </Button>
          </CardContent>
        </Card>

        {/* LLM Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-600" />
              <CardTitle>LLM Configuration</CardTitle>
            </div>
            <CardDescription>Configure the AI provider for schedule generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={llmConfig.provider}
                  onValueChange={(value: 'cerebras' | 'ollama') => {
                    const newConfig = { ...llmConfig, provider: value };
                    // Auto-set API URL and model when switching providers
                    if (value === 'cerebras') {
                      newConfig.api_url = 'https://api.cerebras.ai/v1';
                      newConfig.model = 'llama-3.3-70b';
                    } else {
                      newConfig.api_url = 'http://host.docker.internal:11434';
                      newConfig.model = 'mistral';
                    }
                    setLlmConfig(newConfig);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Ollama (Self-hosted)</SelectItem>
                    <SelectItem value="cerebras">Cerebras</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                {llmConfig.provider === 'cerebras' ? (
                  <Select
                    value={llmConfig.model}
                    onValueChange={(value) => setLlmConfig({ ...llmConfig, model: value })}
                    disabled={isLoadingModels}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select model"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cerebrasModels.length > 0 ? (
                        cerebrasModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                            {model === 'llama-3.3-70b' && ' (Recommended)'}
                            {model === 'llama3.1-8b' && ' (Fast)'}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="llama-3.3-70b">llama-3.3-70b</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="model"
                    value={llmConfig.model}
                    onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                    placeholder="mistral"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {llmConfig.provider === 'ollama'
                    ? 'e.g., mistral, llama3:8b, gemma2:9b'
                    : 'Models are fetched from Cerebras API'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_url">API URL</Label>
                <Input
                  id="api_url"
                  value={llmConfig.api_url}
                  onChange={(e) => setLlmConfig({ ...llmConfig, api_url: e.target.value })}
                  placeholder="http://host.docker.internal:11434"
                />
                <p className="text-xs text-muted-foreground">
                  {llmConfig.provider === 'ollama'
                    ? 'Use host.docker.internal for Docker, or localhost for native'
                    : 'Cerebras API endpoint'}
                </p>
              </div>
            </div>

            {testResult && (
              <div
                className={`flex items-center gap-2 rounded-lg p-3 ${
                  testResult.success
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex-1"
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
              <Button onClick={handleSaveLLMConfig} disabled={isSaving} className="flex-1">
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shift Rules */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              <CardTitle>Shift Rules</CardTitle>
            </div>
            <CardDescription>Configure scheduling constraints and business rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Shift Duration */}
              <div className="space-y-2">
                <Label htmlFor="max_shift_hours" className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  Max Shift Hours
                </Label>
                <Input
                  id="max_shift_hours"
                  type="number"
                  min="1"
                  max="12"
                  value={editedRules.max_shift_hours || ''}
                  onChange={(e) => handleRuleChange('max_shift_hours', e.target.value)}
                  placeholder="8"
                />
                <p className="text-xs text-muted-foreground">{shiftRules.max_shift_hours?.description}</p>
              </div>

              {/* Break Threshold */}
              <div className="space-y-2">
                <Label htmlFor="min_break_threshold" className="flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                  Break Required After
                </Label>
                <Input
                  id="min_break_threshold"
                  type="number"
                  min="1"
                  max="8"
                  value={editedRules.min_break_threshold || ''}
                  onChange={(e) => handleRuleChange('min_break_threshold', e.target.value)}
                  placeholder="5"
                />
                <p className="text-xs text-muted-foreground">{shiftRules.min_break_threshold?.description}</p>
              </div>

              {/* Break Duration */}
              <div className="space-y-2">
                <Label htmlFor="min_break_duration" className="flex items-center gap-2">
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                  Min Break (minutes)
                </Label>
                <Input
                  id="min_break_duration"
                  type="number"
                  min="15"
                  max="120"
                  value={editedRules.min_break_duration || ''}
                  onChange={(e) => handleRuleChange('min_break_duration', e.target.value)}
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">{shiftRules.min_break_duration?.description}</p>
              </div>

              {/* Rest Between Shifts */}
              <div className="space-y-2">
                <Label htmlFor="min_rest_between_shifts" className="flex items-center gap-2">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  Min Rest Hours
                </Label>
                <Input
                  id="min_rest_between_shifts"
                  type="number"
                  min="8"
                  max="24"
                  value={editedRules.min_rest_between_shifts || ''}
                  onChange={(e) => handleRuleChange('min_rest_between_shifts', e.target.value)}
                  placeholder="11"
                />
                <p className="text-xs text-muted-foreground">{shiftRules.min_rest_between_shifts?.description}</p>
              </div>

              {/* Min Employees */}
              <div className="space-y-2">
                <Label htmlFor="min_employees_per_day" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  Min Employees/Day
                </Label>
                <Input
                  id="min_employees_per_day"
                  type="number"
                  min="1"
                  max="20"
                  value={editedRules.min_employees_per_day || ''}
                  onChange={(e) => handleRuleChange('min_employees_per_day', e.target.value)}
                  placeholder="3"
                />
                <p className="text-xs text-muted-foreground">{shiftRules.min_employees_per_day?.description}</p>
              </div>

              {/* Max Weekly Hours */}
              <div className="space-y-2">
                <Label htmlFor="max_hours_per_week" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Max Hours/Week
                </Label>
                <Input
                  id="max_hours_per_week"
                  type="number"
                  min="20"
                  max="60"
                  value={editedRules.max_hours_per_week || ''}
                  onChange={(e) => handleRuleChange('max_hours_per_week', e.target.value)}
                  placeholder="40"
                />
                <p className="text-xs text-muted-foreground">{shiftRules.max_hours_per_week?.description}</p>
              </div>

              {/* Max Missions */}
              <div className="space-y-2">
                <Label htmlFor="max_missions_per_month" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Max Missions/Month
                </Label>
                <Input
                  id="max_missions_per_month"
                  type="number"
                  min="0"
                  max="10"
                  value={editedRules.max_missions_per_month || ''}
                  onChange={(e) => handleRuleChange('max_missions_per_month', e.target.value)}
                  placeholder="2"
                />
                <p className="text-xs text-muted-foreground">{shiftRules.max_missions_per_month?.description}</p>
              </div>

              {/* Min Mission Days */}
              <div className="space-y-2">
                <Label htmlFor="min_mission_days" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Min Mission Days
                </Label>
                <Input
                  id="min_mission_days"
                  type="number"
                  min="1"
                  max="14"
                  value={editedRules.min_mission_days || ''}
                  onChange={(e) => handleRuleChange('min_mission_days', e.target.value)}
                  placeholder="2"
                />
                <p className="text-xs text-muted-foreground">{shiftRules.min_mission_days?.description}</p>
              </div>
            </div>

            <Button onClick={handleSaveRules} disabled={isSavingRules} className="w-full sm:w-auto">
              {isSavingRules ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Save Rules
            </Button>
          </CardContent>
        </Card>

        {/* Database Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <CardTitle>Database Management</CardTitle>
            </div>
            <CardDescription>Backup, clear, or reset database tables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Backup */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Download className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Backup Database</p>
                  <p className="text-sm text-muted-foreground">Download SQL dump of all data</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleBackup}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            {/* Restore */}
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <RotateCcw className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Restore Database</p>
                  <p className="text-sm text-muted-foreground">
                    Restore from a SQL backup file
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".sql"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="restore-file-input"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1"
                  >
                    <FileUp className="mr-2 h-4 w-4" />
                    {restoreFile ? restoreFile.name : 'Select SQL File'}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        disabled={!restoreFile || isRestoring}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isRestoring ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 h-4 w-4" />
                        )}
                        Restore
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          Restore Database?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                          <span className="block">
                            You are about to restore the database from:
                          </span>
                          <span className="block font-mono text-sm bg-muted p-2 rounded">
                            {restoreFile?.name}
                          </span>
                          <span className="block text-orange-600">
                            This will execute all SQL statements in the file. Make sure this is a valid backup file.
                          </span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleRestoreDatabase}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Yes, Restore Database
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {restoreResult && (
                  <div
                    className={`flex items-center gap-2 rounded-lg p-3 ${
                      restoreResult.success
                        ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                        : 'bg-red-500/10 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {restoreResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm">{restoreResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Clear Shifts */}
            <div className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Clear All Shifts</p>
                  <p className="text-sm text-muted-foreground">
                    Remove all scheduled shifts ({stats?.shift_count || 0} records)
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Shifts?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {stats?.shift_count || 0} shifts from the database. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearShifts}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Yes, Clear All Shifts
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Clear Employees */}
            <div className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Clear All Employees</p>
                  <p className="text-sm text-muted-foreground">
                    Remove all employees ({stats?.employee_count || 0} records)
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Employees?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {stats?.employee_count || 0} employees and their associated shifts from the database. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearEmployees}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Yes, Clear All Employees
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Clear Leave Requests */}
            <div className="flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <CalendarOff className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Clear All Leave Requests</p>
                  <p className="text-sm text-muted-foreground">
                    Remove all leave requests ({stats?.leave_count || 0} records)
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-orange-500/50 text-orange-600 hover:bg-orange-500/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Leave Requests?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {stats?.leave_count || 0} leave requests from the database. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearLeaves}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Yes, Clear All Leave Requests
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            {/* Reset Database - Dangerous */}
            <div className="rounded-lg border-2 border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">Reset Entire Database</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete ALL data and reset to initial state
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Shield className="mr-2 h-4 w-4" />
                    Reset Database
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Reset Entire Database?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <span className="block">
                        This is a destructive action that will permanently delete ALL data including:
                      </span>
                      <ul className="list-disc list-inside space-y-1">
                        <li>{stats?.employee_count || 0} employees</li>
                        <li>{stats?.shift_count || 0} shifts</li>
                        <li>{stats?.leave_count || 0} leave requests</li>
                        <li>All leave balances and configurations</li>
                      </ul>
                      <span className="block font-medium text-red-600">
                        This action CANNOT be undone.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Label htmlFor="confirm-reset" className="text-sm">
                      Type <span className="font-mono font-bold">RESET</span> to confirm:
                    </Label>
                    <Input
                      id="confirm-reset"
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder="RESET"
                      className="mt-2"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setResetConfirmText('')}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetDatabase}
                      disabled={resetConfirmText !== 'RESET'}
                      className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      Yes, Reset Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <CardTitle>Data Export</CardTitle>
            </div>
            <CardDescription>Export data to CSV files for backup or analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Export Employees</p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.employee_count || 0} employees
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleExportEmployees}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Calendar className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Export Shifts</p>
                  <p className="text-sm text-muted-foreground">{stats?.shift_count || 0} shifts</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleExportShifts}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <CalendarOff className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium">Export Leave Requests</p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.leave_count || 0} requests
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleExportLeaves}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
