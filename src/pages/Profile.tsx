import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="py-12">
      <div className="container max-w-2xl">
        <h1 className="mb-8 text-3xl font-bold text-foreground animate-fade-in">Profile</h1>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-card animate-scale-in">
          {/* Avatar & Role */}
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-card-foreground">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant="secondary" className="mt-1 capitalize">{user.role}</Badge>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</p>
                <p className="mt-1 capitalize text-foreground">{user.role}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Member Since</p>
                <p className="mt-1 text-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
              <p className="mt-1 text-foreground">{user.email}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 border-t border-border pt-6">
            <Button variant="ghost" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
