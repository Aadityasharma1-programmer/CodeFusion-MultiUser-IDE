import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { Globe } from '../components/ui/Globe'
import { supabase } from '../lib/supabase'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    message: ''
  })
  const [status, setStatus] = useState('idle') // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('')
  const [transmissionState, setTransmissionState] = useState('connected')
  const transmissionTimeoutRef = useRef(null)

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    
    // Dispatch custom event to trigger Earth spin boost in 3D canvas
    window.dispatchEvent(new CustomEvent('globe-pulse'))
    
    // Trigger "transmitting" UI effect
    setTransmissionState('transmitting')
    if (transmissionTimeoutRef.current) clearTimeout(transmissionTimeoutRef.current)
    transmissionTimeoutRef.current = setTimeout(() => {
      setTransmissionState('connected')
    }, 450)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    try {
      const { data, error } = await supabase.functions.invoke('contact-email', {
        body: formData,
      })

      if (error) throw error
      
      setStatus('success')
      setFormData({ fullName: '', email: '', company: '', message: '' })
    } catch (err) {
      console.error('Error submitting form:', err)
      setStatus('error')
      setErrorMessage(err.message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="relative min-h-screen bg-black text-white flex items-center justify-center p-6 sm:p-12 overflow-x-hidden">
      
      {/* Real Space Starry Background */}
      <div className="fixed inset-0 z-0 select-none pointer-events-none w-full h-full bg-black overflow-hidden">
        {/* Deep space base radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.45)_0%,rgba(0,0,0,1)_100%)]" />
        
        {/* Starfield Layer 1 */}
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(1px_1px_at_20px_30px,#fff,transparent),radial-gradient(1px_1px_at_40px_70px,#fff,transparent),radial-gradient(1.5px_1.5px_at_50px_160px,#fff,transparent),radial-gradient(1px_1px_at_80px_120px,#fff,transparent),radial-gradient(1.5px_1.5px_at_110px_210px,#fff,transparent),radial-gradient(1px_1px_at_150px_290px,#fff,transparent)] bg-[size:300px_300px]" />
        
        {/* Starfield Layer 2 */}
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(1.5px_1.5px_at_100px_50px,#fff,transparent),radial-gradient(1px_1px_at_200px_150px,#fff,transparent),radial-gradient(2px_2px_at_250px_220px,#fff,transparent)] bg-[size:400px_400px]" />
        
        {/* Ambient Nebula Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-950/20 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-red-950/20 blur-[130px]" />
      </div>

      {/* Main Grid Content (Floats above the stars background) */}
      <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center relative z-10">
        
        {/* Left Section: Branding, Message & Rotating Earth Globe */}
        <div className="flex flex-col space-y-8 relative z-10 animate-fade-up">
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 text-slate-300 hover:text-white transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)]"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.15)]">
              <Mail className="text-red-500" size={24} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
              <span className="gradient-text">Contact us</span>
            </h1>
            <p className="text-slate-300 max-w-md text-lg leading-relaxed">
              Have questions about Codefusion or need help setting up your collaborative workspace? Contact us and let us know how we can help your team build faster.
            </p>
          </div>

          {/* Interactive Transmission Status */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-2 rounded-full border border-white/5 bg-slate-950/40 backdrop-blur-xl px-4 py-1.5 text-xs font-mono select-none">
              <span className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${transmissionState === 'transmitting' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
              <span className={`font-semibold tracking-wider transition-colors duration-300 ${transmissionState === 'transmitting' ? 'text-red-500' : 'text-slate-400'}`}>
                {transmissionState === 'transmitting' ? 'TRANSMITTING PACKETS...' : 'ORBIT LINK: CONNECTED'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 font-semibold tracking-wider uppercase">
            <span>contact@codefusion.ai</span>
            <span className="text-red-500">•</span>
            <span>support@codefusion.ai</span>
          </div>

          {/* Globe Container (Returned back to the left section) */}
          <div className="w-full h-[380px] mt-4 opacity-75 -ml-12 sm:ml-0 relative z-10">
            <Globe />
          </div>
        </div>

        {/* Right Section: Form Card */}
        <div className="relative animate-scale-in">
          {/* Subtle grid background pattern inside the card */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] rounded-3xl [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
          
          <div className="bg-slate-950/45 backdrop-blur-2xl border border-white/5 p-8 sm:p-10 rounded-3xl relative z-10 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 py-12 text-center animate-fade-in">
                <CheckCircle2 size={48} className="text-emerald-400" />
                <h3 className="text-xl font-bold">Message Sent!</h3>
                <p className="text-slate-300">Thank you for reaching out. We will get back to you shortly.</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-sm font-medium"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === 'error' && (
                  <div className="flex items-start gap-2 rounded-xl border border-coral/40 bg-coral/10 px-4 py-3 text-sm text-coral animate-fade-in">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-semibold text-slate-300">Full name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Manu Arora"
                    className="w-full bg-black/60 border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-slate-300">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="support@aceternity.com"
                    className="w-full bg-black/60 border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="company" className="text-sm font-semibold text-slate-300">Company</label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="Aceternity Labs LLC"
                    className="w-full bg-black/60 border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-semibold text-slate-300">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Type your message here"
                    className="w-full bg-black/60 border border-white/10 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none transition-all resize-y"
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-red-500/30 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? (
                    <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                  ) : (
                    'Submit'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
