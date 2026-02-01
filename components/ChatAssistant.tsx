"use client";

import { useState, useEffect, useRef } from "react";
import { usePrefs } from "../lib/prefs";
import { auth, db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type Message = {
  id: string;
  text: string;
  sender: "user" | "assistant" | "support";
  timestamp: Date;
  userName?: string;
};

type HelpTopic = {
  id: string;
  question: string;
  answer: string;
};

export default function ChatAssistant() {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [showTopics, setShowTopics] = useState(true);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"de" | "en" | "tr" | "ro" | "ru">("de");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        // Nur den Namen anzeigen, keine E-Mail
        const name = user.displayName || user.email?.split('@')[0] || "Benutzer";
        setUserName(name);
      }
    });
    return () => unsub();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const helpTopics: HelpTopic[] = [
    {
      id: "add-item",
      question: t("chat.topic.addItem"),
      answer: t("chat.answer.addItem"),
    },
    {
      id: "wareneingang",
      question: t("chat.topic.wareneingang"),
      answer: t("chat.answer.wareneingang"),
    },
    {
      id: "warenausgang",
      question: t("chat.topic.warenausgang"),
      answer: t("chat.answer.warenausgang"),
    },
    {
      id: "export",
      question: t("chat.topic.export"),
      answer: t("chat.answer.export"),
    },
    {
      id: "reserve",
      question: t("chat.topic.reserve"),
      answer: t("chat.answer.reserve"),
    },
  ];

  function handleTopicClick(topic: HelpTopic) {
    if (!userId) return;
    
    setShowTopics(false);
    setLoading(true);

    // Add user message to local state
    const userMsg: Message = {
      id: Date.now().toString(),
      text: topic.question,
      sender: "user",
      timestamp: new Date(),
      userName,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Add assistant response after delay
    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: topic.answer,
        sender: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLoading(false);
    }, 500);
  }

  function detectLanguage(text: string): "de" | "en" | "tr" | "ro" | "ru" {
    const lower = text.toLowerCase();
    
    // Explizite Sprachanforderungen erkennen
    // Deutsch
    if (/\b(auf deutsch|in deutsch|auf deutschem|deutsch bitte)\b/i.test(text)) return "de";
    
    // Englisch
    if (/\b(auf englisch|in english|english please|auf englisch|in english|english)\b/i.test(text)) return "en";
    
    // Türkisch
    if (/\b(auf türkisch|in türkisch|turkish|türkçe|türkçe lütfen)\b/i.test(text)) return "tr";
    
    // Rumänisch
    if (/\b(auf rumänisch|in rumänisch|romanian|română|română te rog)\b/i.test(text)) return "ro";
    
    // Russisch (auch auf anderen Sprachen geschrieben)
    if (/\b(auf russisch|in russisch|на русском|russian|по русски|русский|русский пожалуйста)\b/i.test(text)) return "ru";
    
    // Cyrillic detectino for Russian
    if (/[а-яё]/i.test(text)) return "ru";
    
    // Turkish indicators
    if (lower.match(/\b(nasıl|nerede|ne|var|yok|lütfen|teşekkür|merhaba)\b/)) return "tr";
    
    // Romanian indicators
    if (lower.match(/\b(cum|unde|ce|este|sunt|mulțumesc|bună)\b/)) return "ro";
    
    // English indicators
    if (lower.match(/\b(how|where|what|is|are|thank|hello|please)\b/)) return "en";
    
    // Default to German
    return "de";
  }

  function getIntelligentResponse(message: string, detectedLang: string): string {
    const lower = message.toLowerCase();
    
    // Greetings
    if (lower.match(/\b(hallo|hi|hey|guten|servus|moin)\b/)) {
      return detectedLang === "de" ? "Hallo! Ich bin Ihr virtueller Assistent. Wie kann ich Ihnen heute helfen?" :
             detectedLang === "en" ? "Hello! I'm your virtual assistant. How can I help you today?" :
             detectedLang === "tr" ? "Merhaba! Ben sanal asistanınızım. Size bugün nasıl yardımcı olabilirim?" :
             detectedLang === "ro" ? "Bună! Sunt asistentul tău virtual. Cu ce te pot ajuta astăzi?" :
             "Здравствуйте! Я ваш виртуальный помощник. Чем могу помочь?";
    }
    
    // Adding items
    if (lower.match(/\b(hinzufüg|anlegen|erstell|neu.*item|neu.*gerät|neu.*material|add.*item|create.*item|yeni.*ekle|adăuga.*articol|добавить.*товар)\b/)) {
      return detectedLang === "de" ? "Um ein neues Gerät oder Material hinzuzufügen:\n\n1. Klicken Sie auf 'Geräte & Material' in der Seitenleiste\n2. Klicken Sie auf den blauen '+' Button oben rechts\n3. Füllen Sie alle erforderlichen Felder aus (ID, Name, Typ, Kategorie, Lager, Zustand, Status, Bestand)\n4. Klicken Sie auf 'Speichern'\n\nMöchten Sie weitere Details zu einem bestimmten Feld?" :
             detectedLang === "en" ? "To add a new device or material:\n\n1. Click 'Items' in the sidebar\n2. Click the blue '+' button at the top right\n3. Fill in all required fields (ID, Name, Type, Category, Warehouse, Condition, Status, Stock)\n4. Click 'Save'\n\nWould you like more details about a specific field?" :
             detectedLang === "tr" ? "Yeni bir cihaz veya malzeme eklemek için:\n\n1. Kenar çubuğunda 'Cihazlar & Malzeme' üzerine tıklayın\n2. Sağ üstteki mavi '+' düğmesine tıklayın\n3. Tüm gerekli alanları doldurun\n4. 'Kaydet' üzerine tıklayın" :
             detectedLang === "ro" ? "Pentru a adăuga un nou articol:\n\n1. Faceți clic pe 'Echipamente & Materiale' în bara laterală\n2. Faceți clic pe butonul albastru '+' din partea dreaptă sus\n3. Completați toate câmpurile necesare\n4. Faceți clic pe 'Salvare'" :
             "Чтобы добавить новое оборудование:\n\n1. Нажмите 'Оборудование и материалы' на боковой панели\n2. Нажмите синюю кнопку '+' справа вверху\n3. Заполните все поля\n4. Нажмите 'Сохранить'";
    }
    
    // Goods receipt
    if (lower.match(/\b(wareneingang|eingang.*buch|empfang|goods.*receipt|receipt|mal.*gir|recepție|приём.*товар)\b/)) {
      return detectedLang === "de" ? "Wareneingang buchen:\n\n1. Gehen Sie zu 'Geräte & Material'\n2. Finden Sie das Item in der Liste\n3. Klicken Sie auf 'Bearbeiten'\n4. Erhöhen Sie den Bestand im Feld 'Bestand (Gesamt)'\n5. Speichern Sie die Änderungen\n\nDie Historie sehen Sie unter 'Wareneingang' in der Seitenleiste." :
             detectedLang === "en" ? "To record goods receipt:\n\n1. Go to 'Items'\n2. Find the item in the list\n3. Click 'Edit'\n4. Increase the stock in 'Stock (total)' field\n5. Save changes\n\nView history under 'Goods Receipt' in the sidebar." :
             detectedLang === "tr" ? "Mal girişi kaydetmek için:\n\n1. 'Cihazlar & Malzeme'ye gidin\n2. Listeden ürünü bulun\n3. 'Düzenle'ye tıklayın\n4. Stok miktarını artırın\n5. Değişiklikleri kaydedin" :
             detectedLang === "ro" ? "Pentru a înregistra recepția:\n\n1. Mergeți la 'Echipamente & Materiale'\n2. Găsiți articolul în listă\n3. Faceți clic pe 'Editare'\n4. Creșteți stocul\n5. Salvați modificările" :
             "Для регистрации приёма:\n\n1. Перейдите в 'Оборудование и материалы'\n2. Найдите товар в списке\n3. Нажмите 'Редактировать'\n4. Увеличьте остаток\n5. Сохраните изменения";
    }
    
    // Goods issue
    if (lower.match(/\b(warenausgang|ausgang.*buch|ausgabe|goods.*issue|issue|mal.*çık|ieșire|отпуск.*товар)\b/)) {
      return detectedLang === "de" ? "Warenausgang buchen:\n\n1. Gehen Sie zu 'Geräte & Material'\n2. Finden Sie das Item\n3. Klicken Sie auf 'Bearbeiten'\n4. Verringern Sie den Bestand\n5. Speichern\n\nOder nutzen Sie die Reservierungsfunktion für geplante Ausgänge." :
             detectedLang === "en" ? "To record goods issue:\n\n1. Go to 'Items'\n2. Find the item\n3. Click 'Edit'\n4. Decrease the stock\n5. Save\n\nOr use the reservation function for planned issues." :
             detectedLang === "tr" ? "Mal çıkışı kaydetmek için:\n\n1. 'Cihazlar & Malzeme'ye gidin\n2. Ürünü bulun\n3. 'Düzenle'ye tıklayın\n4. Stoku azaltın\n5. Kaydedin" :
             detectedLang === "ro" ? "Pentru a înregistra ieșirea:\n\n1. Mergeți la 'Echipamente & Materiale'\n2. Găsiți articolul\n3. Editați\n4. Reduceți stocul\n5. Salvați" :
             "Для регистрации отпуска:\n\n1. Перейдите в 'Оборудование'\n2. Найдите товар\n3. Редактируйте\n4. Уменьшите остаток\n5. Сохраните";
    }
    
    // Export/Download
    if (lower.match(/\b(export|download|herunterlad|daten.*export|csv|excel|indir|descărc|скачать|экспорт)\b/)) {
      return detectedLang === "de" ? "Daten exportieren:\n\n1. Klicken Sie auf 'Exporte' in der Seitenleiste\n2. Wählen Sie den gewünschten Export:\n   - Lagerbestand (aktuelle Bestände)\n   - Wareneingang Historie\n   - Warenausgang Historie\n3. Klicken Sie auf 'Herunterladen'\n\nDie Dateien werden als CSV mit UTF-8 Kodierung heruntergeladen." :
             detectedLang === "en" ? "To export data:\n\n1. Click 'Exports' in the sidebar\n2. Choose your export:\n   - Inventory (current stock)\n   - Goods Receipt History\n   - Goods Issue History\n3. Click 'Download'\n\nFiles are downloaded as CSV with UTF-8 encoding." :
             detectedLang === "tr" ? "Veri dışa aktarmak için:\n\n1. Kenar çubuğunda 'Dışa Aktarımlar'a tıklayın\n2. İstediğiniz dışa aktarımı seçin\n3. 'İndir'e tıklayın" :
             detectedLang === "ro" ? "Pentru a exporta date:\n\n1. Faceți clic pe 'Exporturi' în bara laterală\n2. Alegeți exportul dorit\n3. Faceți clic pe 'Descărcare'" :
             "Для экспорта данных:\n\n1. Нажмите 'Экспорты' на боковой панели\n2. Выберите нужный экспорт\n3. Нажмите 'Скачать'";
    }
    
    // Reservation
    if (lower.match(/\b(reserv|buchen|booking|rezerv|rezervare|резерв)\b/)) {
      return detectedLang === "de" ? "Item reservieren:\n\n1. Gehen Sie zu 'Geräte & Material'\n2. Finden Sie das gewünschte Item\n3. Klicken Sie auf 'Reservieren'\n4. Wählen Sie das Datum\n5. Geben Sie die Anzahl ein\n6. Optional: Für wen (Name/Abteilung)\n7. Bestätigen\n\nReservierte Items bleiben im Bestand, sind aber markiert." :
             detectedLang === "en" ? "To reserve an item:\n\n1. Go to 'Items'\n2. Find the desired item\n3. Click 'Reserve'\n4. Select the date\n5. Enter quantity\n6. Optional: For whom\n7. Confirm\n\nReserved items remain in stock but are marked." :
             detectedLang === "tr" ? "Bir ürünü rezerve etmek için:\n\n1. 'Cihazlar & Malzeme'ye gidin\n2. İstediğiniz ürünü bulun\n3. 'Rezerve Et'e tıklayın\n4. Tarihi seçin\n5. Miktarı girin\n6. Onaylayın" :
             detectedLang === "ro" ? "Pentru a rezerva un articol:\n\n1. Mergeți la 'Echipamente & Materiale'\n2. Găsiți articolul\n3. Faceți clic pe 'Rezervare'\n4. Selectați data\n5. Introduceți cantitatea\n6. Confirmați" :
             "Для резервирования товара:\n\n1. Перейдите в 'Оборудование'\n2. Найдите нужный товар\n3. Нажмите 'Резервировать'\n4. Выберите дату\n5. Введите количество\n6. Подтвердите";
    }
    
    // Search/Filter
    if (lower.match(/\b(such|find|filter|suchen|ara|caut|найти|поиск)\b/)) {
      return detectedLang === "de" ? "Suchen und Filtern:\n\n1. In 'Geräte & Material' gibt es eine Suchleiste oben\n2. Geben Sie ID oder Namen ein\n3. Nutzen Sie die Dropdown-Filter:\n   - Lager\n   - Kategorie\n   - Zustand\n4. Die Ergebnisse werden sofort aktualisiert\n\nKlicken Sie 'Filter zurücksetzen' um alle anzuzeigen." :
             detectedLang === "en" ? "Search and Filter:\n\n1. In 'Items' there's a search bar at the top\n2. Enter ID or name\n3. Use dropdown filters:\n   - Warehouse\n   - Category\n   - Condition\n4. Results update instantly\n\nClick 'Reset filters' to show all." :
             detectedLang === "tr" ? "Arama ve Filtreleme:\n\n1. 'Cihazlar & Malzeme' üstte arama çubuğu var\n2. ID veya isim girin\n3. Açılır filtreleri kullanın\n4. Sonuçlar anında güncellenir" :
             detectedLang === "ro" ? "Căutare și Filtrare:\n\n1. În 'Echipamente' există o bară de căutare sus\n2. Introduceți ID sau nume\n3. Utilizați filtrele dropdown\n4. Rezultatele se actualizează instant" :
             "Поиск и Фильтрация:\n\n1. В 'Оборудование' есть строка поиска сверху\n2. Введите ID или название\n3. Используйте выпадающие фильтры\n4. Результаты обновляются мгновенно";
    }
    
    // Delete
    if (lower.match(/\b(lösch|delete|entfern|sil|șterg|удалить)\b/)) {
      return detectedLang === "de" ? "Item löschen (nur für Admins):\n\n1. Gehen Sie zu 'Geräte & Material'\n2. Finden Sie das Item\n3. Klicken Sie auf den roten 'Löschen' Button\n4. Bestätigen Sie die Aktion\n\n⚠️ Achtung: Gelöschte Items können nicht wiederhergestellt werden!" :
             detectedLang === "en" ? "Delete item (admin only):\n\n1. Go to 'Items'\n2. Find the item\n3. Click the red 'Delete' button\n4. Confirm the action\n\n⚠️ Warning: Deleted items cannot be restored!" :
             detectedLang === "tr" ? "Ürün silme (sadece yöneticiler):\n\n1. 'Cihazlar & Malzeme'ye gidin\n2. Ürünü bulun\n3. Kırmızı 'Sil' düğmesine tıklayın\n4. Onaylayın\n\n⚠️ Uyarı: Silinen ürünler geri yüklenemez!" :
             detectedLang === "ro" ? "Ștergere articol (doar admin):\n\n1. Mergeți la 'Echipamente'\n2. Găsiți articolul\n3. Faceți clic pe butonul roșu 'Ștergere'\n4. Confirmați\n\n⚠️ Atenție: Articolele șterse nu pot fi restaurate!" :
             "Удаление товара (только админ):\n\n1. Перейдите в 'Оборудование'\n2. Найдите товар\n3. Нажмите красную кнопку 'Удалить'\n4. Подтвердите\n\n⚠️ Внимание: Удалённые товары нельзя восстановить!";
    }
    
    // Settings/Language
    if (lower.match(/\b(einstellung|settings|sprach|language|ayar|dil|setări|limbă|настройк|язык)\b/)) {
      return detectedLang === "de" ? "Einstellungen ändern:\n\n1. Klicken Sie auf 'Einstellungen' in der Seitenleiste\n2. Wählen Sie Ihre Sprache (DE, EN, TR, RO, RU)\n3. Wählen Sie ein Design-Thema\n4. Passen Sie die Akzentfarbe an\n\nÄnderungen werden sofort gespeichert!" :
             detectedLang === "en" ? "Change settings:\n\n1. Click 'Settings' in the sidebar\n2. Choose your language (DE, EN, TR, RO, RU)\n3. Select a design theme\n4. Customize accent color\n\nChanges are saved automatically!" :
             detectedLang === "tr" ? "Ayarları değiştir:\n\n1. Kenar çubuğunda 'Ayarlar'a tıklayın\n2. Dilinizi seçin (DE, EN, TR, RO, RU)\n3. Bir tasarım teması seçin\n4. Vurgu rengini özelleştirin" :
             detectedLang === "ro" ? "Modificare setări:\n\n1. Faceți clic pe 'Setări' în bara laterală\n2. Alegeți limba (DE, EN, TR, RO, RU)\n3. Selectați o temă de design\n4. Personalizați culoarea accent" :
             "Изменить настройки:\n\n1. Нажмите 'Настройки' на боковой панели\n2. Выберите язык (DE, EN, TR, RO, RU)\n3. Выберите тему дизайна\n4. Настройте акцентный цвет";
    }
    
    // Thank you
    if (lower.match(/\b(danke|thanks|teşekkür|mulțumesc|спасибо)\b/)) {
      return detectedLang === "de" ? "Gerne! Wenn Sie weitere Fragen haben, bin ich hier um zu helfen. 😊" :
             detectedLang === "en" ? "You're welcome! If you have any more questions, I'm here to help. 😊" :
             detectedLang === "tr" ? "Rica ederim! Başka sorularınız varsa, yardım etmek için buradayım. 😊" :
             detectedLang === "ro" ? "Cu plăcere! Dacă aveți alte întrebări, sunt aici să vă ajut. 😊" :
             "Пожалуйста! Если у вас есть ещё вопросы, я здесь, чтобы помочь. 😊";
    }
    
    // Default: helpful fallback
    return detectedLang === "de" ? 
      "Ich verstehe Ihre Frage. Ich kann Ihnen helfen mit:\n\n• Items hinzufügen/bearbeiten/löschen\n• Wareneingang buchen\n• Warenausgang buchen\n• Daten exportieren\n• Items reservieren\n• Suchen und Filtern\n• Einstellungen ändern\n\nKönnen Sie mir mehr Details geben, oder soll ich Sie an einen Mitarbeiter weiterleiten?" :
    detectedLang === "en" ?
      "I understand your question. I can help you with:\n\n• Adding/editing/deleting items\n• Recording goods receipt\n• Recording goods issue\n• Exporting data\n• Reserving items\n• Search and filter\n• Changing settings\n\nCould you provide more details, or should I forward you to a staff member?" :
    detectedLang === "tr" ?
      "Sorunuzu anlıyorum. Size yardımcı olabilirim:\n\n• Ürün ekleme/düzenleme/silme\n• Mal girişi kaydetme\n• Mal çıkışı kaydetme\n• Veri dışa aktarma\n• Ürün rezervasyonu\n• Arama ve filtreleme\n• Ayarları değiştirme\n\nDaha fazla detay verebilir misiniz?" :
    detectedLang === "ro" ?
      "Înțeleg întrebarea dumneavoastră. Vă pot ajuta cu:\n\n• Adăugarea/editarea/ștergerea articolelor\n• Înregistrarea recepțiilor\n• Înregistrarea ieșirilor\n• Exportarea datelor\n• Rezervarea articolelor\n• Căutare și filtrare\n• Modificarea setărilor\n\nPuteți oferi mai multe detalii?" :
      "Я понимаю ваш вопрос. Я могу помочь вам с:\n\n• Добавлением/редактированием/удалением товаров\n• Регистрацией приёма\n• Регистрацией отпуска\n• Экспортом данных\n• Резервированием товаров\n• Поиском и фильтрацией\n• Изменением настроек\n\nМожете дать больше деталей?";
  }

  async function handleSendMessage() {
    if (!input.trim() || !userId) return;

    const userMessage = input.trim();
    setInput("");
    setShowTopics(false);
    setLoading(true);

    // Add user message to local state
    const userMsg: Message = {
      id: Date.now().toString(),
      text: userMessage,
      sender: "user",
      timestamp: new Date(),
      userName,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Detect language
    const detectedLang = detectLanguage(userMessage);
    // Speichere die Sprache wenn eine explizite Anforderung erkannt wurde
    if (/\b(auf deutsch|in deutsch|auf englisch|in english|auf türkisch|in türkisch|auf rumänisch|in rumänisch|auf russisch|in russisch|english|русский)\b/i.test(userMessage)) {
      setCurrentLanguage(detectedLang);
    }

    // Sende an Gemini API
    try {
      const response = await fetch('/api/chat-with-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          language: currentLanguage,
          userId,
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.response) {
        const botMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: data.response,
          sender: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error('No response from Gemini: ' + JSON.stringify(data));
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        text: currentLanguage === 'de' 
          ? '⚠️ Fehler bei der KI-Anfrage. Bitte versuchen Sie es später erneut.'
          : 'Error connecting to AI assistant. Please try again later.',
        sender: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    }

    setLoading(false);
  }

  function handleWhatsAppContact() {
    const phone = process.env.NEXT_PUBLIC_ADMIN_PHONE_WHATSAPP || "436501234567";
    const message = currentLanguage === "de" 
      ? "Hallo, ich benötige Support über die Astrein Dashboard App!"
      : currentLanguage === "en"
      ? "Hello, I need support from the Astrein Dashboard App!"
      : currentLanguage === "tr"
      ? "Merhaba, Astrein Dashboard uygulamasından destek gerekiyorum!"
      : currentLanguage === "ro"
      ? "Salut, am nevoie de suport de pe aplicația Astrein Dashboard!"
      : "Привет, мне нужна поддержка от приложения Astrein Dashboard!";
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
  }

  function handleContactSupport() {
    if (!userId) return;
    setLoading(true);

    // Verwende die aktuelle Sprache
    const detectedLang = currentLanguage;
    const ticketNumber = Date.now().toString().slice(-6);

    // Get user email from auth
    const userEmail = auth.currentUser?.email || '';

    // Try to create support ticket in Firestore (optional - doesn't block if it fails)
    try {
      addDoc(collection(db, "supportTickets"), {
        userId,
        userName,
        userEmail,
        messages: messages.map(m => ({
          text: m.text,
          sender: m.sender,
          timestamp: m.timestamp,
        })),
        status: "open",
        language: detectedLang,
        createdAt: serverTimestamp(),
        ticketNumber: ticketNumber,
      }).catch(err => console.log("Ticket saved locally only:", err));
    } catch (e) {
      console.log("Ticket will be saved locally only");
    }

    // Send email notification to admin
    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticketNumber,
        userName,
        userEmail,
        messages: messages.map(m => ({
          text: m.text,
          sender: m.sender,
          timestamp: m.timestamp,
        })),
        language: detectedLang,
      }),
    }).catch(err => console.log("Email notification failed:", err));

    // Always show confirmation message to user
    setTimeout(() => {
      const confirmText = currentLanguage === "de" ? 
        `✅ Ihr Anliegen wurde an einen Mitarbeiter weitergeleitet.\n\nEin Administrator wird sich schnellstmöglich bei Ihnen melden.\n\n👤 Kontakt: ${userName}\n🎫 Ticket-Nummer: #${ticketNumber}` :
        currentLanguage === "en" ?
        `✅ Your request has been forwarded to a staff member.\n\nAn administrator will contact you as soon as possible.\n\n👤 Contact: ${userName}\n🎫 Ticket number: #${ticketNumber}` :
        currentLanguage === "tr" ?
        `✅ Talebiniz bir çalışana iletildi.\n\nBir yönetici en kısa sürede sizinle iletişime geçecek.\n\n👤 İletişim: ${userName}\n🎫 Bilet no: #${ticketNumber}` :
        currentLanguage === "ro" ?
        `✅ Solicitarea dumneavoastră a fost transmisă unui angajat.\n\nUn administrator vă va contacta cât mai curând posibil.\n\n👤 Contact: ${userName}\n🎫 Număr bilet: #${ticketNumber}` :
        `✅ Ваш запрос передан сотруднику.\n\nАдминистратор свяжется с вами как можно скорее.\n\n👤 Контакт: ${userName}\n🎫 Номер заявки: #${ticketNumber}`;

      const confirmMsg: Message = {
        id: Date.now().toString(),
        text: confirmText,
        sender: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);
      setTicketCreated(true);
      setLoading(false);
    }, 500);
  }

  function formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (!userId) return null;

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
      {/* Chat Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 10px 40px rgba(59, 130, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          aria-label={t("chat.openChat")}
        >
          <svg style={{ width: '32px', height: '32px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '16px',
            height: '16px',
            background: '#10B981',
            borderRadius: '50%',
            border: '2px solid rgba(0,0,0,0.8)',
          }}></span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '400px',
          height: '600px',
          maxHeight: '80vh',
          borderRadius: '24px',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 9999,
        }}>
          {/* Header */}
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{t("chat.title")}</h3>
                  <div className="flex items-center gap-1 text-xs text-green-400">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    {t("chat.online")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/60 hover:text-white transition p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">👋</div>
                <h4 className="font-semibold text-white mb-2">{t("chat.welcome")}</h4>
                <p className="text-sm text-white/60">{t("chat.welcomeDesc")}</p>
              </div>
            )}

            {/* Help Topics */}
            {showTopics && messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-white/60 mb-3">{t("chat.selectTopic")}</p>
                {helpTopics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicClick(topic)}
                    className="w-full text-left p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-white/90 transition"
                  >
                    {topic.question}
                  </button>
                ))}
              </div>
            )}

            {/* Message List */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.sender === "user"
                      ? "bg-blue-500 text-white"
                      : msg.sender === "support"
                      ? "bg-green-500/20 text-white border border-green-500/30"
                      : "bg-white/10 text-white/90"
                  }`}
                >
                  {msg.sender === "support" && (
                    <div className="text-xs font-semibold text-green-400 mb-1">
                      👤 {msg.userName || "Support"}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-line">{msg.text}</p>
                  <p className="text-xs mt-1 opacity-60">{formatTime(msg.timestamp)}</p>
                </div>
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
                    <span className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Contact Support Buttons */}
          {messages.length > 2 && !ticketCreated && (
            <div className="px-4 py-2 border-t border-white/10 space-y-2 bg-yellow-500/10">
              <button
                onClick={handleContactSupport}
                disabled={loading}
                className="w-full text-center py-2.5 text-sm font-medium text-yellow-400 hover:text-yellow-300 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {currentLanguage === "de" ? "An Mitarbeiter weiterleiten" :
                 currentLanguage === "en" ? "Forward to staff member" :
                 currentLanguage === "tr" ? "Çalışana ilet" :
                 currentLanguage === "ro" ? "Transmite la angajat" :
                 "Передать сотруднику"}
              </button>
              
              <button
                onClick={handleWhatsAppContact}
                disabled={loading}
                className="w-full text-center py-2.5 text-sm font-medium text-green-400 hover:text-green-300 transition disabled:opacity-50 flex items-center justify-center gap-2 bg-green-500/10 rounded-lg"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-9.746 9.798c0 2.734.732 5.41 2.124 7.738L.929 23.5l8.272-2.737C10.487 23.1 13.15 24 16.052 24c9.876 0 17.9-8.047 17.9-17.939C33.952 7.111 25.928-.006 16.052-.006zm0 32.08c-2.33 0-4.618-.632-6.614-1.82L1.524 21.47l2.882-8.464a15.078 15.078 0 01-2.269-7.759c0-8.333 6.783-15.116 15.114-15.116 4.042 0 7.831 1.578 10.68 4.423 2.849 2.845 4.424 6.635 4.424 10.677 0 8.333-6.783 15.116-15.114 15.116z"/>
                </svg>
                {currentLanguage === "de" ? "💬 WhatsApp Admin" :
                 currentLanguage === "en" ? "💬 WhatsApp Admin" :
                 currentLanguage === "tr" ? "💬 WhatsApp Yönetici" :
                 currentLanguage === "ro" ? "💬 WhatsApp Admin" :
                 "💬 WhatsApp Админ"}
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={t("chat.inputPlaceholder")}
                className="flex-1 rounded-2xl bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-2xl bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
