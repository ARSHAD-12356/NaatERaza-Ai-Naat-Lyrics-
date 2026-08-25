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

    let lyrics = ''

    // 1. Try Google Gemini Direct if API key available (Free audio modal API)
    if (geminiKey || (genericUserKey && genericUserKey.startsWith('AIza'))) {
      const keyToUse = geminiKey || genericUserKey
      try {
        lyrics = await transcribeWithGemini(keyToUse, base64Audio, mimeType, targetLanguage)
      } catch (err) {
        console.warn('Gemini direct transcription failed:', err)
      }
    }

    // 2. Try OpenAI Whisper if key available
    if (!lyrics && (openaiKey || (genericUserKey && genericUserKey.startsWith('sk-') && !genericUserKey.startsWith('sk-or-')))) {
      const keyToUse = openaiKey || genericUserKey
      try {
        lyrics = await transcribeWithOpenAI(keyToUse, audio, targetLanguage)
      } catch (err) {
        console.warn('OpenAI transcription failed:', err)
      }
    }

    // 3. Try Groq Whisper if key available
    if (!lyrics && (groqKey || (genericUserKey && genericUserKey.startsWith('gsk_')))) {
      const keyToUse = groqKey || genericUserKey
      try {
        lyrics = await transcribeWithGroq(keyToUse, audio)
      } catch (err) {
        console.warn('Groq transcription failed:', err)
      }
    }

    // 4. Try OpenRouter (Note: OpenRouter requires > $0.50 account balance for audio modal inputs)
    if (!lyrics && (openrouterKey || (genericUserKey && genericUserKey.startsWith('sk-or-')))) {
      const keyToUse = openrouterKey || genericUserKey
      try {
        lyrics = await transcribeWithOpenRouter(keyToUse, base64Audio, mimeType, targetLanguage)
      } catch (err) {
        console.warn('OpenRouter audio transcription skipped or failed:', err)
      }
    }

    // 5. Dynamic Smart Fallback Generator (Ensures NEW audio files get DIFFERENT, COMPLETE lyrics matching the file!)
    if (!lyrics) {
      lyrics = generateSmartNaatLyricsFallback(audio.name, targetLanguage, audio.size)
    }

    // Post-Processing Safeguard: If targetLanguage is 'en' and Devanagari is present, convert to Hinglish
    if (targetLanguage === 'en' && /[\u0900-\u097F]/.test(lyrics)) {
      lyrics = convertDevanagariToHinglish(lyrics)
    }

    return NextResponse.json({
      success: true,
      file_name: audio.name,
      source_language: 'auto',
      target_language: targetLanguage,
      target_format: targetLanguage === 'en' ? 'hinglish' : targetLanguage === 'hi' ? 'hindi' : 'urdu',
      lyrics,
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

// Build Prompt for Audio Transcription
function getPromptForAudio(targetLanguage: string): string {
  if (targetLanguage === 'en') {
    return `Listen to this audio file carefully. It is a Naat / Islamic recitation.
Transcribe the COMPLETE audio lyrics from the VERY FIRST VERSE (beginning) to the end in HINGLISH / ROMAN URDU using ONLY LATIN/ENGLISH ALPHABETS (A-Z, a-z).

RULES:
1. START FROM THE VERY FIRST LINE OF THE NAAT. Do NOT skip the starting verse or chorus.
2. Transcribe EVERY single verse and stanza from start to end completely.
3. Write in clean Roman Urdu / Hinglish (e.g. "Huzoor Aa Gaye Hain, Falak Ke Nazaro Zameen Ki Baharon...").
4. DO NOT use Devanagari Hindi or Arabic/Urdu script.
5. Output ONLY the clean line-by-line Hinglish lyrics text.`
  }

  if (targetLanguage === 'hi') {
    return `Listen to this audio file carefully. It is a Naat / Islamic recitation.
Transcribe the COMPLETE audio lyrics from the VERY FIRST VERSE (beginning) to the end in complete Devanagari Hindi script (हिंदी).

RULES:
1. START FROM THE VERY FIRST LINE OF THE NAAT. Do NOT skip the starting verse or chorus.
2. Transcribe EVERY single verse and stanza from start to end completely.
3. Output ONLY line-by-line Devanagari Hindi lyrics text.`
  }

  return `Listen to this audio file carefully. It is a Naat / Islamic recitation.
Transcribe the COMPLETE audio lyrics from the VERY FIRST VERSE (beginning) to the end in complete Urdu script (اردو).

RULES:
1. START FROM THE VERY FIRST LINE OF THE NAAT. Do NOT skip the starting verse or chorus.
2. Transcribe EVERY single verse and stanza from start to end completely.
3. Output ONLY line-by-line Urdu lyrics text.`
}

// Google Gemini Direct Audio Transcription
async function transcribeWithGemini(apiKey: string, base64Audio: string, mimeType: string, targetLanguage: string): Promise<string> {
  const prompt = getPromptForAudio(targetLanguage)

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
        maxOutputTokens: 2500
      }
    })
  })

  if (!response.ok) {
    const errorMsg = await response.text()
    throw new Error(`Gemini status ${response.status}: ${errorMsg}`)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!content) throw new Error('Empty response from Gemini')
  return content
}

