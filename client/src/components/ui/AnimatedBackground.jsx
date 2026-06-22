import { Code2, Sparkles, Zap, Users } from 'lucide-react'

export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="mesh-bg absolute inset-0" />

      <div
        className="animate-float absolute -left-20 top-1/4 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }}
      />
      <div
        className="animate-float-reverse absolute -right-16 top-1/3 h-80 w-80 rounded-full opacity-35 blur-3xl"
        style={{ background: 'radial-gradient(circle, #f472b6 0%, transparent 70%)' }}
      />
      <div
        className="animate-pulse-glow absolute bottom-0 left-1/3 h-64 w-64 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }}
      />

      <div className="absolute left-[8%] top-[18%] animate-float opacity-20">
        <Code2 size={32} className="text-cyan" />
      </div>
      <div className="absolute right-[12%] top-[22%] animate-float-reverse opacity-20">
        <Sparkles size={28} className="text-magenta" />
      </div>
      <div className="absolute bottom-[25%] left-[15%] animate-float opacity-15">
        <Zap size={24} className="text-lime" />
      </div>
      <div className="absolute bottom-[30%] right-[18%] animate-float-reverse opacity-15">
        <Users size={26} className="text-violet" />
      </div>
    </div>
  )
}
