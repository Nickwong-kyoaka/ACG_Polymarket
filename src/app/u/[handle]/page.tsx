import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { currencyLabel } from "@/lib/utils";
import { getUserByHandle } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const { profile, positions, wallet } = getUserByHandle(handle);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <Surface className="overflow-hidden">
        <div className="grid gap-8 bg-[linear-gradient(135deg,#fff0dc,#ffe6c8_45%,#f5fbff)] px-8 py-10 lg:grid-cols-[1fr_0.75fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#db5d35]">
              Public profile
            </p>
            <h1 className="font-display text-5xl text-slate-950">{profile.displayName}</h1>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              @{profile.handle}
            </p>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">{profile.bio}</p>
          </div>
          <div className="grid gap-3 rounded-[2rem] bg-slate-950 p-6 text-white">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              Visible support value
            </p>
            <p className="font-display text-5xl">
              {currencyLabel(positions.reduce((total, entry) => total + entry.currentValue, 0))}
            </p>
            <p className="text-sm leading-7 text-white/75">
              Holdings visibility is {profile.holdingsVisibility ? "on" : "off"} for this profile.
              Wallet balance currently sits at {currencyLabel(wallet.softBalance)}.
            </p>
          </div>
        </div>
      </Surface>

      <SectionHeading
        eyebrow="Pinned favorites"
        title="Characters this supporter wants to spotlight"
        description="Pinned positions turn the portfolio into a fandom identity page rather than a profit scoreboard."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {positions.map((position) => (
          <Surface key={position.id} className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#db5d35]">
              {position.character.title}
            </p>
            <h3 className="mt-3 font-display text-3xl text-slate-950">{position.character.name}</h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Holding {position.units} units · avg cost {position.averageCost} SUP · current value{" "}
              {currencyLabel(position.currentValue)}
            </p>
          </Surface>
        ))}
      </div>
    </div>
  );
}
