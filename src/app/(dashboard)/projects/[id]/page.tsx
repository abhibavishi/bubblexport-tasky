import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { KanbanBoard } from "@/components/kanban-board";
import {
  ArrowLeft,
  Calendar,
  Users,
  Settings,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import type { Profile, Project, Task } from "@/lib/supabase/database.types";

type TaskWithAssignee = Task & {
  profiles: Profile | null;
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get project
  const { data: projectData, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !projectData) {
    notFound();
  }

  const project = projectData as Project;

  // Get tasks with assignees
  const { data: tasksData } = await supabase
    .from("tasks")
    .select(`
      *,
      profiles:assignee_id (*)
    `)
    .eq("project_id", id)
    .order("position", { ascending: true });

  const tasks = (tasksData as TaskWithAssignee[] | null) || [];

  // Get team members
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select(`
      *,
      profiles:user_id (*)
    `)
    .eq("project_id", id);

  // Get owner profile
  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", project.owner_id)
    .single();

  // Combine all team members (owner + members)
  const allMembers: Profile[] = [
    ...(ownerProfile ? [ownerProfile as Profile] : []),
    ...(teamMembers?.map((tm) => (tm as Record<string, unknown>).profiles as Profile) || []),
  ].filter(Boolean);

  // Calculate stats
  const taskStats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const completionRate =
    taskStats.total > 0
      ? Math.round((taskStats.done / taskStats.total) * 100)
      : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "on_hold":
        return <Badge variant="warning">On Hold</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to projects
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            {getStatusBadge(project.status)}
          </div>
          <p className="text-muted-foreground max-w-2xl">
            {project.description || "No description"}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {project.due_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Due {format(new Date(project.due_date), "MMMM d, yyyy")}
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {allMembers.length} member{allMembers.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${id}/settings`}>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.done}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-slate-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{taskStats.todo}</p>
                <p className="text-sm text-muted-foreground">To Do</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-sm font-medium">{completionRate}%</p>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Team Members</CardTitle>
          <CardDescription>People working on this project</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {allMembers.map((member, index) => (
              <div key={member.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">
                    {index === 0 ? "Owner" : "Member"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Kanban Board */}
      <KanbanBoard
        projectId={id}
        initialTasks={tasks || []}
        teamMembers={allMembers}
      />
    </div>
  );
}
