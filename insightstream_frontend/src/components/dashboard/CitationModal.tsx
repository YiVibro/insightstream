import { motion } from 'framer-motion';
import { FileText, Quote, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Citation } from '@/lib/types';

interface CitationModalProps {
  citation: Citation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CitationModal({ citation, open, onOpenChange }: CitationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            Source Reference
          </DialogTitle>
          <DialogDescription>
            Extracted text chunk used to generate the answer
          </DialogDescription>
        </DialogHeader>

        {citation && (
          <div className="space-y-4">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-secondary/60">
                <FileText className="mr-1 h-3 w-3" />
                {citation.documentTitle}
              </Badge>
              <Badge variant="outline" className="border-primary/30 text-primary">
                Page {citation.page}
              </Badge>
              <Badge variant="outline" className="border-border">
                Chunk {citation.chunk}
              </Badge>
              <Badge variant="outline" className="border-success/30 text-success">
                <TrendingUp className="mr-1 h-3 w-3" />
                {(citation.score * 100).toFixed(1)}% match
              </Badge>
            </div>

            <Separator className="bg-border" />

            {/* Excerpt */}
            <div className="relative rounded-xl border border-border bg-secondary/30 p-4">
              <Quote className="absolute -top-2 -left-1 h-5 w-5 text-primary/40" />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm leading-relaxed text-foreground/90"
              >
                {citation.excerpt}
              </motion.p>
            </div>

            {/* Footer hint */}
            <p className="text-xs text-muted-foreground">
              This chunk was retrieved via {citation.score > 0.85 ? 'direct' : 'semantic'} vector
              search and used as grounding context for the response.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
