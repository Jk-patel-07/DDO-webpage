import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff, 
  User, 
  Layers, 
  Award, 
  BookOpen, 
  ArrowLeft, 
  Timer, 
  RefreshCw,
  Flame,
  Binary,
  Compass,
  Database,
  ArrowRightLeft
} from 'lucide-react';
import { AppState, STUDENT_PROFILES, StudentTier, ThemePreset } from './types';
import MathParticles from './components/MathParticles';
import Mascot from './components/Mascot';

// Custom lightweight Web Audio synthesizer for premium futuristic sound response
class ScienceSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Lazy initialized to prevent browser constraints on page load
  }

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public playBoop(freq: number = 780, type: OscillatorType = 'sine', duration: number = 0.12) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      // Pitch envelope sweep for space telemetry vibe
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + duration);

      gainNode.gain.setValueAtTime(0.08, this.ctx.currentTime); // low elegant volume
      gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio context may be suspended or blocked
    }
  }

  public playAscent() {
    if (!this.enabled) return;
    this.playBoop(440, 'sine', 0.2);
    setTimeout(() => this.playBoop(659.25, 'sine', 0.18), 80);
    setTimeout(() => this.playBoop(880, 'sine', 0.25), 160);
  }

  public playAction() {
    if (!this.enabled) return;
    this.playBoop(380, 'triangle', 0.08);
    setTimeout(() => this.playBoop(520, 'sine', 0.1), 50);
  }
}

const synth = new ScienceSynth();

