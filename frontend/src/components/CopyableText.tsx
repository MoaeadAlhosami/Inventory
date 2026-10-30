import { useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../hooks/useToast';

interface Props {
  value: string;
  label: string;
  className?: string;
}

interface TooltipPosition {
  left: number;
  top: number;
  placeAbove: boolean;
}

async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!ok) throw new Error('Clipboard is not available in this browser.');
}

export function CopyableText({ value, label, className = '' }: Props) {
  const toast = useToast();
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const showTooltip = (e: MouseEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      left: rect.left,
      top: rect.top < 80 ? rect.bottom + 8 : rect.top - 8,
      placeAbove: rect.top >= 80,
    });
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(value);
      toast.success(`${label} copied`, value);
    } catch (err) {
      toast.error('Copy failed', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <>
      <span
        role="button"
        tabIndex={0}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setPosition(null)}
        onClick={handleCopy}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCopy();
          }
        }}
        className={`block cursor-copy truncate hover:underline decoration-dotted underline-offset-4 focus:outline-none ${className}`}
      >
        {value}
      </span>

      {position && createPortal(
        <div
          className={`pointer-events-none fixed z-[90] max-w-[min(520px,calc(100vw-2rem))] rounded-lg border border-slate-200 dark:border-[#30363d] bg-light-surface dark:bg-[#1f2328] px-3 py-2 shadow-xl ${
            position.placeAbove ? '-translate-y-full' : ''
          }`}
          style={{ left: position.left, top: position.top }}
        >
          <p className="whitespace-normal break-words text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-[#8b949e]">Click to copy</p>
        </div>,
        document.body,
      )}
    </>
  );
}
