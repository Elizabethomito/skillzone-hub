import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getEvents, registerForEvent, getUserRegistrations, type SkillEvent } from '@/db/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Building2 } from 'lucide-react';

export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events] = useState<SkillEvent[]>(getEvents);
  const [registrations, setRegistrations] = useState(() => user ? getUserRegistrations(user.id) : []);

  const isRegistered = (eventId: string) => registrations.some((r) => r.event_id === eventId);

  const handleApply = (eventId: string) => {
    if (!user) return;
    try {
      const reg = registerForEvent(user.id, eventId);
      setRegistrations((prev) => [...prev, reg]);
      toast({ title: 'Successfully registered!' });
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="py-12">
      <div className="container">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl animate-fade-in">
            Available <span className="text-gradient-blue">Events</span>
          </h1>
          <p className="mt-3 text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Browse and register for events, internships, and workshops.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <div
              key={event.id}
              className="flex flex-col rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-card-hover animate-fade-in"
              style={{ animationDelay: `${(i + 1) * 0.05}s` }}
            >
              <Badge variant="secondary" className="mb-4 w-fit">{event.skill_category}</Badge>
              <h3 className="mb-2 text-lg font-bold text-card-foreground">{event.title}</h3>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {event.organization_name}
              </div>
              <Button
                onClick={() => handleApply(event.id)}
                disabled={isRegistered(event.id)}
                variant={isRegistered(event.id) ? 'secondary' : 'default'}
                className="w-full"
              >
                {isRegistered(event.id) ? 'Registered ✓' : 'Apply / Register'}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
