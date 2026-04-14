"use client";

import React from "react";
import { motion } from "framer-motion";
import { FullScreenScrollFX } from "@/shared/ui/full-screen-scroll-fx";
import { useI18n } from '@/app/components/i18n/I18nProvider';

const sections = [
  {
    id: "food",
    leftLabel: "Food",
    title: "",
    rightLabel: "Food",
    background: "/images/fruits.webp",
  },
  {
    id: "shoes",
    leftLabel: "Shoes",
    title: "",
    rightLabel: "Shoes",
    background: "/images/adidas-shoes.webp",
  },
  {
    id: "beauty",
    leftLabel: "Beauty",
    title: "",
    rightLabel: "Beauty",
    background: "/images/parfum.webp",
  },
  {
    id: "fashion",
    leftLabel: "Fashion",
    title: "",
    rightLabel: "Fashion",
    background: "/fashion.webp",
  },
  {
    id: "home-living",
    leftLabel: "Home & Living",
    title: "",
    rightLabel: "Home & Living",
    background: "/images/stuhl.webp",
    backgroundMobile: "/images/stuhl.webp",
  },
  {
    id: "electronics",
    leftLabel: "Electronics",
    title: "",
    rightLabel: "Electronics",
    background: "/electronics.webp",
  },
  {
    id: "supplements",
    leftLabel: "Supplements",
    title: "",
    rightLabel: "Supplements",
    background: "/images/supplements-v2.webp",
  },
];

export default function CategoryScroll() {
  const { copy } = useI18n();
  return (
    <section className="bg-black">
      <FullScreenScrollFX
        sections={sections}
        pinOnScroll={false}
        bgTransition="circle"
        header={
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {copy.categoryScroll.header}
          </motion.div>
        }
        footer={<div>{copy.categoryScroll.footer}</div>}
        showProgress
        durations={{ change: 0.7, snap: 800 }}
        gridPaddingX={1}
        colors={{
          text: "rgba(255,255,255,0.94)",
          overlay: "rgba(0,0,0,0.2)",
          pageBg: "#000000",
          stageBg: "#000000",
        }}
      />
    </section>
  );
}
