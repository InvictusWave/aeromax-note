'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Check,
  Copy,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  User,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { Protected } from '@/components/protected';
import { Button, Card, MorphingDiscoveryBar, type Category, Textarea } from '@/components/ui';
import { Badge } from '@/components/base-ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/base-ui/tooltip';
import { followUpState } from '@/lib/event-types';
import { useEvents } from '@/hooks/use-events';

type Tab = 'chat' | 'analysis';
type ChatMessage = { role: 'user' | 'assistant'; content: string; id?: string; timestamp?: string };

const STORAGE_CHAT_KEY = 'aeromax_ai_chat_history_v2';
const STORAGE_ANALYSIS_KEY = 'aeromax_ai_analysis_data_v2';

const AI_CATEGORIES: Category[] = [
  {
    id: 'chat',
    label: 'Chat',
    icon: <MessageSquareText size={18} />,
    activeColor: '#f1f5f2',
    activeTextColor: '#047857',
  },
  {
    id: 'analysis',
    label: 'Saran & Analisis',
    icon: <BrainCircuit size={18} />,
    activeColor: '#f1f5f2',
    activeTextColor: '#047857',
  },
];

const initialMessage: ChatMessage = {
  role: 'assistant',
  content:
    'Halo! Saya asisten AI Aeromax Studio. Siap membantu menganalisis catatan event, memetakan kebutuhan klien (live recording, sound RCF, broadcast streaming, lighting/LED), dan menyusun prioritas follow-up. Ada yang ingin didiskusikan?',
  id: 'init-msg',
};

const chatSuggestions = [
  'Siapa kontak/EO yang perlu di-follow-up hari ini?',
  'Rangkum peluang produksi live recording & sound system.',
  'Event mana yang punya potensi kolaborasi panggung terbesar?',
];

const analysisOptions = [
  {
    title: 'Prioritas follow-up',
    description: 'Urutkan kontak & event paling mendesak untuk ditindaklanjuti.',
    prompt:
      'Tentukan prioritas follow-up terpenting bagi tim Aeromax Studio. Jelaskan alasan, PIC/grup musik yang perlu dihubungi, dan tawaran layanan (sound system, streaming multicam, recording, lighting/LED) yang relevan.',
  },
  {
    title: 'Peluang upselling layanan',
    description: 'Identifikasi potensi paket audio FOH, lighting & streaming.',
    prompt:
      'Analisis peluang upselling dan cross-selling layanan Aeromax (seperti penambahan Sound RCF, Mixer Yamaha, Multicam Broadcast, atau Layar LED) berdasarkan catatan event yang ada.',
  },
  {
    title: 'Rencana aksi 7 hari',
    description: 'Susun agenda tindak lanjut tim Aeromax 7 hari ke depan.',
    prompt:
      'Susun rencana tindak lanjut konkret bagi tim Aeromax untuk 7 hari ke depan berdasarkan catatan event dan status follow-up.',
  },
  {
    title: 'Evaluasi pipeline & mitra',
    description: 'Analisis kekuatan mitra (OM, DJ, EO) dan celah data.',
    prompt:
      'Evaluasi pipeline klien dan mitra (Orkes Melayu, DJ, EO, instansi). Soroti peluang bisnis utama serta data kontak PIC yang masih perlu dilengkapi.',
  },
];

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-leaf"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic text-slate-700">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length ? parts : text;
}

