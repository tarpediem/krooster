'use client';

import Link from 'next/link';
import {
  Calendar,
  Users,
  CalendarOff,
  MessageSquare,
  ChefHat,
  MapPin,
  ArrowRight,
  Sparkles,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    name: 'Schedule',
    description: 'View and manage weekly shifts for both restaurants. Drag and drop to assign employees.',
    href: '/calendar',
    icon: Calendar,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    name: 'Employees',
    description: 'Manage your team. Add new staff, set their skills, and mark who can work at both locations.',
    href: '/employees',
    icon: Users,
    color: 'bg-green-500/10 text-green-600 dark:text-green-400',
    buttonColor: 'bg-green-600 hover:bg-green-700',
  },
  {
    name: 'Leave Requests',
    description: 'Handle time off requests. Approve or decline leave and track remaining balances.',
    href: '/leave',
    icon: CalendarOff,
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    buttonColor: 'bg-orange-600 hover:bg-orange-700',
  },
  {
    name: 'AI Assistant',
    description: 'Ask questions about scheduling, get suggestions, or auto-generate optimal schedules.',
    href: '/assistant',
    icon: MessageSquare,
    color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
  },
];

const steps = [
  {
    number: 1,
    title: 'Add Your Employees',
    description: 'Go to Employees and add all your staff. Mark their skills (kitchen, service, bar, etc.) and whether they can work at both locations.',
    icon: Users,
  },
  {
    number: 2,
    title: 'Create the Schedule',
    description: 'Open Schedule to view the weekly calendar. Click on a day to add shifts, or use the AI Assistant to auto-generate a smart schedule.',
    icon: Calendar,
  },
  {
    number: 3,
    title: 'Manage Time Off',
    description: 'When employees request leave, go to Leave Requests to review and approve. The system tracks balances automatically.',
    icon: CalendarOff,
  },
  {
    number: 4,
    title: 'Ask the AI',
    description: 'Stuck? The AI Assistant can answer questions, detect conflicts, suggest replacements, and generate optimized schedules.',
    icon: Sparkles,
  },
];

const tips = [
  {
    icon: UserCheck,
    title: 'Mobile Employees',
    description: 'Employees marked as "mobile" can be assigned to either Hua Hin or Sathorn. They get accommodation when working at the other site.',
  },
  {
    icon: Clock,
    title: 'Shift Rules',
    description: 'Max 8 hours per shift. Breaks are mandatory for shifts over 5 hours. At least 11 hours rest between shifts.',
  },
  {
    icon: AlertCircle,
    title: 'Minimum Staffing',
    description: 'Each restaurant needs at least 3 employees per shift. The system will alert you if you are understaffed.',
  },
];

export default function WelcomePage() {
  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 px-6 py-12 sm:px-12 sm:py-16">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <ChefHat className="h-9 w-9" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-center sm:text-5xl mb-4">
            Welcome to Krooster
          </h1>
          <p className="text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-8">
            Your smart scheduling system for Hua Hin & Sathorn restaurants
          </p>

          {/* Restaurant Cards */}
          <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
            <div className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-sm border">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Hua Hin</h3>
                <p className="text-sm text-muted-foreground">Beachfront Restaurant</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-sm border">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Sathorn</h3>
                <p className="text-sm text-muted-foreground">Bangkok City Restaurant</p>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            200km apart &bull; 3-4 mobile employees can work at either location
          </p>
        </div>
      </div>

      {/* Quick Start Feature Cards */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Quick Start</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.name} className="group relative overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader className="pb-2">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.color} mb-3`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{feature.name}</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <CardDescription className="mb-4 min-h-[60px]">
                  {feature.description}
                </CardDescription>
                <Link href={feature.href}>
                  <Button className={`w-full ${feature.buttonColor} text-white`}>
                    Open {feature.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How To Use Section */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">How To Use</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative rounded-xl border bg-card p-6 transition-all hover:shadow-md"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  {step.number}
                </div>
                <step.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Important Tips */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Important Tips</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {tips.map((tip, index) => (
            <div
              key={index}
              className="rounded-xl border bg-gradient-to-br from-muted/50 to-muted/20 p-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <tip.icon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{tip.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{tip.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="rounded-2xl bg-primary/5 border border-primary/10 p-8 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to Start?</h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Begin by adding your employees, or let the AI Assistant help you create your first schedule.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/employees">
            <Button size="lg" className="w-full sm:w-auto">
              <Users className="mr-2 h-5 w-5" />
              Add Employees
            </Button>
          </Link>
          <Link href="/assistant">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <MessageSquare className="mr-2 h-5 w-5" />
              Ask AI Assistant
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
