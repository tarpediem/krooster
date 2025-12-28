'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  Calendar,
  Users,
  CalendarOff,
  MessageSquare,
  Menu,
  X,
  Home,
  Settings,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Schedule', href: '/calendar', icon: Calendar },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Leave', href: '/leave', icon: CalendarOff },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Kruce', href: '/assistant', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background px-6 pb-4">
        <div className="flex h-16 shrink-0 items-center gap-2">
          <Image src="/logo.png" alt="Krooster" width={40} height={40} className="dark:invert" />
          <span className="text-xl font-bold">Krooster</span>
        </div>
        <NavLinks />
        <div className="mt-auto">
          <div className="rounded-lg bg-muted p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Kosmo Kompany
            </p>
            <p className="text-xs text-muted-foreground">
              Kosmo & A la mer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-background px-4 py-4 shadow-sm lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="-m-2.5">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center gap-2 px-6">
              <Image src="/logo.png" alt="Krooster" width={40} height={40} className="dark:invert" />
              <span className="text-xl font-bold">Krooster</span>
            </div>
            <div className="flex-1 px-4">
              <NavLinks onClick={() => setOpen(false)} />
            </div>
            <div className="p-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Kosmo Kompany
                </p>
                <p className="text-xs text-muted-foreground">
                  Kosmo & A la mer
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <div className="flex-1 flex items-center gap-2">
        <Image src="/logo.png" alt="Krooster" width={28} height={28} className="dark:invert" />
        <span className="font-semibold">Krooster</span>
      </div>
    </div>
  );
}
