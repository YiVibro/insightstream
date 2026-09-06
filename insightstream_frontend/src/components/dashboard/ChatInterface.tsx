import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Paperclip,
  Brain,
  Search,
  Sparkles,
  User as UserIcon,
  Loader2,
  Zap,
  Trash2,
  FileText,
} from 'lucide-react';
import { useChatStore, citationLabel } from '@/store/useChatStore';
import { useAuthStore } from '@/store/useAuthStore';
import { MODELS, type ChatMessage, type ChatMode, type Citation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CitationModal from '@/components/dashboard/CitationModal';
import { sendChatMessage } from '@/services/chatService';

interface ChatInterfaceProps{
  selectedDocIds:string[]
}
export default function ChatInterface(
  {selectedDocIds}:ChatInterfaceProps
) {
  const { messages, mode, selectedModel, isStreaming, setMode, setSelectedModel, addMessage, updateMessage, setStreaming, clearMessages } = useChatStore();
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  console.log("document selected is:",selectedDocIds)
  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const openCitation = (c: Citation) => {
    setActiveCitation(c);
    setModalOpen(true);
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      mode,
      model: selectedModel,
      createdAt: Date.now(),
    };
    addMessage(userMsg);
    const currentInput = input.trim();
    setInput('');
    setStreaming(true);

    // Create assistant placeholder
    const assistantId = `msg-${Date.now()}-ai`;
    addMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      mode,
      model: selectedModel,
      createdAt: Date.now(),
    });

    // Agentic mode: show thinking steps first if desired
    if (mode === 'agentic') {
      const thinkingSteps = [
        'Analyzing query intent and decomposing into sub-questions...',
        'Retrieving relevant document chunks via vector similarity search...',
        'Ranking and filtering top-k passages by relevance score...',
        'Synthesizing answer with multi-step reasoning chain...',
      ];

      const thinkingId = `msg-${Date.now()}-think`;
      addMessage({
        id: thinkingId,
        role: 'thinking',
        content: '',
        thinkingSteps: [],
        createdAt: Date.now(),
      });

      for (let i = 0; i < thinkingSteps.length; i++) {
        await new Promise((r) => setTimeout(r, 400));
        updateMessage(thinkingId, {
          thinkingSteps: thinkingSteps.slice(0, i + 1),
        });
      }
    }

    try {
      const responseData = await sendChatMessage({
        query: currentInput,
        documentIds: selectedDocIds,
        userId: user?.id,
      });

      const responseContent = responseData.answer || responseData.content|| 'No response content returned.';
      const responseCitations = responseData.sources || responseData.citations || [];

const words = responseContent.split(' ');
for (let i = 0; i <= words.length; i++) {
  await new Promise((r) => setTimeout(r, 20));
  updateMessage(assistantId, { content: words.slice(0, i).join(' ') });
}

updateMessage(assistantId, { citations: responseCitations });
      

    } catch (error: any) {
      toast.error(error.message || 'Error communicating with AI backend');
      updateMessage(assistantId, { content: '⚠️ *Error generating response. Please check your backend connection.*' });
    } finally {
      setStreaming(false);
    }
  }, [input, isStreaming, mode, selectedModel, addMessage, updateMessage, setStreaming, user]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Mode switcher header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-secondary/40 p-1">
          <ModeButton
            active={mode === 'standard'}
            onClick={() => setMode('standard')}
            icon={<Search className="h-3.5 w-3.5" />}
            label="Standard Search"
            sublabel="Vector Retrieval"
          />
          <ModeButton
            active={mode === 'agentic'}
            onClick={() => setMode('agentic')}
            icon={<Brain className="h-3.5 w-3.5" />}
            label="Agentic RAG"
            sublabel="Multi-Step Reasoning"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            disabled={messages.length === 0 || isStreaming}
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="ml-1.5 hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState mode={mode} />
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    onCitationClick={openCitation}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-background/85 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="rounded-xl border border-border bg-secondary/30 focus-within:border-primary/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                mode === 'agentic'
                  ? 'Ask anything — the agent will reason through your documents...'
                  : 'Search your knowledge base...'
              }
              className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none scrollbar-thin"
              style={{ maxHeight: '160px' }}
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Attach</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>
                      <FileText className="mr-2 h-3.5 w-3.5" />
                      Select from Knowledge Base
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Model selector */}
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="h-8 w-auto gap-1.5 border-transparent bg-transparent text-xs text-muted-foreground hover:text-foreground focus:ring-0">
                    <Zap className="h-3.5 w-3.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.label}</span>
                          {m.badge && (
                            <Badge variant="secondary" className="ml-1 text-[10px] py-0">
                              {m.badge}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="icon"
                className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 glow-primary"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Press <kbd className="rounded border border-border bg-muted px-1">Enter</kbd> to send ·
            <kbd className="ml-1 rounded border border-border bg-muted px-1">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>

      <CitationModal citation={activeCitation} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  sublabel,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {active && (
        <motion.div
          layoutId="modeSwitch"
          className="absolute inset-0 -z-10 rounded-md bg-primary"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      )}
      {icon}
      <div className="flex flex-col items-start leading-tight">
        <span>{label}</span>
        <span className={cn('text-[10px]', active ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>
          {sublabel}
        </span>
      </div>
    </button>
  );
}

function MessageBubble({ msg, onCitationClick }: { msg: ChatMessage; onCitationClick: (c: Citation) => void }) {
  if (msg.role === 'thinking') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="ml-12 rounded-xl border border-primary/20 bg-primary/5 p-4"
      >
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-primary">
          <Brain className="h-3.5 w-3.5" />
          Agent Reasoning
        </div>
        <div className="space-y-2">
          {msg.thinkingSteps?.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-2"
            >
              <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              <span className="text-xs text-muted-foreground">{step}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-3', isUser && 'flex-row-reverse')}
    >
      {/* Avatar */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
        isUser
          ? 'border-border bg-secondary text-muted-foreground'
          : 'border-primary/30 bg-primary/15 text-primary'
      )}>
        {isUser ? <UserIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      {/* Content */}
      <div className={cn('min-w-0 flex-1', isUser && 'flex flex-col items-end')}>
        <div className={cn(
          'rounded-xl border px-4 py-3',
          isUser
            ? 'border-primary/30 bg-primary/10'
            : 'border-border bg-card/50'
        )}>
          {isUser ? (
            <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
              {msg.content ? (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
                      inline ? (
                        <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono text-primary">{children}</code>
                      ) : (
                        <pre className="my-2 rounded-lg border border-border bg-secondary/50 p-3 overflow-x-auto scrollbar-thin">
                          <code className="text-xs font-mono text-foreground/90">{children}</code>
                        </pre>
                      ),
                    ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-semibold">{children}</h3>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs">Generating response...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Citation chips */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-muted-foreground self-center mr-1">Sources:</span>
            {msg.citations.map((c) => (
              <button
                key={c.id}
                onClick={() => onCitationClick(c)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary transition-all hover:bg-primary/20 hover:border-primary/50"
              >
                <FileText className="h-2.5 w-2.5" />
                {citationLabel(c)}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ mode }: { mode: ChatMode }) {
  const suggestions = mode === 'agentic'
    ? [
        'Summarize the key findings from my uploaded documents',
        'What are the main risk factors mentioned across all PDFs?',
        'Cross-reference the financial data between documents',
      ]
    : [
        'Find paragraphs mentioning "revenue growth"',
        'Search for sections about "data privacy"',
        'What does the document say about compliance?',
      ];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20"
      >
        {mode === 'agentic' ? (
          <Brain className="h-8 w-8 text-primary" />
        ) : (
          <Search className="h-8 w-8 text-primary" />
        )}
      </motion.div>
      <h3 className="text-lg font-semibold">
        {mode === 'agentic' ? 'Agentic RAG Workspace' : 'Standard Vector Search'}
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {mode === 'agentic'
          ? 'The agent will decompose your question, retrieve relevant chunks, and synthesize a cited answer with multi-step reasoning.'
          : 'Pure vector retrieval — find semantically matching passages from your knowledge base.'}
      </p>
      <div className="mt-8 w-full max-w-md space-y-2">
        {suggestions.map((s) => (
          <div
            key={s}
            className="rounded-lg border border-border bg-card/40 p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground cursor-default"
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

// import { useState, useRef, useEffect, useCallback } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { toast } from 'sonner';
// import ReactMarkdown from 'react-markdown';
// import {
//   Send,
//   Paperclip,
//   Brain,
//   Search,
//   Sparkles,
//   User as UserIcon,
//   ChevronDown,
//   Loader2,
//   Zap,
//   Trash2,
//   FileText,
// } from 'lucide-react';
// import { useChatStore, citationLabel } from '@/store/useChatStore';
// import { useAuthStore } from '@/store/useAuthStore';
// import { MODELS, type ChatMessage, type ChatMode, type Citation } from '@/lib/types';
// import { cn } from '@/lib/utils';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import CitationModal from '@/components/dashboard/CitationModal';

// export default function ChatInterface() {
//   const { messages, mode, selectedModel, isStreaming, setMode, setSelectedModel, addMessage, updateMessage, setStreaming, clearMessages } = useChatStore();
//   const { user } = useAuthStore();
//   const [input, setInput] = useState('');
//   const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
//   const [modalOpen, setModalOpen] = useState(false);
//   const scrollRef = useRef<HTMLDivElement>(null);
//   const textareaRef = useRef<HTMLTextAreaElement>(null);

//   // Auto-scroll
//   useEffect(() => {
//     if (scrollRef.current) {
//       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
//     }
//   }, [messages]);

//   // Auto-expand textarea
//   useEffect(() => {
//     if (textareaRef.current) {
//       textareaRef.current.style.height = 'auto';
//       textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
//     }
//   }, [input]);

//   const openCitation = (c: Citation) => {
//     setActiveCitation(c);
//     setModalOpen(true);
//   };

//   const handleSend = useCallback(async () => {
//     if (!input.trim() || isStreaming) return;

//     const userMsg: ChatMessage = {
//       id: `msg-${Date.now()}`,
//       role: 'user',
//       content: input.trim(),
//       mode,
//       model: selectedModel,
//       createdAt: Date.now(),
//     };
//     addMessage(userMsg);
//     const currentInput = input.trim();
//     setInput('');
//     setStreaming(true);

//     // Create assistant placeholder
//     const assistantId = `msg-${Date.now()}-ai`;
//     addMessage({
//       id: assistantId,
//       role: 'assistant',
//       content: '',
//       mode,
//       model: selectedModel,
//       createdAt: Date.now(),
//     });

//     // Agentic mode: show thinking steps first
//     if (mode === 'agentic') {
//       const thinkingSteps = [
//         'Analyzing query intent and decomposing into sub-questions...',
//         'Retrieving relevant document chunks via vector similarity search...',
//         'Ranking and filtering top-k passages by relevance score...',
//         'Synthesizing answer with multi-step reasoning chain...',
//       ];

//       const thinkingId = `msg-${Date.now()}-think`;
//       addMessage({
//         id: thinkingId,
//         role: 'thinking',
//         content: '',
//         thinkingSteps: [],
//         createdAt: Date.now(),
//       });

//       for (let i = 0; i < thinkingSteps.length; i++) {
//         await new Promise((r) => setTimeout(r, 600));
//         updateMessage(thinkingId, {
//           thinkingSteps: thinkingSteps.slice(0, i + 1),
//         });
//       }
//       await new Promise((r) => setTimeout(r, 400));
//     }

//     // Generate simulated RAG response
//     const { content, citations } = generateResponse(currentInput, mode, user?.email ?? 'User');

//     // Stream content character by character
//     const words = content.split(' ');
//     for (let i = 0; i <= words.length; i++) {
//       await new Promise((r) => setTimeout(r, 25));
//       updateMessage(assistantId, { content: words.slice(0, i).join(' ') });
//     }

//     // Add citations
//     updateMessage(assistantId, { citations });
//     setStreaming(false);
//   }, [input, isStreaming, mode, selectedModel, addMessage, updateMessage, setStreaming, user]);

//   const handleKeyDown = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleSend();
//     }
//   };

//   return (
//     <div className="flex h-full flex-col bg-background">
//       {/* Mode switcher header */}
//       <div className="flex items-center justify-between border-b border-border px-4 py-3">
//         <div className="flex items-center gap-1 rounded-lg bg-secondary/40 p-1">
//           <ModeButton
//             active={mode === 'standard'}
//             onClick={() => setMode('standard')}
//             icon={<Search className="h-3.5 w-3.5" />}
//             label="Standard Search"
//             sublabel="Vector Retrieval"
//           />
//           <ModeButton
//             active={mode === 'agentic'}
//             onClick={() => setMode('agentic')}
//             icon={<Brain className="h-3.5 w-3.5" />}
//             label="Agentic RAG"
//             sublabel="Multi-Step Reasoning"
//           />
//         </div>

//         <div className="flex items-center gap-2">
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={clearMessages}
//             disabled={messages.length === 0 || isStreaming}
//             className="text-muted-foreground hover:text-foreground"
//           >
//             <Trash2 className="h-3.5 w-3.5" />
//             <span className="ml-1.5 hidden sm:inline">Clear</span>
//           </Button>
//         </div>
//       </div>

//       {/* Messages */}
//       <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
//         <div className="mx-auto max-w-3xl px-4 py-6">
//           {messages.length === 0 ? (
//             <EmptyState mode={mode} />
//           ) : (
//             <div className="space-y-6">
//               <AnimatePresence>
//                 {messages.map((msg) => (
//                   <MessageBubble
//                     key={msg.id}
//                     msg={msg}
//                     onCitationClick={openCitation}
//                   />
//                 ))}
//               </AnimatePresence>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Input area */}
//       <div className="border-t border-border bg-background/80 backdrop-blur-sm">
//         <div className="mx-auto max-w-3xl px-4 py-3">
//           <div className="rounded-xl border border-border bg-secondary/30 focus-within:border-primary/50 transition-colors">
//             <textarea
//               ref={textareaRef}
//               value={input}
//               onChange={(e) => setInput(e.target.value)}
//               onKeyDown={handleKeyDown}
//               rows={1}
//               placeholder={
//                 mode === 'agentic'
//                   ? 'Ask anything — the agent will reason through your documents...'
//                   : 'Search your knowledge base...'
//               }
//               className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none scrollbar-thin"
//               style={{ maxHeight: '160px' }}
//             />
//             <div className="flex items-center justify-between px-3 pb-2.5">
//               <div className="flex items-center gap-2">
//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild>
//                     <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
//                       <Paperclip className="h-3.5 w-3.5" />
//                       <span className="hidden sm:inline">Attach</span>
//                     </Button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent align="start">
//                     <DropdownMenuItem>
//                       <FileText className="mr-2 h-3.5 w-3.5" />
//                       Select from Knowledge Base
//                     </DropdownMenuItem>
//                   </DropdownMenuContent>
//                 </DropdownMenu>

//                 {/* Model selector */}
//                 <Select value={selectedModel} onValueChange={setSelectedModel}>
//                   <SelectTrigger className="h-8 w-auto gap-1.5 border-transparent bg-transparent text-xs text-muted-foreground hover:text-foreground focus:ring-0">
//                     <Zap className="h-3.5 w-3.5" />
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {MODELS.map((m) => (
//                       <SelectItem key={m.id} value={m.id}>
//                         <div className="flex items-center gap-2">
//                           <span className="font-medium">{m.label}</span>
//                           {m.badge && (
//                             <Badge variant="secondary" className="ml-1 text-[10px] py-0">
//                               {m.badge}
//                             </Badge>
//                           )}
//                         </div>
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>

//               <Button
//                 size="icon"
//                 className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 glow-primary"
//                 onClick={handleSend}
//                 disabled={!input.trim() || isStreaming}
//               >
//                 {isStreaming ? (
//                   <Loader2 className="h-4 w-4 animate-spin" />
//                 ) : (
//                   <Send className="h-4 w-4" />
//                 )}
//               </Button>
//             </div>
//           </div>
//           <p className="mt-2 text-center text-[11px] text-muted-foreground">
//             Press <kbd className="rounded border border-border bg-muted px-1">Enter</kbd> to send ·
//             <kbd className="ml-1 rounded border border-border bg-muted px-1">Shift+Enter</kbd> for new line
//           </p>
//         </div>
//       </div>

//       <CitationModal citation={activeCitation} open={modalOpen} onOpenChange={setModalOpen} />
//     </div>
//   );
// }

// function ModeButton({
//   active,
//   onClick,
//   icon,
//   label,
//   sublabel,
// }: {
//   active: boolean;
//   onClick: () => void;
//   icon: React.ReactNode;
//   label: string;
//   sublabel: string;
// }) {
//   return (
//     <button
//       onClick={onClick}
//       className={cn(
//         'relative flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
//         active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
//       )}
//     >
//       {active && (
//         <motion.div
//           layoutId="modeSwitch"
//           className="absolute inset-0 -z-10 rounded-md bg-primary"
//           transition={{ type: 'spring', stiffness: 400, damping: 32 }}
//         />
//       )}
//       {icon}
//       <div className="flex flex-col items-start leading-tight">
//         <span>{label}</span>
//         <span className={cn('text-[10px]', active ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>
//           {sublabel}
//         </span>
//       </div>
//     </button>
//   );
// }

// function MessageBubble({ msg, onCitationClick }: { msg: ChatMessage; onCitationClick: (c: Citation) => void }) {
//   if (msg.role === 'thinking') {
//     return (
//       <motion.div
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="ml-12 rounded-xl border border-primary/20 bg-primary/5 p-4"
//       >
//         <div className="mb-3 flex items-center gap-2 text-xs font-medium text-primary">
//           <Brain className="h-3.5 w-3.5" />
//           Agent Reasoning
//         </div>
//         <div className="space-y-2">
//           {msg.thinkingSteps?.map((step, i) => (
//             <motion.div
//               key={i}
//               initial={{ opacity: 0, x: -8 }}
//               animate={{ opacity: 1, x: 0 }}
//               transition={{ delay: i * 0.1 }}
//               className="flex items-start gap-2"
//             >
//               <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
//               <span className="text-xs text-muted-foreground">{step}</span>
//             </motion.div>
//           ))}
//         </div>
//       </motion.div>
//     );
//   }

//   const isUser = msg.role === 'user';

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 8 }}
//       animate={{ opacity: 1, y: 0 }}
//       className={cn('flex gap-3', isUser && 'flex-row-reverse')}
//     >
//       {/* Avatar */}
//       <div className={cn(
//         'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
//         isUser
//           ? 'border-border bg-secondary text-muted-foreground'
//           : 'border-primary/30 bg-primary/15 text-primary'
//       )}>
//         {isUser ? <UserIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
//       </div>

//       {/* Content */}
//       <div className={cn('min-w-0 flex-1', isUser && 'flex flex-col items-end')}>
//         <div className={cn(
//           'rounded-xl border px-4 py-3',
//           isUser
//             ? 'border-primary/30 bg-primary/10'
//             : 'border-border bg-card/50'
//         )}>
//           {isUser ? (
//             <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
//           ) : (
//             <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed">
//               {msg.content ? (
//                 <ReactMarkdown
//                   components={{
//                     p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
//                     code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
//                       inline ? (
//                         <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono text-primary">{children}</code>
//                       ) : (
//                         <pre className="my-2 rounded-lg border border-border bg-secondary/50 p-3 overflow-x-auto scrollbar-thin">
//                           <code className="text-xs font-mono text-foreground/90">{children}</code>
//                         </pre>
//                       ),
//                     ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
//                     ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
//                     strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
//                     h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-semibold">{children}</h3>,
//                   }}
//                 >
//                   {msg.content}
//                 </ReactMarkdown>
//               ) : (
//                 <div className="flex items-center gap-2 text-muted-foreground">
//                   <Loader2 className="h-3.5 w-3.5 animate-spin" />
//                   <span className="text-xs">Generating response...</span>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>

//         {/* Citation chips */}
//         {msg.citations && msg.citations.length > 0 && (
//           <div className="mt-2 flex flex-wrap gap-1.5">
//             <span className="text-[10px] text-muted-foreground self-center mr-1">Sources:</span>
//             {msg.citations.map((c) => (
//               <button
//                 key={c.id}
//                 onClick={() => onCitationClick(c)}
//                 className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary transition-all hover:bg-primary/20 hover:border-primary/50"
//               >
//                 <FileText className="h-2.5 w-2.5" />
//                 {citationLabel(c)}
//               </button>
//             ))}
//           </div>
//         )}
//       </div>
//     </motion.div>
//   );
// }

// function EmptyState({ mode }: { mode: ChatMode }) {
//   const suggestions = mode === 'agentic'
//     ? [
//         'Summarize the key findings from my uploaded documents',
//         'What are the main risk factors mentioned across all PDFs?',
//         'Cross-reference the financial data between documents',
//       ]
//     : [
//         'Find paragraphs mentioning "revenue growth"',
//         'Search for sections about "data privacy"',
//         'What does the document say about compliance?',
//       ];

//   return (
//     <div className="flex flex-col items-center justify-center py-20 text-center">
//       <motion.div
//         initial={{ opacity: 0, scale: 0.9 }}
//         animate={{ opacity: 1, scale: 1 }}
//         className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20"
//       >
//         {mode === 'agentic' ? (
//           <Brain className="h-8 w-8 text-primary" />
//         ) : (
//           <Search className="h-8 w-8 text-primary" />
//         )}
//       </motion.div>
//       <h3 className="text-lg font-semibold">
//         {mode === 'agentic' ? 'Agentic RAG Workspace' : 'Standard Vector Search'}
//       </h3>
//       <p className="mt-2 max-w-md text-sm text-muted-foreground">
//         {mode === 'agentic'
//           ? 'The agent will decompose your question, retrieve relevant chunks, and synthesize a cited answer with multi-step reasoning.'
//           : 'Pure vector retrieval — find semantically matching passages from your knowledge base.'}
//       </p>
//       <div className="mt-8 w-full max-w-md space-y-2">
//         {suggestions.map((s) => (
//           <div
//             key={s}
//             className="rounded-lg border border-border bg-card/40 p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground cursor-default"
//           >
//             {s}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// /** Generates a simulated RAG response with citations. */
// function generateResponse(query: string, mode: ChatMode, userName: string): {
//   content: string;
//   citations: Citation[];
// } {
//   const citations: Citation[] = [
//     {
//       id: 'cit-1',
//       documentId: 'doc-1',
//       documentTitle: 'Q3 Financial Report',
//       page: 4,
//       chunk: 2,
//       excerpt:
//         'The company reported a 23% year-over-year increase in revenue, driven primarily by expansion in the enterprise segment and strong performance in the APAC region. Total revenue reached $184.2M, exceeding analyst expectations of $175M.',
//       score: 0.94,
//     },
//     {
//       id: 'cit-2',
//       documentId: 'doc-2',
//       documentTitle: 'Risk Assessment Brief',
//       page: 12,
//       chunk: 5,
//       excerpt:
//         'Key risk factors include supply chain disruptions, regulatory changes in data privacy (GDPR/CCPA), and increased competition from emerging AI platforms. The mitigation strategy focuses on diversification and proactive compliance monitoring.',
//       score: 0.87,
//     },
//   ];

//   const standardContent = `Based on vector retrieval across your knowledge base, here are the most relevant passages for **"${query}"**:

// **Top Match — Financial Report (Page 4)**
// The document indicates a 23% year-over-year revenue increase, totaling $184.2M, with the enterprise segment and APAC region as primary growth drivers.

// **Second Match — Risk Brief (Page 12)**
// Key risk factors identified include supply chain vulnerabilities, evolving data privacy regulations, and competitive pressure from AI platforms.

// \`\`\`
// retrieval_time: 142ms | chunks_scored: 1,847 | top_k: 5
// \`\`\``;

//   const agenticContent = `Great question, ${userName.split('@')[0]}. Let me walk through my reasoning.

// ### Analysis

// I decomposed your query into three sub-questions and retrieved relevant passages from your uploaded documents.

// ### Key Findings

// 1. **Revenue Performance**: Your Q3 Financial Report shows a **23% YoY increase** to $184.2M, surpassing analyst expectations. The enterprise segment and APAC expansion were the primary drivers.

// 2. **Risk Landscape**: The Risk Assessment Brief identifies three categories of concern:
//    - Supply chain disruptions
//    - Regulatory shifts (GDPR/CCPA)
//    - Competitive pressure from AI-native platforms

// 3. **Strategic Implications**: The mitigation strategy emphasizes *diversification* and *proactive compliance monitoring*, suggesting a defensive posture against regulatory risk while maintaining growth trajectory.

// ### Conclusion

// The documents paint a picture of **strong financial momentum** paired with **acknowledged but managed risks**. The revenue growth exceeds market expectations while the risk framework appears adequately scoped.

// > Note: This response was generated using multi-step LangGraph reasoning with 4 retrieval iterations.`;

//   return {
//     content: mode === 'agentic' ? agenticContent : standardContent,
//     citations,
//   };
// }
