"use client";

import { Progress, TopBar, Slide, Reveal, Kicker, Phone } from "./_components";

/* ── Grounded facts (where-we-are.md / CLAUDE.md, read 2026-06-07) ── */
const PROGRAM_ID = "DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v";
const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const STATE_PDA = "8KUctm4YQRns3788cQWyjc7SFtKSnws4m4FTZ72YDfYm";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card p-5">
      <div className="display grad-text text-3xl sm:text-4xl">{value}</div>
      <div className="mt-2 text-sm font-medium text-muted">{label}</div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="deck">
      <Progress />
      <TopBar />

      {/* 1 — HERO */}
      <section
        id="hero"
        className="slide relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-24 text-center"
      >
        <div className="radar" aria-hidden>
          <i style={{ animationDelay: "0s" }} />
          <i style={{ animationDelay: "1.4s" }} />
          <i style={{ animationDelay: "2.8s" }} />
          <i style={{ animationDelay: "4.2s" }} />
          <b />
        </div>
        <div className="relative z-10 mx-auto w-full max-w-4xl">
          <Reveal>
            <div className="mx-auto mb-7 flex flex-wrap items-center justify-center gap-2">
              <span className="chip border-aqua/40 text-frost">🏆 Solana Mobile Monolith 2026 Hackathon Winner</span>
              <span className="chip">◎ Live on Solana mainnet</span>
              <span className="chip">On the Solana dApp Store</span>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <h1>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="mx-auto h-auto w-[min(78vw,640px)] drop-shadow-[0_0_30px_rgba(97,175,189,0.48)]"
                src="/brand/seek-logo.svg"
                alt="Seek"
              />
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mx-auto mt-5 max-w-3xl text-base font-semibold leading-relaxed text-frost sm:text-lg">
              Seek is real-world scavenger hunts on Seeker: stake{" "}
              <span className="font-bold">$SKR</span>, get a physical target,
              prove it with a photo, and settle the result on-chain. Winner of
              the Solana Mobile Monolith 2026 hackathon.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl">
              Super Hunts is Seek&apos;s next evolution: turning the live dApp
              Store game into a Pokemon Go-level event co-marketing layer for
              partners. First flagship target: Breakpoint London 2026.
            </p>
          </Reveal>
          <Reveal delay={0.26}>
            <div className="mx-auto mt-9 flex flex-wrap items-center justify-center gap-3 text-sm">
              <span className="chip border-aqua/30 text-frost">Next evolution: Super Hunts</span>
              <span className="chip">📍 Breakpoint London 2026</span>
              <span className="chip">Partner co-marketing layer</span>
              <span className="chip">Requesting $30K</span>
            </div>
          </Reveal>
          <Reveal delay={0.34}>
            <p className="mt-10 text-xs uppercase tracking-[0.3em] text-faint">
              Ecosystem grant application
            </p>
          </Reveal>
        </div>
      </section>

      {/* 2 — PROBLEM */}
      <Slide id="problem">
        <Reveal>
          <Kicker>The opening</Kicker>
          <h2 className="display text-4xl sm:text-6xl">
            Communities gather thousands of people.
            <br className="hidden sm:block" />{" "}
            <span className="grad-text">Almost none open a wallet because of it.</span>
          </h2>
          <p className="mt-6 max-w-3xl text-lg text-muted">
            Events are crypto&apos;s highest-energy rooms and weakest conversion
            funnel. There is rarely a shared, on-chain thing to <em>do</em>.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            {
              h: "Moments, not actions",
              p: "Conferences mint photos and follower counts. They don't mint wallets opened, apps installed, or transactions signed.",
            },
            {
              h: "Seeker needs a reason to be in every hand",
              p: "Hardware lives or dies on flagship apps. Solana Mobile needs a consumer hook people pull out and show their friends.",
            },
            {
              h: "Partners need playable marketing",
              p: "Sponsors and communities need more than logos on lanyards. Super Hunts gives them a reason for attendees to visit, play, and share.",
            },
          ].map((c, i) => (
            <Reveal key={c.h} delay={0.08 * i}>
              <div className="card h-full p-6">
                <h3 className="text-lg font-bold text-text">{c.h}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{c.p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Slide>

      {/* 3 — SOLUTION (Seek today) */}
      <Slide id="solution">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <Kicker>The product, live today</Kicker>
              <h2 className="display text-4xl sm:text-6xl">
                Stake. Hunt. <span className="grad-text">Prove. Win.</span>
              </h2>
              <p className="mt-6 max-w-xl text-lg text-muted">
                Commit <span className="text-frost font-semibold">$SKR</span>. Get a
                real-world target. Photograph it before the timer runs out. Claude
                Vision validates on the spot and the result settles on-chain — win,
                and the protocol pays{" "}
                <span className="text-frost font-semibold">2× your stake</span>. No
                oracle, no referee, no waiting.
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="mt-8 grid grid-cols-3 gap-3 text-center">
                {[
                  ["Easy", "500 $SKR", "180s"],
                  ["Medium", "1,000 $SKR", "120s"],
                  ["Hard", "2,000 $SKR", "60s"],
                ].map(([t, a, s]) => (
                  <div key={t} className="card p-4">
                    <div className="text-xs uppercase tracking-widest text-aqua">{t}</div>
                    <div className="mt-2 text-base font-bold text-text">{a}</div>
                    <div className="text-xs text-faint">{s}</div>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="mt-7 flex flex-wrap gap-2">
                {["Commit–reveal missions", "Claude Vision validation", "2× payout", "PDA-signed payouts"].map(
                  (x) => (
                    <span key={x} className="chip">{x}</span>
                  )
                )}
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="flex justify-center gap-5">
              <Phone src="/screens/02-home.png" label="Pick a tier" />
              <div className="hidden sm:block">
                <Phone src="/screens/06-result-win.png" label="Win" />
              </div>
            </div>
          </Reveal>
        </div>
      </Slide>

      {/* 4 — SUPER HUNTS (the ask) */}
      <Slide id="super-hunts">
        <Reveal>
          <Kicker>What the grant builds</Kicker>
          <h2 className="display text-4xl sm:text-6xl">
            <span className="grad-text">Super Hunts</span>{" "}
            make the whole event the game.
          </h2>
          <p className="mt-6 max-w-3xl text-lg text-muted">
            A geofenced, sponsor-funded hunt mode built for conferences and
            partner campaigns. The first target is Breakpoint London; the same
            kit lets any host spin up a venue-scoped mission pool, live
            leaderboard, and $SKR prize economy in an afternoon.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-4">
          {[
            ["01", "Geofence it", "Missions scoped to the venue floor, the city, and partner booths."],
            ["02", "Sponsors fund the pot", "Hosts and partners seed an $SKR prize pool; booths unlock bonus targets."],
            ["03", "Attendees race", "Tap in with MWA, shoot the target, get validated, climb the live board."],
            ["04", "It settles on-chain", "Winners and completions land on mainnet; the host gets a recap dashboard."],
          ].map(([n, h, p], i) => (
            <Reveal key={h} delay={0.07 * i}>
              <div className="card h-full p-6">
                <div className="display grad-text text-3xl">{n}</div>
                <h3 className="mt-3 text-base font-bold text-text">{h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Slide>

      {/* 5 — WHY NOW */}
      <Slide id="why-now">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Reveal>
              <Kicker>Why now</Kicker>
              <h2 className="display text-4xl sm:text-6xl">
                The catalyst is <span className="grad-text">repeatable</span>.
              </h2>
              <p className="mt-6 max-w-xl text-lg text-muted">
                Breakpoint London is the forcing function; community gatherings,
                hacker houses, and grant-backed activations need the same thing:
                a real reason for people to pull out a wallet, explore the venue,
                transact, and discover partners. Super Hunts is the reusable
                co-marketing format.
              </p>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="mt-8 flex flex-wrap gap-2">
                {["Breakpoint London", "Community activations", "Hacker Houses", "Regional meetups"].map((x) => (
                  <span key={x} className="chip">{x}</span>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <div className="card p-8 text-center glow">
              <div className="text-xs uppercase tracking-[0.3em] text-aqua">Flagship launch target</div>
              <div className="display grad-text mt-4 text-5xl">BREAKPOINT</div>
              <div className="mt-2 text-2xl font-bold text-text">London · Nov 15-17, 2026</div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="display text-text text-3xl">16 WKS</div>
                  <div className="text-xs text-faint">to event mode</div>
                </div>
                <div>
                  <div className="display text-text text-3xl">3+ pilots</div>
                  <div className="text-xs text-faint">after Breakpoint</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Slide>

      {/* 6 — TRACTION / LIVE PROOF */}
      <Slide id="traction">
        <Reveal>
          <Kicker>This is not a pitch for vaporware</Kicker>
          <h2 className="display text-4xl sm:text-6xl">
            Already <span className="grad-text">live</span>. Shipped solo, end to end.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal delay={0.04}><Stat value="Mainnet" label="Deployed & initialized program" /></Reveal>
          <Reveal delay={0.08}><Stat value="v1.0.4" label="Shipping on the Solana dApp Store" /></Reveal>
          <Reveal delay={0.12}><Stat value="~76K $SKR" label="House vault funding real payouts" /></Reveal>
          <Reveal delay={0.16}><Stat value="~10%" label="Completion rate, by design" /></Reveal>
        </div>
        <Reveal delay={0.2}>
          <div className="card mt-6 p-6">
            <div className="text-xs uppercase tracking-[0.25em] text-aqua">Don&apos;t take our word for it — verify on-chain</div>
            <div className="mt-4 grid gap-3 font-mono text-xs text-muted">
              <div><span className="text-faint">Program&nbsp;&nbsp;</span><span className="text-frost break-all">{PROGRAM_ID}</span></div>
              <div><span className="text-faint">$SKR mint&nbsp;</span><span className="text-frost break-all">{SKR_MINT}</span></div>
              <div><span className="text-faint">State PDA&nbsp;</span><span className="text-frost break-all">{STATE_PDA}</span></div>
            </div>
          </div>
        </Reveal>
      </Slide>

      {/* 7 — MOBILE NATIVE / SMS */}
      <Slide id="sms">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div className="flex justify-center gap-5">
              <Phone src="/screens/04-camera.png" label="Camera hunt" />
              <div className="hidden sm:block">
                <Phone src="/screens/05-validating.png" label="AI validating" />
              </div>
            </div>
          </Reveal>
          <div>
            <Reveal delay={0.05}>
              <Kicker>Built on the Solana Mobile Stack</Kicker>
              <h2 className="display text-4xl sm:text-5xl">
                Mobile-native because it <span className="grad-text">has to be</span>.
              </h2>
              <p className="mt-5 max-w-xl text-muted">
                The whole game is the phone in your hand. You can&apos;t fake this on
                a desktop tab.
              </p>
            </Reveal>
            <div className="mt-8 space-y-3">
              {[
                ["Mobile Wallet Adapter", "MWA-first sign-in and signing. No desktop fallback, by design."],
                ["Seeker Genesis Token gating", "SGT mint-binding for verified-Seeker access and anti-abuse."],
                ["Camera + location", "Native capture is the core loop; geofencing is what powers Super Hunts."],
                ["Seeker-exclusive", "No iOS, no web build, no general Play Store — dApp Store only."],
              ].map(([h, p], i) => (
                <Reveal key={h} delay={0.06 * i}>
                  <div className="flex gap-4 rounded-2xl border border-line bg-surface/40 p-4">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-aqua shadow-[0_0_12px_2px_rgba(97,175,189,0.7)]" />
                    <div>
                      <div className="font-bold text-text">{h}</div>
                      <div className="text-sm text-muted">{p}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* 8 — SKR INTEGRATION */}
      <Slide id="skr">
        <Reveal>
          <Kicker>$SKR is the game economy</Kicker>
          <h2 className="display text-4xl sm:text-6xl">
            Spent, won, and <span className="grad-text">looped</span>.
          </h2>
          <p className="mt-6 max-w-3xl text-lg text-muted">
            $SKR isn&apos;t a giveaway here — it&apos;s the entry, the prize, and the
            perk. Super Hunts stack sponsor-funded pools and booth unlocks on top of
            a loop that already moves real $SKR every day.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["Entry", "Every hunt is a tiered $SKR commit — real stakes make it a game, not a tap-to-claim."],
            ["Rewards", "Completions pay 2× total return; misses recycle straight back into the economy."],
            ["Singularity pool", "A bonus pool seeds rare windfalls that keep players coming back for one more hunt."],
            ["Partner perks", "Event pools, booth unlocks, and sponsored missions turn $SKR into the currency of the conference floor."],
          ].map(([h, p], i) => (
            <Reveal key={h} delay={0.07 * i}>
              <div className="card h-full p-6">
                <h3 className="text-lg font-bold text-frost">{h}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Slide>

      {/* 9 — PUBLIC GOOD */}
      <Slide id="public-good">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <div className="card p-8 glow">
              <div className="text-xs uppercase tracking-[0.3em] text-aqua">Open source · MIT</div>
              <div className="display mt-4 text-4xl text-text">
                Event <span className="grad-text">Hunt Kit</span>
              </div>
              <p className="mt-4 text-sm text-muted">
                We don&apos;t just want to run hunts — we want everyone to. The kit
                lets any Solana organizer launch a geofenced, on-chain hunt at their
                own event without rebuilding the hard parts.
              </p>
            </div>
          </Reveal>
          <div>
            <Reveal delay={0.05}>
              <Kicker>What we give back</Kicker>
              <h2 className="display text-3xl sm:text-5xl">
                Fund us once, the ecosystem gets the <span className="grad-text">primitive</span> forever.
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["Geofenced mission engine", "Drop-in config for venue- and city-scoped mission pools."],
                ["MWA + proof-capture flow", "Reference client for sign-in, capture, and AI validation."],
                ["Prize-pool escrow pattern", "An Anchor pattern for sponsor-funded, trust-minimized payouts."],
                ["Organizer docs + template", "A starter that turns a new event hunt into hours, not months."],
              ].map(([h, p], i) => (
                <Reveal key={h} delay={0.06 * i}>
                  <div className="rounded-2xl border border-line bg-surface/40 p-5">
                    <div className="font-bold text-text">{h}</div>
                    <div className="mt-1 text-sm text-muted">{p}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Slide>

      {/* 10 — MILESTONES */}
      <Slide id="milestones">
        <Reveal>
          <Kicker>Scope & timeline · 16 weeks</Kicker>
          <h2 className="display text-4xl sm:text-6xl">
            Four milestones. Each one <span className="grad-text">shippable</span>.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            ["M1 · wk 1–4", "Event Hunt mode", "Geofenced mission pools, organizer config, and sponsor prize-pool escrow."],
            ["M2 · wk 5–8", "Breakpoint go-live", "Live leaderboard and real-time event dashboard, hardened for the Breakpoint floor."],
            ["M3 · wk 9–12", "Event Hunt Kit", "Open-source the SDK, docs, and template — the public good ships."],
            ["M4 · wk 13–16", "Post-Breakpoint circuit", "Switchboard VRF for fair bonuses at scale, then 2–3 more events."],
          ].map(([t, h, p], i) => (
            <Reveal key={h} delay={0.08 * i}>
              <div className="card relative h-full overflow-hidden p-6">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-aqua to-frost" />
                <div className="text-xs font-semibold uppercase tracking-widest text-aqua">{t}</div>
                <h3 className="mt-3 text-lg font-bold text-text">{h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Slide>

      {/* 11 — BUDGET */}
      <Slide id="budget">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.8fr]">
          <div>
            <Reveal>
              <Kicker>Use of funds</Kicker>
              <h2 className="display text-4xl sm:text-6xl">
                Every dollar tied to a <span className="grad-text">milestone</span>.
              </h2>
            </Reveal>
            <div className="mt-8 divide-y divide-line overflow-hidden rounded-2xl border border-line">
              {[
                ["Engineering — event mode, geofencing, leaderboard, real-time", "$12K"],
                ["Open-source Event Hunt Kit (SDK + docs)", "$4K"],
                ["Switchboard On-Demand VRF integration", "$3K"],
                ["Infra / RPC / Redis scaling for event spikes", "$3K"],
                ["On-site activation — Breakpoint pilot, prize-pool seed, partner ops", "$6K"],
                ["Concurrency & security pass for event-scale load", "$2K"],
              ].map(([h, v], i) => (
                <Reveal key={h} delay={0.05 * i}>
                  <div className="flex items-center justify-between gap-4 bg-surface/30 px-5 py-4">
                    <span className="text-sm text-muted">{h}</span>
                    <span className="font-bold text-frost">{v}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={0.1}>
            <div className="card p-8 text-center glow">
              <div className="text-xs uppercase tracking-[0.3em] text-aqua">Requested</div>
              <div className="display grad-text mt-4 text-6xl">$30K</div>
              <div className="mt-2 text-sm text-muted">to ship the reusable event layer</div>
              <div className="mt-6 text-xs text-faint">
                Bootstrapped and live today. This grant is the difference between a
                great app and an ecosystem-wide event layer.
              </div>
            </div>
          </Reveal>
        </div>
      </Slide>

      {/* 12 — ASK */}
      <Slide id="ask" className="text-center">
        <Reveal>
          <Kicker>The ask</Kicker>
          <h2 className="display glow-text text-5xl sm:text-7xl">
            Fund the <span className="grad-text">hunt</span>.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-7 max-w-2xl text-lg text-muted">
            Seek is live, winning, and shipped by one builder. A $30K grant
            turns a proven dApp Store app into the on-chain game that makes
            Breakpoint playable first, then gives partners a Pokemon Go-level
            co-marketing solution for ecosystem rooms of any size. We open-source
            the kit so any organizer can run one.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-3">
            <span className="chip border-aqua/40 text-frost">seek.mythx.art</span>
            <span className="chip">app.seek.mobile · dApp Store</span>
            <span className="chip">Built on Solana Mobile Stack</span>
          </div>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="display grad-text mt-14 text-2xl tracking-[0.2em]">SEEK</div>
          <div className="text-xs uppercase tracking-[0.3em] text-faint">scavenger hunts on Solana</div>
        </Reveal>
      </Slide>
    </main>
  );
}
