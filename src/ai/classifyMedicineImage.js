import { LABELS } from '../ml/textClassifier'

const MODEL = 'gemini-3.6-flash'
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
const CONFIDENCE_THRESHOLD = 0.65

const LABEL_BY_ID = new Map(LABELS.map((label) => [label.id, label]))

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    extracted_text: {
      type: 'string',
      description: 'Relevant medicine name and packaging text visible in the image.',
    },
    matches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: {
            type: 'string',
            enum: ['amoxicillin-clavulanic-acid', 'ambroxol-hcl', 'unknown'],
          },
          confidence: { type: 'number' },
          evidence: { type: 'string' },
        },
        required: ['label', 'confidence', 'evidence'],
      },
    },
  },
  required: ['extracted_text', 'matches'],
}

const PROMPT = `Analyze this medicine-package image directly.

Classify every medicine that is clearly visible into exactly one of:
- amoxicillin-clavulanic-acid: Amoxicillin combined with clavulanic acid/clavulanate
- ambroxol-hcl: Ambroxol hydrochloride
- unknown: anything else or insufficient evidence

Use packaging text, brand names, active ingredients, and visual context. Do not guess.
Return a confidence from 0 to 1 and quote the strongest visible evidence.
Also return the relevant text you can read from the package.`

function clamp(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.max(0, Math.min(1, number))
}

function parseInteraction(json) {
  const modelOutput = json?.steps
    ?.slice()
    .reverse()
    .find((step) => step.type === 'model_output')
  const raw = modelOutput?.content
    ?.filter((part) => part.type === 'text')
    .map((part) => part.text || '')
    .join('')
    .trim()

  if (!raw) {
    throw new Error(json?.error?.message || `Gemini interaction ${json?.status || 'returned no classification'}`)
  }

  try {
    return JSON.parse(raw)
  } catch {
    return JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ''))
  }
}

export async function classifyMedicineImage({ base64, mimeType = 'image/jpeg' }) {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY
  if (!apiKey) throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY')
  if (!base64) throw new Error('Image data is missing')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: MODEL,
        input: [
          { type: 'text', text: PROMPT },
          {
            type: 'image',
            data: base64,
            mime_type: mimeType,
          },
        ],
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: RESPONSE_SCHEMA,
        },
        generation_config: {
          thinking_level: 'minimal',
          max_output_tokens: 1024,
        },
        store: false,
      }),
    })

    const json = await response.json()
    if (!response.ok) {
      throw new Error(json?.error?.message || `Gemini request failed (${response.status})`)
    }

    const parsed = parseInteraction(json)
    const matches = Array.isArray(parsed.matches)
      ? parsed.matches.map((match) => ({
          id: String(match.label || ''),
          confidence: clamp(match.confidence),
          evidence: String(match.evidence || '').trim(),
        }))
      : []

    const validMatches = matches.filter((match) => LABEL_BY_ID.has(match.id))
    const foundIds = new Set(
      validMatches
        .filter((match) => match.confidence >= CONFIDENCE_THRESHOLD)
        .map((match) => match.id),
    )

    return {
      text: String(parsed.extracted_text || '').trim(),
      matches: validMatches,
      found: LABELS.filter((label) => foundIds.has(label.id)),
      scores: LABELS.map((label) => ({
        ...label,
        score: Math.max(
          0,
          ...validMatches.filter((match) => match.id === label.id).map((match) => match.confidence),
        ),
      })),
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Gemini request timed out')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
