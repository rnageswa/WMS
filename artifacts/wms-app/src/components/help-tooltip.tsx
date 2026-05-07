import { useState } from "react";
import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HelpContent } from "@/lib/help-content";

interface HelpTooltipProps {
  content: HelpContent;
}

export function HelpTooltip({ content }: HelpTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Help"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 max-h-[80vh] overflow-hidden p-0"
        align="start"
        side="right"
      >
        <div className="border-b bg-muted/50 px-4 py-3">
          <h3 className="font-semibold text-sm">{content.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {content.description}
          </p>
        </div>
        <ScrollArea className="h-[calc(80vh-80px)]">
          <div className="p-4 space-y-4">
            {content.sections.map((section, index) => (
              <div key={index}>
                <h4 className="font-medium text-sm mb-2">{section.title}</h4>
                {Array.isArray(section.content) ? (
                  <ul className="text-xs text-muted-foreground space-y-1.5">
                    {section.content.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-amber-500 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">{section.content}</p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="border-t bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
          Press <kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> to close
        </div>
      </PopoverContent>
    </Popover>
  );
}