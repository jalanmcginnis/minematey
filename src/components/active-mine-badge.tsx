'use client';

import Link from 'next/link';
import { Mountain, ArrowLeftRight } from 'lucide-react';
import { useActiveMine } from '@/context/MineContext';
import { Badge } from '@/components/ui/badge';

/**
 * Displays a read-only indicator badge showing the currently active MSHA Mine Site
 * and a quick link back to the Dashboard to switch mines.
 */
export function ActiveMineBadge() {
  const { selectedMineLabel } = useActiveMine();

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs sm:text-sm">
      <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold">
        <Mountain className="mr-1.5 h-3.5 w-3.5 text-primary" />
        Active Mine: {selectedMineLabel}
      </Badge>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <ArrowLeftRight className="h-3 w-3" />
        Change on Dashboard
      </Link>
    </div>
  );
}
