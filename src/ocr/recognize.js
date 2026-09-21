import { Platform } from 'react-native'

const OCR_URL = 'https://api.ocr.space/parse/image'
const OCR_KEY = 'helloworld'

let webWorker

function cleanText(text) {
  return String(text || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim()
}

async function recognizeOnWeb(base64) {
  const { createWorker } = await import('tesseract.js')
  if (!webWorker) webWorker = await createWorker('eng')
  const { data } = await webWorker.recognize(`data:image/jpeg;base64,${base64}`)
  return cleanText(data.text)
}

function appendCommonFields(form) {
  form.append('apikey', OCR_KEY)
  form.append('language', 'eng')
  form.append('OCREngine', '1')
  form.append('scale', 'true')
  form.append('isOverlayRequired', 'false')
}

async function postOcr(form) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)
  try {
    const res = await fetch(OCR_URL, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    })
    const json = await res.json()
    if (json?.IsErroredOnProcessing) {
      const message = Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join(' ') : json.ErrorMessage
      throw new Error(message || 'OCR failed')
    }
    return cleanText((json?.ParsedResults || []).map((item) => item.ParsedText || '').join('\n'))
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('OCR request took too long')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function recognizeOnDevice(uri, base64) {
  if (base64) {
    try {
      const form = new FormData()
      form.append('base64Image', `data:image/jpeg;base64,${base64}`)
      appendCommonFields(form)
      return await postOcr(form)
    } catch (err) {
      if (!uri) throw err
    }
  }
  if (!uri) return ''
  const form = new FormData()
  form.append('file', {
    uri,
    name: 'scan.jpg',
    type: 'image/jpeg',
  })
  appendCommonFields(form)
  return postOcr(form)
}

export async function recognizeImage({ uri, base64 }) {
  if (Platform.OS === 'web') {
    if (!base64) return ''
    return recognizeOnWeb(base64)
  }
  return recognizeOnDevice(uri, base64)
}