function AiText({ content }: { content: string }) {
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      renderedElements.push(<div key={`gap-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Heading (### or ## or #)
    if (/^#{1,3}\s/.test(line)) {
      const headingText = line.replace(/^#{1,3}\s*/, '');
      renderedElements.push(
        <div key={`h-${i}`} className="mt-3.5 mb-1.5 first:mt-0">
          <h4 className="flex items-center gap-2 font-bold text-ink text-[14.5px]">
            <span className="h-2 w-2 rounded-full bg-leaf shrink-0" />
            {renderInlineMarkdown(headingText)}
          </h4>
        </div>
      );
      i++;
      continue;
    }

    // Numbered list (e.g. 1. 2. 3.)
    const numberMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numberMatch) {
      const num = numberMatch[1];
      const itemText = numberMatch[2];
      renderedElements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 my-1.5">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-emerald-100/70 text-[11px] font-bold text-emerald-800 mt-0.5">
            {num}
          </span>
          <div className="flex-1 text-[13.5px] leading-relaxed text-slate-800">
            {renderInlineMarkdown(itemText)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Bullet points (- or * or •)
    if (/^[-*•]\s/.test(line)) {
      const bulletText = line.replace(/^[-*•]\s*/, '');
      renderedElements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2.5 my-1.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />
          <div className="flex-1 text-[13.5px] leading-relaxed text-slate-800">
            {renderInlineMarkdown(bulletText)}
          </div>
        </div>
      );
      i++;
      continue;
    }

    // Blockquote (> )
    if (line.startsWith('>')) {
      const quoteText = line.replace(/^>\s*/, '');
      renderedElements.push(
        <div
          key={`quote-${i}`}
          className="my-2 rounded-xl border-l-4 border-leaf bg-emerald-50/60 p-3 text-xs italic text-emerald-950"
        >
          {renderInlineMarkdown(quoteText)}
        </div>
      );
      i++;
      continue;
    }

    // Normal paragraph
    renderedElements.push(
      <p key={`p-${i}`} className="text-[13.5px] leading-relaxed text-slate-800 my-1">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5 text-ink">{renderedElements}</div>;
}

async function askGemini(payload: object) {
  const response = await fetch('/api/ai', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'AI sedang tidak dapat merespons.');
  return result as { text: string; model: string };
}

export default function AiPage() {
  const { events, loading: loadingEvents, error: eventError, reload } = useEvents();
  const [tab, setTab] = useState<Tab>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [analysisTitle, setAnalysisTitle] = useState('');
  const [analysisModel, setAnalysisModel] = useState('');
  const [analysisError, setAnalysisError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const conversationEnd = useRef<HTMLDivElement>(null);

  // 1. Load chat & analysis history from localStorage on client mount
  useEffect(() => {
    try {
      const savedChat = localStorage.getItem(STORAGE_CHAT_KEY);
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }

      const savedAnalysis = localStorage.getItem(STORAGE_ANALYSIS_KEY);
      if (savedAnalysis) {
        const parsed = JSON.parse(savedAnalysis);
        if (parsed.analysis) {
          setAnalysis(parsed.analysis);
          setAnalysisTitle(parsed.analysisTitle || '');
          setAnalysisModel(parsed.analysisModel || '');
        }
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // 2. Persist chat messages to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(messages));
    } catch {
      // Ignore quota errors
    }
  }, [messages, isInitialized]);

  // 3. Persist analysis results to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    try {
      if (analysis) {
        localStorage.setItem(
          STORAGE_ANALYSIS_KEY,
          JSON.stringify({ analysis, analysisTitle, analysisModel })
        );
      }
    } catch {
      // Ignore quota errors
    }
  }, [analysis, analysisTitle, analysisModel, isInitialized]);

  const summary = useMemo(() => {
    const contacts = events.flatMap(event => event.networking);
    return {
      events: events.length,
      contacts: contacts.length,
      pending: events.filter(event => followUpState(event) === 'pending').length,
      highPotential: contacts.filter(contact => contact.potential.toLowerCase() === 'high').length,
    };
  }, [events]);

  const quickAdvice = useMemo(() => {
    const advice: string[] = [];
    if (summary.pending)
      advice.push(
        `${summary.pending} event masih menunggu follow-up. Mulai dari kontak berpotensi tinggi.`
      );
    if (summary.highPotential)
      advice.push(
        `${summary.highPotential} kontak berpotensi tinggi tersedia untuk diprioritaskan.`
      );
    const incomplete = events
      .flatMap(event => event.networking)
      .filter(contact => !contact.company || !contact.position).length;
    if (incomplete)
      advice.push(
        `${incomplete} profil kontak belum lengkap; lengkapi perusahaan atau jabatan agar analisis lebih akurat.`
      );
    if (!advice.length)
      advice.push(
        'Data tindak lanjut terlihat rapi. Jalankan analisis AI untuk mencari pola peluang berikutnya.'
      );
    return advice;
  }, [events, summary]);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, sending]);

  async function sendMessage(content = input) {
    const text = content.trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: text,
      id: `user-${Date.now()}`,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setChatError('');
    setSending(true);

    try {
      const result = await askGemini({
        mode: 'chat',
        messages: nextMessages.slice(1).slice(-10),
      });
      setMessages(current => [
        ...current,
        {
          role: 'assistant',
          content: result.text,
          id: `ai-${Date.now()}`,
        },
      ]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'AI sedang tidak dapat merespons.');
    } finally {
      setSending(false);
    }
  }

  function handleClearChat() {
    setMessages([initialMessage]);
    try {
      localStorage.removeItem(STORAGE_CHAT_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  function copyToClipboard(text: string, msgId: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  }

  function submitChat(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function handleComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function runAnalysis(title: string, prompt: string) {
    if (analyzing) return;
    setAnalysisTitle(title);
    setAnalysis('');
    setAnalysisModel('');
    setAnalysisError('');
    setAnalyzing(true);

    try {
      const result = await askGemini({ mode: 'analysis', prompt });
      setAnalysis(result.text);
      setAnalysisModel(result.model);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Analisis tidak dapat dibuat.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <Protected>
      <Brand />
      <main
        className={`mx-auto max-w-4xl px-3 sm:px-6 animate-page-enter ${
          tab === 'chat'
            ? 'pb-[calc(12rem+env(safe-area-inset-bottom))] sm:pb-32'
            : 'pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-12'
        }`}
      >
        <header className="mb-5 px-1 sm:px-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink text-lime shadow-soft">
                <Sparkles size={22} />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-leaf">
                  Asisten Aeromax
                </p>
                <h1 className="mt-0.5 text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">
                  Aeromax AI
                </h1>
              </div>
            </div>

            {tab === 'chat' && messages.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleClearChat}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-semibold text-slate-500 shadow-xs transition hover:bg-red-50 hover:text-red-600 active:scale-95"
                  >
                    <Trash2 size={13} />
                    <span className="hidden sm:inline">Bersihkan Chat</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="rounded-full">
                  <p>Reset riwayat percakapan</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-5 text-slate-500">
            Chat dan analisis cerdas otomatis tersimpan, siap membantu strategi follow-up Aeromax Studio.
          </p>
        </header>

        <div className="mb-5 flex justify-center sm:justify-start">
          <MorphingDiscoveryBar
            categories={AI_CATEGORIES}
            value={tab}
            onChange={catId => setTab(catId as Tab)}
            className="w-full sm:w-auto"
          />
        </div>

        {eventError && (
          <Card className="mb-4 flex items-center justify-between gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-none">
            <span>{eventError}</span>
            <Button
              type="button"
              onClick={reload}
              className="shrink-0 border border-red-200 bg-white px-3 text-red-700"
            >
              <RefreshCw size={15} /> Coba lagi
            </Button>
          </Card>
        )}

        {tab === 'chat' ? (
          <section aria-label="Percakapan AI">
            {!loadingEvents && messages.length === 1 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {chatSuggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="min-h-11 shrink-0 rounded-full border border-line bg-white px-4 text-xs font-semibold text-leaf shadow-sm transition hover:bg-emerald-50 active:scale-95"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              {messages.map((message, index) => {
                const isUser = message.role === 'user';
                const msgId = message.id || `msg-${index}`;
                const isCopied = copiedId === msgId;

                return (
                  <div
                    key={msgId}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-lime shadow-xs">
                        <Bot size={17} />
                      </span>
                    )}

                    <div
                      className={`group relative max-w-[calc(100%_-_3.2rem)] sm:max-w-2xl rounded-2xl px-4 py-3.5 ${
                        isUser
                          ? 'rounded-br-sm bg-leaf text-white shadow-soft'
                          : 'rounded-tl-sm border border-line bg-white text-ink shadow-soft'
                      }`}
                    >
                      {isUser ? (
                        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <div>
                          <AiText content={message.content} />
                          <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-slate-400">
                            <span className="font-medium text-leaf">Aeromax AI</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(message.content, msgId)}
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                            >
                              {isCopied ? (
                                <>
                                  <Check size={12} className="text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">Tersalin</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 shadow-xs">
                        <User size={16} />
                      </span>
                    )}
                  </div>
                );
              })}

              {sending && (
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-lime shadow-xs">
                    <Bot size={17} />
                  </span>
                  <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-sm border border-line bg-white px-4 py-3 text-sm text-slate-600 shadow-soft">
                    <Loader2 size={16} className="animate-spin text-leaf" />
                    <span>Aeromax AI sedang menganalisis catatan event...</span>
                  </div>
                </div>
              )}

              {chatError && (
                <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {chatError}
                </p>
              )}
              <div ref={conversationEnd} />
            </div>
          </section>
        ) : (
          <section className="space-y-4" aria-label="Saran dan analisis AI">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Event', summary.events],
                ['Kontak', summary.contacts],
                ['Perlu follow-up', summary.pending],
                ['Potensi tinggi', summary.highPotential],
              ].map(([label, value]) => (
                <Card key={String(label)} className="p-3.5 shadow-none">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-bold">{loadingEvents ? '—' : value}</p>
                </Card>
              ))}
            </div>

            <Card className="border-lime bg-lime/45 p-4 shadow-none">
              <div className="flex items-center gap-2 font-bold text-ink">
                <Sparkles size={17} className="text-leaf" /> Saran cepat
              </div>
              <div className="mt-3 space-y-2">
                {quickAdvice.map(advice => (
                  <p key={advice} className="flex gap-2 text-sm leading-5 text-slate-800">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />
                    {advice}
                  </p>
                ))}
              </div>
            </Card>

            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-bold text-ink">Analisis lanjutan</h2>
                  <p className="mt-1 text-xs text-slate-500">Pilih fokus analisis yang dibutuhkan.</p>
                </div>
                <Badge variant="outline" className="rounded-full bg-white text-[10px] font-semibold text-leaf shadow-xs">
                  Gemini Flash + Thought
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {analysisOptions.map(option => (
                  <button
                    key={option.title}
                    type="button"
                    onClick={() => void runAnalysis(option.title, option.prompt)}
                    className="min-h-24 rounded-2xl border border-line bg-white p-4 text-left shadow-xs transition active:scale-[.99] sm:hover:border-leaf hover:shadow-soft"
                  >
                    <span className="flex items-center justify-between gap-3 font-bold text-ink">
                      {option.title}
                      <ArrowUpRight size={16} className="shrink-0 text-leaf" />
                    </span>
                    <span className="mt-1.5 block text-xs leading-5 text-slate-500">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              disabled={analyzing || loadingEvents}
              onClick={() =>
                void runAnalysis(
                  'Analisis Menyeluruh Aeromax',
                  'Buat analisis menyeluruh performa event marketing dan penawaran layanan Aeromax Studio. Berikan ringkasan eksekutif, 5 prioritas utama, peluang upselling layanan (sound RCF, multicam recording, lighting/LED), risiko, dan rencana tindakan konkret.'
                )
              }
              className="w-full bg-ink text-white shadow-soft"
            >
              {analyzing ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Menganalisis data event...
                </>
              ) : (
                <>
                  <BrainCircuit size={17} /> Buat Analisis Menyeluruh
                </>
              )}
            </Button>

            {(analysis || analyzing || analysisError) && (
              <Card className="overflow-hidden shadow-soft">
                <div className="flex items-center justify-between gap-3 border-b border-line bg-mist px-4 py-3">
                  <p className="font-bold text-ink">{analysisTitle || 'Hasil analisis'}</p>
                  <div className="flex items-center gap-2">
                    {analysisModel && (
                      <span className="max-w-36 truncate rounded-full bg-white px-2.5 py-0.5 text-[9px] font-semibold text-leaf shadow-xs">
                        {analysisModel}
                      </span>
                    )}
                    {analysis && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(analysis, 'analysis-result')}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-xs transition hover:bg-slate-50"
                      >
                        {copiedId === 'analysis-result' ? (
                          <>
                            <Check size={13} className="text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Salin Analisis</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  {analyzing && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                      <Loader2 size={17} className="animate-spin text-leaf" /> Gemini sedang membaca seluruh data catatan...
                    </div>
                  )}
                  {analysis && <AiText content={analysis} />}
                  {analysisError && <p className="text-sm text-red-700">{analysisError}</p>}
                </div>
              </Card>
            )}
          </section>
        )}
      </main>

      {tab === 'chat' && (
        <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-white/95 px-3 py-2.5 backdrop-blur-md sm:bottom-0 sm:px-6 sm:py-3 shadow-md">
          <form onSubmit={submitChat} className="mx-auto flex max-w-4xl items-end gap-2">
            <Textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleComposerKey}
              rows={1}
              maxLength={2_000}
              placeholder="Tanyakan peluang, kontak, atau rekomendasi paket Aeromax..."
              className="max-h-32 min-h-11 resize-none rounded-2xl border-line bg-mist/60 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-leaf shadow-none"
              aria-label="Pesan untuk Aeromax AI"
            />
            <Button
              type="submit"
              disabled={!input.trim() || sending}
              className="h-11 w-11 shrink-0 rounded-2xl bg-ink p-0 text-white shadow-soft hover:bg-slate-900"
              aria-label="Kirim pesan"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />}
            </Button>
          </form>
        </div>
      )}
    </Protected>
  );
}
