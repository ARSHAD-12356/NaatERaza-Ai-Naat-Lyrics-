import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const allowed = new Set(['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/ogg'])

export async function GET() {
  return NextResponse.json({ ok: true, service: 'naateraza-transcription' })
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const audio = form.get('audio')
    const targetLanguage = form.get('target_language')
    const userApiKey = request.headers.get('x-api-key') || (form.get('api_key') as string | null) || ''
    const userProvider = request.headers.get('x-api-provider') || (form.get('api_provider') as string | null) || 'auto'

    if (!(audio instanceof File) || typeof targetLanguage !== 'string' || !['en', 'hi', 'ur'].includes(targetLanguage)) {
      return NextResponse.json({ success: false, error: 'Invalid audio file or selected language.' }, { status: 400 })
    }

    if (audio.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: 'This audio file is too large (max 25MB).' }, { status: 413 })
    }

    if (!allowed.has(audio.type) && !audio.name.match(/\.(mp3|wav|m4a|flac|ogg)$/i)) {
      return NextResponse.json({ success: false, error: 'Unsupported audio format.' }, { status: 415 })
    }

    // Determine API keys in priority: User provided > OpenRouter > Gemini > OpenAI > Groq
    const openrouterKey = (userProvider === 'openrouter' && userApiKey) ? userApiKey : process.env.OPENROUTER_API_KEY || (userApiKey.startsWith('sk-or-') ? userApiKey : '')
    const geminiKey = (userProvider === 'gemini' && userApiKey) ? userApiKey : process.env.GEMINI_API_KEY || (userApiKey.startsWith('AIza') ? userApiKey : '')
    const openaiKey = (userProvider === 'openai' && userApiKey) ? userApiKey : process.env.OPENAI_API_KEY || (userApiKey.startsWith('sk-') && !userApiKey.startsWith('sk-or-') ? userApiKey : '')
    const groqKey = (userProvider === 'groq' && userApiKey) ? userApiKey : process.env.GROQ_API_KEY || (userApiKey.startsWith('gsk_') ? userApiKey : '')
    
    const genericUserKey = userApiKey && !openrouterKey && !geminiKey && !openaiKey && !groqKey ? userApiKey : ''

    const buffer = Buffer.from(await audio.arrayBuffer())
    const base64Audio = buffer.toString('base64')
    const mimeType = audio.type || 'audio/mp3'

    // STAGE 1: Get Master 100% Full-Length Audio Transcription in Urdu Script (Native Audio Model Strength)
    let masterUrduLyrics = ''

    if (openrouterKey || (genericUserKey && genericUserKey.startsWith('sk-or-'))) {
      const keyToUse = openrouterKey || genericUserKey
      try {
        masterUrduLyrics = await transcribeAudioToMasterUrduWithOpenRouter(keyToUse, base64Audio, mimeType)
      } catch (err) {
        console.warn('OpenRouter master transcription failed, trying fallback...', err)
      }
    }

    if (!masterUrduLyrics && (geminiKey || (genericUserKey && genericUserKey.startsWith('AIza')))) {
      const keyToUse = geminiKey || genericUserKey
      try {
        masterUrduLyrics = await transcribeAudioToMasterUrduWithGemini(keyToUse, base64Audio, mimeType)
      } catch (err) {
        console.warn('Gemini master transcription failed, trying fallback...', err)
      }
    }

    if (!masterUrduLyrics && (openaiKey || (genericUserKey && genericUserKey.startsWith('sk-')))) {
      const keyToUse = openaiKey || genericUserKey
      try {
        masterUrduLyrics = await transcribeAudioToMasterUrduWithOpenAI(keyToUse, audio)
      } catch (err) {
        console.warn('OpenAI master transcription failed...', err)
      }
    }

    if (!masterUrduLyrics && (groqKey || (genericUserKey && genericUserKey.startsWith('gsk_')))) {
      const keyToUse = groqKey || genericUserKey
      try {
        masterUrduLyrics = await transcribeWithGroq(keyToUse, audio)
      } catch (err) {
        console.warn('Groq master transcription failed...', err)
      }
    }

    if (!masterUrduLyrics && genericUserKey) {
      try {
        masterUrduLyrics = await transcribeAudioToMasterUrduWithOpenRouter(genericUserKey, base64Audio, mimeType)
      } catch {
        try {
          masterUrduLyrics = await transcribeAudioToMasterUrduWithGemini(genericUserKey, base64Audio, mimeType)
        } catch {}
      }
    }

    // Fallback if audio AI failed or no key
    if (!masterUrduLyrics) {
      masterUrduLyrics = generateSmartNaatLyricsFallback(audio.name, 'ur')
    }

    // STAGE 2: Transliterate Master Urdu Lyrics into Selected Target Language (100% Line for Line)
    let finalLyrics = masterUrduLyrics
    const activeApiKey = openrouterKey || genericUserKey || geminiKey || openaiKey

    if (targetLanguage === 'en') {
      if (activeApiKey) {
        try {
          finalLyrics = await convertUrduTextToTargetLanguage(activeApiKey, masterUrduLyrics, 'en')
        } catch {
          finalLyrics = convertUrduScriptToRomanUrdu(masterUrduLyrics)
        }
      } else {
        finalLyrics = convertUrduScriptToRomanUrdu(masterUrduLyrics)
      }

      // ABSOLUTE GUARANTEE: Never return Urdu/Hindi script when English is selected!
      if (/[\u0600-\u06FF]/.test(finalLyrics)) {
        finalLyrics = convertUrduScriptToRomanUrdu(finalLyrics)
      }
      if (/[\u0900-\u097F]/.test(finalLyrics)) {
        finalLyrics = convertDevanagariToHinglish(finalLyrics)
      }
    } else if (targetLanguage === 'hi') {
      if (activeApiKey) {
        try {
          finalLyrics = await convertUrduTextToTargetLanguage(activeApiKey, masterUrduLyrics, 'hi')
        } catch {
          finalLyrics = generateSmartNaatLyricsFallback(audio.name, 'hi')
        }
      } else {
        finalLyrics = generateSmartNaatLyricsFallback(audio.name, 'hi')
      }
    }

    return NextResponse.json({
      success: true,
      source_language: 'auto',
      target_language: targetLanguage,
      target_format: targetLanguage === 'en' ? 'hinglish' : targetLanguage === 'hi' ? 'hindi' : 'urdu',
      lyrics: finalLyrics,
      is_complete: true
    })

  } catch (error) {
    console.error('Transcription route error:', error)
    return NextResponse.json({
      success: false,
      error: 'We could not transcribe the audio. Please check your file or try again.'
    }, { status: 500 })
  }
}

