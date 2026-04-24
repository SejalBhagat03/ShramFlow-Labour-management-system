/**
 * PdfService
 * Handles PDF generation for ledgers and reports.
 */
export const pdfService = {
    /**
     * Generate a professional Labour Ledger PDF
     * @param {Object} data 
     */
    async generateLedgerPDF(data) {
        // Dynamic import to reduce initial bundle size
        const { jsPDF } = await import('jspdf');
        await import('jspdf-autotable');

        const { name, name_hindi, phone, totalEarned, totalPaid, balance, entries, payments } = data;
        const doc = new jsPDF();

        // 1. Header Section
        doc.setFontSize(22);
        doc.setTextColor(22, 163, 74); // Success Green
        doc.text('SHRAMFLOW', 105, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text('Labour Workforce Ledger (Digital Khata)', 105, 30, { align: 'center' });

        // 2. Labourer Information
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Labourer: ${name} ${name_hindi ? `(${name_hindi})` : ''}`, 14, 45);
        doc.text(`Phone: ${phone || 'N/A'}`, 14, 52);
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 59);

        // 3. Summary Boxes
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 245);
        doc.rect(14, 65, 182, 25, 'F');

        doc.setFontSize(10);
        doc.text('Total Earned', 35, 75, { align: 'center' });
        doc.text('Total Paid', 85, 75, { align: 'center' });
        doc.text('Total Deducted', 135, 75, { align: 'center' });
        doc.text('Balance Pending', 180, 75, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Rs. ${totalEarned.toLocaleString()}`, 35, 83, { align: 'center' });
        doc.text(`Rs. ${totalPaid.toLocaleString()}`, 85, 83, { align: 'center' });
        doc.setTextColor(220, 38, 38);
        doc.text(`Rs. ${data.totalDeductions ? data.totalDeductions.toLocaleString() : 0}`, 135, 83, { align: 'center' });
        
        doc.setTextColor(balance >= 0 ? [22, 163, 74] : [220, 38, 38]);
        doc.text(`Rs. ${balance.toLocaleString()}`, 180, 83, { align: 'center' });
        doc.setTextColor(0);
        doc.setFont('helvetica', 'normal');

        // 4. Work History Table
        doc.setFontSize(12);
        doc.text('Work History (Approved)', 14, 105);

        const workTableData = entries.map(entry => [
            entry.date,
            entry.task_type,
            `${entry.meters || entry.hours || 0}`,
            `Rs. ${entry.amount.toLocaleString()}`,
            entry.status.toUpperCase()
        ]);

        doc.autoTable({
            startY: 110,
            head: [['Date', 'Task Type', 'Quantity', 'Amount', 'Status']],
            body: workTableData,
            theme: 'striped',
            headStyles: { fillColor: [22, 163, 74] },
            margin: { left: 14, right: 14 }
        });

        // 5. Payment, Advance & Deduction History Table
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.text('Transactions (Payments & Deductions)', 14, finalY);

        const paymentTableData = payments.map(p => {
            const isDeduction = p.payment_type === 'deduction';
            return [
                p.transaction_date || p.date,
                p.payment_type ? p.payment_type.toUpperCase() : 'PAYMENT',
                p.method ? p.method.toUpperCase() : '-',
                isDeduction ? `- Rs. ${p.amount.toLocaleString()}` : `Rs. ${p.amount.toLocaleString()}`,
                p.deduction_reason || p.notes || '-'
            ];
        });

        doc.autoTable({
            startY: finalY + 5,
            head: [['Date', 'Type', 'Method', 'Amount', 'Notes']],
            body: paymentTableData,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] }, // Blue for payments
            margin: { left: 14, right: 14 }
        });

        // 6. Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `Generated via ShramFlow SaaS Platform - Page ${i} of ${pageCount}`,
                105,
                285,
                { align: 'center' }
            );
        }

        doc.save(`labour-ledger-${name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    }
};
