'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Bot,
  BrainCircuit,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { Protected } from '@/components/protected';
import { Button, Card, MorphingDiscoveryBar, type Category, Textarea } from '@/components/ui';
import { followUpState } from '@/lib/event-types';
import { useEvents } from '@/hooks/use-events';

type Tab = 'chat' | 'analysis';
type ChatMessage = { role: 'user' | 'assistant'; content: string };

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
  content: 'Halo! Saya siap membantu membaca catatan event Aeromax, menentukan prioritas follow-up, dan menemukan peluang bisnis. Apa yang ingin Anda ketahui?',
};

const chatSuggestions = [
  'Event mana yang harus diprioritaskan?',
  'Siapa yang perlu di-follow-up hari ini?',
  'Rangkum peluang dengan potensi tinggi.',
];

const analysisOptions = [
  {
    title: 'Prioritas follow-up',
    description: 'Urutkan kontak dan event yang paling mendesak.',
    prompt: 'Tentukan 5 prioritas follow-up terpenting. Jelaskan alasan dan tindakan berikutnya untuk masing-masing prioritas.',
  },
  {
    title: 'Kualitas pipeline',
    description: 'Nilai kekuatan prospek dan celah data yang ada.',
    prompt: 'Analisis kualitas pipeline prospek Aeromax. Kelompokkan peluang kuat, sedang, dan lemah serta jelaskan celah data yang harus dilengkapi.',
  },
  {
    title: 'Rencana 7 hari',
    description: 'Susun agenda tindak lanjut yang realistis.',
    prompt: 'Susun rencana tindak lanjut Aeromax untuk 7 hari ke depan. Buat urutan prioritas yang konkret dan realistis berdasarkan data.',
  },
  {
    title: 'Pola dan peluang',
    description: 'Temukan pola industri, event, dan potensi kontak.',
    prompt: 'Temukan pola penting dari seluruh event, industri, kontak, dan prospek. Soroti peluang bisnis serta risiko yang mungkin terlewat.',
  },
];

