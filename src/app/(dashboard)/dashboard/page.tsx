import { createClient } from "@/lib/supabase/server";
import type { Project, Task, ActivityLog } from "@/lib/supabase/database.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  ListTodo,
  CheckCircle2,
  Clock,
  Plus,
  TrendingUp,
  Activity
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [projectsResult, tasksResult, completedTasksResult, inProgressTasksResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact" })
      .eq("owner_id", userId),
    supabase
      .from("tasks")
      .select("id", { count: "exact" }),
    supabase
      .from("tasks")
      .select("id", { count: "exact" })
      .eq("status", "done"),
    supabase
      .from("tasks")
      .select("id", { count: "exact" })
      .eq("status", "in_progress"),
  ]);

  return {
    totalProjects: projectsResult.count || 0,
    totalTasks: tasksResult.count || 0,
    completedTasks: completedTasksResult.count || 0,
    inProgressTasks: inProgressTasksResult.count || 0,
  };
}

type ActivityWithRelations = ActivityLog & {
  profiles: { full_name: string | null; avatar_url: string | null; email: string } | null;
  projects: { name: string } | null;
};

async function getRecentActivity(supabase: Awaited<ReturnType<typeof createClient>>): Promise<ActivityWithRelations[]> {
  const { data } = await supabase
    .from("activity_log")
    .select(`
      *,
      profiles:user_id (full_name, avatar_url, email),
      projects:project_id (name)
    `)
    .order("created_at", { ascending: false })
    .limit(5);
  return (data as ActivityWithRelations[]) || [];
}

async function getRecentProjects(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<Project[]> {
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false })
    .limit(4);
  return data || [];
}

type TaskWithRelations = Task & {
  projects: { name: string; color: string } | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

async function getUpcomingTasks(supabase: Awaited<ReturnType<typeof createClient>>): Promise<TaskWithRelations[]> {
  const { data } = await supabase
    .from("tasks")
    .select(`
      *,
      projects:project_id (name, color),
      profiles:assignee_id (full_name, avatar_url)
    `)
    .neq("status", "done")
    .not("due_date", "is", null)
    .order("due_date", { ascending: true })
    .limit(5);
  return (data as TaskWithRelations[]) || [];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [stats, recentActivity, recentProjects, upcomingTasks] = await Promise.all([
    getStats(supabase, user.id),
    getRecentActivity(supabase),
    getRecentProjects(supabase, user.id),
    getUpcomingTasks(supabase),
  ]);

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "completed": return "bg-blue-500";
      case "on_hold": return "bg-yellow-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent": return <Badge variant="destructive">Urgent</Badge>;
      case "high": return <Badge variant="destructive" className="bg-orange-500">High</Badge>;
      case "medium": return <Badge variant="secondary">Medium</Badge>;
      case "low": return <Badge variant="outline">Low</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your projects and tasks.
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              Active and completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              Across all projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              Tasks finished
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressTasks}</div>
            <p className="text-xs text-muted-foreground">
              Currently working on
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Completion Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Progress
          </CardTitle>
          <CardDescription>
            Your task completion rate across all projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {stats.completedTasks} of {stats.totalTasks} tasks completed
              </span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Projects</CardTitle>
              <Link href="/projects">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
            <CardDescription>
              Your most recently updated projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No projects yet</p>
                <Link href="/projects/new">
                  <Button variant="link" className="mt-2">
                    Create your first project
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {project.description || "No description"}
                        </p>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Tasks</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
            <CardDescription>
              Tasks with upcoming due dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming tasks</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div
                      className="w-1 h-10 rounded-full"
                      style={{ backgroundColor: (task.projects as { color: string } | null)?.color || "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Due {task.due_date ? formatDistanceToNow(new Date(task.due_date), { addSuffix: true }) : "No date"}
                      </p>
                    </div>
                    {getPriorityBadge(task.priority)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest updates from your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const profile = activity.profiles as { full_name: string | null; avatar_url: string | null; email: string } | null;
                const project = activity.projects as { name: string } | null;
                return (
                  <div key={activity.id} className="flex items-start gap-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(profile?.full_name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm">
                        <span className="font-medium">{profile?.full_name || "User"}</span>
                        {" "}
                        <span className="text-muted-foreground">{activity.action}</span>
                        {project && (
                          <>
                            {" in "}
                            <span className="font-medium">{project.name}</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
