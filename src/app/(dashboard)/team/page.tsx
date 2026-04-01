import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Calendar, FolderKanban, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface TeamMemberWithStats {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  projects_count: number;
  tasks_assigned: number;
  tasks_completed: number;
}

async function getTeamMembers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  _userId: string
): Promise<TeamMemberWithStats[]> {
  void _userId;
  // Get all profiles that are either the owner or team members of shared projects
  const { data: profiles } = await supabase.from("profiles").select("*");

  if (!profiles) return [];

  // Get stats for each profile
  const membersWithStats = await Promise.all(
    profiles.map(async (profile) => {
      const [projectsResult, tasksAssignedResult, tasksCompletedResult] = await Promise.all([
        supabase
          .from("projects")
          .select("id", { count: "exact" })
          .eq("owner_id", profile.id),
        supabase
          .from("tasks")
          .select("id", { count: "exact" })
          .eq("assignee_id", profile.id),
        supabase
          .from("tasks")
          .select("id", { count: "exact" })
          .eq("assignee_id", profile.id)
          .eq("status", "done"),
      ]);

      return {
        ...profile,
        projects_count: projectsResult.count || 0,
        tasks_assigned: tasksAssignedResult.count || 0,
        tasks_completed: tasksCompletedResult.count || 0,
      };
    })
  );

  return membersWithStats;
}

export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const teamMembers = await getTeamMembers(supabase, user.id);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge variant="default">Owner</Badge>;
      case "admin":
        return <Badge variant="secondary">Admin</Badge>;
      case "member":
        return <Badge variant="outline">Member</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Manage and view all team members across your workspace.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active team members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.reduce((acc, m) => acc + m.projects_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all members
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamMembers.reduce((acc, m) => acc + m.tasks_completed, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Team productivity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Grid */}
      {teamMembers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
            <p className="text-muted-foreground text-center">
              Invite team members to collaborate on projects.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => {
            const completionRate =
              member.tasks_assigned > 0
                ? Math.round((member.tasks_completed / member.tasks_assigned) * 100)
                : 0;

            return (
              <Card key={member.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(member.full_name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base truncate">
                          {member.full_name || "User"}
                        </CardTitle>
                        {getRoleBadge(member.role)}
                      </div>
                      <CardDescription className="truncate">
                        {member.email}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{member.projects_count}</p>
                        <p className="text-xs text-muted-foreground">Projects</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{member.tasks_assigned}</p>
                        <p className="text-xs text-muted-foreground">Tasks</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{completionRate}%</p>
                        <p className="text-xs text-muted-foreground">Done</p>
                      </div>
                    </div>

                    {/* Join Date */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Joined {format(new Date(member.created_at), "MMMM yyyy")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