function AiText({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-6">
      {content.split('\n').map((rawLine, index) => {
        const line = rawLine.trim();
        const cleanMarkdown = (value: string) => value
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1');
        if (!line) return <div key={index} className="h-1" />;
        if (/^#{1,3}\s/.test(line)) return <p key={index} className="pt-1 font-bold">{cleanMarkdown(line.replace(/^#{1,3}\s*/, ''))}</p>;
        if (/^[-*•]\s/.test(line)) {
          return <p key={index} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />{cleanMarkdown(line.replace(/^[-*•]\s*/, ''))}</p>;
        }
        return <p key={index}>{cleanMarkdown(line)}</p>;
      })}
    </div>
  );
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
  const conversationEnd = useRef<HTMLDivElement>(null);

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
    if (summary.pending) advice.push(`${summary.pending} event masih menunggu follow-up. Mulai dari kontak berpotensi tinggi.`);
    if (summary.highPotential) advice.push(`${summary.highPotential} kontak berpotensi tinggi tersedia untuk diprioritaskan.`);
    const incomplete = events.flatMap(event => event.networking).filter(contact => !contact.company || !contact.position).length;
    if (incomplete) advice.push(`${incomplete} profil kontak belum lengkap; lengkapi perusahaan atau jabatan agar analisis lebih akurat.`);
    if (!advice.length) advice.push('Data tindak lanjut terlihat rapi. Jalankan analisis AI untuk mencari pola peluang berikutnya.');
    return advice;
  }, [events, summary]);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, sending]);

  async function sendMessage(content = input) {
    const text = content.trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
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
      setMessages(current => [...current, { role: 'assistant', content: result.text }]);
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'AI sedang tidak dapat merespons.');
    } finally {
      setSending(false);
    }
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
      <main className={`mx-auto max-w-4xl px-3 sm:px-6 animate-page-enter ${tab === 'chat' ? 'pb-[calc(12rem+env(safe-area-inset-bottom))] sm:pb-32' : 'pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-12'}`}>
        <header className="mb-5 px-1 sm:px-0">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink text-lime"><Sparkles size={22} /></span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-leaf">Asisten Aeromax</p>
              <h1 className="mt-0.5 text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">Aeromax AI</h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-5 text-slate-500">Chat dan analisis cerdas berdasarkan catatan event yang tersimpan.</p>
        </header>

        <div className="mb-5 flex justify-center sm:justify-start">
          <MorphingDiscoveryBar
            categories={AI_CATEGORIES}
            value={tab}
            onChange={(catId) => setTab(catId as Tab)}
            className="w-full sm:w-auto"
          />
        </div>

        {eventError && (
          <Card className="mb-4 flex items-center justify-between gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-none">
            <span>{eventError}</span>
            <Button type="button" onClick={reload} className="shrink-0 border border-red-200 bg-white px-3 text-red-700"><RefreshCw size={15} /> Coba lagi</Button>
          </Card>
        )}

        {tab === 'chat' ? (
          <section aria-label="Percakapan AI">
            {!loadingEvents && messages.length === 1 && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {chatSuggestions.map(suggestion => (
                  <button key={suggestion} type="button" onClick={() => void sendMessage(suggestion)} className="min-h-11 shrink-0 rounded-full border border-line bg-white px-4 text-xs font-semibold text-leaf shadow-sm">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex items-start gap-2.5 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-lime"><Bot size={17} /></span>}
                  <div className={`max-w-[calc(100%_-_3rem)] rounded-2xl px-4 py-3 ${message.role === 'user' ? 'rounded-br-md bg-leaf text-white' : 'rounded-tl-md border border-line bg-white text-ink shadow-sm'}`}>
                    <AiText content={message.content} />
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-lime"><Bot size={17} /></span>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-line bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                    <Loader2 size={16} className="animate-spin text-leaf" /> Sedang menganalisis data...
                  </div>
                </div>
              )}
              {chatError && <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{chatError}</p>}
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
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-bold">{loadingEvents ? '—' : value}</p>
                </Card>
              ))}
            </div>

            <Card className="border-lime bg-lime/45 p-4 shadow-none">
              <div className="flex items-center gap-2 font-bold"><Sparkles size={17} className="text-leaf" /> Saran cepat</div>
              <div className="mt-3 space-y-2">
                {quickAdvice.map(advice => <p key={advice} className="flex gap-2 text-sm leading-5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-leaf" />{advice}</p>)}
              </div>
            </Card>

            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-bold">Analisis lanjutan</h2>
                  <p className="mt-1 text-xs text-slate-500">Pilih fokus analisis yang dibutuhkan.</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-leaf shadow-sm">Gemini 3 + 2.5</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {analysisOptions.map(option => (
                  <button key={option.title} type="button" onClick={() => void runAnalysis(option.title, option.prompt)} className="min-h-24 rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition active:scale-[.99] sm:hover:border-leaf">
                    <span className="flex items-center justify-between gap-3 font-bold">{option.title}<ArrowUpRight size={16} className="shrink-0 text-leaf" /></span>
                    <span className="mt-1.5 block text-xs leading-5 text-slate-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button type="button" disabled={analyzing || loadingEvents} onClick={() => void runAnalysis('Analisis menyeluruh', 'Buat analisis menyeluruh performa event marketing Aeromax. Berikan ringkasan eksekutif, 5 prioritas, peluang utama, risiko, dan rencana tindakan yang konkret.')} className="w-full bg-ink text-white">
              {analyzing ? <><Loader2 size={17} className="animate-spin" /> Menganalisis...</> : <><BrainCircuit size={17} /> Buat Analisis Menyeluruh</>}
            </Button>

            {(analysis || analyzing || analysisError) && (
              <Card className="overflow-hidden shadow-none">
                <div className="flex items-center justify-between gap-3 border-b border-line bg-mist px-4 py-3">
                  <p className="font-bold">{analysisTitle || 'Hasil analisis'}</p>
                  {analysisModel && <span className="max-w-36 truncate rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-leaf">{analysisModel}</span>}
                </div>
                <div className="p-4">
                  {analyzing && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={17} className="animate-spin text-leaf" /> Gemini sedang membaca catatan...</div>}
                  {analysis && <AiText content={analysis} />}
                  {analysisError && <p className="text-sm text-red-700">{analysisError}</p>}
                </div>
              </Card>
            )}
          </section>
        )}
      </main>

      {tab === 'chat' && (
        <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-mist/95 px-3 py-2 backdrop-blur sm:bottom-0 sm:px-6 sm:py-3">
          <form onSubmit={submitChat} className="mx-auto flex max-w-4xl items-end gap-2">
            <Textarea
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleComposerKey}
              rows={1}
              maxLength={2_000}
              placeholder="Tanyakan sesuatu tentang data event..."
              className="max-h-32 min-h-12 resize-none rounded-2xl bg-white py-3 shadow-sm"
              aria-label="Pesan untuk Aeromax AI"
            />
            <Button type="submit" disabled={!input.trim() || sending} className="h-12 w-12 shrink-0 rounded-2xl bg-ink p-0 text-white" aria-label="Kirim pesan">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </Button>
          </form>
        </div>
      )}
    </Protected>
  );
}
