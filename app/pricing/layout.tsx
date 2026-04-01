import type { Metadata } from "next";
import { generateMetadata as seoGenerateMetadata, pageSeo } from "@/lib/seo";

export const metadata: Metadata = seoGenerateMetadata(
  pageSeo.pricing.title,
  pageSeo.pricing.description,
  {
    keywords: pageSeo.pricing.keywords,
  }
);

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
