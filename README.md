This is a [Tina CMS](https://tina.io/) starter project.

# Astro + TinaCMS Starter Kit: Blog

```sh
npx create-tina-app@latest --template tina-astro-starter
```

And start editing with TinaCMS at `/admin`! 


> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

![blog](https://github.com/withastro/astro/assets/2244813/ff10799f-a816-4703-b967-c78997e8323d)

Features:

- ✅ Markdown & MDX support + TinaCMS Markdown Component
- ✅ TinaCMS Collections (Pages, Blogs, Config)
- ✅ Visual Editing using Custom Loaders and Client Directives (requires React)
- ✅ 100/100 Lighthouse performance
- ✅ View transitions are enabled 
- ✅ Minimal styling (make it your own!)
- ✅ SEO-friendly with canonical URLs and OpenGraph data
- ✅ Sitemap support
- ✅ RSS Feed support


## 🚀 Project Structure

Inside of your project, you'll see the following folders and files:

```text
├── README.md
├── astro-tina-directive/
├── astro.config.mjs
├── package.json
├── pnpm-lock.yaml
├── public/
├── src
│   ├── components
│   ├── content
│   ├── content.config.ts
│   ├── layouts
│   ├── pages
│   └── styles
├── tina
│   ├── collections
│   ├── components
│   ├── config.ts
│   ├── pages
│   └── tina-lock.json
└── tsconfig.json
```

Each page is exposed as a route based on its file name which are generated from the content under `src/content/` (excluding the `config` folder). 

To enable Visual Editing with TinaCMS we have had to use React components and a new `client:tina` Directive. Which is the code located under `astro-tina-directive`. 

Under the `tina/` folder we have, `collections/` which holds our TinaCMS schema definitions. Under `components/` we have a custom Icon Component that is used within the TinaCMS UI. Under `pages/` we have the "wrappers" that make the Visual Editing work, using the `useTina` hook. 

The `pages/index.astro` is the "Home" page - This is a special case and has been setup to look for the `content/page/home.mdx` file. 

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

The `src/content/` directory contains "collections" of related Markdown and MDX documents. Use `getCollection()` to retrieve posts from `src/content/blog/`, and type-check your frontmatter using an optional schema. See [Astro's Content Collections docs](https://docs.astro.build/en/guides/content-collections/) to learn more.

> [!NOTE]
> To use `getCollection()` we need to add a schema in `content.config.ts` with a custom loader that uses the correct TinaCMS Collection.


Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm ci`                  | Recreates dependencies from the lockfile         |
| `npm run check:node-version` | Verifies the exact required Node version     |
| `npm run deps:check`      | Detects duplicate `node_modules/* 2` folders     |
| `npm run deps:externalize`| Moves `node_modules` to `~/Library/Caches/...`   |
| `npm run deps:localize`   | Restores `node_modules` back into the repo       |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

If Finder or another tool duplicates folders inside `node_modules`, `npm run dev` and `npm run build` now stop early with a cleanup message. To recover, remove generated artifacts and reinstall dependencies:

```sh
rm -rf node_modules .astro dist
npm ci
```

If this project lives inside iCloud Drive or a shared Desktop/Documents folder, keep `node_modules` outside the synced folder to avoid large logical-size inflation and duplicate `* 2` folders:

```sh
npm run deps:externalize
npm install
```

This moves `node_modules` to `~/Library/Caches/com.tystudio/Blog-Post/node_modules` and leaves a symlink in the repo. To move it back into the project later:

```sh
npm run deps:localize
```

To keep an iCloud copy as backup only, without syncing `node_modules` or build output:

```sh
npm run backup:icloud
```

This syncs source files to `/Users/tystudio/Desktop/Blog-Post` and excludes `node_modules`, `.astro`, `dist`, and generated admin output.

## Cross-device setup

Use the same Node version on every device. This repo pins Node `20.19.6` in [.nvmrc](.nvmrc) and [.node-version](.node-version), and npm now fails early if a different version is used.

Recommended first-time setup on each Mac:

```sh
nvm use
npm run deps:externalize
npm ci
npm run dev
```

For TinaCMS editing on another device, only the synced project files need to come from iCloud. `node_modules` stays local to that device, and Tina will work after `npm ci` finishes.

## Operational Notes

This repo is intended to keep `node_modules` out of the iCloud-synced project folder.

- The repo path `/Users/tystudio/Desktop/Blog-Post/node_modules` should be a symlink.
- The actual dependency tree should live at `~/Library/Caches/com.tystudio/Blog-Post/node_modules`.
- `npm run deps:externalize` moves dependencies to that cache location.
- `npm run deps:localize` moves them back into the repo if you explicitly need a local copy.
- `npm run dev` and `npm run build` now run a link self-check before continuing.

Daily editing workflow:

```sh
nvm use
npm run dev
```

Available local editing endpoints:

- Site: `http://127.0.0.1:4321/`
- Tina admin: `http://127.0.0.1:4321/admin/index.html`
- Tina GraphQL: `http://127.0.0.1:7777/graphql`

Equivalent Tina command:

```sh
npm run tina:dev
```

`npm run dev` and `npm run tina:dev` both start the same Tina-powered dev server. If the Blog dev server is already running, rerunning either command should return the existing URLs instead of failing on a port conflict.

Build / verification commands:

```sh
npm run build
npm run preview
```

Validated local editing flows in this setup:

- blog post text edits
- blog post image-field changes
- content page text edits
- content page image-field changes
- portal home text edits
- global config text edits
- global config image-field changes

If `npm run dev` fails because Finder or iCloud duplicated nested folders inside `node_modules`, run:

```sh
rm -rf node_modules .astro dist
npm ci
npm run deps:externalize
```

## 👀 Want to learn more?

Check out the [TinaCMS documentation](https://tina.io/docs) and the [Astro documentation](https://docs.astro.build) or jump into our [TinaCMS Discord server](https://discord.gg/cG2UNREu).

## Credit

This theme is based off of the lovely [Bear Blog](https://github.com/HermanMartinus/bearblog/).
