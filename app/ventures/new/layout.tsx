import type { Metadata } from "next";
import { generateMetadata as seoGenerateMetadata, pageSeo } from "@/lib/utils/seo";

export const metadata: Metadata = seoGenerateMetadata(
  pageSeo.ventureNew.title,
  pageSeo.ventureNew.description,
  {
    keywords: pageSeo.ventureNew.keywords,
  }
);

export default function NewVentureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
