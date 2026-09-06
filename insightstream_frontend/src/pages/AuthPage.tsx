import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Brain, GitBranch, Search, Shield, Zap } from 'lucide-react';
import AuthCard from '@/components/auth/AuthCard';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, initialized } = useAuthStore();

  useEffect(() => {
    if (initialized && !loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, initialized, navigate]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left — animated abstract gradient */}
      <div className="relative hidden flex-1 overflow-hidden lg:flex">
        <AnimatedGradient />

        {/* Floating feature cards */}
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-lg"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Agentic RAG Engine v2.0
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Agentic Intelligence
              <br />
              for <span className="text-gradient">Complex Documents</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Upload your PDFs and let multi-step reasoning engines extract,
              synthesize, and cite answers with traceable source references.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                { icon: Brain, label: 'LangGraph Reasoning', desc: 'Multi-step agent chains' },
                { icon: Zap, label: 'Groq Llama-3', desc: 'Ultra-fast inference' },
                { icon: Search, label: 'Vector Retrieval', desc: 'Semantic chunk search' },
                { icon: Shield, label: 'Source Citations', desc: 'Every claim traced' },
              ].map((feat, i) => (
                <motion.div
                  key={feat.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4"
                >
                  <feat.icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-sm font-medium">{feat.label}</p>
                  <p className="text-xs text-muted-foreground">{feat.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t border-border/30 bg-background/40 px-16 py-5 backdrop-blur-md xl:px-24"
        >
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> 12K+ documents processed
            </span>
            <span className="flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" /> 99.8% retrieval accuracy
            </span>
          </div>
        </motion.div>
      </div>

      {/* Right — auth card */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <AuthCard />
      </div>
    </div>
  );
}

function AnimatedGradient() {
  return (
    <div className="absolute inset-0">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary to-background" />

      {/* Animated blobs */}
      <motion.div
        className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/30 blur-3xl"
        animate={{
          x: [0, 80, 0],
          y: [0, 60, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 -right-32 h-80 w-80 rounded-full bg-chart-4/20 blur-3xl"
        animate={{
          x: [0, -60, 0],
          y: [0, 40, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-chart-2/15 blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-grid opacity-30" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
    </div>
  );
}
