import { useState } from 'react'
import Icon from './Icon.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { apiOrigin } from '../api/client.js'
import { useT } from '../i18n/index.jsx'

export function CodeBlock({ code }) {
  const toast = useToast()
  const t = useT()
  return (
    <pre className="codeblock">
      <button className="btn btn-ghost btn-sm copy" onClick={() => navigator.clipboard.writeText(code).then(() => toast.success('Copied'))}><Icon name="copy" size={13} /> {t('Copy')}</button>
      <code>{code}</code>
    </pre>
  )
}

const samples = (base, key, web) => ({
  cURL: `# 1) One-shot: send a PDF + placements, get the signed PDF back
curl -X POST ${base}/api/v1/sign \\
  -H "X-API-Key: ${key}" \\
  -F "file=@contract.pdf" \\
  -F 'placements=[{"page":0,"x":0.6,"y":0.85,"w":0.3,"h":0.06,"text":"Jane Doe"}]' \\
  -o contract-signed.pdf

# 2) Store a document, then sign it later
curl -X POST ${base}/api/v1/documents -H "X-API-Key: ${key}" -F "file=@contract.pdf"
curl -X POST ${base}/api/v1/documents/DOC_ID/sign -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"placements":[{"page":0,"x":72,"y":700,"w":180,"h":50,"unit":"pt","image":"data:image/png;base64,..."}]}'
curl -L ${base}/api/v1/documents/DOC_ID/download -H "X-API-Key: ${key}" -o signed.pdf`,

  'JavaScript / Node': `import fs from 'node:fs';

const API = '${base}/api/v1';
const headers = { 'X-API-Key': process.env.E1000_API_KEY ?? '${key}' };

const form = new FormData();
form.append('file', new Blob([fs.readFileSync('contract.pdf')], { type: 'application/pdf' }), 'contract.pdf');
form.append('placements', JSON.stringify([
  { page: 0, x: 0.6, y: 0.85, w: 0.3, h: 0.06, text: 'Jane Doe' },
  { page: 0, x: 0.1, y: 0.85, w: 0.25, h: 0.08, image: 'data:image/png;base64,' + fs.readFileSync('sig.png', 'base64') },
]));

const res = await fetch(\`\${API}/sign\`, { method: 'POST', headers, body: form });
if (!res.ok) throw new Error((await res.json()).error.message);
fs.writeFileSync('contract-signed.pdf', Buffer.from(await res.arrayBuffer()));`,

  Python: `import json, base64, requests

API = "${base}/api/v1"
HEADERS = {"X-API-Key": "${key}"}

sig = "data:image/png;base64," + base64.b64encode(open("sig.png", "rb").read()).decode()
placements = [
    {"page": 0, "x": 0.1, "y": 0.85, "w": 0.25, "h": 0.08, "image": sig},
    {"page": 0, "x": 0.6, "y": 0.85, "w": 0.3, "h": 0.06, "text": "Jane Doe"},
]

with open("contract.pdf", "rb") as f:
    r = requests.post(f"{API}/sign", headers=HEADERS,
                      files={"file": ("contract.pdf", f, "application/pdf")},
                      data={"placements": json.dumps(placements)})
r.raise_for_status()
open("contract-signed.pdf", "wb").write(r.content)`,

  PHP: `<?php
$api = '${base}/api/v1';
$ch = curl_init("$api/sign");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => ['X-API-Key: ${key}'],
  CURLOPT_POSTFIELDS => [
    'file' => new CURLFile('contract.pdf', 'application/pdf'),
    'placements' => json_encode([[ 'page' => 0, 'x' => 0.6, 'y' => 0.85, 'w' => 0.3, 'h' => 0.06, 'text' => 'Jane Doe' ]]),
  ],
]);
$pdf = curl_exec($ch);
if (curl_getinfo($ch, CURLINFO_HTTP_CODE) !== 200) die($pdf);
file_put_contents('contract-signed.pdf', $pdf);`,

  'C# / .NET': `using System.Net.Http;
using System.Text.Json;

var http = new HttpClient { BaseAddress = new Uri("${base}/api/v1/") };
http.DefaultRequestHeaders.Add("X-API-Key", "${key}");

using var form = new MultipartFormDataContent();
var file = new ByteArrayContent(await File.ReadAllBytesAsync("contract.pdf"));
file.Headers.ContentType = new("application/pdf");
form.Add(file, "file", "contract.pdf");
form.Add(new StringContent(JsonSerializer.Serialize(new[] {
    new { page = 0, x = 0.6, y = 0.85, w = 0.3, h = 0.06, text = "Jane Doe" }
})), "placements");

var res = await http.PostAsync("sign", form);
res.EnsureSuccessStatusCode();
await File.WriteAllBytesAsync("contract-signed.pdf", await res.Content.ReadAsByteArrayAsync());`,

  Java: `import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.util.Base64;

var pdf = Base64.getEncoder().encodeToString(Files.readAllBytes(Path.of("contract.pdf")));
var json = """
  {"fileBase64":"%s","fileName":"contract.pdf",
   "placements":[{"page":0,"x":0.6,"y":0.85,"w":0.3,"h":0.06,"text":"Jane Doe"}]}
  """.formatted(pdf);

var req = HttpRequest.newBuilder(URI.create("${base}/api/v1/sign"))
    .header("X-API-Key", "${key}")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(json)).build();

var res = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofByteArray());
Files.write(Path.of("contract-signed.pdf"), res.body());`,

  Go: `package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"os"
)

func main() {
	pdf, _ := os.ReadFile("contract.pdf")
	body, _ := json.Marshal(map[string]any{
		"fileBase64": base64.StdEncoding.EncodeToString(pdf),
		"placements": []map[string]any{{"page": 0, "x": 0.6, "y": 0.85, "w": 0.3, "h": 0.06, "text": "Jane Doe"}},
	})
	req, _ := http.NewRequest("POST", "${base}/api/v1/sign", bytes.NewReader(body))
	req.Header.Set("X-API-Key", "${key}")
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil { panic(err) }
	defer res.Body.Close()
	out, _ := io.ReadAll(res.Body)
	os.WriteFile("contract-signed.pdf", out, 0644)
}`,

  'Embed widget': `<!-- Let your clients sign inside YOUR website (no redirect) -->
<script src="${base}/embed.js"></script>
<button onclick="E1000Signer.open('TEMPLATE_SHARE_TOKEN', {
  onSigned: (submission) => console.log('Signed!', submission.downloadUrl),
  onClose:  () => console.log('closed')
})">Sign the agreement</button>

<!-- Or simply link / iframe the hosted page -->
<iframe src="${web}/sign/TEMPLATE_SHARE_TOKEN?embed=1" width="100%" height="800"></iframe>`,

  'Templates via API': `# Create a template from a stored document: clients may only draw or type
curl -X POST ${base}/api/v1/templates -H "X-API-Key: ${key}" -H "Content-Type: application/json" -d '{
  "documentId": "DOC_ID",
  "name": "NDA 2026",
  "allowedSignTypes": ["draw", "type"],
  "fields": [
    {"id": "sig1", "kind": "signature", "page": 0, "x": 0.1, "y": 0.8, "w": 0.3, "h": 0.07, "label": "Client signature"},
    {"id": "date1", "kind": "date", "page": 0, "x": 0.6, "y": 0.82, "w": 0.2, "h": 0.03}
  ]
}'
# → response.data.shareUrl is the link for your clients

# Email the link to clients
curl -X POST ${base}/api/v1/templates/TEMPLATE_ID/send -H "X-API-Key: ${key}" \\
  -H "Content-Type: application/json" -d '{"emails":["client@example.com"]}'

# List who signed
curl ${base}/api/v1/templates/TEMPLATE_ID/submissions -H "X-API-Key: ${key}"`,

  'Webhook verify': `// Node/Express: verify E1000Signer webhook signatures
import crypto from 'node:crypto';
import express from 'express';

const app = express();
app.post('/hooks/e1000', express.raw({ type: 'application/json' }), (req, res) => {
  const expected = 'sha256=' + crypto.createHmac('sha256', process.env.E1000_WEBHOOK_SECRET)
    .update(req.body).digest('hex');
  const got = req.get('X-E1000-Signature') || '';
  if (got.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected)))
    return res.sendStatus(401);
  const event = JSON.parse(req.body);   // { id, event: 'submission.created', data: {...} }
  console.log(event.event, event.data);
  res.sendStatus(200);
});`,
})

export default function CodeSamples({ apiKey = 'e1k_YOUR_API_KEY' }) {
  const t = useT()
  const base = apiOrigin()
  const all = samples(base, apiKey, window.location.origin)
  const langs = Object.keys(all)
  const [lang, setLang] = useState(langs[0])
  return (
    <div className="stack">
      <div className="tabs" role="tablist">
        {langs.map((l) => <button key={l} role="tab" aria-selected={l === lang} className={`tab${l === lang ? ' active' : ''}`} onClick={() => setLang(l)}>{l}</button>)}
      </div>
      <CodeBlock code={all[lang]} />
      <p className="small muted" style={{ margin: 0 }}>
        {t('OpenAPI 3.1 spec:')} <a href={`${base}/api/v1/openapi.json`} target="_blank" rel="noreferrer">{base}/api/v1/openapi.json</a> — {t('import into Postman / Insomnia, or generate a typed SDK with openapi-generator for any language.')}
      </p>
    </div>
  )
}
