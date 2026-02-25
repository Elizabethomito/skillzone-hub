import { BookOpen, Briefcase, Award, Search, CalendarCheck, UserCheck } from 'lucide-react';

const individualFeatures = [
  { icon: BookOpen, title: 'Skill Growth', description: 'Access curated events, bootcamps, and internships to build real skills.' },
  { icon: Award, title: 'Verified Credibility', description: 'Earn badges that organizations verify, proving your competence to employers.' },
  { icon: Briefcase, title: 'Job Readiness', description: 'Build a profile that showcases your verified achievements and makes you stand out.' },
];

const orgFeatures = [
  { icon: CalendarCheck, title: 'Post Events & Tasks', description: 'Create learning opportunities and discover talent through your programs.' },
  { icon: Search, title: 'Discover Talent', description: 'Find candidates with verified skills that match your requirements.' },
  { icon: UserCheck, title: 'Verify Participation', description: 'Confirm attendee skills and issue verified badges to top performers.' },
];

export default function WhoThisIsFor() {
  return (
    <div className="py-16">
      <div className="container">
        <h1 className="text-center text-4xl font-extrabold text-foreground md:text-5xl animate-fade-in">
          Who This Is <span className="text-gradient-blue">For</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
          SkillZone serves both individuals seeking growth and organizations looking for verified talent.
        </p>

        <div className="mt-16 grid gap-12 lg:grid-cols-2">
          {/* Individuals */}
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="mb-6 inline-block rounded-lg bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
              For Individuals
            </div>
            <h2 className="mb-6 text-2xl font-bold text-card-foreground">Build Your Career with Confidence</h2>
            <div className="space-y-6">
              {individualFeatures.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-card-foreground">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Organizations */}
          <div className="rounded-2xl border border-border bg-card p-8 shadow-card animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <div className="mb-6 inline-block rounded-lg bg-accent/10 px-4 py-2 text-sm font-bold text-accent">
              For Organizations
            </div>
            <h2 className="mb-6 text-2xl font-bold text-card-foreground">Find & Verify Top Talent</h2>
            <div className="space-y-6">
              {orgFeatures.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-card-foreground">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
