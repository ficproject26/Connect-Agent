import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { X, Send, Loader2, Bot, Ticket, Sparkles, MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'agent';
  text: string;
  time: string;
  action?: {
    label: string;
    link: string;
  };
}

interface LiveChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_TOPICS = [
  '📋 KYC Verification',
  '💳 Payout & Wallet',
  '🗺️ Territory Bounds',
  '🎯 Daily Targets',
  '🎫 Raise Ticket'
];

export const LiveChatAssistant: React.FC<LiveChatAssistantProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const userName = user?.name || 'Agent';
  const userRole = (user?.role || (user as any)?.level || 'Agent').toLowerCase();

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: `Hello ${userName}! 👋 I am your ConnectPortal 24/7 Operations Assistant. How can I help you today with your field operations, KYC verification, payouts, or targets?`,
      time: 'Just now'
    }
  ]);

  // Focus input and scroll to bottom when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTyping, isOpen]);

  // Escape key listener to close chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const generateReply = (query: string): { text: string; action?: { label: string; link: string } } => {
    const q = query.toLowerCase();

    if (q.includes('kyc') || q.includes('aadhaar') || q.includes('pan') || q.includes('document')) {
      return {
        text: 'For KYC verification, ensure uploaded documents are clear JPEG or PDF files under 5MB. Once submitted, our Admin desk processes approvals within 2–4 business hours.',
        action: { label: 'View KYC Status', link: '/kyc' }
      };
    }

    if (q.includes('payout') || q.includes('wallet') || q.includes('cash') || q.includes('earning') || q.includes('commission')) {
      return {
        text: 'Wallet payouts are processed within 30 minutes to your verified bank account. Please verify that your bank IFSC code and account details are up to date.',
        action: { label: 'Open Wallet Dashboard', link: '/wallet' }
      };
    }

    if (q.includes('pincode') || q.includes('district') || q.includes('division') || q.includes('territory') || q.includes('scope')) {
      return {
        text: 'Your territory jurisdiction and assigned sectors are configured in your profile. Field visits and vendor tie-ups must be within your designated operating territory.',
        action: { label: 'Check Territory in Profile', link: '/shared/profile' }
      };
    }

    if (q.includes('target') || q.includes('task') || q.includes('quota') || q.includes('goal')) {
      return {
        text: 'Daily target allocations track active vendor verification visits. Be sure to check in at store locations to mark visits as completed.',
        action: { label: 'View My Targets', link: '/targets' }
      };
    }

    if (q.includes('ticket') || q.includes('dispute') || q.includes('issue') || q.includes('support') || q.includes('raise')) {
      return {
        text: 'Need immediate manual intervention from ConnectPortal Operations? You can raise an official support ticket and our team will respond within 15 minutes.',
        action: { label: 'Raise Support Ticket Now', link: '/tickets' }
      };
    }

    if (q.includes('vendor') || q.includes('merchant') || q.includes('onboard')) {
      return {
        text: 'You can onboard new merchant vendors directly from the Vendors tab. Ensure store coordinates and valid phone numbers are collected during field visits.',
        action: { label: 'Go to Vendor Management', link: '/vendors' }
      };
    }

    return {
      text: "I have logged your request. If you require specialized human assistance or dispute resolution, please raise an official support ticket for immediate priority review.",
      action: { label: 'Raise Support Ticket', link: '/tickets' }
    };
  };

  const sendMessage = (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'agent',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    setTimeout(() => {
      const { text, action } = generateReply(trimmed);
      const botMsg: ChatMessage = {
        id: `reply-${Date.now()}`,
        sender: 'assistant',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action
      };
      setChatMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 800);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(chatInput);
  };

  const handleTopicClick = (topic: string) => {
    const cleanQuery = topic.replace(/^[^\w\s]+/, '').trim();
    sendMessage(cleanQuery);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[380px] sm:w-[420px] h-[540px] max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-[#d7c3b5]/60 flex flex-col overflow-hidden animate-fade-in font-sans">
      {/* Assistant Header */}
      <div className="bg-gradient-to-r from-[#864f19] to-[#a3672f] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#864f19] rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5 leading-tight">
              Live Chat Assistant
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </h3>
            <p className="text-[11px] text-white/80 font-medium">ConnectPortal 24/7 Operations Desk</p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close Live Chat Assistant"
          className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer border-none bg-transparent"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fdfbf9]">
        {/* Quick Topics Pills */}
        <div className="mb-2">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Quick Assistance Topics</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TOPICS.map((topic, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleTopicClick(topic)}
                className="text-[11px] font-bold px-2.5 py-1 bg-white hover:bg-[#ffdcc2] text-[#864f19] border border-[#d7c3b5]/50 rounded-xl transition cursor-pointer shadow-2xs"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        {chatMessages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`p-3 rounded-2xl max-w-[85%] space-y-1.5 shadow-2xs ${
                msg.sender === 'agent'
                  ? 'bg-[#864f19] text-white rounded-tr-none'
                  : 'bg-white text-slate-800 border border-slate-200/70 rounded-tl-none'
              }`}
            >
              <p className="font-medium text-xs leading-relaxed whitespace-pre-line">{msg.text}</p>
              
              {msg.action && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(msg.action!.link);
                  }}
                  className="mt-2 text-[11px] font-black py-1 px-3 bg-[#ffdcc2] hover:bg-[#f6caa7] text-[#864f19] rounded-xl flex items-center gap-1.5 border border-[#864f19]/20 transition cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  {msg.action.label}
                </button>
              )}

              <span className={`block text-[9px] text-right font-bold ${msg.sender === 'agent' ? 'text-white/60' : 'text-slate-400'}`}>
                {msg.time}
              </span>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white text-slate-500 p-2.5 px-3.5 rounded-2xl rounded-tl-none border border-slate-200 flex items-center gap-2 shadow-2xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#864f19]" />
              <span className="text-[11px] font-bold">Assistant is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <form onSubmit={handleFormSubmit} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder="Ask a question or describe an issue..."
          className="flex-1 bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl px-3.5 py-2.5 text-xs text-[#1b1c1c] focus:outline-none focus:ring-1 focus:ring-[#864f19]"
        />
        <button
          type="submit"
          disabled={!chatInput.trim()}
          aria-label="Send message"
          className="p-2.5 bg-[#864f19] disabled:opacity-40 text-white rounded-xl hover:bg-[#a3672f] border-none cursor-pointer flex items-center justify-center shadow-sm transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default LiveChatAssistant;
