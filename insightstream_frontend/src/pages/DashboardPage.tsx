import { useState } from 'react';
import { motion } from 'framer-motion';
import TopNavbar from '@/components/dashboard/TopNavbar';
import DocumentUploader from '@/components/dashboard/DocumentUploader';
import ChatInterface from '@/components/dashboard/ChatInterface';

export default function DashboardPage() {
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const handleToggleSelect = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <TopNavbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Panel A — Documents (40%) */}
        <motion.div
          animate={{ width: panelCollapsed ? '56px' : '40%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="shrink-0 overflow-hidden"
          style={{ maxWidth: '560px', minWidth: '56px' }}
        >
          <DocumentUploader collapsed={panelCollapsed} onToggle={() => setPanelCollapsed(!panelCollapsed)} selectedDocIds={selectedDocIds} onToggleSelect={handleToggleSelect} />
        </motion.div>

        {/* Panel B — Chat (60%) */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface selectedDocIds={selectedDocIds} />
        </div>
      </div>
    </div>
  );
}
