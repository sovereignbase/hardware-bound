# AGENTS.md

This file defines normative development rules for this repository.

All RFC 2119 keywords (MUST, MUST NOT, SHOULD, etc.) are to be interpreted as described in:
https://www.rfc-editor.org/rfc/rfc2119.html

---

# General

- **NEVER USE MEMORY CACHE.**
- **ALWAYS READ CURRENT FILE STATE FROM DISK OR THE ACTIVE CODE EDITOR BUFFER.**
- **AGENT MEMORY IS A FORBIDDEN STATE / REALITY SOURCE.**
- When uncertain about behavior, **prefer primary specifications and vendor documentation over assumptions.**
- Do not invent behavior. Verify it.

---

# Verification

Run the smallest set of checks that covers your change.

- If you change runtime logic or public API: `npm run test`.
- If you touch benchmarks or performance-sensitive code: `npm run bench`.
- If you modify TypeScript build config or emit-related logic: `npm run build`.
- If you change formatting or add files: `npm run format`.

If a required command cannot run in the current environment, state that explicitly and explain why.

---

# Architectural Principles

## 1. Minimal Surface Area

Every directory under `src/` represents a single logical unit.

Each unit:

- MUST contain at most one root-level `.ts` file.
- MUST export at most one top-level class OR one top-level function.
- SHOULD remain under ~100 lines of executable logic (imports and type-only declarations excluded).
- The ~100 line budget counts executable statements only and excludes imports, type-only exports, comments, and blank lines.
- MUST have a single, clear responsibility.

If complexity grows:

- Extract a subdirectory.
- Or prefer an external dependency.

Large files are a design failure, not an achievement.

---

## 2. Package Preference Rule

Reimplementation of common infrastructure logic is forbidden.

- Prefer mature, audited packages over ad-hoc boilerplate.
- Do not reimplement encoding, parsing, crypto primitives, validation frameworks, etc.
- Local code MUST focus on domain logic, not infrastructure recreation.

If boilerplate appears repeatedly, dependency evaluation is mandatory.

Dependency evaluation MUST consider maintenance activity within the last 12 months, license compatibility, known security advisories, API stability, and real-world adoption. Record the decision in change notes or the PR description.

---

## 3. Helpers

If helpers are unavoidable:

- They MUST reside under a `.helpers/` directory.
- They MUST be minimal and narrowly scoped.
- They MUST NOT evolve into a general-purpose utility framework.
- They MUST NOT contain domain logic.

A growing `.helpers/` directory indicates architectural drift.

Domain logic means business rules, policy decisions, and data model validation specific to this package. It excludes encoding/decoding, crypto, serialization, I/O, and generic data plumbing.

---

## 4. Types

Reusable structural types MUST be isolated.

Structure:

```

.types/
TypeName/
type.ts

```

Rules:

- Each reusable type gets its own folder.
- The file MUST be named `type.ts`.
- No executable logic is allowed in `.types/`.
- Types define contracts, not behavior.

---

## 5. Errors

Errors MUST be explicit, semantic, and typed.

Structure:

```

.errors/
class.ts

```

Pattern:

```ts
export type PackageNameCode = 'SOME_ERROR_CODE' | 'ANOTHER_ERROR_CODE'

export class PackageNameError extends Error {
  readonly code: PackageNameCode

  constructor(code: PackageNameCode, message?: string) {
    const detail = message ?? code
    super(`{@scope/package-name} ${detail}`)
    this.code = code
    this.name = 'PackageNameError'
  }
}
```

Rules:

- Error codes MUST be semantic string literals.
- Error codes MUST be SCREAMING_SNAKE_CASE and use short domain prefixes when needed (example: `CRYPTO_INVALID_KEY`).
- Throwing raw `Error` is forbidden.
- Every thrown error MUST map to an explicit error code.
- Error messages MUST include package scope.

Errors are part of the public contract.

---

## 6. Forbidden Patterns

- No multi-responsibility modules
- No utility dumping grounds
- No silent boilerplate replication
- No implicit global state
- No hidden cross-layer imports

Architecture must remain explicit and auditable.

