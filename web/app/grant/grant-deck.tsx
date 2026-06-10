"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import "./grant.css";

const PROGRAM_ID = "DqsCXFjgLp4UDZgMQE6nvEHe7yiRNJsVYFv21JSbd73v";
const SKR_MINT = "SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3";
const STATE_PDA = "8KUctm4YQRns3788cQWyjc7SFtKSnws4m4FTZ72YDfYm";

const SECTIONS = [
  "hero", "problem", "solution", "super-hunts", "why-now", "traction",
  "sms", "skr", "public-good", "milestones", "budget", "ask",
];

function rd(delay: number): CSSProperties {
  return { ["--d" as string]: `${delay}s` } as CSSProperties;
}

function CountUp({
  prefix = "", value, suffix = "", className = "",
}: { prefix?: string; value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fmt = (n: number) => n.toLocaleString("en-US");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const dur = 1200, start = performance.now();
        const step = (t: number) => {
          const p = Math.min(1, (t - start) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = `${prefix}${fmt(Math.round(value * eased))}${suffix}`;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [prefix, value, suffix]);
  return (
    <span ref={ref} className={className}>
      {prefix}{value.toLocaleString("en-US")}{suffix}
    </span>
  );
}

export default function GrantDeck() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("hero");

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.classList.add("js");

    // Scroll-reveal
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          revealIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    el.querySelectorAll(".reveal").forEach((n) => revealIO.observe(n));

    // Active-section tracking for dot nav
    const secIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setActive((e.target as HTMLElement).id);
      });
    }, { threshold: 0.5 });
    el.querySelectorAll("section.slide").forEach((n) => secIO.observe(n));

    // Progress bar
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      el.style.setProperty("--p", String(p));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      revealIO.disconnect();
      secIO.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const go = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="gp" ref={root}>
      <div className="gp-progress" aria-hidden />

      <header className="gp-bar">
        <a className="wm" href="/" aria-label="Seek home">
          <span className="gp-wordmark grad glow">SEEK</span>
          <span className="tag">scavenger hunts on Solana</span>
        </a>
        <span className="chip hot">Ecosystem grant deck</span>
      </header>

      <nav className="gp-dots" aria-label="Slide navigation">
        {SECTIONS.map((id) => (
          <button
            key={id}
            className={active === id ? "active" : ""}
            aria-label={`Go to ${id}`}
            aria-current={active === id}
            onClick={() => go(id)}
          />
        ))}
      </nav>

      {/* 1 — HERO */}
      <section id="hero" className="slide center">
        <div className="radar" aria-hidden>
          <i style={{ animationDelay: "0s" }} />
          <i style={{ animationDelay: "1.4s" }} />
          <i style={{ animationDelay: "2.8s" }} />
          <i style={{ animationDelay: "4.2s" }} />
          <span className="sweep" />
          <b />
        </div>
        <div className="wrap" style={{ maxWidth: 960 }}>
          <div className="reveal chips" style={{ marginBottom: "1.6rem", ...rd(0) }}>
            <span className="chip hot">🏆 Solana Mobile Monolith 2026 Hackathon Winner</span>
            <span className="chip">◎ Live on Solana mainnet</span>
            <span className="chip">On the Solana dApp Store</span>
          </div>
          <h1 className="reveal hero-logo-wrap" style={rd(0.08)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hero-logo" src="/grant/seek-logo.svg" alt="Seek" />
          </h1>
          <p className="reveal hero-proof" style={rd(0.12)}>
            Seek is real-world scavenger hunts on Seeker: stake{" "}
            <span className="hl">$SKR</span>, get a physical target, prove it with
            a photo, and settle the result on-chain. Winner of the Solana Mobile
            Monolith 2026 hackathon.
          </p>
          <p className="reveal lead" style={{ maxWidth: 680, marginInline: "auto", ...rd(0.18) }}>
            Super Hunts is Seek&apos;s next evolution: turning the live dApp Store
            game into a Pokemon Go-level event co-marketing layer for partners.
            First flagship target: Breakpoint London 2026.
          </p>
          <div className="reveal chips mt" style={rd(0.26)}>
            <span className="chip hot">Next evolution: Super Hunts</span>
            <span className="chip">📍 Breakpoint London 2026</span>
            <span className="chip">Partner co-marketing layer</span>
            <span className="chip">Requesting $30K</span>
          </div>
          <p className="reveal" style={{ marginTop: "2.4rem", fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--faint)", ...rd(0.34) }}>
            Ecosystem grant application
          </p>
        </div>
      </section>

      {/* 2 — PROBLEM */}
      <section id="problem" className="slide">
        <div className="wrap">
          <div className="reveal">
            <p className="kicker">The opening</p>
            <h2 className="display">
              Communities gather thousands of people.{" "}
              <span className="grad">Almost none open a wallet because of it.</span>
            </h2>
            <p className="lead wide">
              Events are crypto&apos;s highest-energy rooms and weakest conversion
              funnel. There is rarely a shared, on-chain thing to <em>do</em>.
            </p>
          </div>
          <div className="grid g3 mt">
            {[
              ["Moments, not actions", "Conferences mint photos and follower counts. They don't mint wallets opened, apps installed, or transactions signed."],
              ["Seeker needs a reason to be in every hand", "Hardware lives or dies on flagship apps. Solana Mobile needs a consumer hook people pull out and show their friends."],
              ["Partners need playable marketing", "Sponsors and communities need more than logos on lanyards. Super Hunts gives them a reason for attendees to visit, play, and share."],
            ].map(([h, p], i) => (
              <div className="reveal card" style={rd(0.08 * i)} key={h}>
                <h3>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 — SOLUTION */}
      <section id="solution" className="slide">
        <div className="wrap split">
          <div className="reveal">
            <p className="kicker">The product, live today</p>
            <h2 className="display">Stake. Hunt. <span className="grad">Prove. Win.</span></h2>
            <p className="lead narrow">
              Commit <span className="hl">$SKR</span>. Get a real-world target.
              Photograph it before the timer runs out. Claude Vision validates on the
              spot and the result settles on-chain — win, and the protocol pays{" "}
              <span className="hl">2× your stake</span>. No oracle, no referee, no waiting.
            </p>
            <div className="grid g3 tiers mt" style={{ gap: "0.75rem" }}>
              {[["Easy", "500 $SKR", "180s"], ["Medium", "1,000 $SKR", "120s"], ["Hard", "2,000 $SKR", "60s"]].map(([t, a, s]) => (
                <div className="card center" style={{ padding: "1rem" }} key={t}>
                  <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--aqua)" }}>{t}</div>
                  <div style={{ marginTop: "0.5rem", fontWeight: 700 }}>{a}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--faint)" }}>{s}</div>
                </div>
              ))}
            </div>
            <div className="chips" style={{ marginTop: "1.6rem" }}>
              {["Commit–reveal missions", "Claude Vision validation", "2× payout", "PDA-signed payouts"].map((x) => (
                <span className="chip" key={x}>{x}</span>
              ))}
            </div>
          </div>
          <div className="reveal phones" style={rd(0.1)}>
            <div className="phone float">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/grant/screens/02-home.png" alt="Seek tier selection" loading="lazy" />
              <span className="phone-cap">Pick a tier</span>
            </div>
            <div className="phone float d" style={{ alignSelf: "flex-end" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/grant/screens/06-result-win.png" alt="Seek win screen" loading="lazy" />
              <span className="phone-cap">Win</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4 — SUPER HUNTS */}
      <section id="super-hunts" className="slide">
        <div className="wrap">
          <div className="reveal">
            <p className="kicker">What the grant builds</p>
            <h2 className="display">
              <span className="grad">Super Hunts</span> make the whole event the game.
            </h2>
            <p className="lead wide">
              A geofenced, sponsor-funded hunt mode built for conferences and
              partner campaigns. The first target is Breakpoint London; the same
              kit lets any host spin up a venue-scoped mission pool, live
              leaderboard, and $SKR prize economy in an afternoon.
            </p>
          </div>
          <div className="grid g4 mt">
            {[
              ["01", "Geofence it", "Missions scoped to the venue floor, the city, and partner booths."],
              ["02", "Sponsors fund the pot", "Hosts and partners seed an $SKR prize pool; booths unlock bonus targets."],
              ["03", "Attendees race", "Tap in with MWA, shoot the target, get validated, climb the live board."],
              ["04", "It settles on-chain", "Winners and completions land on mainnet; the host gets a recap dashboard."],
            ].map(([n, h, p], i) => (
              <div className="reveal card" style={rd(0.07 * i)} key={h}>
                <div className="num grad">{n}</div>
                <h3 style={{ marginTop: "0.8rem" }}>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — WHY NOW */}
      <section id="why-now" className="slide">
        <div className="wrap split l">
          <div className="reveal">
              <p className="kicker">Why now</p>
              <h2 className="display">The catalyst is <span className="grad">repeatable</span>.</h2>
              <p className="lead narrow">
              Breakpoint London is the forcing function; community gatherings,
              hacker houses, and grant-backed activations need the same thing:
              a real reason for people to pull out a wallet, explore the venue,
              transact, and discover partners. Super Hunts is the reusable
              co-marketing format.
            </p>
            <div className="chips" style={{ marginTop: "1.6rem" }}>
              {["Breakpoint London", "Community activations", "Hacker Houses", "Regional meetups"].map((x) => (
                <span className="chip" key={x}>{x}</span>
              ))}
            </div>
          </div>
          <div className="reveal hcard" style={rd(0.1)}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--aqua)" }}>Flagship launch target</div>
            <div className="display grad big" style={{ marginTop: "1rem" }}>BREAKPOINT</div>
            <div style={{ marginTop: "0.4rem", fontSize: "1.5rem", fontWeight: 700 }}>London · Nov 15-17, 2026</div>
            <div className="grid g2" style={{ marginTop: "1.6rem" }}>
              <div>
                <div className="display" style={{ fontSize: "1.8rem" }}>16 WKS</div>
                <div style={{ fontSize: "0.75rem", color: "var(--faint)" }}>to event mode</div>
              </div>
              <div>
                <div className="display" style={{ fontSize: "1.8rem" }}>
                  <CountUp value={3} suffix="+ pilots" />
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--faint)" }}>after Breakpoint</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6 — TRACTION */}
      <section id="traction" className="slide">
        <div className="wrap">
          <div className="reveal">
            <p className="kicker">This is not a pitch for vaporware</p>
            <h2 className="display">Already <span className="grad">live</span>. Shipped solo, end to end.</h2>
          </div>
          <div className="grid g4 mt">
            <div className="reveal card stat" style={rd(0.04)}>
              <div className="num"><span className="grad">Mainnet</span></div>
              <div className="label">Deployed &amp; initialized program</div>
            </div>
            <div className="reveal card stat" style={rd(0.08)}>
              <div className="num"><span className="grad">v1.0.4</span></div>
              <div className="label">Shipping on the Solana dApp Store</div>
            </div>
            <div className="reveal card stat" style={rd(0.12)}>
              <div className="num"><CountUp prefix="~" value={76} suffix="K $SKR" className="grad" /></div>
              <div className="label">House vault funding real payouts</div>
            </div>
            <div className="reveal card stat" style={rd(0.16)}>
              <div className="num"><CountUp prefix="~" value={10} suffix="%" className="grad" /></div>
              <div className="label">Completion rate, by design</div>
            </div>
          </div>
          <div className="reveal card mono" style={{ marginTop: "1.6rem", ...rd(0.2) }}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--aqua)" }}>
              Don&apos;t take our word for it — verify on-chain
            </div>
            <div className="row"><span className="k">Program&nbsp;&nbsp;</span><span className="v">{PROGRAM_ID}</span></div>
            <div className="row"><span className="k">$SKR mint&nbsp;</span><span className="v">{SKR_MINT}</span></div>
            <div className="row"><span className="k">State PDA&nbsp;</span><span className="v">{STATE_PDA}</span></div>
          </div>
        </div>
      </section>

      {/* 7 — SMS */}
      <section id="sms" className="slide">
        <div className="wrap split">
          <div className="reveal phones" style={rd(0.05)}>
            <div className="phone float">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/grant/screens/04-camera.png" alt="Seek camera hunt" loading="lazy" />
              <span className="phone-cap">Camera hunt</span>
            </div>
            <div className="phone float d" style={{ alignSelf: "flex-end" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/grant/screens/05-validating.png" alt="Seek AI validating" loading="lazy" />
              <span className="phone-cap">AI validating</span>
            </div>
          </div>
          <div className="reveal">
            <p className="kicker">Built on the Solana Mobile Stack</p>
            <h2 className="display">Mobile-native because it <span className="grad">has to be</span>.</h2>
            <p className="lead narrow">The whole game is the phone in your hand. You can&apos;t fake this on a desktop tab.</p>
            <div className="stack mt">
              {[
                ["Mobile Wallet Adapter", "MWA-first sign-in and signing. No desktop fallback, by design."],
                ["Seeker Genesis Token gating", "SGT mint-binding for verified-Seeker access and anti-abuse."],
                ["Camera + location", "Native capture is the core loop; geofencing is what powers Super Hunts."],
                ["Seeker-exclusive", "No iOS, no web build, no general Play Store — dApp Store only."],
              ].map(([h, p]) => (
                <div className="frow" key={h}>
                  <span className="pip" />
                  <div><div className="ft">{h}</div><div className="fp">{p}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8 — SKR */}
      <section id="skr" className="slide">
        <div className="wrap">
          <div className="reveal">
            <p className="kicker">$SKR is the game economy</p>
            <h2 className="display">Spent, won, and <span className="grad">looped</span>.</h2>
            <p className="lead wide">
              $SKR isn&apos;t a giveaway here — it&apos;s the entry, the prize, and the
              perk. Super Hunts stack sponsor-funded pools and booth unlocks on top of
              a loop that already moves real $SKR every day.
            </p>
          </div>
          <div className="grid g4 skr mt">
              {[
                ["Entry", "Every hunt is a tiered $SKR commit — real stakes make it a game, not a tap-to-claim."],
                ["Rewards", "Completions pay 2× total return; misses recycle straight back into the economy."],
                ["Singularity pool", "A bonus pool seeds rare windfalls that keep players coming back for one more hunt."],
                ["Partner perks", "Event pools, booth unlocks, and sponsored missions turn $SKR into the currency of the conference floor."],
              ].map(([h, p], i) => (
              <div className="reveal card" style={rd(0.07 * i)} key={h}>
                <h3 style={{ color: "var(--frost)" }}>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9 — PUBLIC GOOD */}
      <section id="public-good" className="slide">
        <div className="wrap split r">
          <div className="reveal hcard" style={{ textAlign: "left" }}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--aqua)" }}>Open source · MIT</div>
            <div className="display" style={{ fontSize: "2.4rem", marginTop: "1rem" }}>Event <span className="grad">Hunt Kit</span></div>
            <p style={{ marginTop: "1rem", color: "var(--muted)", lineHeight: 1.55 }}>
              We don&apos;t just want to run hunts — we want everyone to. The kit lets
              any Solana organizer launch a geofenced, on-chain hunt at their own event
              without rebuilding the hard parts.
            </p>
          </div>
          <div>
            <div className="reveal">
              <p className="kicker">What we give back</p>
              <h2 className="display" style={{ fontSize: "clamp(1.8rem,4.4vw,3.2rem)" }}>
                Fund us once, the ecosystem gets the <span className="grad">primitive</span> forever.
              </h2>
            </div>
            <div className="grid g2 mt">
              {[
                ["Geofenced mission engine", "Drop-in config for venue- and city-scoped mission pools."],
                ["MWA + proof-capture flow", "Reference client for sign-in, capture, and AI validation."],
                ["Prize-pool escrow pattern", "An Anchor pattern for sponsor-funded, trust-minimized payouts."],
                ["Organizer docs + template", "A starter that turns a new event hunt into hours, not months."],
              ].map(([h, p], i) => (
                <div className="reveal frow" style={{ display: "block", ...rd(0.06 * i) }} key={h}>
                  <div className="ft">{h}</div>
                  <div className="fp" style={{ marginTop: "0.3rem" }}>{p}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10 — MILESTONES */}
      <section id="milestones" className="slide">
        <div className="wrap">
          <div className="reveal">
            <p className="kicker">Scope &amp; timeline · 16 weeks</p>
            <h2 className="display">Four milestones. Each one <span className="grad">shippable</span>.</h2>
          </div>
          <div className="grid g4 mt">
            {[
              ["M1 · wk 1–4", "Event Hunt mode", "Geofenced mission pools, organizer config, and sponsor prize-pool escrow."],
              ["M2 · wk 5–8", "Breakpoint go-live", "Live leaderboard and real-time event dashboard, hardened for the Breakpoint floor."],
              ["M3 · wk 9–12", "Event Hunt Kit", "Open-source the SDK, docs, and template — the public good ships."],
              ["M4 · wk 13–16", "Post-Breakpoint circuit", "Switchboard VRF for fair bonuses at scale, then 2–3 more events."],
            ].map(([t, h, p], i) => (
              <div className="reveal card ms" style={rd(0.08 * i)} key={h}>
                <span className="bar" />
                <div className="tnum">{t}</div>
                <h3 style={{ marginTop: "0.8rem" }}>{h}</h3>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11 — BUDGET */}
      <section id="budget" className="slide">
        <div className="wrap split l">
          <div>
            <div className="reveal">
              <p className="kicker">Use of funds</p>
              <h2 className="display">Every dollar tied to a <span className="grad">milestone</span>.</h2>
            </div>
            <div className="reveal table mt" style={rd(0.06)}>
              {[
                ["Engineering — event mode, geofencing, leaderboard, real-time", "$12K"],
                ["Open-source Event Hunt Kit (SDK + docs)", "$4K"],
                ["Switchboard On-Demand VRF integration", "$3K"],
                ["Infra / RPC / Redis scaling for event spikes", "$3K"],
                ["On-site activation — Breakpoint pilot, prize-pool seed, partner ops", "$6K"],
                ["Concurrency & security pass for event-scale load", "$2K"],
              ].map(([l, a]) => (
                <div className="tr" key={l}><span className="lbl">{l}</span><span className="amt">{a}</span></div>
              ))}
            </div>
          </div>
          <div className="reveal hcard" style={rd(0.1)}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--aqua)" }}>Requested</div>
            <div className="display grad big" style={{ marginTop: "1rem" }}>
              <span className="grad">$30K</span>
            </div>
            <div style={{ marginTop: "0.5rem", color: "var(--muted)" }}>to ship the reusable event layer</div>
            <p style={{ marginTop: "1.4rem", fontSize: "0.8rem", color: "var(--faint)", lineHeight: 1.55 }}>
              Bootstrapped and live today. This grant is the difference between a great
              app and an ecosystem-wide event layer.
            </p>
          </div>
        </div>
      </section>

      {/* 12 — ASK */}
      <section id="ask" className="slide center">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div className="reveal">
            <p className="kicker">The ask</p>
            <h2 className="display glow" style={{ fontSize: "clamp(2.6rem,7vw,5rem)" }}>
              Fund the <span className="grad animate">hunt</span>.
            </h2>
          </div>
          <p className="reveal lead" style={{ maxWidth: 620, marginInline: "auto", ...rd(0.1) }}>
            Seek is live, winning, and shipped by one builder. A $30K grant turns
            a proven dApp Store app into the on-chain game that makes Breakpoint
            playable first, then gives partners a Pokemon Go-level co-marketing
            solution for ecosystem rooms of any size. We open-source the kit so
            any organizer can run one.
          </p>
          <div className="reveal chips mt" style={rd(0.2)}>
            <span className="chip hot">seek.mythx.art</span>
            <span className="chip">app.seek.mobile · dApp Store</span>
            <span className="chip">Built on Solana Mobile Stack</span>
          </div>
        </div>
      </section>

      <footer className="gp-foot">
        <div className="grad" style={{ fontWeight: 900, letterSpacing: "0.2em", fontSize: "1.3rem" }}>SEEK</div>
        <div className="sm">scavenger hunts on Solana</div>
      </footer>
    </div>
  );
}
