/**
 * DocumentExport - PDF/DOCX Export Button
 * Used by: Legal Studio, Email Studio
 */

'use client';

import { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';

interface DocumentExportProps {
  content: string;
  filename: string;
  format?: 'pdf' | 'txt';
  disabled?: boolean;
}

export function DocumentExport({
  content,
  filename,
  format = 'txt',
  disabled = false,
}: DocumentExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!content) return;

    setIsExporting(true);

    try {
      if (format === 'pdf') {
        // TODO: Implement PDF export with jsPDF
        // For now, fallback to TXT
        exportAsText();
      } else {
        exportAsText();
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportAsText = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || isExporting || !content}
      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Exportiere...
        </>
      ) : (
        <>
          {format === 'pdf' ? (
            <FileText className="w-4 h-4" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Exportieren als {format.toUpperCase()}
        </>
      )}
    </button>
  );
}