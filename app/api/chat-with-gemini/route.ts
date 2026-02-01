import { NextRequest, NextResponse } from 'next/server';

const languageInstructions: { [key: string]: string } = {
  de: 'Du bist ein hilfreicher Assistent für das Lagerverwaltungssystem "Astrein Dashboard". Antworte immer auf Deutsch. Sei präzise, hilfreich und freundlich.',
  en: 'You are a helpful assistant for the warehouse management system "Astrein Dashboard". Always respond in English. Be precise, helpful and friendly.',
  tr: 'Depo yönetim sistemi "Astrein Dashboard" için yardımcısınız. Daima Türkçe yanıt verin. Doğru, yardımcı ve dostça olun.',
  ro: 'Sunteți asistent pentru sistemul de management de depozit "Astrein Dashboard". Răspundeți întotdeauna în limba română. Fiți precis, util și prietenos.',
  ru: 'Вы помощник для системы управления складом "Astrein Dashboard". Всегда отвечайте на русском языке. Будьте точны, полезны и дружелюбны.'
};

// Fallback lokale Antworten wenn Gemini nicht funktioniert
const fallbackResponses: { [key: string]: { [key: string]: string } } = {
  de: {
    artikel: 'Um einen neuen Artikel hinzuzufügen:\n1. Gehe zu "Artikel"\n2. Klicke auf "Neuer Artikel"\n3. Fülle die erforderlichen Felder aus\n4. Speichere den Artikel',
    eingang: 'Wareneingang buchen:\n1. Gehe zu "Wareneingang"\n2. Klicke "Neue Eingangslieferung"\n3. Wähle Artikel und Menge\n4. Speichern',
    ausgang: 'Warenausgang buchen:\n1. Gehe zu "Warenausgang"\n2. Klicke "Neue Ausgangslieferung"\n3. Wähle Artikel und Menge\n4. Speichern',
    default: 'Ich bin dein persönlicher Assistant. Ich kann dir helfen mit Fragen zum Lagerverwaltungssystem "Astrein Dashboard". Wie kann ich dir helfen?'
  },
  en: {
    artikel: 'To add a new item:\n1. Go to "Items"\n2. Click "New Item"\n3. Fill in the required fields\n4. Save',
    eingang: 'Record goods receipt:\n1. Go to "Goods Receipt"\n2. Click "New Receipt"\n3. Select items and quantity\n4. Save',
    ausgang: 'Record goods issue:\n1. Go to "Goods Issue"\n2. Click "New Issue"\n3. Select items and quantity\n4. Save',
    default: 'I am your personal assistant. I can help you with questions about the "Astrein Dashboard" warehouse system. How can I help?'
  },
  tr: {
    artikel: 'Yeni ürün eklemek için:\n1. "Ürünler"e gidin\n2. "Yeni Ürün"e tıklayın\n3. Gerekli alanları doldurun\n4. Kaydedin',
    eingang: 'Mal girişi kaydetmek için:\n1. "Mal Girişi"ne gidin\n2. "Yeni Giriş"e tıklayın\n3. Ürün ve miktarı seçin\n4. Kaydedin',
    ausgang: 'Mal çıkışı kaydetmek için:\n1. "Mal Çıkışı"na gidin\n2. "Yeni Çıkış"a tıklayın\n3. Ürün ve miktarı seçin\n4. Kaydedin',
    default: 'Ben senin kişisel yardımcınım. "Astrein Dashboard" depo sistemi hakkındaki sorulara yardımcı olabilirim. Nasıl yardımcı olabilirim?'
  },
  ro: {
    artikel: 'Pentru a adăuga un articol nou:\n1. Mergeți la "Articole"\n2. Faceți clic pe "Articol Nou"\n3. Completați câmpurile necesare\n4. Salvați',
    eingang: 'Pentru a înregistra recepția:\n1. Mergeți la "Recepție"\n2. Faceți clic pe "Recepție Nouă"\n3. Selectați articole și cantitate\n4. Salvați',
    ausgang: 'Pentru a înregistra ieșirea:\n1. Mergeți la "Ieșire"\n2. Faceți clic pe "Ieșire Nouă"\n3. Selectați articole și cantitate\n4. Salvați',
    default: 'Sunt asistentul tău personal. Pot ajuta cu întrebări despre sistemul de depozit "Astrein Dashboard". Cum te pot ajuta?'
  },
  ru: {
    artikel: 'Чтобы добавить новый товар:\n1. Перейди в "Товары"\n2. Нажми "Новый товар"\n3. Заполни необходимые поля\n4. Сохрани',
    eingang: 'Зарегистрировать приём:\n1. Перейди в "Приём"\n2. Нажми "Новый приём"\n3. Выбери товары и количество\n4. Сохрани',
    ausgang: 'Зарегистрировать отпуск:\n1. Перейди в "Отпуск"\n2. Нажми "Новый отпуск"\n3. Выбери товары и количество\n4. Сохрани',
    default: 'Я твой личный помощник. Я могу помочь с вопросами о системе управления складом "Astrein Dashboard". Чем я могу помочь?'
  }
};

function getFallbackResponse(message: string, language: string): string {
  const lower = message.toLowerCase();
  const langResponses = fallbackResponses[language] || fallbackResponses.de;

  // Artikel hinzufügen
  if (lower.match(/artikel|item|product|ware|hinzufügen|hinzufüge|neu|add|ürün|articol|товар|добавить|hinzufügn|erstell/)) {
    return langResponses.artikel;
  }
  // Wareneingang
  if (lower.match(/eingang|receipt|girişi|recepție|приём|wareneingang|eingeben|ware.*ein|mal.*gir|goods.*receipt/)) {
    return langResponses.eingang;
  }
  // Warenausgang
  if (lower.match(/ausgang|issue|çıkışı|ieșire|отпуск|warenausgang|ausgeben|ware.*aus|mal.*çık|goods.*issue/)) {
    return langResponses.ausgang;
  }
  return langResponses.default;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, language = 'de' } = body;

    console.log('API called:', { message, language });

    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        response: 'Error: Message is required',
        error: true
      });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'dein-gemini-api-key-hier') {
      console.log('Using fallback - API key not configured');
      return NextResponse.json({
        response: getFallbackResponse(message, language),
        language,
        fallback: true
      });
    }

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const systemPrompt = languageInstructions[language] || languageInstructions.de;
      const fullPrompt = `${systemPrompt}\n\nFrage: ${message}`;

      console.log('Calling Gemini...');
      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text();

      console.log('Gemini response OK');
      return NextResponse.json({
        response: responseText,
        language,
        success: true
      });
    } catch (geminiError) {
      console.error('Gemini failed:', geminiError);
      // Fallback auf lokale Antworten
      return NextResponse.json({
        response: getFallbackResponse(message, language),
        language,
        fallback: true
      });
    }
  } catch (error: any) {
    console.error('API error:', error?.message);
    return NextResponse.json(
      {
        response: 'Error processing request',
        error: true,
        details: error?.message
      },
      { status: 500 }
    );
  }
}
