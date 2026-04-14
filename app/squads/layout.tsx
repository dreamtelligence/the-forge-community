import type { Metadata } from "next";
import { generateMetadata as seoGenerateMetadata, pageSeo } from "@/lib/utils/seo";

export const metadata: Metadata = seoGenerateMetadata(
  pageSeo.squads.title,
  pageSeo.squads.description,
  {
    keywords: pageSeo.squads.keywords,
  }
);

export default function SquadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
