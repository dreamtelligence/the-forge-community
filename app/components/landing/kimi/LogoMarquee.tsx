'use client';

import { motion } from 'framer-motion';

export default function LogoMarquee() {
  return (
    <section className="py-16 lg:py-24 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
          className="text-center"
        >
          <h2 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-bold text-white tracking-tighter">
            THE FORGE
          </h2>
        </motion.div>
      </div>
    </section>
  );
}