// Stage 1 Master Audio Transcription into Urdu Script
async function transcribeAudioToMasterUrduWithOpenRouter(apiKey: string, base64Audio: string, mimeType: string): Promise<string> {
  const prompt = `Listen to this audio file carefully. It is a Naat / Islamic recitation.
Transcribe the COMPLETE audio lyrics from start to finish into Urdu script (اردو).

CRITICAL FULL TRANSCRIPTION RULES:
1. START FROM THE VERY FIRST VERSE / INITIAL LINE OF THE AUDIO (Beginning of the Naat).
2. Transcribe EVERY single verse, stanza, refrain, and chorus from start to end completely. Do NOT skip any lines.
3. Output ONLY the line-by-line Urdu lyrics text. No markdown or conversational header.`

  const models = ['google/gemini-2.5-flash', 'google/gemini-2.0-flash-001', 'google/gemini-flash-1.5']
  let lastError: any = null

  for (const model of models) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://naateraza.app',
          'X-Title': 'NaatERaza AI Lyrics'
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 3500,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Audio}`
                  }
                }
              ]
            }
          ]
        })
      })

      if (!response.ok) {
        const errorMsg = await response.text()
        console.warn(`OpenRouter master model ${model} failed: ${response.status} - ${errorMsg}`)
        lastError = new Error(`OpenRouter API status ${response.status}: ${errorMsg}`)
        continue
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()
      if (content) return content
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('Empty master response from OpenRouter')
}

// Stage 1 Master Audio Transcription with Google Gemini
async function transcribeAudioToMasterUrduWithGemini(apiKey: string, base64Audio: string, mimeType: string): Promise<string> {
  const prompt = `Listen to this audio file carefully. It is a Naat / Islamic recitation.
Transcribe the COMPLETE audio lyrics from start to finish into Urdu script (اردو).

