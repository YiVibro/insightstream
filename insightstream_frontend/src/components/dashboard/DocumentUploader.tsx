import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  UploadCloud,
  FileText,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Loader2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { fetchDocuments, deleteDocument, uploadAndProcessFile } from '@/services/documentService';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DocumentStatus } from '@/lib/types';

interface UploadProgress {
  fileName: string;
  stage: 'uploading' | 'processing' | 'done' | 'error';
}

interface DocumentRecord {
  id: string;
  filename?: string;
  title?: string;
  file_size_bytes?: number;
  file_size?: number;
  status: DocumentStatus | string;
  created_at: string;
}

interface DocumentUploaderProps {
  collapsed: boolean;
  onToggle: () => void;
  selectedDocIds: string[];
  onToggleSelect: (id: string) => void;
}

const STAGE_LABELS: Record<UploadProgress['stage'], string> = {
  uploading: 'Uploading to S3...',
  processing: 'Processing document with AI...',
  done: 'Processed',
  error: 'Failed',
};

export default function DocumentUploader({
  collapsed,
  onToggle,
  selectedDocIds,
  onToggleSelect,
}: DocumentUploaderProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', user?.id],
    queryFn: () => fetchDocuments(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-docs-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['documents', user.id] });
          const updatedDoc = payload.new;
          if (updatedDoc.status === 'completed' || updatedDoc.status === 'processed') {
            setProgress((prev) =>
              prev.map((item) =>
                item.fileName === updatedDoc.filename ? { ...item, stage: 'done' } : item
              )
            );
            toast.success(`"${updatedDoc.filename}" processing complete!`);
          } else if (updatedDoc.status === 'failed') {
            setProgress((prev) =>
              prev.map((item) =>
                item.fileName === updatedDoc.filename ? { ...item, stage: 'error' } : item
              )
            );
            toast.error(`Failed to process "${updatedDoc.filename}"`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !user) return;
      const pdfFiles = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
      );

      if (pdfFiles.length === 0) {
        toast.error('Only PDF files are supported');
        return;
      }

      for (const file of pdfFiles) {
        try {
          setProgress((p) => [...p, { fileName: file.name, stage: 'uploading' }]);
          await uploadAndProcessFile(file, user.id, (stage) => {
            setProgress((p) =>
              p.map((item) =>
                item.fileName === file.name
                  ? { ...item, stage: stage === 'done' ? 'processing' : stage }
                  : item
              )
            );
          });
          queryClient.invalidateQueries({ queryKey: ['documents', user.id] });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setProgress((p) =>
            p.map((item) => (item.fileName === file.name ? { ...item, stage: 'error' } : item))
          );
          toast.error(msg);
        }
      }
    },
    [user, queryClient]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDelete = async (id: string, filename: string) => {
    try {
      await deleteDocument(id);
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      toast.success(`"${filename}" deleted`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-3 border-r border-border bg-card/30 py-4">
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-muted-foreground">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="h-px w-8 bg-border" />
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span className="text-[10px] font-medium">{documents.length}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col border-r border-border bg-card/30">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Knowledge Base</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="space-y-4 p-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all',
              dragging
                ? 'scale-[1.02] border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-secondary/30'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <motion.div
              animate={dragging ? { y: -4 } : { y: 0 }}
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/15"
            >
              <UploadCloud className="h-6 w-6 text-primary" />
            </motion.div>
            <p className="text-sm font-medium">{dragging ? 'Drop to upload' : 'Drag & drop PDFs here'}</p>
            <p className="mt-1 text-xs text-muted-foreground">or click to browse — .pdf files only</p>
          </div>

          <AnimatePresence>
            {progress.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
                {progress.map((item, i) => (
                  <ProgressRow key={i} item={item} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documents</h3>
              <span className="text-xs text-muted-foreground">{documents.length}</span>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">No documents yet</p>
                <p className="text-xs text-muted-foreground/70">Upload a PDF to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: DocumentRecord) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    isSelected={selectedDocIds.includes(doc.id)}
                    onToggleSelect={() => onToggleSelect(doc.id)}
                    onDelete={() => handleDelete(doc.id, doc.filename || doc.title || 'Untitled document')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function ProgressRow({ item }: { item: UploadProgress }) {
  const isDone = item.stage === 'done';
  const isError = item.stage === 'error';
  const isInProgress = !isDone && !isError;

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center gap-2">
        {isInProgress && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
        {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
        {isError && <XCircle className="h-3.5 w-3.5 text-destructive" />}
        <span className="flex-1 truncate text-xs font-medium">{item.fileName}</span>
      </div>
      <p className={cn('mt-1.5 text-xs', isDone ? 'text-success' : isError ? 'text-destructive' : 'text-muted-foreground')}>
        {STAGE_LABELS[item.stage]}
      </p>
    </div>
  );
}

function DocumentCard({
  doc,
  isSelected,
  onToggleSelect,
  onDelete,
}: {
  doc: DocumentRecord;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  const statusConfig: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
    completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/30', label: 'Processed' },
    processed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/30', label: 'Processed' },
    parsing: { icon: Loader2, color: 'text-warning', bg: 'bg-warning/10 border-warning/30', label: 'Parsing' },
    pending: { icon: Loader2, color: 'text-muted-foreground', bg: 'bg-muted/10 border-muted/30', label: 'Pending' },
    failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', label: 'Failed' },
  };

  const statusKey = doc.status in statusConfig ? doc.status : 'pending';
  const cfg = statusConfig[statusKey];
  const displayName = doc.filename || doc.title || 'Untitled Document';
  const sizeInBytes = doc.file_size_bytes ?? doc.file_size ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onToggleSelect}
      className={cn(
        'group cursor-pointer rounded-lg border p-3 transition-all',
        isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-secondary/20 hover:border-primary/30 hover:bg-secondary/40'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/20 bg-primary/10 text-primary')}>
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-medium">{displayName}</p>
            {isSelected && <span className="text-[10px] font-semibold text-primary">Selected</span>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatSize(sizeInBytes)}</span>
            <span>· {formatDate(doc.created_at)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', cfg.bg, cfg.color)}>
              <cfg.icon className={cn('h-2.5 w-2.5', (doc.status === 'parsing' || doc.status === 'pending') && 'animate-spin')} />
              {cfg.label}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
  if (diffH < 1) return 'just now';
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


// import { useState, useCallback, useRef, useEffect } from 'react';
// import { useQuery, useQueryClient } from '@tanstack/react-query';
// import { motion, AnimatePresence } from 'framer-motion';
// import { toast } from 'sonner';
// import {
//   UploadCloud,
//   FileText,
//   Trash2,
//   ExternalLink,
//   CheckCircle2,
//   Loader2,
//   XCircle,
//   ChevronLeft,
//   ChevronRight,
// } from 'lucide-react';
// import type { LucideIcon } from 'lucide-react';
// import { useAuthStore } from '@/store/useAuthStore';
// import { fetchDocuments, deleteDocument, uploadAndProcessFile } from '@/services/documentService';
// import { supabase } from '@/lib/supabaseClient';
// import { cn } from '@/lib/utils';
// import { Button } from '@/components/ui/button';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import type { DocumentStatus } from '@/lib/types';

// interface UploadProgress {
//   fileName: string;
//   stage: 'uploading' | 'processing' | 'done' | 'error';
// }

// interface DocumentRecord {
//   id: string;fetchD
//   filename?: string;
//   title?: string;
//   file_size_bytes?: number;
//   file_size?: number;
//   status: DocumentStatus | string;
//   created_at: string;
// }

// const STAGE_LABELS: Record<UploadProgress['stage'], string> = {
//   uploading: 'Uploading to S3...',
//   processing: 'Processing document with AI...',
//   done: 'Processed',
//   error: 'Failed',
// };

// export default function DocumentUploader({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
//   const { user } = useAuthStore();
//   const queryClient = useQueryClient();
//   const [dragging, setDragging] = useState(false);
//   const [progress, setProgress] = useState<UploadProgress[]>([]);
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   // Fetch documents list
//   const { data: documents = [], isLoading } = useQuery({
//     queryKey: ['documents', user?.id],
//     queryFn: () => fetchDocuments(user!.id),
//     enabled: !!user,
//   });

//   // Real-time listener for background Lambda updates
//   useEffect(() => {
//     if (!user) return;

//     const channel = supabase
//       .channel(`user-docs-${user.id}`)
//       .on(
//         'postgres_changes',
//         {
//           event: 'UPDATE',
//           schema: 'public',
//           table: 'documents',
//           filter: `user_id=eq.${user.id}`,
//         },
//         (payload) => {
//           // Refresh Query Cache when Lambda finishes processing
//           queryClient.invalidateQueries({ queryKey: ['documents', user.id] });

//           const updatedDoc = payload.new;
//           if (updatedDoc.status === 'completed' || updatedDoc.status === 'processed') {
//             setProgress((prev) =>
//               prev.map((item) =>
//                 item.fileName === updatedDoc.filename ? { ...item, stage: 'done' } : item
//               )
//             );
//             toast.success(`"${updatedDoc.filename}" processing complete!`);
//           } else if (updatedDoc.status === 'failed') {
//             setProgress((prev) =>
//               prev.map((item) =>
//                 item.fileName === updatedDoc.filename ? { ...item, stage: 'error' } : item
//               )
//             );
//             toast.error(`Failed to process "${updatedDoc.filename}"`);
//           }
//         }
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [user, queryClient]);

//   // Handle File Drag & Upload
//   const handleFiles = useCallback(
//     async (files: FileList | null) => {
//       if (!files || files.length === 0 || !user) return;
//       const pdfFiles = Array.from(files).filter(
//         (f) => f.type === 'application/pdf' || f.name.endsWith('.pdf')
//       );

//       if (pdfFiles.length === 0) {
//         toast.error('Only PDF files are supported');
//         return;
//       }

//       for (const file of pdfFiles) {
//         try {
//           // Stage 1: Uploading to S3
//           setProgress((p) => [...p, { fileName: file.name, stage: 'uploading' }]);

//           // Direct S3 Presigned Upload + Hand off to S3 Event Trigger
//           await uploadAndProcessFile(file, user.id, (stage) => {
//             setProgress((p) =>
//               p.map((item) =>
//                 item.fileName === file.name
//                   ? { ...item, stage: stage === 'done' ? 'processing' : stage }
//                   : item
//               )
//             );
//           });

//           // Invalidate cache to show the newly inserted 'pending' document in list
//           queryClient.invalidateQueries({ queryKey: ['documents', user.id] });
//         } catch (err) {
//           const msg = err instanceof Error ? err.message : 'Upload failed';
//           setProgress((p) =>
//             p.map((item) => (item.fileName === file.name ? { ...item, stage: 'error' } : item))
//           );
//           toast.error(msg);
//         }
//       }
//     },
//     [user, queryClient]
//   );

//   const handleDrop = useCallback(
//     (e: React.DragEvent) => {
//       e.preventDefault();
//       setDragging(false);
//       handleFiles(e.dataTransfer.files);
//     },
//     [handleFiles]
//   );

//   const handleDelete = async (id: string, filename: string) => {
//     try {
//       await deleteDocument(id);
//       queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
//       toast.success(`"${filename}" deleted`);
//     } catch (err) {
//       toast.error(err instanceof Error ? err.message : 'Delete failed');
//     }
//   };

//   // Collapsed Sidebar View
//   if (collapsed) {
//     return (
//       <div className="flex h-full flex-col items-center gap-3 border-r border-border bg-card/30 py-4">
//         <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-muted-foreground">
//           <ChevronRight className="h-4 w-4" />
//         </Button>
//         <div className="h-px w-8 bg-border" />
//         <div className="flex flex-col items-center gap-2 text-muted-foreground">
//           <FileText className="h-4 w-4" />
//           <span className="text-[10px] font-medium">{documents.length}</span>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="flex h-full flex-col border-r border-border bg-card/30">
//       {/* Header */}
//       <div className="flex items-center justify-between border-b border-border px-4 py-3">
//         <div className="flex items-center gap-2">
//           <FileText className="h-4 w-4 text-primary" />
//           <h2 className="text-sm font-semibold">Knowledge Base</h2>
//         </div>
//         <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8 text-muted-foreground">
//           <ChevronLeft className="h-4 w-4" />
//         </Button>
//       </div>

//       <ScrollArea className="flex-1 scrollbar-thin">
//         <div className="space-y-4 p-4">
//           {/* Drop Zone */}
//           <div
//             onDragOver={(e) => {
//               e.preventDefault();
//               setDragging(true);
//             }}
//             onDragLeave={() => setDragging(false)}
//             onDrop={handleDrop}
//             onClick={() => fileInputRef.current?.click()}
//             className={cn(
//               'relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all',
//               dragging
//                 ? 'scale-[1.02] border-primary bg-primary/10'
//                 : 'border-border hover:border-primary/50 hover:bg-secondary/30'
//             )}
//           >
//             <input
//               ref={fileInputRef}
//               type="file"
//               accept=".pdf,application/pdf"
//               multiple
//               className="hidden"
//               onChange={(e) => handleFiles(e.target.files)}
//             />
//             <motion.div
//               animate={dragging ? { y: -4 } : { y: 0 }}
//               className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/15"
//             >
//               <UploadCloud className="h-6 w-6 text-primary" />
//             </motion.div>
//             <p className="text-sm font-medium">
//               {dragging ? 'Drop to upload' : 'Drag & drop PDFs here'}
//             </p>
//             <p className="mt-1 text-xs text-muted-foreground">
//               or click to browse — .pdf files only
//             </p>
//           </div>

//           {/* Upload Progress Tracker */}
//           <AnimatePresence>
//             {progress.length > 0 && (
//               <motion.div
//                 initial={{ opacity: 0, height: 0 }}
//                 animate={{ opacity: 1, height: 'auto' }}
//                 exit={{ opacity: 0, height: 0 }}
//                 className="space-y-2"
//               >
//                 {progress.map((item, i) => (
//                   <ProgressRow key={i} item={item} />
//                 ))}
//               </motion.div>
//             )}
//           </AnimatePresence>

//           {/* Documents List */}
//           <div>
//             <div className="mb-2 flex items-center justify-between">
//               <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
//                 Documents
//               </h3>
//               <span className="text-xs text-muted-foreground">{documents.length}</span>
//             </div>

//             {isLoading ? (
//               <div className="space-y-2">
//                 {[1, 2, 3].map((i) => (
//                   <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/50" />
//                 ))}
//               </div>
//             ) : documents.length === 0 ? (
//               <div className="rounded-lg border border-dashed border-border p-8 text-center">
//                 <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
//                 <p className="mt-2 text-sm text-muted-foreground">No documents yet</p>
//                 <p className="text-xs text-muted-foreground/70">Upload a PDF to get started</p>
//               </div>
//             ) : (
//               <div className="space-y-2">
//                 {documents.map((doc: DocumentRecord) => (
//                   <DocumentCard
//                     key={doc.id}
//                     doc={doc}
//                     onDelete={() => handleDelete(doc.id, doc.filename || doc.title || 'Untitled document')}
//                   />
//                 ))}
//               </div>
//             )}
//           </div>
//         </div>
//       </ScrollArea>
//     </div>
//   );
// }

// function ProgressRow({ item }: { item: UploadProgress }) {
//   const isDone = item.stage === 'done';
//   const isError = item.stage === 'error';
//   const isInProgress = !isDone && !isError;

//   return (
//     <div className="rounded-lg border border-border bg-secondary/30 p-3">
//       <div className="flex items-center gap-2">
//         {isInProgress && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
//         {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
//         {isError && <XCircle className="h-3.5 w-3.5 text-destructive" />}
//         <span className="flex-1 truncate text-xs font-medium">{item.fileName}</span>
//       </div>
//       <p
//         className={cn(
//           'mt-1.5 text-xs',
//           isDone ? 'text-success' : isError ? 'text-destructive' : 'text-muted-foreground'
//         )}
//       >
//         {STAGE_LABELS[item.stage]}
//       </p>
//       {isInProgress && (
//         <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
//           <motion.div
//             className="h-full bg-primary"
//             initial={{ width: '20%' }}
//             animate={{ width: ['20%', '60%', '90%'] }}
//             transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
//           />
//         </div>
//       )}
//     </div>
//   );
// }

// function DocumentCard({
//   doc,
//   onDelete,
// }: {
//   doc: DocumentRecord;
//   onDelete: () => void;
// }) {
//   const statusConfig: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
//     completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/30', label: 'Processed' },
//     processed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10 border-success/30', label: 'Processed' },
//     parsing: { icon: Loader2, color: 'text-warning', bg: 'bg-warning/10 border-warning/30', label: 'Parsing' },
//     pending: { icon: Loader2, color: 'text-muted-foreground', bg: 'bg-muted/10 border-muted/30', label: 'Pending' },
//     failed: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', label: 'Failed' },
//   };

//   const statusKey = doc.status in statusConfig ? doc.status : 'pending';
//   const cfg = statusConfig[statusKey];
//   const displayName = doc.filename || doc.title || 'Untitled Document';
//   const sizeInBytes = doc.file_size_bytes ?? doc.file_size ?? 0;

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 8 }}
//       animate={{ opacity: 1, y: 0 }}
//       className="group rounded-lg border border-border bg-secondary/20 p-3 transition-colors hover:border-primary/30 hover:bg-secondary/40"
//     >
//       <div className="flex items-start gap-3">
//         <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
//           <FileText className="h-4 w-4 text-primary" />
//         </div>
//         <div className="min-w-0 flex-1">
//           <p className="truncate text-sm font-medium">{displayName}</p>
//           <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
//             <span>{formatSize(sizeInBytes)}</span>
//             <span>· {formatDate(doc.created_at)}</span>
//           </div>
//           <div className="mt-2 flex items-center justify-between">
//             <span
//               className={cn(
//                 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
//                 cfg.bg,
//                 cfg.color
//               )}
//             >
//               <cfg.icon className={cn('h-2.5 w-2.5', (doc.status === 'parsing' || doc.status === 'pending') && 'animate-spin')} />
//               {cfg.label}
//             </span>
//             <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="h-7 w-7 text-muted-foreground hover:text-foreground"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   toast.info('Document selected');
//                 }}
//               >
//                 <ExternalLink className="h-3.5 w-3.5" />
//               </Button>
//               <Button
//                 variant="ghost"
//                 size="icon"
//                 className="h-7 w-7 text-muted-foreground hover:text-destructive"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   onDelete();
//                 }}
//               >
//                 <Trash2 className="h-3.5 w-3.5" />
//               </Button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </motion.div>
//   );
// }

// function formatSize(bytes: number): string {
//   if (bytes <= 0) return '0 B';
//   if (bytes < 1024) return `${bytes} B`;
//   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
//   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
// }

// function formatDate(iso: string): string {
//   if (!iso) return '';
//   const d = new Date(iso);
//   const now = new Date();
//   const diffH = Math.floor((now.getTime() - d.getTime()) / 3600000);
//   if (diffH < 1) return 'just now';
//   if (diffH < 24) return `${diffH}h ago`;
//   return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
// }