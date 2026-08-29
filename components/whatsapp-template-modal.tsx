'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Sparkles,
  X,
} from 'lucide-react';
import {
  cleanPhoneNumber,
  getWhatsAppUrl,
  WA_TEMPLATES,
  WhatsAppTemplateKey,
} from '@/lib/contact-actions';
import { Button, Card } from '@/components/ui';

export interface WhatsAppTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactName: string;
  contactPhone: string;
  eventName: string;
  companyName?: string;
}

export function WhatsAppTemplateModal({
  isOpen,
  onClose,
  contactName,
  contactPhone,
  eventName,
  companyName,
}: WhatsAppTemplateModalProps) {
  const [selectedKey, setSelectedKey] = useState<WhatsAppTemplateKey>('intro');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentTemplate = WA_TEMPLATES.find((t) => t.key === selectedKey) || WA_TEMPLATES[0];
  const messageText = currentTemplate.getText(contactName, eventName);
  const waUrl = getWhatsAppUrl(contactPhone, contactName, eventName, selectedKey);
  const isValidPhone = Boolean(cleanPhoneNumber(contactPhone));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-[28px] border border-line bg-white p-5 shadow-2xl transition-all sm:rounded-[24px] sm:p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <MessageCircle size={20} />
            </span>
            <div>
              <h3 className="font-bold text-ink text-base">Template Pesan WhatsApp</h3>
              <p className="text-xs text-slate-500">
                Penerima: <strong className="text-ink">{contactName}</strong>
                {companyName ? ` (${companyName})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {/* Template Selector Pills */}
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Pilih Layanan & Template Pesan
          </p>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-line bg-mist p-1.5">
            {WA_TEMPLATES.map((tmpl) => {
              const active = tmpl.key === selectedKey;
              return (
                <button
                  key={tmpl.key}
                  type="button"
                  onClick={() => setSelectedKey(tmpl.key)}
                  className={`flex flex-col items-start rounded-xl py-2 px-2.5 text-left text-xs transition-all ${
                    active
                      ? 'bg-white text-emerald-950 shadow-xs ring-1 ring-black/5 font-bold'
                      : 'text-slate-600 hover:text-ink hover:bg-white/50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="truncate font-bold">{tmpl.label}</span>
                    <span className="rounded bg-emerald-100/70 px-1 py-0.2 text-[9px] font-semibold text-emerald-800 shrink-0">
                      {tmpl.badge}
                    </span>
                  </div>
                  <span className="mt-0.5 line-clamp-1 text-[10px] text-slate-400 font-normal">
                    {tmpl.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Preview Box */}
        <div className="mt-4">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pratinjau Pesan
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-xs font-semibold text-leaf hover:underline"
            >
              {copied ? (
                <>
                  <Check size={13} /> Tersalin
                </>
              ) : (
                <>
                  <Copy size={13} /> Salin Teks
                </>
              )}
            </button>
          </div>
          <Card className="rounded-2xl bg-emerald-50/40 border-emerald-100 p-3.5 text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap select-text font-normal shadow-none">
            {messageText}
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-col gap-2 min-[440px]:flex-row min-[440px]:justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="border border-line bg-white px-4 text-ink hover:bg-slate-50"
          >
            Batal
          </Button>

          {isValidPhone && waUrl ? (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <ExternalLink size={16} /> Buka WhatsApp Sekarang
            </a>
          ) : (
            <Button
              type="button"
              onClick={handleCopy}
              className="bg-ink text-white hover:bg-slate-900"
            >
              <Copy size={16} /> Salin Teks Pesan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default WhatsAppTemplateModal;
