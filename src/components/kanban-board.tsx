"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Calendar, MoreVertical, Trash2, Edit, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Task, Profile } from "@/lib/supabase/database.types";

interface TaskWithAssignee extends Task {
  profiles: Profile | null;
}

interface KanbanBoardProps {
  projectId: string;
  initialTasks: TaskWithAssignee[];
  teamMembers: Profile[];
}

const columns = [
  { id: "todo", title: "To Do", color: "bg-slate-500" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-500" },
  { id: "done", title: "Done", color: "bg-green-500" },
];

export function KanbanBoard({ projectId, initialTasks, teamMembers }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>(initialTasks);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithAssignee | null>(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    assignee_id: "",
    due_date: "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const getTasksByStatus = (status: string) => {
    return tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const taskId = draggableId;
    const newStatus = destination.droppableId as "todo" | "in_progress" | "done";

    // Optimistic update
    const updatedTasks = tasks.map((task) =>
      task.id === taskId
        ? { ...task, status: newStatus, position: destination.index }
        : task
    );
    setTasks(updatedTasks);

    // Update in database
    const { error } = await supabase
      .from("tasks")
      .update({ status: newStatus, position: destination.index })
      .eq("id", taskId);

    if (error) {
      // Revert on error
      setTasks(tasks);
    } else {
      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const task = tasks.find((t) => t.id === taskId);
        await supabase.from("activity_log").insert({
          project_id: projectId,
          task_id: taskId,
          user_id: user.id,
          action: `moved task "${task?.title}" to ${newStatus.replace("_", " ")}`,
        });
      }
    }

    router.refresh();
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const todoTasks = getTasksByStatus("todo");
    const maxPosition = todoTasks.length > 0
      ? Math.max(...todoTasks.map((t) => t.position)) + 1
      : 0;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        title: newTask.title,
        description: newTask.description || null,
        priority: newTask.priority,
        assignee_id: newTask.assignee_id || null,
        due_date: newTask.due_date || null,
        created_by: user.id,
        position: maxPosition,
      })
      .select(`
        *,
        profiles:assignee_id (*)
      `)
      .single();

    if (!error && data) {
      setTasks([...tasks, data as TaskWithAssignee]);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assignee_id: "",
        due_date: "",
      });
      setIsAddingTask(false);

      // Log activity
      await supabase.from("activity_log").insert({
        project_id: projectId,
        task_id: data.id,
        user_id: user.id,
        action: `created task "${data.title}"`,
      });
    }

    setLoading(false);
    router.refresh();
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from("tasks")
      .update({
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        assignee_id: editingTask.assignee_id || null,
        due_date: editingTask.due_date || null,
      })
      .eq("id", editingTask.id);

    if (!error) {
      setTasks(tasks.map((t) => (t.id === editingTask.id ? editingTask : t)));
      setEditingTask(null);
    }

    setLoading(false);
    router.refresh();
  };

  const handleDeleteTask = async (taskId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const task = tasks.find((t) => t.id === taskId);

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (!error) {
      setTasks(tasks.filter((t) => t.id !== taskId));

      // Log activity
      if (user && task) {
        await supabase.from("activity_log").insert({
          project_id: projectId,
          user_id: user.id,
          action: `deleted task "${task.title}"`,
        });
      }
    }

    router.refresh();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "high":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "medium":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "low":
        return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
      default:
        return "";
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>
                Create a new task for this project.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Task description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: "low" | "medium" | "high" | "urgent") =>
                      setNewTask({ ...newTask, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={newTask.assignee_id}
                  onValueChange={(value) => setNewTask({ ...newTask, assignee_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingTask(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTask} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((column) => (
            <div key={column.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="font-medium">{column.title}</h3>
                <span className="text-sm text-muted-foreground">
                  ({getTasksByStatus(column.id).length})
                </span>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] rounded-lg p-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-muted/80"
                        : "bg-muted/30"
                    }`}
                  >
                    {getTasksByStatus(column.id).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-2 cursor-grab active:cursor-grabbing ${
                              snapshot.isDragging ? "shadow-lg rotate-2" : ""
                            }`}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-sm">{task.title}</p>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setEditingTask(task)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleDeleteTask(task.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              {task.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between gap-2">
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${getPriorityColor(task.priority)}`}
                                >
                                  {task.priority}
                                </Badge>
                                {task.due_date && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(task.due_date), "MMM d")}
                                  </div>
                                )}
                              </div>
                              {task.profiles && (
                                <div className="flex items-center gap-2 pt-1">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={task.profiles.avatar_url || undefined} />
                                    <AvatarFallback className="text-[10px]">
                                      {getInitials(task.profiles.full_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {task.profiles.full_name || task.profiles.email}
                                  </span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task details.
            </DialogDescription>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingTask.title}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingTask.description || ""}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={editingTask.priority}
                    onValueChange={(value: "low" | "medium" | "high" | "urgent") =>
                      setEditingTask({ ...editingTask, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-due_date">Due Date</Label>
                  <Input
                    id="edit-due_date"
                    type="date"
                    value={editingTask.due_date || ""}
                    onChange={(e) =>
                      setEditingTask({ ...editingTask, due_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={editingTask.assignee_id || ""}
                  onValueChange={(value) =>
                    setEditingTask({ ...editingTask, assignee_id: value || null })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
