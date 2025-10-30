'use client';

import React, { useState } from 'react';
import { Trip } from '@/types';
import { ExportPdfDialog } from './ExportPdfDialog';
import { Button } from './ui/button';
import { FileDown } from 'lucide-react';

interface ExportPdfButtonProps {
  trip: Trip;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function ExportPdfButton({
  trip,
  variant = 'outline',
  size = 'default',
  className = '',
}: ExportPdfButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setDialogOpen(true)}
      >
        <FileDown className="w-4 h-4 mr-2" />
        导出 PDF
      </Button>

      <ExportPdfDialog
        trip={trip}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
