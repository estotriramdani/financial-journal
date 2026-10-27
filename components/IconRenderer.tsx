'use client';

import React from 'react';
import * as Icons from 'lucide-react';

interface IconRendererProps {
  name?: string | null;
  className?: string;
  size?: number;
}

export function IconRenderer({ name, className = 'w-5 h-5', size = 20 }: IconRendererProps) {
  if (!name) {
    const Fallback = Icons.Tag;
    return <Fallback size={size} className={className} />;
  }

  // Get Lucide component
  const LucideIcon = (Icons as any)[name];

  if (!LucideIcon) {
    const Fallback = Icons.Tag;
    return <Fallback size={size} className={className} />;
  }

  return <LucideIcon size={size} className={className} />;
}
