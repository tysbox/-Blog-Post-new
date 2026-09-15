import React, { useState } from 'react';
import { useTina } from 'tinacms/dist/react';
import JapaneseAccordion from './JapaneseAccordion';
import { richTextToHtml } from '../../utils/richText';

interface ContentLayoutProps {
  data: any; // We'll type this loosely or match the query result
  query?: string;
  variables?: any;
}

export default function ContentLayout(props: ContentLayoutProps) {
  const { data } = useTina({
    query: props.query,
    variables: props.variables,
    data: props.data,
  });

  const page = data.contentPage || data.page; // Handle potential query name differences
  const { hero, japaneseText, contentSections } = page;

  return (
    <>
      <div className="relative w-full">
        {hero?.image1 && (
          <img 
            alt={hero.title || 'Hero Image'} 
            className="w-full h-[66vh] object-cover" 
            src={hero.image1}
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="w-4/5 -translate-y-12">
            <h1 style={{ color: 'white', fontSize: 'clamp(1.75rem, 6vw, 3.5rem)', lineHeight: 1.05, fontWeight: 700 }}>
              {hero?.title}
            </h1>
            <p className="text-white text-lg mt-2 whitespace-pre-wrap">{hero?.subtitle}</p>
          </div>
        </div>
      </div>

      {japaneseText && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <JapaneseAccordion content={japaneseText} />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        {contentSections?.map((section: any, index: number) => {
          if (section.__typename?.endsWith('TextBlock') || section._template === 'textBlock') {
            return (
              <div key={index} className="text-gray-700 text-base font-normal leading-relaxed space-y-4">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: richTextToHtml(section.bodyText) }} />
              </div>
            );
          }
          
          if (section.__typename?.endsWith('ImageGrid') || section._template === 'imageGrid') {
            const images = section.images || [];
            const isSingle = images.length === 1;

            if (isSingle) {
              const img = images[0];
              return (
                <div key={index} className="flex justify-center w-full">
                  <div className="flex flex-col gap-2 w-full md:w-3/4">
                    <img 
                      alt={img.label || 'Content Image'} 
                      className="w-full aspect-[3/2] object-cover rounded-lg shadow-sm" 
                      src={img.src}
                    />
                    {(img.label || img.caption) && (
                      <div className="text-sm text-gray-500 text-center">
                        {img.label && <span className="font-bold block">{img.label}</span>}
                        {img.caption && <span>{img.caption}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            
            return (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images.map((img: any, imgIndex: number) => (
                  <div key={imgIndex} className="flex flex-col gap-2">
                    <img 
                      alt={img.label || 'Content Image'} 
                      className="w-full aspect-square object-cover rounded-lg" 
                      src={img.src}
                    />
                    {(img.label || img.caption) && (
                      <div className="text-sm text-gray-500">
                        {img.label && <span className="font-bold block">{img.label}</span>}
                        {img.caption && <span>{img.caption}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })}
      </div>
    </>
  );
}
