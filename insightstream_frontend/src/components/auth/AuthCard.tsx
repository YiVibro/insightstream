import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Github, Loader2, Mail, Lock, User as UserIcon, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type AuthTab = 'signin' | 'signup';

interface FieldErrors {
  email?: string;
  password?: string;
  name?: string;
}

export default function AuthCard() {
  const navigate = useNavigate();
  const { setSession } = useAuthStore();
  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const validate = (): boolean => {
    const e: FieldErrors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'At least 6 characters';
    if (tab === 'signup' && !name.trim()) e.name = 'Name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (tab === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSession(data.session);
        toast.success('Welcome back');
        navigate('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) {
          setSession(data.session);
          toast.success('Account created');
          navigate('/dashboard');
        } else {
          toast.success('Account created. You can now sign in.');
          setTab('signin');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = async () => {
    setOauthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'GitHub sign-in failed';
      toast.error(msg);
      setOauthLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-primary/30">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Veritas RAG</h1>
          <p className="text-xs text-muted-foreground">Agentic Intelligence Platform</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-xl p-1 shadow-2xl">
        {/* Tab switcher */}
        <div className="relative grid grid-cols-2 gap-1 p-1">
          {(['signin', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setErrors({}); }}
              className={cn(
                'relative z-10 rounded-lg py-2.5 text-sm font-medium transition-colors',
                tab === t ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === t && (
                <motion.div
                  layoutId="authTab"
                  className="absolute inset-0 -z-10 rounded-lg bg-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              {t === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <div className="p-6 pt-4">
          {/* GitHub OAuth */}
          <Button
            variant="outline"
            className="w-full h-11 border-border bg-secondary/50 hover:bg-secondary mb-4"
            onClick={handleGithub}
            disabled={oauthLoading || loading}
          >
            {oauthLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Github className="h-4 w-4" />
            )}
            <span className="ml-2">Continue with GitHub</span>
          </Button>

          <div className="relative mb-4">
            <Separator className="bg-border" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
              or
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {tab === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <FloatingInput
                    icon={<UserIcon className="h-4 w-4" />}
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={(v) => setName(v)}
                    error={errors.name}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <FloatingInput
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              type="email"
              value={email}
              onChange={(v) => setEmail(v)}
              error={errors.email}
            />

            <FloatingInput
              icon={<Lock className="h-4 w-4" />}
              label="Password"
              type="password"
              value={password}
              onChange={(v) => setPassword(v)}
              error={errors.password}
            />

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 glow-primary"
              disabled={loading || oauthLoading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{tab === 'signin' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {tab === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setTab(tab === 'signin' ? 'signup' : 'signin'); setErrors({}); }}
              className="font-medium text-primary hover:underline"
            >
              {tab === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

interface FloatingInputProps {
  icon: React.ReactNode;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

function FloatingInput({ icon, label, type, value, onChange, error }: FloatingInputProps) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  return (
    <div className="relative">
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border bg-secondary/30 transition-colors',
          error ? 'border-destructive/60' : focused ? 'border-primary/60' : 'border-border',
          'h-12 px-3'
        )}
      >
        <span className={cn('transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
          {icon}
        </span>
        <div className="relative flex-1">
          <label
            className={cn(
              'absolute left-0 transition-all pointer-events-none',
              active
                ? '-top-2.5 text-xs text-muted-foreground'
                : 'top-2 text-sm text-muted-foreground'
            )}
          >
            {label}
          </label>
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className="w-full bg-transparent pt-2 text-sm text-foreground outline-none"
          />
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
