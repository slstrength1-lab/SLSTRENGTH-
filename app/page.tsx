import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import coachPhoto from "@/public/coach.jpg";
import {
  ArrowRight,
  Dumbbell,
  Salad,
  ClipboardCheck,
  Smartphone,
  TrendingUp,
  MessageSquare,
  Target,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { APPLICATION_FORM_URL, SITE_URL } from "@/lib/links";

/* SEO — this is the public page that should surface on a name search. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Shane Lanteigne — Online Strength & Nutrition Coach (CSCS) | SL Strength",
  description:
    "1:1 online strength coaching with Shane Lanteigne, NSCA-CSCS with 13 years developing college & pro athletes (Arkansas State, Miami Marlins org, IMG Academy). Custom training, real macro-based nutrition, and weekly accountability. Apply for coaching.",
  keywords: [
    "Shane Lanteigne",
    "SL Strength",
    "CSCS",
    "SCCC",
    "strength and conditioning coach",
    "online strength coach",
    "personal trainer",
    "online coaching",
    "nutrition coaching",
    "strength training",
    "1:1 coaching",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Shane Lanteigne — Online Strength & Nutrition Coach",
    description:
      "Custom training + real macro-based nutrition + weekly accountability, delivered through your own client app. Apply for 1:1 coaching.",
    url: SITE_URL,
    siteName: "SL Strength",
    type: "website",
    images: [{ url: "/coach.jpg", width: 900, height: 1125, alt: "Shane Lanteigne — SL Strength" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shane Lanteigne — Online Strength & Nutrition Coach",
    description: "1:1 online strength coaching. Apply for coaching with SL Strength.",
    images: ["/coach.jpg"],
  },
};

const OFFERS = [
  { icon: Dumbbell, title: "Custom 1:1 Programming", body: "A training plan built around your goals, schedule, equipment, and experience — then progressed every single week. No cookie-cutter templates." },
  { icon: Salad, title: "Real Nutrition Coaching", body: "Macro targets calculated from proven equations and meal plans grounded in a real food database — not guesses. Built for your body and your goal." },
  { icon: ClipboardCheck, title: "Weekly Check-ins & Accountability", body: "You send your numbers; I read them and adjust. Someone in your corner every week so you never plateau or wonder if it's working." },
  { icon: Smartphone, title: "Your Own Client App", body: "Training, nutrition, progress, and a direct line to me — all in one private portal on your phone. Everything in one place." },
];

const BENEFITS = [
  { icon: TrendingUp, title: "You actually progress", body: "Progressive overload is programmed in, so the weight on the bar keeps moving — and so do your results." },
  { icon: Target, title: "Built around your life", body: "Your plan fits your schedule and preferences, so it's something you can actually stick to for the long haul." },
  { icon: MessageSquare, title: "Never train alone", body: "Message me between check-ins. Real answers from a real coach, not a chatbot or a PDF you never open." },
  { icon: ShieldCheck, title: "Nutrition that's true, not trendy", body: "No fad diets. Clear targets and meals you enjoy, adjusted as your weight and goals change." },
];

function ApplyButton({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <a
      href={APPLICATION_FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-blood-500 px-6 py-3.5 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-blood-600 ${className}`}
    >
      {children}
    </a>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-blood-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-blood-700/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <header className="flex items-center justify-between py-6">
          <Brand href="/" />
          <ApplyButton className="px-4 py-2 text-xs">Apply now</ApplyButton>
        </header>

        {/* Hero */}
        <section className="py-16 sm:py-24">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-blood-500">
            Online Strength &amp; Nutrition Coaching
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl">
            Get stronger, leaner, and{" "}
            <span className="text-blood-500">actually stick to it.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-zinc-400">
            I&apos;m Shane Lanteigne. I coach busy people to build real strength and
            change their body composition — with custom training, real nutrition,
            and week-to-week accountability, all in one app.
          </p>
          <p className="mt-4 text-sm font-medium text-zinc-500">
            NSCA-CSCS · CSCCA-SCCC · 13 years developing college &amp; pro athletes
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <ApplyButton>
              Apply for coaching <ArrowRight className="h-4 w-4" />
            </ApplyButton>
            <a href="#how" className="text-sm font-medium text-zinc-300 hover:text-white">
              See how it works ↓
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
            {["Custom programming", "Real macro-based nutrition", "Weekly check-ins", "Your own client app"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-blood-500" /> {t}
              </span>
            ))}
          </div>
        </section>

        {/* What I offer */}
        <section id="how" className="scroll-mt-20 border-t border-white/[0.06] py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">What you get</h2>
          <p className="mt-2 max-w-xl text-zinc-400">Everything you need to train with a plan and eat with intention — nothing you don&apos;t.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {OFFERS.map((o) => (
              <div key={o.title} className="card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blood-500/10 text-blood-500 ring-1 ring-inset ring-blood-500/25">
                  <o.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">{o.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{o.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="border-t border-white/[0.06] py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">Why it works</h2>
          <p className="mt-2 max-w-xl text-zinc-400">Coaching is more than a workout PDF. Here&apos;s the difference it makes.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-white/[0.06] bg-ink-900/40 p-5">
                <b.icon className="h-6 w-6 text-blood-500" />
                <h3 className="mt-3 font-semibold text-white">{b.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="border-t border-white/[0.06] py-16">
          <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="relative h-64 w-52 shrink-0 overflow-hidden rounded-3xl shadow-glow ring-1 ring-inset ring-white/15">
              <Image
                src={coachPhoto}
                alt="Shane Lanteigne, SL Strength coach"
                fill
                sizes="(min-width: 1024px) 13rem, 60vw"
                placeholder="blur"
                className="object-cover"
              />
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-blood-500">About your coach</div>
              <h2 className="text-2xl font-bold sm:text-3xl">Shane Lanteigne</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {["13 years coaching", "NSCA · CSCS", "CSCCA · SCCC", "College & Pro experience"].map((c) => (
                  <span key={c} className="rounded-full border border-blood-500/30 bg-blood-500/10 px-3 py-1 text-xs font-medium text-blood-400">
                    {c}
                  </span>
                ))}
              </div>
              <p className="mt-4 max-w-2xl text-zinc-400">
                I&apos;m a strength &amp; conditioning coach with 13 years in the field,
                certified through the NSCA (CSCS) and the CSCCA (SCCC). I&apos;ve spent
                my career developing college and professional athletes — Saint Leo
                University, the Miami Marlins organization, Southwest Baptist
                University, IMG Academy, and Lincoln University — and today I&apos;m the
                Director of Men&apos;s Basketball Performance at Arkansas State
                University.
              </p>
              <p className="mt-4 max-w-2xl text-zinc-400">
                That&apos;s the same standard I bring to your training. My coaching is
                built on the fundamentals that actually move the needle: progressive
                overload, honest nutrition, and consistency you can sustain. Online
                or in person, you get a program made for you, targets grounded in
                real data, and a coach paying attention every week. No fluff, no
                shortcuts — just steady, earned progress.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-white/[0.06] py-20">
          <div className="card relative overflow-hidden p-10 text-center">
            <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blood-500/60 to-transparent" />
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to get to work?</h2>
            <p className="mx-auto mt-3 max-w-lg text-zinc-400">
              Fill out the application — it takes a couple of minutes. I&apos;ll review
              it and reach out to see if we&apos;re a good fit.
            </p>
            <div className="mt-8 flex justify-center">
              <ApplyButton className="px-8 py-4 text-base">
                Apply for coaching <ArrowRight className="h-5 w-5" />
              </ApplyButton>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] py-8 text-sm text-zinc-500 sm:flex-row">
          <Brand href="/" compact />
          <div className="flex items-center gap-5">
            <a href={APPLICATION_FORM_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">Apply</a>
            <Link href="/login" className="hover:text-white">Coach login</Link>
          </div>
          <span>© {new Date().getFullYear()} SL Strength</span>
        </footer>
      </div>
    </div>
  );
}
