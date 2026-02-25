import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Award, Calendar, CheckCircle, TrendingUp, Users, Zap } from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';

const steps = [
  {
    icon: Users,
    title: 'Sign Up & Choose Your Path',
    description: 'Create your account as an individual or organization and set your goals.',
  },
  {
    icon: Calendar,
    title: 'Attend Events & Build Skills',
    description: 'Join bootcamps, internships, and workshops that match your career path.',
  },
  {
    icon: Award,
    title: 'Earn Verified Badges',
    description: 'Get recognized with verified skill badges that prove your competence.',
  },
];

const features = [
  { icon: CheckCircle, title: 'Verified Skills', description: 'Every achievement is verified by the hosting organization.' },
  { icon: TrendingUp, title: 'Career Growth', description: 'Build a portfolio of credentials that employers trust.' },
  { icon: Zap, title: 'Real Opportunities', description: 'Access internships, events, and tasks from top organizations.' },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient py-24 md:py-32">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
        />
        <div className="container relative z-10 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight text-primary-foreground md:text-6xl animate-fade-in">
            Unlock Your Potential with Verified Skills
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-primary-foreground/80 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            SkillZone connects individuals with real-world learning opportunities and gives organizations access to credible, skill-verified candidates.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button size="lg" variant="secondary" asChild className="px-8 text-base font-semibold">
              <Link to="/signup">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary-foreground/30 px-8 text-base font-semibold text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-section-gradient py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold text-foreground md:text-4xl">
            How It <span className="text-gradient-blue">Works</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-muted-foreground">
            Three simple steps to start building your verified skill portfolio.
          </p>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="group rounded-xl border border-border bg-card p-8 shadow-card transition-all hover:shadow-card-hover animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="mb-2 text-sm font-bold text-primary">Step {i + 1}</div>
                <h3 className="mb-2 text-lg font-bold text-card-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <h2 className="text-center text-3xl font-bold text-foreground md:text-4xl">
            Why <span className="text-gradient-blue">SkillZone</span>?
          </h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {features.map((f, i) => (
              <div key={f.title} className="flex gap-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-card-foreground">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-hero-gradient py-16">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-primary-foreground">Ready to Build Your Future?</h2>
          <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
            Join thousands of learners and organizations already using SkillZone.
          </p>
          <Button size="lg" variant="secondary" asChild className="mt-8 px-8 text-base font-semibold">
            <Link to="/signup">Create Your Account</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
