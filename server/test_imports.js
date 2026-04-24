try {
    console.log('Testing: ./middlewares/errorMiddleware');
    require('./middlewares/errorMiddleware');
    
    console.log('Testing: ./routes/labourRoutes');
    require('./routes/labourRoutes');
    
    console.log('Testing: ./routes/workRoutes');
    require('./routes/workRoutes');
    
    console.log('Testing: ./routes/historyRoutes');
    require('./routes/historyRoutes');
    
    console.log('Testing: ./routes/paymentRoutes');
    require('./routes/paymentRoutes');
    
    console.log('Testing: ./routes/auditRoutes');
    require('./routes/auditRoutes');
    
    console.log('All imports succeeded!');
} catch (err) {
    const fs = require('fs');
    console.error('--- IMPORT FAILURE ---');
    console.error(err);
    fs.writeFileSync('import_error.txt', err.stack || err.message || String(err));
    console.log('Error written to import_error.txt');
}
