import { Code2, ArrowDown, CheckCircle2, ExternalLink } from 'lucide-react'
import { DottedSurface } from './dotted-surface'
import loginVideo from '../../assets/login-visual.mp4'

export default function AuthLayout({ children, subtitle }) {
  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-y-auto scroll-smooth select-none">
      
      {/* Background Layer: Particle Backdrop for the Hero Fold */}
      <div className="absolute top-0 left-0 w-full h-[100vh] overflow-hidden pointer-events-none z-0">
        <DottedSurface className="opacity-40" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full flex flex-col">
        
        {/* Section 1: Hero & Login Card (First Fold) */}
        <div className="min-h-screen w-full flex flex-col lg:flex-row items-center justify-between px-6 md:px-12 lg:px-24 py-12 gap-12">
          
          {/* Left Hero Side */}
          <div className="flex-1 flex flex-col justify-center max-w-xl text-left space-y-6 lg:pr-8">
            {/* Logo */}
            <div className="flex items-center gap-3 animate-fade-up">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10 shadow-[0_0_25px_rgba(34,211,238,0.2)]">
                <Code2 size={24} className="text-cyan" />
              </div>
              <span className="text-3xl font-extrabold tracking-tight">
                <span className="gradient-text">Codefusion</span>
              </span>
            </div>

            {/* Tagline */}
            <div className="space-y-4 animate-fade-up stagger-2">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                The next-gen <br />
                <span className="gradient-text bg-gradient-to-r from-cyan to-magenta">collaborative IDE.</span>
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed">
                Code, run, and collaborate in real-time with your team. Backed by fully integrated AI assistance and cloud sandboxes.
              </p>
            </div>

            {/* Scroll Indicator */}
            <div className="pt-8 flex items-center gap-2 text-xs text-slate-500 font-semibold tracking-wider uppercase animate-bounce mt-4">
              <span>Scroll down to see benefits</span>
              <ArrowDown size={14} />
            </div>
          </div>

          {/* Right Login Form Side */}
          <div className="w-full lg:w-[450px] flex justify-center items-center">
            <div className="w-full glass-panel rounded-2xl p-8 sm:p-10 shadow-2xl border border-white/5 bg-slate-950/40 backdrop-blur-xl animate-scale-in">
              {children}
            </div>
          </div>

        </div>

        {/* Section 2: Benefits & Video Showcase (Second Fold) */}
        <div className="min-h-screen w-full flex flex-col lg:flex-row items-center justify-center px-6 md:px-12 lg:px-24 py-24 bg-black border-t border-slate-900/60 gap-16">
          
          {/* Left Side: Benefits Copy */}
          <div className="flex-1 max-w-xl space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/5 px-3 py-1 text-xs font-semibold text-cyan tracking-wide uppercase">
                Why Codefusion?
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Engineered to speed up your coding cycles
              </h2>
              <p className="text-slate-400 text-base leading-relaxed">
                Traditional setups slow down collaboration. Codefusion provides a unified environment where brainstorming, pair-programming, and deployment run in sync.
              </p>
            </div>

            {/* Benefit Checkpoints */}
            <div className="space-y-5">
              
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-cyan/10 text-cyan border border-cyan/20">
                  <CheckCircle2 size={16} className="text-cyan" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Boost Productivity by 10x</h4>
                  <p className="text-slate-400 text-sm mt-0.5 leading-relaxed">
                    With instant sandbox runtimes, you can test code as you write it. No local compiler setups or configurations required.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-magenta/10 text-magenta border border-magenta/20">
                  <CheckCircle2 size={16} className="text-magenta" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Seamless Pair Programming</h4>
                  <p className="text-slate-400 text-sm mt-0.5 leading-relaxed">
                    Zero conflict real-time multi-user synchronization. Watch your teammates code line-by-line with absolute precision.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet/10 text-violet border border-violet/20">
                  <CheckCircle2 size={16} className="text-violet" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">Contextual AI Co-Pilot</h4>
                  <p className="text-slate-400 text-sm mt-0.5 leading-relaxed">
                    Integrated AI agent instantly identifies bugs, refactors code, generates tests, and explains foreign repos.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Right Side: Clipped Video Showcase without Mockup Box */}
          <div className="flex-1 w-full max-w-2xl flex justify-center items-center">
            <div 
              className="relative w-full overflow-hidden"
              style={{
                clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 100%)'
              }}
            >
              <video
                src={loginVideo}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto block object-contain mix-blend-lighten"
              />
              {/* Radial gradient mask to fade video edges smoothly */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.95)_95%)]" />
              {/* Bottom gradient to blend the clipped edge into background */}
              <div className="absolute bottom-0 left-0 w-full h-1/4 pointer-events-none bg-gradient-to-t from-black to-transparent" />
            </div>
          </div>

        </div>

        {/* Section 3: Premium Footer */}
        <footer className="w-full bg-black border-t border-slate-900/60 py-16 px-6 md:px-12 lg:px-24">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            
            {/* Footer Brand Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan/30 bg-cyan/10">
                  <Code2 size={18} className="text-cyan" />
                </div>
                <span className="text-xl font-extrabold tracking-tight text-white">
                  <span>Codefusion</span>
                </span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                The next-generation collaborative workspace where developers and AI create software together.
              </p>
              {/* Social Icons (using inline SVGs to avoid package version mismatches) */}
              <div className="flex items-center gap-4 pt-2">
                <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors" aria-label="GitHub">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-cyan transition-colors" aria-label="Twitter">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a href="https://discord.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-indigo-400 transition-colors" aria-label="Discord">
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.873-.894.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.011c3.92 1.793 8.18 1.793 12.061 0a.073.073 0 01.078.009c.12.099.246.195.373.289a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Links Column 1: Product */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</h4>
              <ul className="space-y-2.5 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-white transition-colors">Workspace Editor</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">AI Co-pilot</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Code Runner Runtimes</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Pricing Options</a></li>
              </ul>
            </div>

            {/* Links Column 2: Resources */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resources</h4>
              <ul className="space-y-2.5 text-sm text-slate-500">
                <li><a href="/docs" className="hover:text-white transition-colors flex items-center gap-1">Documentation <ExternalLink size={12} /></a></li>
                <li><a href="/tutorials" className="hover:text-white transition-colors">Getting Started Guide</a></li>
                <li><a href="/blog" className="hover:text-white transition-colors">Tech Blog</a></li>
                <li><a href="/status" className="hover:text-white transition-colors">System Status</a></li>
              </ul>
            </div>

            {/* Links Column 3: Company */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Company</h4>
              <ul className="space-y-2.5 text-sm text-slate-500">
                <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security Trust</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>

          </div>

          {/* Bottom Bar */}
          <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-4">
            <div>
              &copy; {new Date().getFullYear()} Codefusion. All rights reserved.
            </div>
            <div className="flex gap-6">
              <a href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</a>
              <a href="/cookies" className="hover:text-slate-400 transition-colors">Cookie Preferences</a>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
