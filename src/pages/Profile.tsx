import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut, Trash2 } from 'lucide-react';

export default function Profile() {
  const { user, updateProfile, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    organization_name: user?.organization_name || '',
    email: user?.email || '',
  });

  if (!user) return null;

  const handleSave = () => {
    updateProfile(form);
    setEditing(false);
    toast({ title: 'Profile updated' });
  };

  const handleDelete = () => {
    deleteAccount();
    navigate('/');
    toast({ title: 'Account deleted' });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="py-12">
      <div className="container max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-foreground animate-fade-in">Profile</h1>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card animate-scale-in">
          {/* Avatar & Role */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {user.first_name?.[0] || user.organization_name?.[0] || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-card-foreground">
                {user.role === 'organization' ? user.organization_name : `${user.first_name} ${user.last_name}`}
              </h2>
              <Badge variant="secondary" className="mt-1 capitalize">{user.role}</Badge>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-5">
            {user.role === 'user' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  {editing ? (
                    <Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="mt-1.5" />
                  ) : (
                    <p className="mt-1.5 text-foreground">{user.first_name}</p>
                  )}
                </div>
                <div>
                  <Label>Last Name</Label>
                  {editing ? (
                    <Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="mt-1.5" />
                  ) : (
                    <p className="mt-1.5 text-foreground">{user.last_name}</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <Label>Organization Name</Label>
                {editing ? (
                  <Input value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} className="mt-1.5" />
                ) : (
                  <p className="mt-1.5 text-foreground">{user.organization_name}</p>
                )}
              </div>
            )}
            <div>
              <Label>Email</Label>
              {editing ? (
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
              ) : (
                <p className="mt-1.5 text-foreground">{user.email}</p>
              )}
            </div>
            <div>
              <Label>Member Since</Label>
              <p className="mt-1.5 text-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            {editing ? (
              <>
                <Button onClick={handleSave}>Save Changes</Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)}>Edit Profile</Button>
            )}
          </div>

          {/* Destructive Actions */}
          <div className="mt-8 border-t border-border pt-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" /> Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All your data, registrations, and badges will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