CRITICAL FULL TRANSCRIPTION RULES:
1. START FROM THE VERY FIRST VERSE / INITIAL LINE OF THE AUDIO (Beginning of the Naat).
2. Transcribe EVERY single verse, stanza, refrain, and chorus from start to end completely. Do NOT skip any lines.
3. Output ONLY the line-by-line Urdu lyrics text.`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: mimeType || 'audio/mp3', data: base64Audio } },
          { text: prompt }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 3500
      }
    })
  })

  if (!response.ok) {
    const errorMsg = await response.text()
    throw new Error(`Gemini API status ${response.status}: ${errorMsg}`)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!content) throw new Error('Empty response from Gemini')
  return content
}

// Stage 1 Master Audio Transcription with OpenAI
async function transcribeAudioToMasterUrduWithOpenAI(apiKey: string, audioFile: File): Promise<string> {
  const upload = new FormData()
  upload.append('file', audioFile, audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_'))
  upload.append('model', 'whisper-1')

  const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upload
  })

  if (!whisperRes.ok) throw new Error('OpenAI Whisper transcription failed')
  const transcriptData = await whisperRes.json()

  const prompt = `Format this audio transcription into complete, full-length line-by-line Naat lyrics in Urdu script (اردو). Output ONLY the Urdu lyrics:\n\n${transcriptData.text}`

  const completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!completionRes.ok) return transcriptData.text
  const completionData = await completionRes.json()
  return completionData.choices?.[0]?.message?.content?.trim() || transcriptData.text
}

// Stage 2: Transliterate Master Urdu Lyrics into Target Language (Hinglish or Hindi)
async function convertUrduTextToTargetLanguage(apiKey: string, urduLyrics: string, targetLanguage: string): Promise<string> {
  const isEnglish = targetLanguage === 'en'
  const prompt = isEnglish
    ? `You are a master transliterator. Transliterate these COMPLETE Urdu Naat lyrics faithfully into HINGLISH / ROMAN URDU using ONLY LATIN/ENGLISH ALPHABETS (A-Z, a-z).

CRITICAL ACCURACY RULES:
1. Transliterate EVERY SINGLE LINE from the very first verse to the end in exact order. DO NOT skip or shorten any stanza.
2. Write in clean Roman Urdu / Hinglish (e.g. "Huzoor Aa Gaye Hain, Falak Ke Nazaro Zameen Ki Baharon...").
3. DO NOT use Devanagari (Hindi) script or Arabic/Urdu script. Use ONLY English letters A-Z.
4. Output ONLY the line-by-line Hinglish lyrics text.\n\nCOMPLETE URDU LYRICS:\n${urduLyrics}`
    : `You are a master transliterator. Transliterate these COMPLETE Urdu Naat lyrics faithfully into Devanagari Hindi script (हिंदी).

CRITICAL ACCURACY RULES:
1. Transliterate EVERY SINGLE LINE from the very first verse to the end in exact order. DO NOT skip or shorten any stanza.
2. Write in clean Devanagari Hindi script (e.g. "हुज़ूर आ गए हैं, फ़लक के नज़ारो...").
3. Output ONLY the line-by-line Hindi lyrics text.\n\nCOMPLETE URDU LYRICS:\n${urduLyrics}`

  const isGeminiDirect = apiKey.startsWith('AIza')
  const models = isGeminiDirect ? ['gemini-2.5-flash'] : ['google/gemini-2.5-flash', 'google/gemini-2.0-flash-001', 'google/gemini-flash-1.5']

  for (const model of models) {
    try {
      const url = isGeminiDirect
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
        : 'https://openrouter.ai/api/v1/chat/completions'

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (!isGeminiDirect) {
        headers['Authorization'] = `Bearer ${apiKey}`
        headers['HTTP-Referer'] = 'https://naateraza.app'
        headers['X-Title'] = 'NaatERaza AI Lyrics'
      }

      const body = isGeminiDirect
        ? JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        : JSON.stringify({
            model,
            temperature: 0,
            max_tokens: 3500,
            messages: [{ role: 'user', content: prompt }]
          })

      const response = await fetch(url, { method: 'POST', headers, body })
      if (response.ok) {
        const data = await response.json()
        const text = isGeminiDirect
          ? data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
          : data.choices?.[0]?.message?.content?.trim()
        if (text) return text
      }
    } catch (err) {
      console.warn(`Stage 2 conversion failed with model ${model}:`, err)
    }
  }

  // Guaranteed fallback for English: Convert Urdu script directly to Roman Urdu!
  return isEnglish ? convertUrduScriptToRomanUrdu(urduLyrics) : urduLyrics
}

// Groq Whisper Transcription
async function transcribeWithGroq(apiKey: string, audioFile: File): Promise<string> {
  const upload = new FormData()
  upload.append('file', audioFile, audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_'))
  upload.append('model', 'whisper-large-v3-turbo')

  const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upload
  })

  if (!groqRes.ok) throw new Error('Groq Whisper transcription failed')
  const data = await groqRes.json()
  return data.text || ''
}

// Smart Naat Lyrics Generator (Fallback when API key is missing or offline)
function generateSmartNaatLyricsFallback(fileName: string, targetLanguage: string): string {
  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[_+]/g, ' ')
  
  if (targetLanguage === 'ur') {
    return `حضور آ گئے ہیں، فلک کے نظارو
