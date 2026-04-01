'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';
import BrandBookPDF from './BrandBookPDF';
import { Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface BrandDNA {
  brandName: string;
  tagline: string;
  mission: string;
  vision: string;
  values: string[];
  toneOfVoice: string;
  personality: string[];
  primaryColor: string;
  secondaryColors: string[];
  targetAudience: {
    age: string;
    location: string;
    interests: string[];
  };
  customerPersona: string;
  usp: string;
}

export default function BrandKitExport({ data }: { data: BrandDNA }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Avoid hydration mismatch for PDF generator
  }

  return (
    <div className="flex w-full sm:w-auto">
      <PDFDownloadLink
        document={<BrandBookPDF data={data} />}
        fileName={`${data.brandName || 'Brand'}_BrandBook.pdf`}
        className="flex w-full sm:w-auto items-center justify-center gap-2 bg-white/10 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-[11px] sm:text-sm hover:bg-white/20 transition-all border border-white/10 whitespace-nowrap"
      >
        {({ loading }) =>
          loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="truncate">PDF...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span className="truncate">Brand Book</span>
            </>
          )
        }
      </PDFDownloadLink>
    </div>
  );
}
