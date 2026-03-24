import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";

export default function MarketRulesPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
      <SectionHeading
        eyebrow="Rules"
        title="Trust surfaces that keep the market fan-safe"
        description="These rules are part of the product design, not optional moderation polish."
      />
      <div className="grid gap-5">
        {[
          {
            title: "Positive-only support",
            body: "Users can buy and sell back support units against the system pool. There is no shorting, no betting against another fandom, and no player-to-player matching.",
          },
          {
            title: "Rights-aware content",
            body: "Bangumi-compatible metadata and CC BY-SA text must keep attribution. Official art, voice, logos, and manga pages are not assumed reusable unless separately permissioned.",
          },
          {
            title: "Profile-first social layer",
            body: "Comments, likes, and reactions are built for appreciation and curation. Rankings are tag-based and supportive, not conflict-oriented.",
          },
        ].map((rule) => (
          <Surface key={rule.title} className="p-6">
            <h2 className="font-display text-3xl text-slate-950">{rule.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{rule.body}</p>
          </Surface>
        ))}
      </div>
    </div>
  );
}
