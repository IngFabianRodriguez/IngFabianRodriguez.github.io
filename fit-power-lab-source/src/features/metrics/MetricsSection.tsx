import type { ReactNode } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface MetricsSectionProps {
  /** Identifies the section among the accordion items. */
  value: string;
  title: string;
  children: ReactNode;
}

/** A collapsible group of metrics inside the panel's accordion. */
export function MetricsSection({ value, title, children }: MetricsSectionProps) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger>{title}</AccordionTrigger>
      <AccordionContent className="grid gap-4">{children}</AccordionContent>
    </AccordionItem>
  );
}
