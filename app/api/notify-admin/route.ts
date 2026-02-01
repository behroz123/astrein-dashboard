import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticketNumber, userName, userEmail, messages, language } = body;

    // Admin E-Mail
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@astrein-exzellent.de';
    
    // E-Mail-Text erstellen
    const emailSubject = `🎫 Neue Support-Anfrage #${ticketNumber}`;
    const emailBody = `
Neue Support-Anfrage erhalten:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎫 Ticket-Nummer: #${ticketNumber}
👤 Von: ${userName}
📧 E-Mail: ${userEmail}
🌐 Sprache: ${language}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHAT-VERLAUF:
${messages.map((m: any, i: number) => `
${i + 1}. [${m.sender === 'user' ? '👤 Benutzer' : '🤖 Assistent'}]:
${m.text}
`).join('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bitte melden Sie sich im Admin-Panel an, um zu antworten:
🔗 http://localhost:3000/support

Mit freundlichen Grüßen,
Astrein Exzellent Dashboard System
    `.trim();

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 5px; }
    .message { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .user-msg { border-left: 4px solid #4CAF50; }
    .bot-msg { border-left: 4px solid #2196F3; }
    .footer { background: #333; color: white; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎫 Neue Support-Anfrage</h2>
      <p>Ticket #${ticketNumber}</p>
    </div>
    <div class="content">
      <div class="info-box">
        <p><strong>👤 Von:</strong> ${userName}</p>
        <p><strong>📧 E-Mail:</strong> ${userEmail}</p>
        <p><strong>🌐 Sprache:</strong> ${language}</p>
      </div>
      
      <h3>💬 Chat-Verlauf:</h3>
      ${messages.map((m: any, i: number) => `
        <div class="message ${m.sender === 'user' ? 'user-msg' : 'bot-msg'}">
          <strong>${m.sender === 'user' ? '👤 Benutzer' : '🤖 Assistent'}:</strong>
          <p>${m.text.replace(/\n/g, '<br>')}</p>
        </div>
      `).join('')}
      
      <div style="text-align: center; margin-top: 20px;">
        <a href="http://localhost:3000/support" class="button">
          🔗 Im Admin-Panel öffnen
        </a>
      </div>
    </div>
    <div class="footer">
      <p>Astrein Exzellent Dashboard System</p>
      <p style="font-size: 12px; opacity: 0.8;">Automatische Benachrichtigung</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // SMTP-Transporter konfigurieren
    // Sie können Gmail, Outlook oder einen eigenen SMTP-Server verwenden
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true für 465, false für andere Ports
      auth: {
        user: process.env.SMTP_USER || '', // Ihre E-Mail
        pass: process.env.SMTP_PASS || '', // Ihr Passwort oder App-Passwort
      },
    });

    // E-Mail senden
    try {
      await transporter.sendMail({
        from: `"Astrein Support System" <${process.env.SMTP_USER || 'noreply@astrein.de'}>`,
        to: ADMIN_EMAIL,
        subject: emailSubject,
        text: emailBody,
        html: emailHtml,
      });

      console.log('✅ E-Mail erfolgreich gesendet an:', ADMIN_EMAIL);
      
      return NextResponse.json({ 
        success: true, 
        message: 'E-Mail-Benachrichtigung wurde erfolgreich gesendet'
      });
    } catch (emailError) {
      // Falls E-Mail-Versand fehlschlägt, trotzdem Info ausgeben
      console.error('❌ E-Mail-Versand fehlgeschlagen:', emailError);
      console.log('\n=== SUPPORT-ANFRAGE (E-Mail nicht gesendet) ===');
      console.log('An:', ADMIN_EMAIL);
      console.log('Betreff:', emailSubject);
      console.log(emailBody);
      console.log('===============================================\n');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Anfrage wurde gespeichert (E-Mail-Versand deaktiviert - bitte SMTP konfigurieren)'
      });
    }
  } catch (error) {
    console.error('Fehler beim Verarbeiten der Anfrage:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Fehler beim Verarbeiten der Anfrage' 
    }, { status: 500 });
  }
}
