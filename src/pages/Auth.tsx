import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, Lock, LogIn, Eye, EyeOff, Mail, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import gtsLogo from '@/assets/gts-logo-white.png';
import gtsLogoColor from '@/assets/gts-logo-color.png';
import travelBg from '@/assets/login-travel-bg.jpg';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const checkRateLimit = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('login-security', {
        body: { action: 'check_rate_limit', email },
      });
      if (error) return { allowed: true, attempts_remaining: null };
      return data;
    } catch {
      return { allowed: true, attempts_remaining: null };
    }
  };

  const recordAttempt = async (email: string, success: boolean, userId?: string) => {
    try {
      await supabase.functions.invoke('login-security', {
        body: { action: 'record_attempt', email, ip_address: 'client', user_agent: navigator.userAgent, user_id: userId },
        headers: { 'x-login-success': success.toString() },
      });
    } catch { /* silent */ }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockoutMessage(null);
    const validation = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!validation.success) { toast.error(validation.error.errors[0].message); return; }

    setIsLoading(true);
    const rateCheck = await checkRateLimit(loginEmail);
    if (!rateCheck.allowed) { setIsLoading(false); setLockoutMessage(rateCheck.message || 'Too many failed attempts.'); return; }

    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      await recordAttempt(loginEmail, false);
      const remaining = (rateCheck.attempts_remaining ?? 5) - 1;
      setAttemptsRemaining(remaining);
      if (remaining <= 0) setLockoutMessage('Account locked. Try again in 30 minutes.');
      toast.error(error.message === 'Invalid login credentials' ? `Invalid email or password.${remaining > 0 ? ` ${remaining} attempts remaining.` : ''}` : error.message);
    } else {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await recordAttempt(loginEmail, true, currentUser?.id);
      setAttemptsRemaining(null);
      toast.success('Welcome back!');
      navigate('/');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-end">
      {/* Full-bleed background */}
      <img src={travelBg} alt="" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
      <div className="absolute inset-0 bg-black/30" />

      {/* Logo top-left on the photo */}
      <div className="absolute top-3 left-6 z-10">
        <img src={gtsLogo} alt="GTS Booking" className="h-40 lg:h-48 w-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]" />
      </div>

      {/* Left text overlay - Enhanced Premium UI */}
      <div className="absolute left-10 lg:left-16 top-[28%] z-10 max-w-2xl">
        <h1 className="text-6xl sm:text-7xl xl:text-8xl font-bold font-heading text-white tracking-tighter leading-[1.05] animate-fade-up" style={{ textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
          Explore the <br />
          <span className="relative inline-block mt-2">
            {/* Animated glow behind text */}
            <span className="absolute -inset-4 bg-gradient-to-r from-violet-600 to-cyan-500 blur-2xl opacity-40 animate-pulse" />
            <span className="relative bg-gradient-to-r from-violet-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent pb-2 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.2)' }}>
              world
            </span>
          </span>
        </h1>
        
        <div className="mt-8 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 text-white/90 text-lg md:text-xl font-light shadow-2xl">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]"></span>
            </span>
            <span className="tracking-wide">Your complete travel management platform</span>
          </div>
          
          <div className="flex items-center gap-6 mt-6 ml-2">
            {['Flights', 'Hotels', 'Group Packages'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-white/70 text-sm tracking-widest uppercase font-medium">
                <span className="h-px w-6 bg-white/20" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute left-10 bottom-6 z-10">
        <p className="text-xs text-white/40">© {new Date().getFullYear()} GTS Booking · All rights reserved</p>
      </div>

      {/* Compact floating login card */}
      <div className="relative z-10 w-full max-w-[440px] mr-8 lg:mr-16 my-8">
        <div className="bg-white/90 dark:bg-[hsl(231,30%,12%)]/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 lg:p-10">

          <div className="space-y-1.5 mb-6">
            <h2 className="text-3xl font-bold font-heading text-foreground">Sign In</h2>
            <p className="text-muted-foreground text-sm">Welcome back to GTS Booking</p>
            <div className="h-1 w-10 rounded-full mt-2" style={{ background: 'linear-gradient(90deg, hsl(5,45%,42%), hsl(210,70%,45%))' }} />
          </div>

          {/* Lockout */}
          {lockoutMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 mb-4">
              <Lock className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{lockoutMessage}</p>
            </div>
          )}

          {attemptsRemaining !== null && attemptsRemaining > 0 && attemptsRemaining <= 3 && !lockoutMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-300">{attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining.</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input
                type="email"
                placeholder="Email address"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="h-12 rounded-xl bg-white/60 dark:bg-white/10 border-border/40 text-foreground placeholder:text-muted-foreground/50 text-sm pl-11 pr-5 focus-visible:ring-primary/30"
                required
                disabled={!!lockoutMessage}
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="h-12 rounded-xl bg-white/60 dark:bg-white/10 border-border/40 text-foreground placeholder:text-muted-foreground/50 text-sm pl-11 pr-11 focus-visible:ring-primary/30"
                required
                disabled={!!lockoutMessage}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex justify-start">
              <button type="button" className="text-xs text-[hsl(210,70%,45%)] hover:text-[hsl(210,70%,35%)] font-semibold transition-colors">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !!lockoutMessage}
              className="w-full h-12 rounded-xl text-sm font-bold tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 text-white"
              style={{
                background: 'linear-gradient(135deg, hsl(5,45%,42%) 0%, hsl(210,70%,45%) 100%)',
              }}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
              ) : (
                <><LogIn className="mr-2 h-4 w-4" />Sign In</>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground/50 text-center mt-6">Need access? Contact administrator</p>
        </div>
      </div>
    </div>
  );
}