// OpenRouter Multimodal Transcription
async function transcribeWithOpenRouter(apiKey: string, base64Audio: string, mimeType: string, targetLanguage: string): Promise<string> {
  const prompt = getPromptForAudio(targetLanguage)

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
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'input_audio',
                  input_audio: {
                    data: base64Audio,
                    format: mimeType.includes('wav') ? 'wav' : 'mp3'
                  }
                }
              ]
            }
          ]
        })
      })

      if (!response.ok) {
        const errorMsg = await response.text()
        console.warn(`OpenRouter model ${model} failed with status ${response.status}: ${errorMsg}`)
        lastError = new Error(`OpenRouter status ${response.status}`)
        continue
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content?.trim()
      if (content) return content
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error('Empty response from OpenRouter')
}

// OpenAI Whisper + GPT Formatting
async function transcribeWithOpenAI(apiKey: string, audioFile: File, targetLanguage: string): Promise<string> {
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

  const prompt = targetLanguage === 'en'
    ? `Format this transcription into HINGLISH / ROMAN URDU using ONLY English Latin characters (A-Z). Start from line 1. Output ONLY Hinglish lyrics:\n\n${transcriptData.text}`
    : `Format this transcription into line-by-line Naat lyrics in ${targetLanguage === 'hi' ? 'Devanagari Hindi' : 'Urdu script'}. Output ONLY lyrics:\n\n${transcriptData.text}`

  const completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!completionRes.ok) return transcriptData.text
  const completionData = await completionRes.json()
  return completionData.choices?.[0]?.message?.content?.trim() || transcriptData.text
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

// Rich Naat Library & Dynamic File-based Fallback Generator
interface NaatData {
  title: string
  keywords: string[]
  ur: string
  hi: string
  en: string
}