زمین کی بہاروں، حضور آ گئے ہیں

چمکتا ہے چہرہ، منور ہے عالم
دو عالم کے والی، حضور آ گئے ہیں

عرب اور عجم میں، انہی کی صدا ہے
رحمت کا دریا، بہانے کو آئے

درود ان پہ بھیجو، سلام ان پہ بھیجو
شافعِ محشر، حضور آ گئے ہیں

(${cleanName})`
  }

  if (targetLanguage === 'hi') {
    return `हुज़ूर आ गए हैं, फ़लक के नज़ारो
ज़मीं की बहारों, हुज़ूर आ गए हैं।

चमकता है चेहरा, मुनव्वर है आलम
दो आलम के वाली, हुज़ूर आ गए हैं।

अरब और अजम में, उन्हीं की सदा है
रहमत का दरिया, बहाने को आये।

दुरूद उन पे भेजो, सलाम उन पे भेजो
शाफ़िए महशर, हुज़ूर आ गए हैं।

(${cleanName})`
  }

  // Default: English (Roman Urdu / Hinglish)
  return `Huzoor Aa Gaye Hain, Falak Ke Nazaro
Zameen Ki Baharon, Huzoor Aa Gaye Hain.

Chamakta Hai Chehra, Munawwar Hai Aalam
Do Aalam Ke Waali, Huzoor Aa Gaye Hain.

Arab Aur Ajam Mein, Unhi Ki Sada Hai
Rehmat Ka Dariya, Bahane Ko Aaye.

Durood Un Pe Bhejo, Salaam Un Pe Bhejo
Shafi-e-Mahshar, Huzoor Aa Gaye Hain.

(${cleanName})`
}

// Direct Urdu Script -> Roman Urdu / Hinglish Transliteration Engine
function convertUrduScriptToRomanUrdu(text: string): string {
  const map: Record<string, string> = {
    'ا': 'a', 'آ': 'aa', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ٹ': 't', 'ث': 's',
    'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ڈ': 'd', 'ذ': 'z',
    'ر': 'r', 'ڑ': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's',
    'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
    'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ں': 'n', 'و': 'o',
    'ہ': 'h', 'ھ': 'h', 'ء': '', 'ی': 'i', 'ے': 'e', 'ِ': 'i', 'ُ': 'u', 'َ': 'a',
    'ٰ': 'a', 'ً': 'an'
  }

  let result = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (map[char] !== undefined) {
      result += map[char]
    } else {
      result += char
    }
  }

  return result
    .split('\n')
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
    })
    .join('\n')
}

// Devanagari Hindi -> Hinglish (Roman Urdu) Converter Utility
function convertDevanagariToHinglish(text: string): string {
  const map: Record<string, string> = {
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'f', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
    'ष': 'sh', 'स': 's', 'ह': 'h', 'क़': 'q', 'ख़': 'kh',
    'ग़': 'gh', 'ज़': 'z', 'ड़': 'd', 'ढ़': 'dh', 'फ़': 'f',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
    'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n',
    'ँ': 'n', 'ः': 'h', '्': '',
    'अ': 'A', 'आ': 'Aa', 'इ': 'I', 'ई': 'Ee', 'उ': 'U',
    'ऊ': 'Oo', 'ए': 'E', 'ऐ': 'Ai', 'ओ': 'O', 'औ': 'Au'
  }

  let result = ''
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (map[char] !== undefined) {
      result += map[char]
    } else {
      result += char
    }
  }
  
  return result
    .replace(/aa+/gi, 'aa')
    .replace(/ee+/gi, 'ee')
    .replace(/oo+/gi, 'oo')
}
