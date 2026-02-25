import { Target, Eye, ShieldCheck } from 'lucide-react';

const sections = [
  {
    icon: Target,
    title: 'Our Mission',
    text: 'To democratize access to verified skills and career opportunities by connecting learners with organizations that value real-world competence over paper credentials.',
  },
  {
    icon: Eye,
    title: 'Our Vision',
    text: 'A world where every individual can prove their abilities through verified, transparent achievements — and every employer can discover talent with confidence.',
  },
  {
    icon: ShieldCheck,
    title: 'Why Skill Verification Matters',
    text: 'Traditional resumes can be embellished. SkillZone solves this by having organizations verify participation and competence directly, creating a trustworthy ecosystem for both job seekers and employers.',
  },
];

export default function About() {
  return (
    <div className="py-16">
      <div className="container max-w-3xl">
        <h1 className="text-center text-4xl font-extrabold text-foreground md:text-5xl animate-fade-in">
          About <span className="text-gradient-blue">SkillZone</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
          SkillZone is a platform that bridges the gap between learning and employment by providing verified, transparent skill credentials.
        </p>

        <div className="mt-16 space-y-10">
          {sections.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-border bg-card p-8 shadow-card animate-fade-in"
              style={{ animationDelay: `${(i + 1) * 0.1}s` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <h2 className="mb-3 text-2xl font-bold text-card-foreground">{s.title}</h2>
              <p className="leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
