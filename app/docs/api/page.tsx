/**
 * API Documentation Page
 *
 * Complete guide for using The Forge API with external integrations.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import Link from 'next/link';
import { Key, Shield, Zap, Code, BookOpen, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'API Documentation | The Forge',
  description: 'Complete guide for integrating with The Forge API',
};

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/settings/api-keys"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-6"
          >
            ← Back to API Keys
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#FF9900]/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#FF9900]" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">API Documentation</h1>
              <p className="text-zinc-400 mt-1">Version 1.0</p>
            </div>
          </div>
          <p className="text-zinc-400 text-lg">
            Integriere The Forge mit Zapier, Make, n8n oder eigenen Anwendungen.
          </p>
        </div>

        {/* Quick Start */}
        <section className="mb-12 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#FF9900]" />
            Quick Start
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#FF9900] text-black rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-white font-semibold">Erstelle einen API Key</h3>
                <p className="text-zinc-400 text-sm">
                  Gehe zu <Link href="/settings/api-keys" className="text-[#FF9900] hover:underline">Settings → API Keys</Link> und erstelle deinen ersten Key.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#FF9900] text-black rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-white font-semibold">Wähle Scopes</h3>
                <p className="text-zinc-400 text-sm">
                  Selektiere die Permissions, die deine Integration benötigt (z.B. <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">media:generate:image</code>).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-[#FF9900] text-black rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-white font-semibold">Mach deinen ersten Request</h3>
                <p className="text-zinc-400 text-sm">
                  Nutze den API Key im <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">Authorization</code> Header.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-lg p-4">
            <div className="text-xs text-zinc-500 mb-2">Example Request</div>
            <pre className="text-sm text-zinc-300 font-mono overflow-x-auto">
{`curl -X POST https://stakeandscale.de/api/v1/media/generate-image \\
  -H "Authorization: Bearer forge_prod_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "A serene mountain landscape at sunset",
    "model": "flux-schnell"
  }'`}
            </pre>
          </div>
        </section>

        {/* Authentication */}
        <section className="mb-12" id="authentication">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#FF9900]" />
            Authentication
          </h2>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <p className="text-zinc-400">
              Alle API Requests müssen mit einem <strong className="text-white">Bearer Token</strong> authentifiziert werden.
            </p>

            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <div className="text-xs text-zinc-500 mb-2">Authorization Header</div>
              <code className="text-sm text-[#FF9900] font-mono">
                Authorization: Bearer forge_prod_kJ8vLp2Qm9xR4sT6...
              </code>
            </div>

            <div className="bg-yellow-950/20 border border-yellow-900/50 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-yellow-500 font-semibold mb-1">Wichtig</h3>
                <p className="text-yellow-200/70 text-sm">
                  Teile deinen API Key niemals öffentlich. Er hat vollen Zugriff auf deine Ressourcen basierend auf den gewählten Scopes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Available Scopes */}
        <section className="mb-12" id="scopes">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-[#FF9900]" />
            Available Scopes
          </h2>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-800/50 border-b border-zinc-700">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-white">Scope</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-white">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <tr><td colSpan={2} className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase">Media Generation</td></tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">media:generate:image</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Generate AI images</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">media:generate:video</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Generate AI videos</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">media:generate:voice</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Generate AI voice audio</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">media:read</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Read media assets</td>
                </tr>

                <tr><td colSpan={2} className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase">Content Generation</td></tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">content:generate:marketing</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Generate marketing content</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">content:generate:legal</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Generate legal documents</td>
                </tr>

                <tr><td colSpan={2} className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase">Venture Management</td></tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">venture:read</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Read venture data</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">venture:write</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Create/update ventures</td>
                </tr>

                <tr><td colSpan={2} className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase">Files</td></tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">files:upload</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Upload files</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">files:read</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Read files</td>
                </tr>

                <tr><td colSpan={2} className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase">Special</td></tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-xs text-[#FF9900]">*</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Wildcard (Full Access - use with caution)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-12" id="endpoints">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-[#FF9900]" />
            API Endpoints
          </h2>

          <div className="space-y-6">
            {/* Generate Image */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="bg-zinc-800/50 px-6 py-3 border-b border-zinc-700">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded">POST</span>
                  <code className="text-sm text-white font-mono">/api/v1/media/generate-image</code>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-zinc-400 text-sm">
                  Generate AI-powered images using Flux or Stable Diffusion.
                </p>

                <div>
                  <div className="text-xs font-semibold text-zinc-500 mb-2">Required Scope</div>
                  <code className="text-xs text-[#FF9900] bg-zinc-800 px-2 py-1 rounded">media:generate:image</code>
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-500 mb-2">Request Body</div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <pre className="text-xs text-zinc-300 font-mono overflow-x-auto">
{`{
  "prompt": "A serene mountain landscape at sunset",
  "model": "flux-schnell",  // optional: flux-schnell, flux-pro
  "width": 1024,            // optional: 256-2048
  "height": 1024            // optional: 256-2048
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-500 mb-2">Response</div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                    <pre className="text-xs text-zinc-300 font-mono overflow-x-auto">
{`{
  "data": {
    "url": "https://blob.vercel-storage.com/image.png",
    "width": 1024,
    "height": 1024,
    "model": "flux-schnell",
    "creditsUsed": 10
  },
  "meta": {
    "requestId": "abc123...",
    "timestamp": "2026-02-01T12:00:00Z"
  }
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-500 mb-2">Credits Cost</div>
                  <div className="text-sm text-zinc-400">10-15 credits depending on model</div>
                </div>
              </div>
            </div>

            {/* More endpoints coming soon */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 text-center">
              <p className="text-zinc-500 text-sm">
                Weitere Endpoints werden demnächst dokumentiert:<br/>
                <code className="text-xs text-zinc-600">POST /api/v1/media/generate-video</code><br/>
                <code className="text-xs text-zinc-600">POST /api/v1/content/generate</code><br/>
                <code className="text-xs text-zinc-600">GET /api/v1/ventures/[id]</code>
              </p>
            </div>
          </div>
        </section>

        {/* Rate Limits */}
        <section className="mb-12" id="rate-limits">
          <h2 className="text-2xl font-bold text-white mb-4">Rate Limits</h2>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <p className="text-zinc-400 mb-4">
              API Keys haben konfigurierbare Rate Limits um Missbrauch zu verhindern.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Default Hourly Limit</div>
                <div className="text-2xl font-bold text-white">100 requests/hour</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <div className="text-xs font-bold text-zinc-500 uppercase mb-2">Default Daily Limit</div>
                <div className="text-2xl font-bold text-white">1,000 requests/day</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-zinc-400">
              Du kannst diese Limits in den <Link href="/settings/api-keys" className="text-[#FF9900] hover:underline">API Key Settings</Link> anpassen (10-10,000/hour, 100-100,000/day).
            </div>
          </div>
        </section>

        {/* Error Codes */}
        <section className="mb-12" id="errors">
          <h2 className="text-2xl font-bold text-white mb-4">Error Codes</h2>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-800/50 border-b border-zinc-700">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-white">Code</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-white">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <tr>
                  <td className="px-6 py-3"><code className="text-sm text-red-400">401</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Missing or invalid API key</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-sm text-red-400">403</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Insufficient scopes for this endpoint</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-sm text-red-400">429</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Rate limit exceeded</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-sm text-red-400">402</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Insufficient credits</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-sm text-yellow-400">400</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Invalid request body</td>
                </tr>
                <tr>
                  <td className="px-6 py-3"><code className="text-sm text-yellow-400">500</code></td>
                  <td className="px-6 py-3 text-sm text-zinc-400">Internal server error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-12" id="examples">
          <h2 className="text-2xl font-bold text-white mb-4">Code Examples</h2>

          <div className="space-y-6">
            {/* JavaScript/Node.js */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="bg-zinc-800/50 px-6 py-3 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-white">JavaScript / Node.js</h3>
              </div>
              <div className="p-6">
                <pre className="text-sm text-zinc-300 font-mono overflow-x-auto">
{`const API_KEY = 'forge_prod_YOUR_API_KEY';
const API_URL = 'https://stakeandscale.de/api/v1/media/generate-image';

async function generateImage(prompt) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: prompt,
      model: 'flux-schnell'
    })
  });

  if (!response.ok) {
    throw new Error(\`API Error: \${response.status}\`);
  }

  const data = await response.json();
  return data.data.url;
}

// Usage
generateImage('A serene mountain landscape')
  .then(url => console.log('Image URL:', url));`}
                </pre>
              </div>
            </div>

            {/* Python */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <div className="bg-zinc-800/50 px-6 py-3 border-b border-zinc-700">
                <h3 className="text-sm font-semibold text-white">Python</h3>
              </div>
              <div className="p-6">
                <pre className="text-sm text-zinc-300 font-mono overflow-x-auto">
{`import requests

API_KEY = 'forge_prod_YOUR_API_KEY'
API_URL = 'https://stakeandscale.de/api/v1/media/generate-image'

def generate_image(prompt):
    response = requests.post(
        API_URL,
        headers={
            'Authorization': f'Bearer {API_KEY}',
            'Content-Type': 'application/json'
        },
        json={
            'prompt': prompt,
            'model': 'flux-schnell'
        }
    )

    response.raise_for_status()
    return response.json()['data']['url']

# Usage
url = generate_image('A serene mountain landscape')
print(f'Image URL: {url}')`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <div className="bg-[#FF9900]/10 border border-[#FF9900]/30 rounded-lg p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Bereit loszulegen?</h3>
          <p className="text-zinc-400 mb-6">
            Erstelle deinen ersten API Key und starte mit der Integration.
          </p>
          <Link
            href="/settings/api-keys"
            className="inline-block px-6 py-3 bg-[#FF9900] hover:bg-[#FF9900] text-black rounded-lg font-semibold transition-colors"
          >
            API Keys verwalten
          </Link>
        </div>
      </div>
    </div>
  );
}
