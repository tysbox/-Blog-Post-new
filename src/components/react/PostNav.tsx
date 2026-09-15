import React, { useEffect } from 'react';

interface NavItem {
  id: string;
  title: string;
  href: string;
}

interface Props {
  prev?: NavItem | null;
  next?: NavItem | null;
}

export default function PostNav({ prev = null, next = null }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && prev) {
        window.location.href = prev.href;
      } else if (e.key === 'ArrowRight' && next) {
        window.location.href = next.href;
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  return (
    <footer className="flex justify-between items-center gap-4 mt-8">
      {prev ? (
        <a href={prev.href} className="flex items-center gap-3 text-gray-700 hover:text-amber-700">
          <span className="text-2xl">←</span>
          <div>
            <div className="text-xs text-amber-600 uppercase tracking-wide">Previous</div>
            <div className="font-semibold">{prev.title}</div>
          </div>
        </a>
      ) : (
        <div />
      )}

      {next ? (
        <a href={next.href} className="flex items-center gap-3 text-gray-700 hover:text-amber-700 ml-auto">
          <div className="text-right">
            <div className="text-xs text-amber-600 uppercase tracking-wide">Next</div>
            <div className="font-semibold">{next.title}</div>
          </div>
          <span className="text-2xl">→</span>
        </a>
      ) : (
        <div />
      )}
    </footer>
  );
}
