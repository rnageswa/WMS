import * as React from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "type" | "prefix"> {
  currency?: string;
}

export function CurrencyInput({ currency = "$", className, ...props }: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
        {currency}
      </span>
      <Input type="number" step="0.01" className={`pl-7 ${className ?? ""}`} {...props} />
    </div>
  );
}
