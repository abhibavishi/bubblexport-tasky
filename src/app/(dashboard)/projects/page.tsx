import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FolderKanban, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface ProjectWithCounts {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "completed" | "on_hold" | "cancelled";
  color: string;
  due_date: string | null;
  created_at: string;
  task_count: number;
  completed_task_count: number;
  member_count: number;
}

async function getProjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  status?: string,
  search?: string
): Promise<ProjectWithCounts[]> {
  let query = supabase
    .from("projects")
    .select("*")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const { data: projects } = await query;

  if (!projects) return [];

  // Get task and member counts for each project
  const projectsWithCounts = await Promise.all(
    projects.map(async (project) => {
      const [tasksResult, completedTasksResult, membersResult] = await Promise.all([
        supabase
          .from("tasks")
          .select("id", { count: "exact" })
          .eq("project_id", project.id),
        supabase
          .from("tasks")
          .select("id", { count: "exact" })
          .eq("project_id", project.id)
          .eq("status", "done"),
        supabase
          .from("team_members")
          .select("id", { count: "exact" })
          .eq("project_id", project.id),
      ]);

      return {
        ...project,
        task_count: tasksResult.count || 0,
        completed_task_count: completedTasksResult.count || 0,
        member_count: (membersResult.count || 0) + 1, // +1 for owner
      };
    })
  );

  return projectsWithCounts;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const projects = await getProjects(supabase, user.id, params.status, params.search);

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage and track all your projects in one place.
          </p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form className="flex-1" action="/projects">
          <Input
            name="search"
            placeholder="Search projects..."
            defaultValue={params.search || ""}
            className="max-w-sm"
          />
          <input type="hidden" name="status" value={params.status || "all"} />
        </form>
        <form action="/projects" className="flex items-center gap-2">
          <input type="hidden" name="search" value={params.search || ""} />
          <Select name="status" defaultValue={params.status || "all"}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No projects found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {params.search || params.status
                ? "Try adjusting your filters or search query."
                : "Get started by creating your first project."}
            </p>
            <Link href="/projects/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const progress =
              project.task_count > 0
                ? Math.round((project.completed_task_count / project.task_count) * 100)
                : 0;

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                    <CardDescription className="line-clamp-2 mt-2">
                      {project.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FolderKanban className="h-4 w-4" />
                        <span>
                          {project.completed_task_count}/{project.task_count} tasks
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{project.member_count}</span>
                      </div>
                    </div>

                    {/* Due Date */}
                    {project.due_date && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-3 pt-3 border-t">
                        <Calendar className="h-4 w-4" />
                        <span>Due {format(new Date(project.due_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
