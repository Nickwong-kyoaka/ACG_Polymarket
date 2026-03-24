import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <SectionHeading
        eyebrow="Onboarding"
        title="Start in under a minute"
        description="Pick your fandom tags, claim starter balance, then support one character to make your profile feel alive."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: "1. Sign in",
            body: "Google and email providers are ready when environment variables are set. The demo credentials provider keeps local development usable today.",
          },
          {
            title: "2. Claim your starter loop",
            body: "Every user begins with 300 SUP, can claim 100 SUP each day, and may unlock 20 SUP from rewarded ads up to three times daily.",
          },
          {
            title: "3. Support and style",
            body: "Use the first buy to pin a favorite, then spend on a frame or profile theme so your public page feels personal immediately.",
          },
        ].map((step) => (
          <Surface key={step.title} className="p-6">
            <h3 className="font-display text-3xl text-slate-950">{step.title}</h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">{step.body}</p>
          </Surface>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <Link
          href="/api/auth/signin"
          className="rounded-full bg-[#db5d35] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#c14a24]"
        >
          Open sign-in
        </Link>
        <Link
          href="/market"
          className="rounded-full border border-black/10 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:border-[#db5d35] hover:text-[#db5d35]"
        >
          Skip into market
        </Link>
      </div>
    </div>
  );
}
