import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  id: string;
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function Section({ id, children, className, delay = 0 }: SectionProps) {
  return (
    <section 
      id={id} 
      className={cn("py-20 md:py-32 px-4 scroll-mt-20", className)}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
        className="max-w-7xl mx-auto"
      >
        {children}
      </motion.div>
    </section>
  );
}

export function SectionHeader({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <div className="mb-12 md:mb-16">
      <h2 className="text-3xl md:text-5xl font-display font-bold mb-4 tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
          {subtitle}
        </p>
      )}
      <div className="h-1 w-20 bg-primary mt-6 rounded-full" />
    </div>
  );
}
