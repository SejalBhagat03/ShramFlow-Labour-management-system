const ocrService = require('../src/services/ocrService');

// Mock Supabase labourers list
const mockLabourers = [
  { id: '1-ramesh-uuid', name: 'Ramesh Kumar' },
  { id: '2-mohan-uuid', name: 'Mohan Lal' },
  { id: '3-sejal-uuid', name: 'Sejal Bhagat' }
];

// Messy handwritten/Tesseract OCR raw text inputs
const mockRawOcrText = `
Rarnesh khudai 12m 450rs
M0han fiting 8m 320
Sejal plaster 15m 600 rupees
`;

async function testLocalParser() {
  console.log('--- STARTING LOCAL RULES PARSER VERIFICATION ---');
  console.log('Parsing raw text locally...');
  
  const entries = ocrService.parseRawTextLocally(mockRawOcrText, mockLabourers);
  
  console.log('\n--- EXTRACTED STRUCTURED WORK ENTRIES ---');
  entries.forEach((entry, idx) => {
    console.log(`\nEntry #${idx + 1}:`);
    console.log(`- Original Scanned Word:`, entry.labourerName);
    console.log(`- Fuzzy Mapped Name:`, entry.labourerName);
    console.log(`- Labourer UUID:`, entry.labourer_id);
    console.log(`- Task detected:`, entry.taskType);
    console.log(`- Quantity (meters):`, entry.meters);
    console.log(`- Payment calculated: ₹`, entry.payment);
    console.log(`- Validation confidence:`, entry.confidence + '%');
  });
  console.log('\n-----------------------------------------------');
  
  // Assertions
  const ramesh = entries[0];
  if (ramesh.labourer_id === '1-ramesh-uuid' && ramesh.taskType === 'Digging' && ramesh.meters === 12 && ramesh.payment === 450) {
    console.log('✅ Ramesh (khudai -> Digging) test passed!');
  } else {
    console.error('❌ Ramesh test failed!', ramesh);
  }
  
  const mohan = entries[1];
  if (mohan.labourer_id === '2-mohan-uuid' && mohan.taskType === 'Wiring & Pole Fitting' && mohan.meters === 8 && mohan.payment === 320) {
    console.log('✅ Mohan (fiting -> Wiring & Pole Fitting) test passed!');
  } else {
    console.error('❌ Mohan test failed!', mohan);
  }
}

testLocalParser();
