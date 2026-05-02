import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * @file pdfGenerator.js
 * @description Generates professional PDF receipts for ShramFlow.
 */

export const generatePaymentReceipt = (payment, labourer) => {
    const doc = new jsPDF();
    const primaryColor = [16, 185, 129]; // Emerald 600
    const secondaryColor = [71, 85, 105]; // Slate 600

    // Header - Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("ShramFlow", 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("OFFICIAL PAYMENT RECEIPT", 20, 32);

    // Divider
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(1.5);
    doc.line(20, 40, 190, 40);

    // Transaction Details Section
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("TRANSACTION DETAILS", 20, 55);

    autoTable(doc, {
        startY: 60,
        theme: 'plain',
        head: [['Field', 'Description']],
        body: [
            ['Reference ID', payment.id?.substring(0, 8).toUpperCase() || 'N/A'],
            ['Date', payment.date || payment.transaction_date || 'N/A'],
            ['Payment Mode', payment.payment_mode || payment.method || 'Cash'],
            ['Status', (payment.status || 'Success').toUpperCase()]
        ],
        headStyles: { fillColor: [248, 250, 252], textColor: secondaryColor, fontStyle: 'bold' },
        columnStyles: { 
            0: { fontStyle: 'bold', textColor: secondaryColor, cellWidth: 50 },
            1: { textColor: [0, 0, 0] }
        },
        margin: { left: 20 }
    });

    // Payee Section
    const nextY = doc.lastAutoTable.finalY + 15;
    doc.setFont("helvetica", "bold");
    doc.text("PAYEE INFORMATION", 20, nextY);

    autoTable(doc, {
        startY: nextY + 5,
        theme: 'plain',
        body: [
            ['Name', labourer.name || 'N/A'],
            ['Hindi Name', labourer.name_hindi || 'N/A'],
            ['Phone', labourer.phone || 'N/A'],
            ['Assigned Site', labourer.location || 'N/A']
        ],
        columnStyles: { 
            0: { fontStyle: 'bold', textColor: secondaryColor, cellWidth: 50 },
            1: { textColor: [0, 0, 0] }
        },
        margin: { left: 20 }
    });

    // Final Amount Section (Premium Box)
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.roundedRect(20, finalY, 170, 35, 3, 3, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("TOTAL AMOUNT DISBURSED", 30, finalY + 12);
    
    doc.setFontSize(24);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`INR ${Number(payment.amount).toLocaleString()}/-`, 30, finalY + 25);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("This is a computer-generated receipt and does not require a physical signature.", 105, pageHeight - 20, { align: 'center' });
    doc.text("Digital Transformation for Workforce Management • shramflow.com", 105, pageHeight - 15, { align: 'center' });

    // Save PDF
    doc.save(`Receipt_${(labourer.name || 'Staff').replace(/\s+/g, '_')}_${payment.date || payment.transaction_date}.pdf`);
};
