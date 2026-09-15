import React, { useState } from 'react';
import { richTextToHtml } from '../../utils/richText';

interface JapaneseAccordionProps {
  content: any;
}

export default function JapaneseAccordion({ content }: JapaneseAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!content) return null;
  // generate a stable-ish id based on content (simple hash)
  const id = React.useMemo(() => {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    let h = 0;
    for (let i = 0; i < Math.min(64, str.length); i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return `japanese-accordion-${Math.abs(h)}`;
  }, [content]);

  const renderContent = () => {
    try {
      const html = richTextToHtml(content);

      if (!html) {
        return null;
      }

      return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('JapaneseAccordion render error:', err);
      return <pre style={{ whiteSpace: 'pre-wrap' }}>{typeof content === 'string' ? content : JSON.stringify(content, null, 2)}</pre>;
    }
  };

  return (
    <div className="japanese-accordion" style={{ margin: '2rem 0' }}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.5rem 0',
          textAlign: 'left',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 'bold',
          color: '#A36A4F',
          fontSize: '1rem'
        }}
      >
        <span>日本語バージョン　（Japanese Original Script）</span>
        <span style={{
          border: '1px solid #A36A4F',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L5 5L9 1" stroke="#A36A4F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      {isOpen && (
        <div id={id} role="region" style={{ padding: '1.5rem 0', backgroundColor: 'transparent', color: '#A36A4F' }}>
          {renderContent()}
        </div>
      )}
    </div>
  );
}
