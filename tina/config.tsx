import { defineConfig } from "tinacms";
import React from "react";

// Your hosting provider likely exposes this as an environment variable
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.CF_PAGES_BRANCH ||
  process.env.HEAD ||
  "main";

export default defineConfig({
  branch,
  apiURL: "http://localhost:7777/api",

  // Local mode
  clientId: null,
  token: null,

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  media: {
    tina: {
      mediaRoot: "images",
      publicFolder: "public",
    },
  },
  // See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/schema/
  schema: {
    collections: [
      {
        name: "portal",
        label: "Portal (Home)",
        path: "src/content/portal",
        format: "json",
        ui: {
          allowedActions: {
            create: false,
            delete: false,
          },
        },
        fields: [
          { type: "string", name: "title", label: "Title", isTitle: true, required: true },
          {
            type: "object",
            name: "hero",
            label: "Hero Section (Carousel)",
            fields: [
              {
                type: 'object',
                name: 'slides',
                label: 'Slides',
                list: true,
                ui: { itemProps: (item) => ({ label: item?.title || 'Slide' }) },
                fields: [
                  { type: 'image', name: 'image', label: 'Image' },
                  { type: 'string', name: 'title', label: 'Center Title' },
                  { type: 'string', name: 'subtitle', label: 'Subtitle', ui: { component: 'textarea' }, description: 'Supports multiple lines. Press Enter for line breaks.' },
                  { type: 'string', name: 'leftTitle', label: 'Left Title' },
                  { type: 'string', name: 'rightTitle', label: 'Right Title' },
                ],
              },
              // Backwards-compatible single-image fields
              { type: "image", name: "image1", label: "Image 1" },
              { type: "image", name: "image2", label: "Image 2" },
              { type: "image", name: "image3", label: "Image 3" },
              { type: "image", name: "image4", label: "Image 4" },
              { type: "image", name: "image5", label: "Image 5" },
              { type: "string", name: "title", label: "Main Title" },
              { type: "string", name: "subtitle", label: "Subtitle" },
            ],
          },
          {
            type: "string",
            name: "introTitle",
            label: "Intro Title",
          },
          {
            type: "string",
            name: "introText",
            label: "Intro Text",
            ui: {
              component: "textarea",
            },
          },
          {
            type: "number",
            name: "displayCount",
            label: "Top Page Display Count",
            description: "Number of articles shown on the top page (featured + grid).",
            ui: {
              defaultValue: 5,
            },
          },
          {
            type: "object",
            name: "featuredItems",
            label: "Featured Items (Overrides Automatic Sorting)",
            description: "Select items to pin to the top. Unselected slots will be filled by latest content.",
            list: true,
            ui: {
              itemProps: (item) => {
                return { label: item?.item || 'Featured Item' };
              },
            },
            fields: [
              {
                type: "reference",
                name: "item",
                label: "Content Item",
                collections: ["blog"],
              }
            ]
          },
        ],
      },
      {
        name: "blog",
        label: "Blog Posts",
        path: "src/content/blog",
        format: "mdx",
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "description",
            label: "Description",
          },
          {
            type: "datetime",
            name: "pubDate",
            label: "Date Posted",
            required: true,
          },
          {
            type: "image",
            name: "heroImage",
            label: "Hero Image",
          },
          {
            type: "rich-text",
            name: "japaneseText",
            label: "Japanese Version (Full Text)",
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
            templates: [
              {
                name: "TextBox",
                label: "Text Box",
                fields: [
                  {
                    type: "rich-text",
                    name: "text",
                    label: "Text",
                  },
                ],
              },
              {
                name: "ImageGallery",
                label: "Image Gallery",
                fields: [
                  {
                    type: "object",
                    name: "images",
                    label: "Images",
                    list: true,
                    ui: {
                      itemProps: (item) => {
                        return { label: item?.label || 'Image' };
                      },
                      validate: (value) => {
                        if (value && value.length < 2) {
                          return 'Must have at least 2 images';
                        }
                        if (value && value.length > 6) {
                          return 'Must have at most 6 images';
                        }
                      },
                    },
                    fields: [
                      { type: "image", name: "src", label: "Image Source" },
                      { type: "string", name: "label", label: "Label" },
                      { type: "string", name: "caption", label: "Caption" },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      // `contentPage` (src/content/pages) は削除した。同じ記事が
      // blog (src/content/blog/*.mdx) と二重に存在し、/{slug} と
      // /blog/{slug} の2URLで同じ内容が公開されていたため。
      // 記事は blog コレクションだけで管理する。
      {
        name: "global",
        label: "Global Settings",
        path: "src/content/global",
        format: "json",
        ui: {
          allowedActions: {
            create: false,
            delete: false,
          },
        },
        templates: [
          {
            name: "config",
            label: "Site Configuration",
            fields: [
              { type: "string", name: "siteTitle", label: "Site Title" },
              {
                type: "object",
                name: "navLinks",
                label: "Navigation Links",
                list: true,
                fields: [
                  { type: "string", name: "label", label: "Label" },
                  { type: "string", name: "href", label: "URL" },
                ],
              },
              {
                type: "image",
                name: "lpLogo",
                label: "LP Logo (right-side header)",
                description: "Upload the logo image used for the LP link in the header (right side).",
              },
              { type: "string", name: "lpUrl", label: "LP Link URL", description: "The URL the LP logo should link to (include https://)." },
              {
                type: "object",
                name: "socialLinks",
                label: "Social Links",
                list: true,
                fields: [
                  { type: "string", name: "platform", label: "Platform" },
                  { type: "string", name: "href", label: "URL" },
                ],
              },
              { type: "string", name: "footerText", label: "Footer Text" },
            ]
          },
          {
            name: "about",
            label: "About Page",
            fields: [
              { type: "string", name: "mainTitle", label: "Main Title" },
              { type: "string", name: "subTitle", label: "Sub Title" },
              { type: "string", name: "aboutBlogTitle", label: "Top Section Title (About Blog)" },
              { type: "string", name: "aboutBlogText", label: "Top Section Text", ui: { component: "textarea" } },
              { type: "string", name: "aboutAuthorTitle", label: "Bottom Section Title (About Author)" },
              { type: "string", name: "aboutAuthorText", label: "Bottom Section Text", ui: { component: "textarea" } },
              { type: "string", name: "contactTitle", label: "Contact Title" },
            ]
          }
        ]
      },
      {
        name: "page",
        label: "Pages (MDX)",
        path: "src/content/page",
        format: "mdx",
        fields: [
           {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true,
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
          },
        ]
      },
    ],
  },
  cmsCallback: (cms) => {
    cms.plugins.add({
      __type: "screen",
      name: "Preview",
      Icon: () => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ),
      layout: "fullscreen",
      Component: () => {
        const [url, setUrl] = React.useState('');
        const previewTarget = 'tina-preview-window';
        const previewPort = 4321;
        const previewBase = `${window.location.protocol}//${window.location.hostname}:${previewPort}`;

        return (
          <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: '24px', marginBottom: '24px', fontWeight: 'bold' }}>Site Preview</h1>
            
            {/* Quick Preview Section */}
            <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
               <h2 style={{ fontSize: '18px', marginBottom: '12px', fontWeight: '600', color: '#1f2937' }}>Quick Preview</h2>
               <p style={{ marginBottom: '16px', fontSize: '14px', color: '#4b5563' }}>
                 Open the home page to navigate through the site.
               </p>
               <button
                  onClick={() => window.open(`${previewBase}/`, previewTarget, 'noopener,noreferrer')}
                  style={{
                    backgroundColor: '#2296fe',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  Open Home Page
                </button>
            </div>

            {/* Specific Page Section */}
            <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#374151' }}>
                Preview Specific Page
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="your-page-slug"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '16px'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && url) {
                      const path = url.startsWith('/') ? url : `/${url}`;
                      window.open(`${previewBase}${path}`, previewTarget, 'noopener,noreferrer');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if(url) {
                      const path = url.startsWith('/') ? url : `/${url}`;
                      window.open(`${previewBase}${path}`, previewTarget, 'noopener,noreferrer')
                    }
                  }}
                  style={{
                    backgroundColor: url ? '#4b5563' : '#9ca3af',
                    color: 'white',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: url ? 'pointer' : 'not-allowed',
                    fontWeight: '600',
                    fontSize: '16px',
                    whiteSpace: 'nowrap'
                  }}
                  disabled={!url}
                >
                  Open Page
                </button>
              </div>
              <p style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280', lineHeight: '1.4' }}>
                Enter the filename (e.g., <code>kado</code>) to preview a newly created page directly.
              </p>
            </div>
          </div>
        );
      },
    });
  },
});
