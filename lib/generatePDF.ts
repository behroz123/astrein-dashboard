import jsPDF from 'jspdf';

interface Bed {
  id: string;
  number: number;
  tenant?: string;
  rent?: string;
  moveInDate?: string;
  moveOutDate?: string;
  occupied?: boolean;
  payments?: {
    month: number;
    year: number;
    amount: string;
    paid: boolean;
    paidDate?: string;
    paymentMethod?: string;
  }[];
}

interface Room {
  id: string;
  name: string;
  beds: Bed[];
}

interface Wohnung {
  address?: string;
  adresse?: string;
  stadtplz?: string;
  zimmerzahl?: string;
  quadratmeter?: string;
  miete?: string;
}

export function generatePropertyPDF(wohnung: Wohnung, rooms: Room[], currentYear: number, currentMonth: number) {
  // Create PDF document
  const doc = new jsPDF({
    format: 'a4',
    unit: 'mm',
  });

  // Get address
  const address = wohnung.address || wohnung.adresse || 'N/A';
  const stadtPlz = wohnung.stadtplz || '';
  
  // Set colors
  const primaryColor: [number, number, number] = [25, 103, 210]; // Blue
  const secondaryColor: [number, number, number] = [50, 50, 50]; // Dark gray
  const lightGray: [number, number, number] = [240, 240, 240];
  
  // Company name header
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('AH Exzellent Immobilien GmbH', 20, 15);
  
  // Title section
  doc.setFontSize(20);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('MIETVERWALTUNG', 20, 28);
  
  // Property info
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(`Adresse: ${address}`, 20, 38);
  
  doc.setFontSize(10);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  if (stadtPlz) {
    doc.text(`PLZ: ${stadtPlz}`, 20, 46);
  }
  
  doc.text(`Einträge: ${currentMonth}/${currentYear}`, 20, 54);
  
  // Current date
  const now = new Date();
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Erstellt: ${now.toLocaleDateString('de-DE')}`, 160, 38);

  let yPosition = 64;

  // Process each room
  rooms.forEach((room) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Room header
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`Zimmer: ${room.name}`, 20, yPosition);
    yPosition += 8;

    // Create simple text-based table
    doc.setFontSize(9);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    
    // Table headers
    const headers = ['Bett', 'Mieter', 'Miete', 'Einzugsdatum', 'Status', 'Zahlung', 'Methode'];
    const colWidths = [12, 25, 15, 25, 15, 20, 20];
    let xPos = 20;
    
    // Draw header background
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(20, yPosition - 5, 170, 6, 'F');
    
    // Draw headers
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    xPos = 20;
    headers.forEach((header, idx) => {
      doc.text(header, xPos + 1, yPosition - 1);
      xPos += colWidths[idx];
    });
    
    yPosition += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    
    // Draw rows
    room.beds.forEach((bed, bedIdx) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      
      const tenantName = bed.tenant || '(Leer)';
      const rent = bed.rent || '0';
      const moveInDate = bed.moveInDate || '-';
      const status = bed.occupied ? 'Belegt' : 'Frei';
      
      // Get current month payment status
      let paymentStatus = 'Offene Miete';
      let paymentMethod = '-';
      
      if (bed.payments) {
        const currentPayment = bed.payments.find(p => p.year === currentYear && p.month === currentMonth);
        if (currentPayment) {
          if (currentPayment.paid) {
            paymentStatus = 'Bezahlt';
            paymentMethod = currentPayment.paymentMethod || '-';
          } else {
            paymentStatus = 'ÜBERFÄLLIG';
          }
        }
      }
      
      const rowData = [
        `Bett ${bed.number}`,
        tenantName,
        `€ ${rent}`,
        moveInDate,
        status,
        paymentStatus,
        paymentMethod,
      ];
      
      // Draw row background
      if (bedIdx % 2 === 0) {
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.rect(20, yPosition - 4, 170, 5, 'F');
      }
      
      // Draw row data
      xPos = 20;
      rowData.forEach((cell, idx) => {
        const cellText = String(cell).substring(0, 12);
        doc.text(cellText, xPos + 1, yPosition + 0.5);
        xPos += colWidths[idx];
      });
      
      yPosition += 6;
    });
    
    yPosition += 6;
  });

  // Summary section
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('ZUSAMMENFASSUNG', 20, yPosition);
  yPosition += 8;

  // Calculate totals
  let totalRents = 0;
  let paidRents = 0;
  let openRents = 0;

  rooms.forEach((room) => {
    room.beds.forEach((bed) => {
      if (bed.occupied && bed.rent) {
        const rentAmount = parseFloat(bed.rent) || 0;
        totalRents += rentAmount;

        if (bed.payments) {
          const currentPayment = bed.payments.find(p => p.year === currentYear && p.month === currentMonth);
          if (currentPayment?.paid) {
            paidRents += rentAmount;
          } else {
            openRents += rentAmount;
          }
        } else {
          openRents += rentAmount;
        }
      }
    });
  });

  // Draw summary table
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  
  // Summary headers
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(20, yPosition - 5, 170, 6, 'F');
  doc.text('Beschreibung', 22, yPosition - 1);
  doc.text('Betrag', 130, yPosition - 1);
  
  yPosition += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  
  const summaryData = [
    ['Gesamtmiete', `€ ${totalRents.toFixed(2)}`],
    ['Eingezahlte Miete', `€ ${paidRents.toFixed(2)}`],
    ['Offene Miete', `€ ${openRents.toFixed(2)}`],
  ];

  summaryData.forEach((row, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(20, yPosition - 4, 170, 5, 'F');
    }
    doc.text(row[0], 22, yPosition + 0.5);
    doc.text(row[1], 130, yPosition + 0.5);
    yPosition += 6;
  });

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}
