import Link from "next/link";
import { ArrowRight, Dumbbell, Users } from "lucide-react";
import { Brand } from "@/components/Brand";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
        <header className="flex items-center justify-between">
          <Brand href="/" />
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-zinc-400">
            Prototype · v0.1
          </span>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-blood-500">
            The SL Strength Operating System
          </div>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] sm:text-6xl">
            Run the entire coaching business from{" "}
            <span className="text-blood-500">one system.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-zinc-400">
            The interface layer on top of the SL Strength backend — a premium
            client portal for delivery and a command dashboard for the coach.
            Choose an experience to explore the prototype.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Link
              href="/dashboard"
              className="card card-hover group relative overflow-hidden p-6"
            >
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blood-500/50 to-transparent" />
              <Dumbbell className="h-7 w-7 text-blood-500" />
              <h2 className="mt-4 text-lg font-semibold">Client Portal</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Training, nutrition, check-ins, progress, and direct line to
                your coach.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blood-500">
                Enter as Jordan Miles
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              href="/coach"
              className="card card-hover group relative overflow-hidden p-6"
            >
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blood-500/50 to-transparent" />
              <Users className="h-7 w-7 text-blood-500" />
              <h2 className="mt-4 text-lg font-semibold">Coach Dashboard</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Active clients, risk flags, sales pipeline, revenue, and the
                content engine.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blood-500">
                Enter as Shane
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
        </main>

        <footer className="border-t border-white/[0.06] py-6 text-xs text-zinc-600">
          Backed by the SL Strength OS (Notion today, API-ready). Sample data —
          not real clients.
        </footer>
      </div>
    </div>
  );
}
