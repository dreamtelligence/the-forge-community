import type { Metadata } from "next";
import { generateMetadata as seoGenerateMetadata, pageSeo } from "@/lib/utils/seo";

export const metadata: Metadata = seoGenerateMetadata(
  pageSeo.demoShop.title,
  pageSeo.demoShop.description,
  {
    keywords: pageSeo.demoShop.keywords,
  }
);

export default function DemoShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