export default function App() {
  const [appState, setAppState] = useState<AppState>('splash');
  const [themePreset, setThemePreset] = useState<ThemePreset>('gemini-cyan');
  
  // Splash sequence stats
  const [splashProgress, setSplashProgress] = useState(0);
  const splashDurationSeconds = 10;
  const progressIntervalMs = 100;
  
  // Forms & Interactive states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | 'none'>('none');
  const [activeTier, setActiveTier] = useState<StudentTier>('jee');
  const [isMuted, setIsMuted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginStep, setLoginStep] = useState<'idle' | 'success'>('idle');
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);

  // Math Quest Minigame Playground states
  const [userMathAnswer, setUserMathAnswer] = useState('');
  const [mathFeedback, setMathFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Trigger sounds on state change
  const toggleMute = () => {
    synth.enabled = !synth.enabled;
    setIsMuted(!synth.enabled);
    if (synth.enabled) {
      synth.playBoop(600, 'sine', 0.15);
    }
  };

  // Splash countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (appState === 'splash') {
      const incrementStep = (progressIntervalMs / (splashDurationSeconds * 1000)) * 100;
      timer = setInterval(() => {
        setSplashProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            // Initiate transition safely
            synth.playAscent();
            setAppState('login');
            return 100;
          }
          return prev + incrementStep;
        });
      }, progressIntervalMs);
    }
    return () => clearInterval(timer);
  }, [appState]);

  // Restart splash animation (for testing/demonstrating)
  const handleRestartSplash = () => {
    synth.playAction();
    setSplashProgress(0);
    setAppState('splash');
  };

  // Quick bypass of current loading state
  const handleSkipSplash = () => {
    synth.playAscent();
    setSplashProgress(100);
    setAppState('login');
  };

  // Handles form interaction feedback
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      synth.playBoop(220, 'triangle', 0.3);
      alert('Please fill in the demo credentials!');
      return;
    }
    
    synth.playAction();
    setIsSubmitting(true);
    
    // Simulate high tech auth analysis with Almsy
    setTimeout(() => {
      setIsSubmitting(false);
      setLoginStep('success');
      setLoggedInUser(email.split('@')[0]);
      synth.playAscent();
      
      // Transition to game hub
      setTimeout(() => {
        setAppState('dashboard');
      }, 1500);
    }, 2000);
  };

  // Math Quest evaluator in dashboard
  const handleCheckQuest = (e: React.FormEvent, correctValue: string) => {
    e.preventDefault();
    if (userMathAnswer.trim() === correctValue) {
      setMathFeedback('correct');
      synth.playAscent();
    } else {
      setMathFeedback('wrong');
      synth.playBoop(260, 'triangle', 0.35);
      setTimeout(() => setMathFeedback('idle'), 2000);
    }
  };

  // Simulated instant sign up
  const handleQuickSignup = () => {
    synth.playAction();
    setEmail('aspirant_alms@edu.in');
    setPassword('quantumMath101');
    setFocusedField('none');
  };

  // Active greeting calculations corresponding to grade levels
  const currentProfile = STUDENT_PROFILES.find(p => p.id === activeTier) || STUDENT_PROFILES[1];

  // Grade/Tier math challenge setup
  const getChallengeQuestion = (): { q: string; ans: string; tip: string } => {
    switch(activeTier) {
      case 'junior':
        return { q: 'Solve of quadratic: x² - 5x + 6 = 0. Find the largest real root x.', ans: '3', tip: 'Factorizes to (x-2)(x-3) = 0' };
      case 'jee':
        return { q: 'Find value of: ∫₀¹ 3x² dx', ans: '1', tip: 'Integral is x³, evaluate from 0 to 1' };
      case 'college':
        return { q: 'Dimension of Span({[1,0,1], [0,1,0], [2,0,2]}) is:', ans: '2', tip: 'First and third vectors are linearly dependent!' };
    }
  };

  const challenge = getChallengeQuestion();

  return (
    <div 
      className="min-h-screen relative flex flex-col justify-between font-sans text-slate-800 transition-all duration-1000 select-none overflow-x-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #cffafe 100%)' }}
    >
      
      {/* Absolute Dynamic Particle canvas drifting backward */}
      <MathParticles />

      {/* Underlaying Blurry Glow Blobs from design theme */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-cyan-300/30 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[15%] w-[300px] h-[300px] bg-indigo-200/40 rounded-full blur-[80px] pointer-events-none"></div>

      {/* Modern Top Utilities Bar */}
      <header className="relative z-50 flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
        {/* Soft Branding Logo */}
        <div 
          onClick={handleRestartSplash}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-500 p-0.5 shadow-[0_4px_12px_rgba(6,182,212,0.25)] group-hover:scale-105 transition-all duration-300">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center font-display font-medium text-white text-base">
              ∑
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-lg tracking-tight bg-slate-900 bg-clip-text text-transparent">
                Alms Maths
              </span>
              <span className="px-1.5 py-0.5 text-[8px] font-mono tracking-widest bg-cyan-100 text-cyan-700 border border-cyan-200 rounded">
                v2.6
              </span>
            </div>
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block -mt-1">
              Math Learning Engine
            </span>
          </div>
        </div>

        {/* Floating Utilities */}
        <div className="flex items-center gap-3">
          {/* Quick theme selector */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/70 backdrop-blur border border-slate-200/50 rounded-full text-xs">
            <span className="text-slate-500 font-medium">Visual Node:</span>
            <div className="flex items-center gap-1">
              {(['gemini-cyan', 'twilight-blue', 'cosmic-aurora'] as ThemePreset[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setThemePreset(t);
                    synth.playAction();
                  }}
                  className={`w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 ${
                    t === 'gemini-cyan' ? 'bg-cyan-500' :
                    t === 'twilight-blue' ? 'bg-sky-600' : 'bg-purple-500'
                  } ${themePreset === t ? 'ring-2 ring-slate-800 ring-offset-1 scale-110' : 'opacity-70'}`}
                  title={`Switch theme: ${t}`}
                />
              ))}
            </div>
          </div>

          {/* Sound Synthesizer toggler */}
          <button
            onClick={toggleMute}
            className="p-2 bg-white/80 hover:bg-white rounded-xl border border-slate-200/60 shadow-sm transition-all hover:scale-105 active:scale-95 text-slate-600 flex items-center justify-center"
            title={isMuted ? 'Unmute space sound synthesizers' : 'Mute sound FX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500 animate-pulse" /> : <Volume2 className="w-4 h-4 text-cyan-600" />}
          </button>

          {/* Interactive Screen Manual Switcher */}
          <div className="flex items-center p-0.5 bg-slate-900/10 rounded-xl border border-slate-200">
            <button
              onClick={() => {
                synth.playAction();
                setAppState('splash');
              }}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                appState === 'splash' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Splash
            </button>
            <button
              onClick={() => {
                synth.playAscent();
                setAppState('login');
              }}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                appState === 'login' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Login
            </button>
          </div>
        </div>
      </header>

      {/* Central Screen Stage */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 py-8">
        <AnimatePresence mode="wait">
          
          {/* ================= SPLASH SCREEN ================= */}
          {appState === 'splash' && (
            <motion.div
              key="splash-screen"
              initial={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.04, filter: 'blur(15px)' }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="w-full max-w-lg flex flex-col items-center"
            >
              {/* Outer soft glowing halo container */}
              <div id="splash_glow_container" className="relative w-80 h-80 flex items-center justify-center mb-6">
                
                {/* Gemini AI Wave / Pulse background layers  */}
                <motion.div 
                  className={`absolute inset-4 rounded-full filter blur-xl opacity-60 mix-blend-screen transition-all duration-1000 ${
                    themePreset === 'gemini-cyan' ? 'bg-gradient-to-r from-cyan-400 to-indigo-500' :
                    themePreset === 'twilight-blue' ? 'bg-gradient-to-r from-sky-400 to-blue-600' :
                    'bg-gradient-to-r from-purple-500 to-pink-500'
                  }`}
                  animate={{
                    scale: [1, 1.22, 1],
                    rotate: [0, 180, 360],
                    borderRadius: ["42% 58% 70% 30% / 45% 45% 55% 55%", "70% 30% 52% 48% / 60% 40% 60% 40%", "42% 58% 70% 30% / 45% 45% 55% 55%"]
                  }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />

                <motion.div 
                  className={`absolute inset-10 rounded-full filter blur-lg opacity-40 mix-blend-screen transition-all duration-1000 ${
                    themePreset === 'gemini-cyan' ? 'bg-gradient-to-tr from-teal-400 to-cyan-500' :
                    themePreset === 'twilight-blue' ? 'bg-gradient-to-tr from-sky-300 to-indigo-500' :
                    'bg-gradient-to-tr from-fuchsia-400 to-purple-600'
                  }`}
                  animate={{
                    scale: [1.15, 0.9, 1.15],
                    rotate: [360, 180, 0],
                    borderRadius: ["50% 50% 30% 70% / 50% 60% 40% 50%", "30% 70% 70% 30% / 50% 30% 70% 50%", "50% 50% 30% 70% / 50% 60% 40% 50%"]
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />

                {/* Pulsing circular outlines representing orbital mechanics */}
                <motion.div 
                  className="absolute w-64 h-64 rounded-full border border-white/20 flex items-center justify-center glow-box-cyan"
                  animate={{ scale: [0.93, 1.07, 0.93] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="w-56 h-56 rounded-full border border-cyan-400/30 border-dashed animate-spin" style={{ animationDuration: '40s' }} />
                </motion.div>

                {/* High contrast center sphere - Gemini Core */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 1 }}
                  className="absolute z-10 w-44 h-44 rounded-full bg-slate-900/90 backdrop-blur-md border border-white/30 flex flex-col items-center justify-center shadow-[0_10px_35px_rgba(0,0,0,0.4)]"
                >
                  {/* Floating light ray inside */}
                  <div className="absolute top-1 left-4 w-6 h-6 rounded-full bg-cyan-400/30 filter blur-sm animate-pulse" />
                  
                  {/* Core logo icon assembly */}
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative text-5xl font-mono text-cyan-300 font-extrabold filter drop-shadow-[0_0_12px_rgba(34,211,238,0.8)] glow-cyan"
                  >
                    ∑
                    {/* Glowing secondary particle orbital */}
                    <div className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 border border-white/40 flex items-center justify-center text-[10px] text-white font-mono shadow-[0_0_8px_#06b6d4]">
                      x²
                    </div>
                  </motion.div>

                  <div className="mt-3 flex flex-col items-center">
                    <span className="font-display font-medium text-[10px] tracking-[0.3em] uppercase text-cyan-400/80">
                      NUCLEUS MODE
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 mt-0.5">
                      ACTIVE QUANTUM
                    </span>
                  </div>
                </motion.div>

                {/* Micro formula chips orbiting around core */}
                <motion.span 
                  className="absolute top-8 right-16 px-2.5 py-1 text-xs font-mono font-bold bg-white/85 text-indigo-900 rounded-full border border-indigo-200 shadow-sm"
                  animate={{ y: [0, -8, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 0.2 }}
                >
                  π ≈ 3.1415
                </motion.span>

                <motion.span 
                  className="absolute bottom-8 left-12 px-2.5 py-1 text-xs font-mono font-bold bg-white/85 text-cyan-900 rounded-full border border-cyan-200 shadow-sm"
                  animate={{ y: [0, 8, 0], scale: [1, 0.95, 1] }}
                  transition={{ duration: 4.5, repeat: Infinity, delay: 0.8 }}
                >
                  ∫ xⁿ dx
                </motion.span>
                
                <motion.span 
                  className="absolute bottom-1/2 -right-10 px-2 py-0.5 text-[11px] font-mono font-bold bg-white/80 text-teal-800 rounded-lg border border-teal-200 shadow-sm"
                  animate={{ x: [0, 6, 0] }}
                  transition={{ duration: 5, repeat: Infinity }}
                >
                  √-1 = i
                </motion.span>
              </div>

              {/* Text Area */}
              <div className="text-center mt-4">
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 filter drop-shadow-sm font-display"
                >
                  Alms Maths
                </motion.h1>

                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.55, duration: 0.6 }}
                  className="text-sm font-semibold tracking-[0.3em] text-blue-500/80 uppercase mt-2 font-display"
                >
                  Powered by DDO
                </motion.p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  transition={{ delay: 0.7 }}
                  className="text-xs text-slate-500 mt-1 max-w-sm px-6 italic"
                >
                  Advanced conceptual algorithms for JEE, Board Exams & College Math
                </motion.p>
              </div>

              {/* Loader with Countdown */}
              <div className="w-64 max-w-xs mt-8 bg-slate-900/5 p-1 rounded-full border border-slate-900/10 backdrop-blur relative">
                {/* Visual loading strip */}
                <motion.div 
                  className="h-2 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                  animate={{ width: `${splashProgress}%` }}
                  transition={{ ease: 'linear' }}
                />

                {/* Progress numeric metrics */}
                <div className="absolute right-3 -bottom-6 text-[10px] font-mono font-medium text-slate-500 flex items-center gap-1">
                  <Timer className="w-3 h-3 text-cyan-500 animate-pulse" />
                  <span>Loading Matrix: {Math.min(Math.round(splashProgress), 100)}%</span>
                </div>

                <div className="absolute left-3 -bottom-6 text-[10px] font-mono font-medium text-slate-500 flex items-center gap-1">
                  <span>{(10 - (splashProgress / 10)).toFixed(1)}s left</span>
                </div>
              </div>

              {/* Action controller for active previewing */}
              <div className="flex items-center gap-4 mt-12">
                <button
                  onClick={handleRestartSplash}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white/70 hover:bg-white border border-slate-300/60 rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-600" />
                  Replay 10s Screen
                </button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSkipSplash}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  Bypass System Intro
                  <ArrowRight className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ================= LOGIN SCREEN ================= */}
          {appState === 'login' && (
            <motion.div
              key="login-screen"
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.05, filter: 'blur(10px)' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center justify-center p-2"
            >
              
              {/* Desktop Left Decorative Column: Core Mascot Intro & Target Profiles */}
              <div className="col-span-1 md:col-span-5 flex flex-col justify-center items-center md:items-start text-center md:text-left gap-4">
                
                {/* Reacting digital mascot box */}
                <div className="w-full bg-white/40 backdrop-blur-lg border border-white/60 rounded-3xl p-6 shadow-[0_15px_30px_rgba(0,0,0,0.05)] flex items-center justify-center relative group min-h-[220px]">
                  <div className="absolute top-3 right-3 text-[9px] font-mono px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-md border border-cyan-200 uppercase tracking-wider">
                    Interactive Bot
                  </div>
                  <Mascot activeInput={focusedField} isSubmitting={isSubmitting} themePreset={themePreset} />
                </div>

                {/* Audience Switcher Info Header */}
                <div className="w-full">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Choose Curriculum</span>
                    <span className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" /> Custom Quest Adaptive
                    </span>
                  </div>

                  {/* Curriculums pills selector */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-100/80 backdrop-blur-sm p-1 rounded-2xl border border-slate-200">
                    {STUDENT_PROFILES.map((prof) => (
                      <button
                        key={prof.id}
                        onClick={() => {
                          setActiveTier(prof.id);
                          synth.playAction();
                        }}
                        className={`py-2 text-xs font-bold rounded-xl transition-all ${
                          activeTier === prof.id
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/20'
                        }`}
                      >
                        {prof.id === 'junior' && '8th-10th'}
                        {prof.id === 'jee' && 'JEE Goal'}
                        {prof.id === 'college' && 'University'}
                      </button>
                    ))}
                  </div>

                  {/* Dynamically active grade summary card with beautiful neon border indicator */}
                  <motion.div 
                    layoutId="audience-details"
                    className="mt-3 p-4 bg-slate-900 text-slate-100 rounded-2xl border-l-4 border-cyan-400 shadow-lg"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest bg-cyan-500/20 text-cyan-300 rounded uppercase font-bold">
                        {currentProfile.badge}
                      </span>
                      <h4 className="text-sm font-display font-semibold">{currentProfile.label}</h4>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 lines-clamp-2 leading-relaxed">
                      {currentProfile.desc}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {currentProfile.targetTopics.map((topic, i) => (
                        <span key={i} className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-cyan-200 border border-slate-700">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Login Form Core Glassmorphic Card */}
              <div className="col-span-1 md:col-span-7">
                <motion.div
                  className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[40px] p-8 sm:p-10 relative overflow-hidden"
                  layoutId="login-card"
                >
                  {/* Subtle decorative theme lights behind card */}
                  <div className="absolute top-[-10%] left-[-10%] w-[150px] h-[150px] bg-cyan-300/20 rounded-full blur-[40px] pointer-events-none" />
                  <div className="absolute bottom-[-10%] right-[-10%] w-[150px] h-[150px] bg-blue-400/20 rounded-full blur-[40px] pointer-events-none" />

                  {/* Card Hub Title */}
                  <div className="mb-8 relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-display font-black text-slate-900 tracking-tight flex items-center gap-2">
                      Access Alms Arcade
                      <span className="inline-block animate-bounce text-lg">🚀</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter credentials to test standard authentication & active AI assistant behaviors.
                    </p>
                  </div>

                  {/* Main Form content */}
                  <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10">
                    
                    {/* Username/Email Input with clear state reactive updates for Mascot */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 ml-1">
                        Student ID / Email
                      </label>
                      <div className={`relative rounded-2xl border transition-all duration-300 flex items-center ${
                        focusedField === 'email' 
                          ? 'ring-2 ring-cyan-400 bg-white border-white/95 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
                          : 'border-white/80 bg-white/50 hover:bg-white/60'
                      }`}>
                        <span className="absolute left-4 text-slate-400 flex items-center">
                          <Mail className="w-5 h-5 text-cyan-500" />
                        </span>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => {
                            setFocusedField('email');
                            synth.playBoop(500, 'sine', 0.08);
                          }}
                          onBlur={() => setFocusedField('none')}
                          placeholder="your_handle@almsmaths.com"
                          className="w-full pl-12 pr-4 py-4 text-sm focus:outline-none bg-transparent text-slate-800 placeholder-slate-400"
                        />
                        {email && (
                          <span className="absolute right-4 text-[10px] text-teal-600 font-mono flex items-center gap-0.5 pointer-events-none">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" /> ID Ready
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Password Input with interactive toggle of shyness details for Mascot */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5 ml-1">
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest">
                          Matrix Key / Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            synth.playAction();
                            setShowPassword(!showPassword);
                          }}
                          className="text-[11px] font-semibold text-blue-500/90 hover:text-blue-700 flex items-center gap-1 focus:none cursor-pointer"
                        >
                          {showPassword ? (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-cyan-600" /> Hide Key
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-indigo-600" /> Reveal Key
                            </>
                          )}
                        </button>
                      </div>
                      
                      <div className={`relative rounded-2xl border transition-all duration-300 flex items-center ${
                        focusedField === 'password'
                          ? 'ring-2 ring-indigo-400 bg-white border-white/95 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                          : 'border-white/80 bg-white/50 hover:bg-white/60'
                      }`}>
                        <span className="absolute left-4 text-slate-400 flex items-center">
                          <Lock className="w-5 h-5 text-indigo-500" />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => {
                            setFocusedField('password');
                            synth.playBoop(400, 'triangle', 0.1);
                          }}
                          onBlur={() => setFocusedField('none')}
                          placeholder="••••••••••••••"
                          className="w-full pl-12 pr-4 py-4 text-sm focus:outline-none bg-transparent text-slate-800 placeholder-slate-400 font-mono"
                        />
                      </div>
                    </div>

                    {/* Demo credential helper triggers (Outstanding quality to allow 1-click test) */}
                    <div className="flex flex-wrap items-center justify-between p-3.5 bg-sky-50/40 rounded-2xl border border-sky-150/40 gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1.5 rounded-xl bg-sky-100/60 text-sky-700">
                          <User className="w-4 h-4 text-cyan-600" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-bold tracking-wider">Fast sandbox test</span>
                          <span className="text-[10px] font-mono text-cyan-900 font-bold block">aspirant_alms@edu.in</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleQuickSignup}
                        className="px-3.5 py-1.5 text-[10px] font-bold text-slate-700 bg-white/80 hover:bg-slate-900 hover:text-white rounded-xl shadow-sm transition-all border border-slate-200"
                      >
                        Autofill Demo State
                      </button>
                    </div>

                    {/* Action buttons (Login + Register side-by-side) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <motion.button
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 relative cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            Analyzing signature...
                          </>
                        ) : (
                          <>
                            Initiate Arcade Login
                            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1" />
                          </>
                        )}
                      </motion.button>

                      <motion.button
                        type="button"
                        onClick={() => {
                          synth.playBoop(800, 'sine', 0.15);
                          alert('Alms Maths registration sandbox: You can register manually inside the ultimate production build. For testing, choose Autofill and test the real gamified arcade dashboard now!');
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 px-4 bg-white/60 border border-white/80 text-slate-700 font-bold rounded-2xl hover:bg-white/80 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        Request New ID
                      </motion.button>
                    </div>

                    {/* Custom Continue with Google Button */}
                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-4 text-slate-400 font-mono text-[9px] uppercase tracking-widest font-semibold">
                        Or login externally
                      </span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => {
                        synth.playAscent();
                        setEmail('google_student@gmail.com');
                        setPassword('securePassword123');
                        setLoginStep('success');
                        setLoggedInUser('google_student');
                        setTimeout(() => setAppState('dashboard'), 1500);
                      }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full py-4 bg-white/60 border border-white/80 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-3 hover:bg-white/80 transition-all shadow-sm text-sm cursor-pointer"
                    >
                      {/* Simple custom colored Google icon */}
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.68 14.9 1 12 1 7.35 1 3.37 3.68 1.48 7.58l3.75 2.91C6.11 7.53 8.84 5.04 12 5.04z" />
                        <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.58-.2-2.33H12v4.51h6.47c-.29 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.4-4.92 3.4-8.63z" />
                        <path fill="#FBBC05" d="M5.23 10.49c-.23-.68-.36-1.42-.36-2.19 0-.77.13-1.51.36-2.19L1.48 7.58c-.97 1.95-1.48 4.14-1.48 6.42s.51 4.47 1.48 6.42l3.75-2.91c-.23-.68-.36-1.42-.36-2.19z" />
                        <path fill="#34A853" d="M12 23c3.24 0 5.96-1.08 7.95-2.93l-3.7-2.87c-1.03.69-2.34 1.1-4.25 1.1-3.16 0-5.89-2.49-6.77-5.45L1.48 15.76C3.37 19.66 7.35 23 12 23z" />
                      </svg>
                      Continue with Google Test Profile
                    </motion.button>
                  </form>
                  
                  {/* Subtle Footer indicator inside the modal */}
                  <div className="mt-8 text-center border-t border-slate-200/50 pt-4">
                    <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                      SECURED END-TO-END VIA ALMS MATRIX GATEWAY
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Theme Footer Branding Banner outside cards */}
              <div className="col-span-1 md:col-span-12 mt-12 flex flex-col items-center gap-2">
                <div className="flex items-center gap-3 py-2 px-4 bg-white/20 backdrop-blur-md rounded-full border border-white/40 shadow-sm animate-pulse">
                  <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                     <span className="text-[10px] text-white font-bold">AI</span>
                  </div>
                  <span className="text-sm font-medium text-slate-600 italic">Learn Maths in a Fun Way</span>
                </div>
                <div className="flex gap-6 mt-4 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                  <span className="text-xs font-black tracking-widest text-slate-700">JEE</span>
                  <span className="text-xs font-black tracking-widest text-slate-700">BOARDS</span>
                  <span className="text-xs font-black tracking-widest text-slate-700">OLYMPIAD</span>
                </div>
              </div>

            </motion.div>
          )}

          {/* ================= EXTRA FEATURE: GAME HUB / DASHBOARD ================= */}
          {appState === 'dashboard' && (
            <motion.div
              key="dashboard-stage"
              initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-5xl flex flex-col gap-6"
            >
              
              {/* Back button */}
              <button
                onClick={() => {
                  synth.playBoop(300, 'sine', 0.1);
                  setAppState('login');
                  setLoginStep('idle');
                }}
                className="self-start px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Login Setup
              </button>

              {/* Dynamic Header */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-700 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 filter blur-3xl rounded-full" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[9px] font-mono tracking-widest bg-cyan-500 text-slate-950 font-bold rounded uppercase">
                        {currentProfile.badge} Arcader
                      </span>
                      <span className="text-xs text-slate-400 font-mono">ID: {loggedInUser || 'Aspirant'}</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display font-black tracking-tight text-white mt-1">
                      Welcome to the Math Matrix Playground
                    </h2>
                    <p className="text-xs text-slate-400 max-w-xl mt-1 leading-relaxed">
                      You are authenticated as the test user. Below is an active mock quest configured specifically for your selection: <span className="text-cyan-400 font-bold font-mono">{currentProfile.label}</span>.
                    </p>
                  </div>

                  {/* Level status indicator */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/80 rounded-2xl border border-slate-700 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center font-mono font-bold text-white text-base">
                      L1
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block uppercase">Game Level</span>
                      <span className="text-xs text-white font-bold block">Matrix Decimator</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid content columns */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Math Interactive Quest Combat card */}
                <div className="col-span-1 md:col-span-8 bg-white/70 backdrop-blur-md rounded-3xl p-6 border border-slate-200/60 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block font-mono">Daily Quest Challenge</span>
                    <div className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                      <Flame className="w-3.5 h-3.5 fill-amber-500 stroke-none" /> Multiplier 2.5x
                    </div>
                  </div>

                  <div className="p-5 bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-2xl border border-slate-700 min-h-[120px] flex flex-col justify-between relative shadow-inner">
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-60">
                      <Binary className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-cyan-300 tracking-wider">ACTIVE PROBLEM STATEMENT:</span>
                      <p className="text-sm font-semibold font-mono tracking-tight text-white mt-1.5 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                        {challenge.q}
                      </p>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-400 italic">
                      💡 Tip: {challenge.tip}
                    </div>
                  </div>

                  {/* Sandbox solving interaction form */}
                  <form onSubmit={(e) => handleCheckQuest(e, challenge.ans)} className="mt-4">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5 ml-1">
                      Enter Numeric Solution Value
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={userMathAnswer}
                        onChange={(e) => {
                          setUserMathAnswer(e.target.value);
                          setMathFeedback('idle');
                        }}
                        placeholder="Your absolute final answer (e.g. 1, 2, or 3)"
                        className="flex-grow py-3 px-4 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono text-slate-800"
                      />
                      <button
                        type="submit"
                        className="py-3 px-6 bg-slate-900 hover:bg-slate-800 text-slate-100 font-bold rounded-xl text-sm transition-all shadow-sm"
                      >
                        Compute Verdict
                      </button>
                    </div>
                  </form>

                  {/* Dynamic Math feedback response */}
                  <div className="mt-3.5 min-h-[25px]">
                    {mathFeedback === 'correct' && (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-xl flex items-center gap-2 font-semibold"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Core Correct! Almsy analyzed your answer as a total mathematical absolute! +150 Points.</span>
                      </motion.div>
                    )}
                    {mathFeedback === 'wrong' && (
                      <motion.span
                        initial={{ x: [-10, 10, -10, 10, 0] }}
                        className="text-xs text-rose-800 bg-rose-50 border border-rose-200 py-2 px-3 rounded-xl flex items-center gap-2 font-semibold block"
                      >
                        ✕ Math Matrix mismatched! Please try factoring or verifying vectors again.
                      </motion.span>
                    )}
                  </div>
                </div>

                {/* Left side details sidebar: Stats, Profile & Leaderboard */}
                <div className="col-span-1 md:col-span-4 flex flex-col gap-4">
                  
                  {/* User Stats Card */}
                  <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-200/60 shadow-lg">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono">User Stats</h3>
                    <div className="divide-y divide-slate-200/50">
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-cyan-600" />
                          Rank XP Points
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900">4,850</span>
                      </div>
                      
                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          Quests Solved
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900">32</span>
                      </div>

                      <div className="py-2.5 flex justify-between items-center">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                          Accuracy
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-600">89.4%</span>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard panel */}
                  <div className="bg-white/70 backdrop-blur-md rounded-2xl p-5 border border-slate-200/60 shadow-lg flex-grow">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 font-mono">Global Leaders</h3>
                    <div className="space-y-2">
                      {[
                        { name: 'MatrixGlider', points: '12,940 XP', tier: 'College' },
                        { name: 'Aspirant_Jay', points: '11,400 XP', tier: 'JEE' },
                        { name: 'LinearThorn', points: '9,820 XP', tier: 'JEE' },
                        { name: 'Pi_Master_88', points: '8,400 XP', tier: '8th-10th' }
                      ].map((lead, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border border-slate-200/20">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-400 w-4 font-bold">#{i+1}</span>
                            <div>
                              <span className="font-medium text-slate-800">{lead.name}</span>
                              <span className="text-[8px] bg-slate-200/80 text-slate-600 px-1 rounded ml-1 tracking-tighter uppercase font-mono">{lead.tier}</span>
                            </div>
                          </div>
                          <span className="font-mono text-cyan-600 font-bold">{lead.points}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
              
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Modern Bottom status and copyright info */}
      <footer className="relative z-30 py-6 border-t border-slate-200/40 text-center w-full max-w-7xl mx-auto px-4 mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono">Live Demo: Alms Maths Arcade Design Simulator</span>
          </div>
          <div>
            <span>© 2026 Alms Maths. All rights reserved. Designed for JEE & college student platforms.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