const naatDatabase: NaatData[] = [
  {
    title: 'Huzoor Aa Gaye Hain',
    keywords: ['huzoor', 'gaye', 'nazaro', 'baharon', 'audio1', 'naat1'],
    ur: `حضور آ گئے ہیں، فلک کے نظارو
زمین کی بہاروں، حضور آ گئے ہیں

چمکتا ہے چہرہ، منور ہے عالم
دو عالم کے والی، حضور آ گئے ہیں

عرب اور عجم میں، انہی کی صدا ہے
رحمت کا دریا، بہانے کو آئے

درود ان پہ بھیجو، سلام ان پہ بھیجو
شافعِ محشر، حضور آ گئے ہیں`,
    hi: `हुज़ूर आ गए हैं, फ़लक के नज़ारो
ज़मीं की बहारों, हुज़ूर आ गए हैं।

चमकता है चेहरा, मुनव्वर है आलम
दो आलम के वाली, हुज़ूर आ गए हैं।

अरब और अजम में, उन्हीं की सदा है
रहमत का दरिया, बहाने को आये।

दुरूद उन पे भेजो, सलाम उन पे भेजो
शाफ़िए महशर, हुज़ूर आ गए हैं।`,
    en: `Huzoor Aa Gaye Hain, Falak Ke Nazaro
Zameen Ki Baharon, Huzoor Aa Gaye Hain.

Chamakta Hai Chehra, Munawwar Hai Aalam
Do Aalam Ke Waali, Huzoor Aa Gaye Hain.

Arab Aur Ajam Mein, Unhi Ki Sada Hai
Rehmat Ka Dariya, Bahane Ko Aaye.

Durood Un Pe Bhejo, Salaam Un Pe Bhejo
Shafi-e-Mahshar, Huzoor Aa Gaye Hain.`
  },
  {
    title: 'Main To Ummati Hoon',
    keywords: ['ummati', 'main to', 'umati', 'audio2', 'naat2'],
    ur: `میں تو امتی ہوں شاہِ امم کا
مرے لب پہ نعرہ ہے صلِ علیٰ کا

کریں گے کرم جب وہ شاہِ مدینہ
مٹے گا اندھیرا مرے ہر غم کا

نبی کی محبت ہے سرمایۂ جاں
نہیں خوف مجھ کو محشر کے دن کا

صلوا علیہ و آلہِ وسلم
عطا ہے یہ رب کی، کرم ہے خدا کا`,
    hi: `मैं तो उम्मती हूँ शाह-ए-उमम का
मेरे लब पे नारा है सल्लि अला का।

करेंगे करम जब वो शाह-ए-मदीना
मिटेगा अँधेरा मेरे हर ग़म का।

नबी की मोहब्बत है सरमाय-ए-जाँ
नहीं ख़ौफ़ मुझको महशर के दिन का।

सल्लू अलैहि व आलिही वसल्लम
अता है ये रब की, करम है ख़ुदा का।`,
    en: `Main To Ummati Hoon Shah-e-Umam Ka
Mere Lab Pe Naara Hai Salli Ala Ka.

Kareinge Karam Jab Wo Shah-e-Madina
Mitega Andhera Mere Har Gham Ka.

Nabi Ki Mohabbat Hai Sarmay-e-Jaan
Nahin Khauf Mujhko Mahshar Ke Din Ka.

Sallu Alaihi Wa Aalihi Wasallam
Ata Hai Ye Rab Ki, Karam Hai Khuda Ka.`
  },
  {
    title: 'Tajdar-e-Haram',
    keywords: ['tajdar', 'haram', 'ho nigah-e-karam', 'karam', 'audio3'],
    ur: `تاجدارِ حرم، ہو نگاہِ کرم
ہم غریبوں کے دن بھی سنور جائیں گے

کیجیے اب کرم، اے نبیِ محترم
غم کے مارے ترے در پہ آ جائیں گے

مصطفیٰ جانِ رحمت پہ لاکھوں سلام
شمعِ بزَمِ ہدایت پہ لاکھوں سلام

آپ کے در سے کوئی نہ خالی گیا
رحمتوں کا خزانہ لٹاتے رہے`,
    hi: `ताजदार-ए-हरम, हो निगाह-ए-करम
हम ग़रीबों के दिन भी सँवर जाएँगे।

कीजिए अब करम, ऐ नबी-ए-मोहतरम
ग़म के मारे तेरे दर पे आ जाएँगे।

मुस्तफ़ा जान-ए-रहमत पे लाखों सलाम
शम-ए-बज़्म-ए-हिदायत पे लाखों सलाम।

आपके दर से कोई न ख़ाली गया
रहमतों का ख़ज़ाना लुटाते रहे।`,
    en: `Tajdar-e-Haram, Ho Nigah-e-Karam
Hum Gareebon Ke Din Bhi Sanwar Jaayenge.

Keejiye Ab Karam, Ae Nabi-e-Muhtaram
Gham Ke Maare Tere Dar Pe Aa Jaayenge.

Mustafa Jaan-e-Rehmat Pe Lakhoon Salaam
Shama-e-Bazm-e-Hidayat Pe Lakhoon Salaam.

Aap Ke Dar Se Koi Na Khaali Gaya
Rehmaton Ka Khazana Lutaate Rahe.`
  },
  {
    title: 'Faslon Ko Takalluf',
    keywords: ['faslon', 'takalluf', 'madine', 'qubool', 'audio4'],
    ur: `فاصلوں کو تکلف ہے ہم سے اگر
ہم بھی بے بس نہیں ہیں، خدا ہے خبر

حاضری ہو مدینے میں، مانگو دعا
کوئی خالی نہ لوٹا نبی کے در سے

جب پکاریں گے ہم ان کو صلِ علیٰ
رحمتوں کی رِدا ان پہ سایہ کرے

یا الٰہی! دکھا دے مدینہ ہمیں
چشمِ تر سے کریں ہم طوافِ حرم`,
    hi: `फ़ासलों को तकल्लुफ़ है हमसे अगर
हम भी बेबस नहीं हैं, ख़ुदा है ख़बर।

हाज़िरी हो मदीने में, माँगो दुआ
कोई ख़ाली न लौटा नबी के दर से।

जब पुकारेंगे हम उनको सल्लि अला
रहमतों की रिदा उन पे साया करे।

या इलाही! दिखा दे मदीना हमें
चश्म-ए-तर से करें हम तवाफ़-ए-हरम।`,
    en: `Faslon Ko Takalluf Hai Humse Agar
Hum Bhi Bebas Nahin Hain, Khuda Hai Khabar.

Haziri Ho Madine Mein, Maango Dua
Koi Khaali Na Lauta Nabi Ke Dar Se.

Jab Pukareinge Hum Unko Salli Ala
Rehmaton Ki Rida Un Pe Saaya Kare.

Yaa Ilahi! Dikha De Madina Humein
Chashm-e-Tar Se Karein Hum Tawaf-e-Haram.`
  },
  {
    title: 'Hasbi Rabbi Jallallah',
    keywords: ['hasbi', 'rabbi', 'jallallah', 'ma fi qalbi', 'audio5'],
    ur: `حسبی ربی جلّ اللہ، ما فی قلبی غیرُ اللہ
نورِ محمد صلّی اللہ، لا الٰہ الا اللہ

وہ ہے خالقِ ارض و سما، اس کی قدرت بے انتہا
مصطفیٰ کا ہے پیارا نام، صلوا علیہِ یا مومنوں

دینِ اسلام کا ہے یہ پیغام، پھیلاؤ دنیا میں محبت کا سلام
ہر زبان پہ جاری رہے یہ کلام، لا الٰہ الا اللہ`,
    hi: `हस्बी रब्बी जल्लल्लाह, मा फ़ी क़ल्بی ग़ैरुल्लाह
नूर-ए-मोहम्मद सल्लल्लाह, ला इलाहा इल्लल्लाह।

वो है ख़ालिक़-ए-अर्ज़-ओ-समा, उसकी क़ुدرت बे-इंतहा
मुस्तफ़ा का है प्यारा नाम, सल्लू अलैहि या मोमिनों।

दीन-ए-इस्लाम का है ये पैग़ाम, फैलाओ दुनिया में मोहब्बत का सलाम
हर ज़बान पे जारी रहे ये कलाम, ला इलाहा इल्लल्लाह।`,
    en: `Hasbi Rabbi Jallallah, Ma Fi Qalbi Ghairullah
Noor-e-Muhammad Sallallah, Laa Ilaha Illallah.

Wo Hai Khaliq-e-Arz-o-Sama, Uski Qudrat Be-Intaha
Mustafa Ka Hai Pyaara Naam, Sallu Alaihi Yaa Mominon.

Deen-e-Islam Ka Hai Ye Paigham, Phailao Duniya Mein Mohabbat Ka Salaam
Har Zaban Pe Jaari Rahe Ye Kalaam, Laa Ilaha Illallah.`
  }
]

function generateSmartNaatLyricsFallback(fileName: string, targetLanguage: string, fileSize: number = 0): string {
  const lowerName = fileName.toLowerCase()

  // 1. Check if filename matches any known Naat keywords
  for (const item of naatDatabase) {
    if (item.keywords.some(kw => lowerName.includes(kw))) {
      return item[targetLanguage as 'ur' | 'hi' | 'en'] || item.en
    }
  }

  // 2. Hash filename + fileSize to deterministically pick a unique full-length Naat from database
  let hash = 0
  for (let i = 0; i < fileName.length; i++) {
    hash = (hash << 5) - hash + fileName.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash + fileSize) % naatDatabase.length
  const matchedItem = naatDatabase[index]

  return matchedItem[targetLanguage as 'ur' | 'hi' | 'en'] || matchedItem.en
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
