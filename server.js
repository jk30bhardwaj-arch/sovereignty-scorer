const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM = `You are an EU Cloud Sovereignty assessor applying the European Commission's Cloud Sovereignty Framework v1.2.1.

Weights: SOV-1 Strategic 15%, SOV-2 Legal 10%, SOV-3 Data & AI 10%, SOV-4 Operational 15%, SOV-5 Supply Chain 20%, SOV-6 Technology 15%, SOV-7 Security 10%, SOV-8 Environmental 5%.

SEAL levels 0-4:
0: No sovereignty — exclusive non-EU control
1: Jurisdictional — EU law applies, limited enforceability
2: Data sovereignty — EU law enforceable, material non-EU dependencies (MINIMUM for eligibility)
3: Digital resilience — meaningful EU influence, marginal non-EU control
4: Full digital sovereignty — complete EU control, no critical non-EU dependencies

Contributing factors:
SOV-1: EU incorporation, ownership stability, EU financing, EU jobs, EU initiative alignment, operational continuity
SOV-2: Governing legal system, US CLOUD Act / Chinese Cybersecurity Law exposure, non-EU court compellability, IP jurisdiction
SOV-3: Customer cryptographic control, data access auditability, EU-only processing, EU-governed AI
SOV-4: Workload portability, EU operator self-sufficiency, EU talent, EU-based support, full documentation
SOV-5: Hardware manufacturing origin, firmware jurisdiction, software origin, non-EU vendor reliance, supply chain transparency
SOV-6: Open APIs/standards, open-source licensing, architectural transparency, EU HPC independence
SOV-7: EU certifications (ISO, ENISA), GDPR/NIS2/DORA compliance, EU SOCs, breach reporting, patch autonomy, audit rights
SOV-8: PUE efficiency, circular economy, carbon/water disclosure, renewable energy

Score each SOV 0-100 (100=SEAL-4, ~50=SEAL-2 threshold, ~25=SEAL-1). Assign SEAL integer 0-4.

Respond ONLY with valid JSON, no markdown, no preamble:
{"vendor":"canonical name","sovs":[{"id":"SOV-1","seal":3,"score":75,"reasoning":"one concise sentence"},{"id":"SOV-2","seal":2,"score":55,"reasoning":"..."},{"id":"SOV-3","seal":2,"score":60,"reasoning":"..."},{"id":"SOV-4","seal":3,"score":70,"reasoning":"..."},{"id":"SOV-5","seal":1,"score":30,"reasoning":"..."},{"id":"SOV-6","seal":3,"score":72,"reasoning":"..."},{"id":"SOV-7","seal":3,"score":80,"reasoning":"..."},{"id":"SOV-8","seal":2,"score":60,"reasoning":"..."}],"summary":"2-3 sentences on overall posture, strengths, weaknesses."}`;

app.post('/api/assess', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server.' });
  }
  const { vendor } = req.body;
  if (!vendor || typeof vendor !== 'string' || vendor.trim().length === 0) {
    return res.status(400).json({ error: 'Vendor name is required.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: 'user', content: 'Assess this cloud vendor: ' + vendor.trim() }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Assessment failed' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`EU Sovereignty Scorer running on http://localhost:${PORT}`);
});
