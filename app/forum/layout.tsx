import type { Metadata } from "next";
import { generateMetadata as seoGenerateMetadata, pageSeo } from "@/lib/seo";

export const metadata: Metadata = seoGenerateMetadata(
  pageSeo.forum.title,
  pageSeo.forum.description,
  {
    keywords: pageSeo.forum.keywords,
  }
);

export default function ForumLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
