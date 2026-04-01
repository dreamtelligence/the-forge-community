import type { Metadata } from "next";
import { generateMetadata as seoGenerateMetadata, pageSeo } from "@/lib/seo";

export const metadata: Metadata = seoGenerateMetadata(
  pageSeo.home.title,
  pageSeo.home.description,
  {
    keywords: pageSeo.home.keywords,
  }
);

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