Example disallowed: `.helpers/` importing from `src/domain/*`, or `.types/` importing from runtime code.

---

# Specification Discipline (`index.html`)

When working on `(cwd | root | .)/index.html`:

This applies only when `index.html` exists or a task explicitly asks to create it. Otherwise, do not create or modify it.

## Authoring Tool

Use ReSpec:

- [https://respec.org/docs/](https://respec.org/docs/)
- [https://github.com/speced/respec](https://github.com/speced/respec)
- [https://www.w3.org/community/reports/reqs/](https://www.w3.org/community/reports/reqs/)
- [https://respec.org/docs/#using-respec](https://respec.org/docs/#using-respec)

## Normative References

### Infra / Language

- ECMA-262 — [https://tc39.es/ecma262/](https://tc39.es/ecma262/)
- WHATWG Infra — [https://infra.spec.whatwg.org/](https://infra.spec.whatwg.org/)
- Infra Extension — [https://www.w3.org/TR/xmlschema11-2/](https://www.w3.org/TR/xmlschema11-2/)
- Base64Url — [https://base64.guru/standards/base64url](https://base64.guru/standards/base64url)
- JSON — [https://www.rfc-editor.org/rfc/rfc8259](https://www.rfc-editor.org/rfc/rfc8259)
- URI — [https://www.rfc-editor.org/rfc/rfc3986](https://www.rfc-editor.org/rfc/rfc3986)

### Identifiers / Credentials

- DID Use Cases — [https://www.w3.org/TR/did-use-cases/](https://www.w3.org/TR/did-use-cases/)
- DID Core v1.0 — [https://www.w3.org/TR/did-core/](https://www.w3.org/TR/did-core/)
- DID Core v1.1 — [https://www.w3.org/TR/did-1.1/](https://www.w3.org/TR/did-1.1/)
- DID Test Suite — [https://w3c.github.io/did-test-suite/](https://w3c.github.io/did-test-suite/)
- DID Extensions — [https://www.w3.org/TR/did-extensions/](https://www.w3.org/TR/did-extensions/)

- VC Data Model v2.0 — [https://www.w3.org/TR/vc-data-model-2.0/](https://www.w3.org/TR/vc-data-model-2.0/)
- VC Overview — [https://www.w3.org/TR/vc-overview/](https://www.w3.org/TR/vc-overview/)
- VC Test Suite — [https://w3c.github.io/vc-test-suite/](https://w3c.github.io/vc-test-suite/)
- Distributed Ledger Technologies — [https://en.wikipedia.org/wiki/Distributed_ledger](https://en.wikipedia.org/wiki/Distributed_ledger)

### JSON-LD / RDF

- JSON-LD 1.1 — [https://www.w3.org/TR/json-ld11/](https://www.w3.org/TR/json-ld11/)
- JSON-LD API — [https://www.w3.org/TR/json-ld11-api/](https://www.w3.org/TR/json-ld11-api/)
- RDF Concepts — [https://www.w3.org/TR/rdf11-concepts/](https://www.w3.org/TR/rdf11-concepts/)
- RDF Schema — [https://www.w3.org/TR/rdf-schema/](https://www.w3.org/TR/rdf-schema/)
- Schema Org — [https://schema.org/docs/schemas.html](https://schema.org/docs/schemas.html)

### WebCrypto

- Web Cryptography Level 2 — [https://www.w3.org/TR/webcrypto-2/](https://www.w3.org/TR/webcrypto-2/)

### JOSE

- JWS — [https://www.rfc-editor.org/rfc/rfc7515.html](https://www.rfc-editor.org/rfc/rfc7515.html)
- JWE — [https://www.rfc-editor.org/rfc/rfc7516.html](https://www.rfc-editor.org/rfc/rfc7516.html)
- JWK — [https://www.rfc-editor.org/rfc/rfc7517.html](https://www.rfc-editor.org/rfc/rfc7517.html)
- JWA — [https://www.rfc-editor.org/rfc/rfc7518.html](https://www.rfc-editor.org/rfc/rfc7518.html)
- JWT — [https://www.rfc-editor.org/rfc/rfc7519.html](https://www.rfc-editor.org/rfc/rfc7519.html)
- JWS Unencoded Payload — [https://www.rfc-editor.org/rfc/rfc7797.html](https://www.rfc-editor.org/rfc/rfc7797.html)
- JWT BCP — [https://www.rfc-editor.org/rfc/rfc8725.html](https://www.rfc-editor.org/rfc/rfc8725.html)
- JWT/JWS Updates — [https://www.rfc-editor.org/rfc/rfc9864.html](https://www.rfc-editor.org/rfc/rfc9864.html)
- JOSE Cookbook — [https://www.rfc-editor.org/rfc/rfc7520.html](https://www.rfc-editor.org/rfc/rfc7520.html)
- JWK Thumbprint — [https://www.rfc-editor.org/rfc/rfc7638.html](https://www.rfc-editor.org/rfc/rfc7638.html)
- EdDSA for JOSE — [https://www.rfc-editor.org/rfc/rfc8037.html](https://www.rfc-editor.org/rfc/rfc8037.html)
- IANA JOSE Registries — [https://www.iana.org/assignments/jose/jose.xhtml](https://www.iana.org/assignments/jose/jose.xhtml)

### HTTP

- HTTP [https://datatracker.ietf.org/doc/html/rfc9110](https://datatracker.ietf.org/doc/html/rfc9110)

### Ideas

- KERI — [https://trustoverip.github.io/kswg-keri-specification/](https://trustoverip.github.io/kswg-keri-specification/)
- ACDA — [https://trustoverip.github.io/kswg-acdc-specification/][https://trustoverip.github.io/kswg-acdc-specification/s]
- CESR — [https://trustoverip.github.io/kswg-cesr-specification/](https://trustoverip.github.io/kswg-cesr-specification/)

---

## NON-SPEC Web page styling guid

Must not be used with respec documents.

Something like this!

Always ensure mobile-optimization!

css```

<style>
:root {
color-scheme: dark;
font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif;
background: #000;
color: #fff;
}

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(
            circle at top,
            rgba(255, 255, 255, 0.1),
            transparent 36%
          ),
          #000;
        color: #fff;
      }

      main {
        width: min(100%, 42rem);
        margin: 0 auto;
        padding: 1.25rem;
      }

      .shell {
        display: grid;
        gap: 1.25rem;
        padding: 1.25rem;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 1.25rem;
        background: rgba(255, 255, 255, 0.04);
        box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.45);
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 8vw, 3.4rem);
        line-height: 0.95;
      }

      .lede {
        margin: 0;
        color: rgba(255, 255, 255, 0.76);
        line-height: 1.6;
      }

      .controls {
        display: grid;
        gap: 1rem;
      }

      label {
        display: grid;
        gap: 0.55rem;
        font-size: 0.95rem;
      }

      input,
      button,
      a {
        border-radius: 999px;
      }

      input {
        width: 100%;
        padding: 0.9rem 1rem;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: #050505;
        color: #fff;
        font: inherit;
      }

      input::placeholder {
        color: rgba(255, 255, 255, 0.38);
      }

      .actions {
        display: grid;
        gap: 0.75rem;
      }

      button {
        width: 100%;
        padding: 0.95rem 1rem;
        border: 1px solid rgba(255, 255, 255, 0.16);
        background: #fff;
        color: #000;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      button.secondary {
        background: transparent;
        color: #fff;
      }

      button:disabled {
        opacity: 0.55;
        cursor: progress;
      }

      .status {
        margin: 0;
        min-height: 1.5rem;
        color: rgba(255, 255, 255, 0.7);
      }

      .result {
        display: grid;
        gap: 0.5rem;
        padding: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.03);
      }

      .result-label {
        font-size: 0.78rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.6);
      }

      output {
        display: block;
        overflow-wrap: anywhere;
        font-family: 'IBM Plex Mono', 'Cascadia Code', monospace;
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .links {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .links a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        min-height: 2.5rem;
        padding: 0.75rem 1rem;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #fff;
        text-decoration: none;
      }

      .links img {
        width: 1rem;
        height: 1rem;
        flex: 0 0 1rem;
      }

      @media (min-width: 40rem) {
        main {
          padding: 2rem;
        }

        .shell {
          padding: 1.75rem;
        }

        .actions {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    </style>

````

---

## Seo guide

```html
 <title></title>
    <meta
      name="description"
      content=""
    />
    <meta
      name="keywords""
    />
    <meta name="author" content="Jori Lehtinen" />
    <meta
      name="robots"
      content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    />
    <meta name="application-name" content="package-name" />
    <link
      rel="canonical"
      href="https://sovereignbase.dev/package-name/"
    />
    <link
      rel="icon"
      type="image/png"
      href="https://sovereignbase.dev/sovereignbase_logo.png"
    />
    <link
      rel="apple-touch-icon"
      href="https://sovereignbase.dev/sovereignbase_logo.png"
    />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:site_name" content="Sovereignbase" />
    <meta
      property="og:title"
      content=""
    />
    <meta
      property="og:description"
      content=""
    />
    <meta
      property="og:url"
      content="https://sovereignbase.dev/package-name/"
    />
    <meta
      property="og:image"
      content="https://sovereignbase.dev/sovereignbase_social_sharing_image.png"
    />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta
      property="og:image:alt"
      content=""
    />
    <meta name="twitter:card" content="summary_large_image" />
    <meta
      name="twitter:title"
      content=""
    />
    <meta
      name="twitter:description"
      content=""
    />
    <meta
      name="twitter:image"
      content="https://sovereignbase.dev/sovereignbase_social_sharing_image.png"
    />
    <meta
      name="twitter:image:alt"
      content=""
    />
    <meta name="twitter:creator" content="@jortsupetterson" />
        <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://sovereignbase.dev/package-name/#organization",
            "name": "Sovereignbase",
            "url": "https://github.com/sovereignbase",
            "alternateName": ["@sovereignbase"],
            "logo": {
              "@type": "ImageObject",
              "url": "https://sovereignbase.dev/sovereignbase_logo.png",
              "width": 320,
              "height": 320
            },
            "sameAs": [
              "https://github.com/sovereignbase",
              "https://jsr.io/@sovereignbase",
              "https://www.npmjs.com/org/sovereignbase"
            ]
          },
          {
            "@type": "Person",
            "@id": "https://sovereignbase.dev/package-name/#author",
            "name": "Jori Lehtinen",
            "url": "https://github.com/jortsupetterson",
            "alternateName": ["jortsupetterson", "@jortsupetterson"],
            "sameAs": [
              "https://github.com/jortsupetterson",
              "https://www.npmjs.com/~jortsupetterson",
              "https://jsr.io/user/ab186a13-a64f-429e-a757-927aa4fa6e6c",
              "https://linkedin.com/in/jortsupetterson",
              "https://x.com/jortsupetterson",
              "https://www.youtube.com/@jortsupetterson"
            ]
          },
          {
            "@type": "WebSite",
            "@id": "https://sovereignbase.dev/package-name/#website",
            "url": "https://sovereignbase.dev/package-name/",
            "name": "package-name",
            "inLanguage": "en",
            "publisher": {
              "@id": "https://sovereignbase.dev/package-name/#organization"
            }
          },
          {
            "@type": "SoftwareSourceCode",
            "@id": "https://sovereignbase.dev/package-name/#software",
            "name": "@sovereignbase/package-name",
            "alternateName": [],
            "url": "https://sovereignbase.dev/package-name/",
            "description": "",
            "codeRepository": "https://github.com/sovereignbase/package-name",
            "license": "https://www.apache.org/licenses/LICENSE-2.0",
            "programmingLanguage": ["TypeScript", "JavaScript"],
            "runtimePlatform": [
              "Node.js",
              "Web Browser",
              "Bun",
              "Deno",
              "Cloudflare Workers",
              "Edge Runtime"
            ],
            "keywords": [],
            "image": "https://sovereignbase.dev/sovereignbase_social_sharing_image.png",
            "isAccessibleForFree": true,
            "author": {
              "@id": "https://sovereignbase.dev/package-name/#author"
            },
            "maintainer": {
              "@id": "https://sovereignbase.dev/package-name/#organization"
            },
            "publisher": {
              "@id": "https://sovereignbase.dev/package-name/#organization"
            },
            "sameAs": [
              "https://jsr.io/@sovereignbase/package-name/",
              "https://www.npmjs.com/package/@sovereignbase/package-name"
            ]
          },
          {
            "@type": "TechArticle",
            "@id": "https://sovereignbase.dev/package-name/#specification",
            "headline": "",
            "name": "",
            "url": "https://sovereignbase.dev/package-name/",
            "description": "",
            "inLanguage": "en",
            "isPartOf": {
              "@id": "https://sovereignbase.dev/package-name/#website"
            },
            "mainEntityOfPage": {
              "@id": "https://sovereignbase.dev/package-name/#webpage"
            },
            "about": {
              "@id": "https://sovereignbase.dev/package-name/#software"
            },
            "author": {
              "@id": "https://sovereignbase.dev/package-name/#author"
            },
            "publisher": {
              "@id": "https://sovereignbase.dev/package-name/#organization"
            },
            "image": {
              "@type": "ImageObject",
              "url": "https://sovereignbase.dev/sovereignbase_social_sharing_image.png",
              "width": 1200,
              "height": 630
            }
          },
          {
            "@type": "WebPage",
            "@id": "https://sovereignbase.dev/package-name/#webpage",
            "url": "https://sovereignbase.dev/package-name/",
            "name": "",
            "description": "",
            "inLanguage": "en",
            "isPartOf": {
              "@id": "https://sovereignbase.dev/package-name/#website"
            },
            "about": {
              "@id": "https://sovereignbase.dev/package-name/#software"
            },
            "author": {
              "@id": "https://sovereignbase.dev/package-name/#author"
            },
            "publisher": {
              "@id": "https://sovereignbase.dev/package-name/#organization"
            },
            "primaryImageOfPage": {
              "@type": "ImageObject",
              "url": "https://sovereignbase.dev/sovereignbase_social_sharing_image.png",
              "width": 1200,
              "height": 630
            },
            "relatedLink": [
              "https://github.com/sovereignbase",
              "https://jsr.io/@sovereignbase",
              "https://www.npmjs.com/org/sovereignbase",
              "https://github.com/sovereignbase/package-name",
              "https://jsr.io/@sovereignbase/package-name/",
              "https://www.npmjs.com/package/@sovereignbase/package-name",
              "https://github.com/jortsupetterson",
              "https://www.npmjs.com/~jortsupetterson",
              "https://jsr.io/user/ab186a13-a64f-429e-a757-927aa4fa6e6c",
              "https://linkedin.com/in/jortsupetterson",
              "https://x.com/jortsupetterson",
              "https://www.youtube.com/@jortsupetterson"
            ]
          }
        ]
      }
    </script>
````

---

# Cloudflare Workers Discipline

Your knowledge of Cloudflare Workers MAY be outdated.

Before any task involving Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, Workers AI, Hyperdrive, or Agents:

- Retrieve current documentation.
- Verify platform limits.
- Confirm API behavior against official docs.
- If documentation cannot be retrieved due to environment restrictions, request permission to browse and state the limitation.

## Documentation Entry Points

- Workers — [https://developers.cloudflare.com/workers/](https://developers.cloudflare.com/workers/)
- Agents — [https://developers.cloudflare.com/agents/](https://developers.cloudflare.com/agents/)
- MCP — [https://developers.cloudflare.com/agents/model-context-protocol/](https://developers.cloudflare.com/agents/model-context-protocol/)

## Limits

Always consult official limits pages before reasoning about quotas.

## Commands

| Command               | Purpose                   |
| --------------------- | ------------------------- |
| `npx wrangler dev`    | Local development         |
| `npx wrangler deploy` | Deploy to Cloudflare      |
| `npx wrangler types`  | Generate TypeScript types |

After modifying bindings in `wrangler.toml` or `wrangler.jsonc`, run:

```

npx wrangler types

```

---

# Philosophy

Small modules.
Explicit contracts.
Typed errors.
Spec-first reasoning.
Dependency over reinvention.
No hidden state.

Architecture is a constraint system, not a suggestion.
