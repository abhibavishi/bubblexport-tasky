"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskStatusToggleProps {
  taskId: string;
  status: string;
}

export function TaskStatusToggle({ taskId, status }: TaskStatusToggleProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleToggle = async (checked: boolean) => {
    const newStatus = checked ? "done" : "todo";

    await supabase
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", taskId);

    router.refresh();
  };

  return (
    <Checkbox
      checked={status === "done"}
      onCheckedChange={handleToggle}
      className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
    />
  );
}
