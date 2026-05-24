import * as React from "react";
import { Input } from "@/components/ui/input";

interface PercentInputProps extends Omit<React.ComponentProps<"input">, "type"> {}

export function PercentInput({ className, ...props }: PercentInputProps) {
  return (
    <div className="relative">
      <Input type="number" step="0.1" className={`pr-8 ${className ?? ""}`} {...props} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
        %
      </span>
    </div>
  );
}
