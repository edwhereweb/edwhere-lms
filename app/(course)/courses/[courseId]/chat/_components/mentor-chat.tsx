'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Author {
  id: string;
  name: string;
  imageUrl: string | null;
  role: string;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
}

interface MentorChatProps {
  courseId: string;
  currentProfileId: string;
  currentRole: string;
  /** For instructors: the student's profile ID whose thread to view/reply to */
  threadStudentId?: string;
  /** Called after marking read — hub uses this to refresh unread count */
  onMarkedRead?: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Mentor',
  TEACHER: 'Mentor',
  STUDENT: 'Student'
};

export function MentorChat({
  courseId,
  currentProfileId,
  currentRole,
  threadStudentId,
  onMarkedRead
}: MentorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isInstructor = currentRole === 'TEACHER' || currentRole === 'ADMIN';

  // Determine which thread to show — students always use their own ID
  const resolvedThreadId = isInstructor ? threadStudentId : currentProfileId;

  const fetchMessages = useCallback(async () => {
    if (!resolvedThreadId) return;
    try {
      const { data } = await axios.get(
        `/api/courses/${courseId}/messages?threadStudentId=${resolvedThreadId}`
      );
      setMessages(data);
    } catch {
      // silently fail on poll
    } finally {
      setLoading(false);
    }
  }, [courseId, resolvedThreadId]);

  const markedRead = useRef(false);

  // Initial load + mark-as-read
  useEffect(() => {
    fetchMessages();

    if (!markedRead.current) {
      markedRead.current = true;
      if (isInstructor && threadStudentId) {
        axios
          .post(`/api/courses/${courseId}/messages/read`, { studentId: threadStudentId })
          .then(() => onMarkedRead?.())
          .catch(() => {
            /* non-critical */
          });
      } else if (!isInstructor) {
        // Students mark their own thread read
        axios
          .post(`/api/courses/${courseId}/messages/read-student`)
          .then(() => onMarkedRead?.())
          .catch(() => {
            /* non-critical */
          });
      }
    }
  }, [fetchMessages, courseId, isInstructor, threadStudentId, onMarkedRead]);

  // Poll every 5 s
  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !resolvedThreadId) return;

    setSending(true);
    try {
      const { data } = await axios.post(`/api/courses/${courseId}/messages`, {
        content: trimmed,
        ...(isInstructor ? { threadStudentId: resolvedThreadId } : {})
      });
      setMessages((prev) => [...prev, data]);
      setInput('');
      textareaRef.current?.focus();
    } catch {
      // toast would go here
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isMine = (msg: Message) => msg.author.id === currentProfileId;
  const isMentor = (role: string) => role === 'TEACHER' || role === 'ADMIN';

  if (!resolvedThreadId) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        No thread selected.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b bg-white dark:bg-slate-900 shrink-0">
        <div className="h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">
            Mentor Connect
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isInstructor ? 'Private chat with student' : 'Ask your course mentor anything'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="flex justify-center pt-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-3 pt-16">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">
              {isInstructor
                ? "This student hasn't asked anything yet."
                : 'Ask your first question — a mentor will reply.'}
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const mine = isMine(msg);
          const mentor = isMentor(msg.author.role);
          return (
            <div key={msg.id} className={cn('flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}>
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white',
                  mentor ? 'bg-emerald-500' : 'bg-blue-500'
                )}
              >
                {msg.author.name.charAt(0).toUpperCase()}
              </div>
              <div className={cn('flex flex-col max-w-[72%]', mine ? 'items-end' : 'items-start')}>
                <span className="text-[10px] text-slate-400 mb-1 px-1">
                  {mine ? 'You' : msg.author.name}
                  {` · ${ROLE_LABEL[msg.author.role] ?? msg.author.role}`}
                  {` · ${format(new Date(msg.createdAt), 'dd MMM, h:mm a')}`}
                </span>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
                    mine
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : mentor
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-slate-800 dark:text-slate-100 border border-emerald-200 dark:border-emerald-800 rounded-tl-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-slate-100 max-h-32"
            placeholder={
              isInstructor ? 'Reply to student… (Enter to send)' : 'Ask a question… (Enter to send)'
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ height: 'auto', minHeight: '42px' }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-10 w-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 text-white animate-spin" />
            ) : (
              <Send className="h-4 w-4 text-white" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 ml-1">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
