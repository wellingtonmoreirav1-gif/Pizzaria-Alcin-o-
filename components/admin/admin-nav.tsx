'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart3, CalendarClock, ClipboardList, Gauge, Image as ImageIcon, LayoutGrid, Menu, MessageSquareQuote,
  Power, ScrollText, Settings, ShieldCheck, Tag, Tags, Truck, Users, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  dashboard: Gauge, orders: ClipboardList, operation: Power, catalog: LayoutGrid, categories: Tags, promotions: Tag,
  banners: ImageIcon, hours: CalendarClock, delivery: Truck, reports: BarChart3, customers: Users, reviews: MessageSquareQuote,
  settings: Settings, team: ShieldCheck, audit: ScrollText,
} as const;

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

export function AdminNav({ items, userLabel, roleLabel, signOut }: { items: NavItem[]; userLabel: string; roleLabel: string; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = (
    <nav aria-label="Painel">
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium', active ? 'bg-white text-ink-950' : 'text-white/75 hover:bg-white/10 hover:text-white')}
              >
                <Icon className="size-4" aria-hidden /> {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
  const footer = (
    <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-xs text-white/60">
      <p className="truncate">{userLabel}</p>
      <p className="font-semibold text-white/80">{roleLabel}</p>
      <div className="flex gap-3">
        <Link href="/" className="underline hover:text-white">Ver site</Link>
        <form action={signOut}>
          <button type="submit" className="underline hover:text-white">Sair</button>
        </form>
      </div>
    </div>
  );
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-ink-950 px-4 py-3 text-white lg:hidden">
        <span className="font-display text-lg font-bold italic">Alcinão · Painel</span>
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-lg hover:bg-white/10" aria-label="Abrir menu" aria-expanded={open}>
          <Menu className="size-5" aria-hidden />
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 bg-ink-950/60 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-72 overflow-y-auto bg-ink-950 p-4" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} className="mb-4 grid size-10 place-items-center rounded-lg text-white hover:bg-white/10" aria-label="Fechar menu">
              <X className="size-5" aria-hidden />
            </button>
            {nav}
            {footer}
          </div>
        </div>
      ) : null}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto bg-ink-950 p-4 lg:block">
        <p className="mb-6 px-3 font-display text-xl font-bold italic text-white">
          Alcinão<span className="text-brand-500">.</span> <span className="font-sans text-xs font-medium not-italic text-white/50">painel</span>
        </p>
        {nav}
        {footer}
      </aside>
    </>
  );
}
