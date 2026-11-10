import { Alert, AlertDescription } from "@/components/ui/alert";

export interface ToolMessageProps {
  kind: "ok" | "error";
  text: string;
}

/** The outcome of a tool: announced politely when it worked, as an alert when it did not. */
export function ToolMessage({ kind, text }: ToolMessageProps) {
  return (
    <Alert
      variant={kind === "error" ? "destructive" : "default"}
      role={kind === "error" ? "alert" : "status"}
    >
      <AlertDescription>{text}</AlertDescription>
    </Alert>
  );
}
