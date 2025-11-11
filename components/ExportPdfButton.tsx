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
      <button
        onClick={() => setDialogOpen(true)}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <FileDown className="w-4 h-4 mr-2" />
        导出 PDF
      </button>

      <ExportPdfDialog
        trip={trip}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
