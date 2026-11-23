import { EventDescription } from "@/components/events/event-description";
import { isRichText, sanitizeRichText } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/**
 * Toont opgemaakte tekst uit de teksteditor (opgeschoonde HTML). Oudere platte tekst wordt
 * automatisch in alinea's, tussenkoppen en opsommingen omgezet.
 */
export function RichText({ value, className }: { value: string; className?: string }) {
  if (!value?.trim()) return null;
  if (!isRichText(value)) {
    return (
      <div className={className}>
        <EventDescription text={value} />
      </div>
    );
  }
  return <div className={cn("prose-club", className)} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />;
}
