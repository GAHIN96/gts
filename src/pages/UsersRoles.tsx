import { useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UserCog, 
  Search, 
  Shield,
  Users,
  Mail,
  Calendar,
  Building,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsersRoles } from '@/hooks/useUsersRoles';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roles: { name: string; value: AppRole; description: string; permissions: string[]; color: string }[] = [
  {
    name: "Admin",
    value: "admin",
    description: "Full access to all modules and settings",
    permissions: ["All modules", "User management", "Settings", "Audit logs"],
    color: "bg-destructive/10 text-destructive",
  },
  {
    name: "Finance",
    value: "finance",
    description: "Manage payments, invoices, and reports",
    permissions: ["Payments", "Invoices", "Financial reports", "Refunds"],
    color: "bg-gold/10 text-gold",
  },
  {
    name: "Agency",
    value: "agency",
    description: "Book packages and manage agency operations",
    permissions: ["Bookings", "Packages", "Hotels", "Flights"],
    color: "bg-primary/10 text-primary",
  },
];

const getRoleBadge = (role: AppRole | null) => {
  switch (role) {
    case "admin":
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Admin</Badge>;
    case "finance":
      return <Badge className="bg-gold/10 text-gold border-gold/20">Finance</Badge>;
    case "agency":
      return <Badge className="bg-primary/10 text-primary border-primary/20">Agency</Badge>;
    default:
      return <Badge variant="secondary">No Role</Badge>;
  }
};

const UsersRoles = () => {
  const { users, loading, updateUserRole, getRoleStats, refetch, isAdmin } = useUsersRoles();
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const stats = getRoleStats();

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingUserId(userId);
    await updateUserRole(userId, newRole);
    setUpdatingUserId(null);
  };

  const roleUserCounts = roles.map(role => ({
    ...role,
    userCount: users.filter(u => u.role === role.value).length,
  }));

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Card className="p-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only administrators can access user management.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Users & Roles</h1>
          <p className="text-muted-foreground">Manage team members and permissions</p>
        </div>
        <Button variant="outline" onClick={refetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Compact Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{stats.total}</span>
          <span className="text-xs text-muted-foreground">Users</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Shield className="h-4 w-4 text-destructive" />
          <span className="text-sm font-semibold">{stats.admins}</span>
          <span className="text-xs text-muted-foreground">Admins</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <UserCog className="h-4 w-4 text-gold" />
          <span className="text-sm font-semibold">{stats.finance}</span>
          <span className="text-xs text-muted-foreground">Finance</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Building className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{stats.agencies}</span>
          <span className="text-xs text-muted-foreground">Agencies</span>
        </div>
      </div>

      {/* Roles Overview */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Roles Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roleUserCounts.map((role) => (
              <div key={role.value} className="p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={role.color}>{role.name}</Badge>
                  <span className="text-sm text-muted-foreground">{role.userCount} users</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.map((perm) => (
                    <Badge key={perm} variant="secondary" className="text-xs">
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search by email, name, or company..." 
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48" /></div></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? 'No users match your search' : 'No users found'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Change Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary-foreground">
                            {(user.full_name || user.email).split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{user.company_name || '-'}</span>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role || ''}
                        onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                        disabled={updatingUserId === user.id}
                      >
                        <SelectTrigger className="w-32">
                          {updatingUserId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue placeholder="Select role" />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : '-'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersRoles;
