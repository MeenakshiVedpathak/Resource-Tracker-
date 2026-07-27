import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, X } from 'lucide-react';
import AICopilotBubble from './AICopilotBubble';
import AIChatPanel from './AIChatPanel';
import { useAICopilot } from '@/hooks/useAICopilot';
import { useAuth } from '@/hooks/useAuth';
import { aiCopilotApi } from '@/api/aiCopilot.api';
import { formatGreetingMarkdown } from '@/utils/aiCopilotEngine';
import { cn } from '@/utils/cn';

const BUBBLE_SESSION_KEY = 'rut_ai_copilot_bubble_shown';
const BUBBLE_DELAY_MS = 1200;
const DIGEST_QUESTION = 'Give me an executive summary for this month';

// Single mount point for the whole AI Copilot experience (Features 1 & 3): a floating
// action button, a proactive greeting bubble that surfaces once per session (backed by
// a real POST /api/v1/ai/query executive-summary call, not fabricated numbers), and the
// full chat panel. Mounted once in MainLayout — purely additive, touches no existing
// dashboard/reports/nav code or routes.
const AICopilotWidget = () => {
  const { user } = useAuth();
  const displayName = user?.name ?? user?.username ?? user?.email?.split('@')[0] ?? 'there';
  const copilot = useAICopilot();
  const [chatOpen, setChatOpen] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [digest, setDigest] = useState({ loading: true, answer: null, error: null });

  useEffect(() => {
    if (sessionStorage.getItem(BUBBLE_SESSION_KEY)) return undefined;

    const timer = setTimeout(() => setBubbleVisible(true), BUBBLE_DELAY_MS);

    aiCopilotApi.query({ question: DIGEST_QUESTION, roleId: user?.role_id, hoursSource: 'M' })
      .then((res) => setDigest({ loading: false, answer: res?.data?.answer ?? null, error: null }))
      .catch(() => setDigest({ loading: false, answer: null, error: true }));

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissBubble = () => {
    setBubbleVisible(false);
    sessionStorage.setItem(BUBBLE_SESSION_KEY, '1');
  };

  const openChatFromBubble = () => {
    if (copilot.messages.length === 0) {
      if (digest.answer) {
        copilot.seedAssistantMessage(formatGreetingMarkdown(displayName, digest.answer), digest.answer.priority);
      } else {
        copilot.seedAssistantMessage(`Hi ${displayName}, ask me anything about utilization, budget, bench, or timesheets.`);
      }
    }
    dismissBubble();
    setChatOpen(true);
  };

  const toggleChat = () => {
    dismissBubble();
    setChatOpen((prev) => !prev);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {chatOpen && (
          <AIChatPanel key="chat-panel" copilot={copilot} onClose={() => setChatOpen(false)} />
        )}
        {!chatOpen && bubbleVisible && (
          <AICopilotBubble
            key="copilot-bubble"
            displayName={displayName}
            digest={digest}
            onViewDetails={openChatFromBubble}
            onDismiss={dismissBubble}
          />
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggleChat}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          'relative h-14 w-14 rounded-2xl shadow-xl flex items-center justify-center shrink-0',
          'text-white',
        )}
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5 55%, #2563eb)' }}
        title="AI Copilot"
      >
        {!chatOpen && (
          <motion.span
            className="absolute inset-0 rounded-2xl"
            animate={{ boxShadow: ['0 0 0 0 rgba(124,58,237,0.35)', '0 0 0 10px rgba(124,58,237,0)', '0 0 0 0 rgba(124,58,237,0)'] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        {chatOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </motion.button>
    </div>
  );
};

export default AICopilotWidget;
