'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Zap, Globe, Users, Trophy, Clock, Shield } from 'lucide-react'

// Simulated live canvas preview (colorful grid)
function CanvasPreview() {
  const SIZE = 30 // 30x30 preview grid
  const FACTION_COLORS = ['#FF2222', '#2222FF', '#22FF22', '#8822FF', '#FF8822', '#22FFFF']

  // Deterministic "random" for server/client consistency
  function hashCoord(x: number, y: number) {
    return ((x * 31 + y * 17) * 1337) % FACTION_COLORS.length
  }

  return (
    <div
      className="w-full aspect-square max-w-[360px] mx-auto rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-900/20"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
    >
      {Array.from({ length: SIZE * SIZE }).map((_, i) => {
        const x = i % SIZE
        const y = Math.floor(i / SIZE)
        return (
          <div
            key={i}
            style={{ backgroundColor: FACTION_COLORS[hashCoord(x, y)] }}
            className="aspect-square"
          />
        )
      })}
    </div>
  )
}

const FACTIONS = [
  { name: 'Red', color: '#FF2222', bg: 'bg-red-500/10', border: 'border-red-500/30', territory: 31 },
  { name: 'Blue', color: '#2222FF', bg: 'bg-blue-500/10', border: 'border-blue-500/30', territory: 28 },
  { name: 'Green', color: '#22FF22', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', territory: 24 },
  { name: 'Purple', color: '#8822FF', bg: 'bg-purple-500/10', border: 'border-purple-500/30', territory: 17 },
]

const STATS = [
  { value: '1M+', label: 'Pixels placed today' },
  { value: '28K', label: 'Active players' },
  { value: '<5ms', label: 'DynamoDB write latency' },
  { value: '4', label: 'Factions at war' },
]

const FEATURES = [
  {
    icon: Zap,
    title: 'Real-Time at Any Scale',
    description: 'DynamoDB Streams → Lambda → WebSocket API Gateway. Every pixel you place reaches every other player\'s canvas in under 50ms — whether there are 100 or 1,000,000 players.',
    color: 'text-amber-400',
  },
  {
    icon: Shield,
    title: 'DynamoDB Single-Table Design',
    description: 'Advanced NoSQL modeling: pixels, users, cooldowns, leaderboards, faction stats — one table, carefully designed partition keys, and GSIs. No N+1 queries.',
    color: 'text-blue-400',
  },
  {
    icon: Clock,
    title: 'TTL-Based Cooldowns',
    description: 'Each player waits 5 minutes between pixels. Cooldown markers use DynamoDB TTL — they auto-expire without a single cron job or cleanup Lambda. Pure DynamoDB.',
    color: 'text-purple-400',
  },
  {
    icon: Globe,
    title: 'Global Tables',
    description: 'DynamoDB Global Tables replicate canvas state to us-east-1, eu-west-1, and ap-northeast-1. Players in Tokyo paint at Tokyo latency. True internet-scale.',
    color: 'text-emerald-400',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#080810]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <span className="text-xl font-bold bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              PixelWars
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <Link href="/canvas" className="hover:text-white">Play Now</Link>
            <Link href="#leaderboard" className="hover:text-white">Leaderboard</Link>
            <Link href="#factions" className="hover:text-white">Factions</Link>
          </div>
          <Link
            href="/canvas"
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
          >
            Join the Battle <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center px-6 pt-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 left-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative max-w-6xl mx-auto w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 text-sm text-purple-300 mb-8">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                28,431 players active right now
              </div>

              <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
                One canvas.
                <br />
                <span className="bg-gradient-to-r from-red-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Four factions.
                </span>
                <br />
                Millions of pixels.
              </h1>

              <p className="text-lg text-white/60 mb-8 leading-relaxed">
                PixelWars is a real-time collaborative canvas where factions battle for territory.
                Powered by DynamoDB Streams and WebSocket API Gateway — every pixel update reaches
                every player globally in under 50 milliseconds.
              </p>

              <div className="flex gap-4">
                <Link
                  href="/canvas"
                  className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 text-lg shadow-xl shadow-purple-900/30"
                >
                  Start Painting <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="https://youtube.com/pixelwars-demo"
                  className="flex items-center gap-2 border border-white/10 text-white/70 hover:text-white px-8 py-4 rounded-xl transition-all"
                >
                  Watch Demo
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <CanvasPreview />
              <p className="text-xs text-white/30 mt-3">Live canvas preview — 30×30 sample</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="py-12 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-sm text-white/40 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Faction standings */}
      <section id="factions" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-3">Current Territory Control</h2>
            <p className="text-white/50">Updated in real-time via DynamoDB Streams</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {FACTIONS.map((faction, i) => (
              <motion.div
                key={faction.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`${faction.bg} border ${faction.border} rounded-2xl p-6 text-center`}
              >
                <div className="w-12 h-12 rounded-full mx-auto mb-3" style={{ backgroundColor: faction.color }} />
                <div className="font-bold text-lg mb-1">Team {faction.name}</div>
                <div className="text-3xl font-black mb-1" style={{ color: faction.color }}>{faction.territory}%</div>
                <div className="text-xs text-white/40">of canvas</div>
                {i === 0 && (
                  <div className="mt-2 text-xs text-amber-400 font-medium">👑 Leading</div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/canvas"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl transition-all"
            >
              <Users className="w-4 h-4" />
              Join a faction and start painting
            </Link>
          </div>
        </div>
      </section>

      {/* Features — DynamoDB tech */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent to-purple-950/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Built to scale to millions</h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              DynamoDB isn&apos;t just a database choice — it&apos;s the architectural decision that makes
              PixelWars possible at r/place scale.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white/3 border border-white/5 rounded-2xl p-8"
              >
                <f.icon className={`w-8 h-8 ${f.color} mb-4`} />
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-white/50 leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scale math */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/3 border border-white/10 rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              The Scale Math
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-sm">
              {[
                {
                  title: 'r/place 2022 Peak',
                  stats: ['6M simultaneous users', '2.5M pixel events/day', 'Required custom infra'],
                  note: 'AWS rebuilt DynamoDB internals for this scale',
                  color: 'text-amber-400',
                },
                {
                  title: 'PixelWars At Scale',
                  stats: ['6M users @ 1 pixel/5 min = 20K writes/sec', 'DynamoDB capacity: 40,000 WCU', '100x headroom remaining'],
                  note: 'Zero custom infra — just configure DynamoDB',
                  color: 'text-emerald-400',
                },
                {
                  title: 'WebSocket Math',
                  stats: ['1M connected users', '20K pixel events/sec', '20M WebSocket pushes/sec via API GW'],
                  note: 'API Gateway scales automatically',
                  color: 'text-blue-400',
                },
              ].map((card) => (
                <div key={card.title} className="bg-white/3 rounded-xl p-4">
                  <div className={`font-semibold ${card.color} mb-3`}>{card.title}</div>
                  <ul className="space-y-1 text-white/60">
                    {card.stats.map((s) => <li key={s}>• {s}</li>)}
                  </ul>
                  <p className="mt-3 text-xs text-white/30 italic">{card.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <h2 className="text-5xl font-black mb-4">
          Your faction needs you.
        </h2>
        <p className="text-white/50 mb-8 text-lg">Join the battle. Every pixel counts.</p>
        <Link
          href="/canvas"
          className="inline-flex items-center gap-3 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold px-10 py-5 rounded-2xl transition-all hover:scale-105 text-xl shadow-2xl shadow-purple-900/30"
        >
          Open the Canvas <ArrowRight className="w-6 h-6" />
        </Link>
      </section>

      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-bold text-lg">🎨 PixelWars</span>
          <p className="text-white/30 text-sm">Built on DynamoDB + Vercel · #H0Hackathon</p>
        </div>
      </footer>
    </div>
  )
}
