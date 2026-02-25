import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Users, Building2 } from 'lucide-react';

type AccountType = 'user' | 'organization';

export default function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [type, setType] = useState<AccountType>('user');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    organization_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await register({
        role: type,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        organization_name: form.organization_name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: err.message || 'Registration failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12">
      <div className="w-full max-w-md animate-scale-in">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-card-foreground">Create Account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Join SkillZone and start your journey</p>
          </div>

          {/* Account Type Selector */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            {([
              { key: 'user' as const, icon: Users, label: 'Individual' },
              { key: 'organization' as const, icon: Building2, label: 'Organization' },
            ]).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-medium transition-all ${
                  type === key
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                <Icon className="h-6 w-6" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {type === 'user' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} className="mt-1.5" required />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} className="mt-1.5" required />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="org_name">Organization Name</Label>
                <Input id="org_name" value={form.organization_name} onChange={(e) => update('organization_name', e.target.value)} className="mt-1.5" required />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Min 6 characters" className="mt-1.5" required />
            </div>
            <div>
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input id="confirm_password" type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Re-enter your password" className="mt-1.5" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/signin" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
