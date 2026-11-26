import express from 'express';
import cors from 'cors';
import { config } from './config';
import { SheetsService } from './services/sheets.service';
import { authRouter } from './routes/auth.routes';
import { dashboardRouter } from './routes/dashboard.routes';
import { customerRouter } from './routes/customer.routes';
import { productRouter } from './routes/product.routes';
import { enquiryRouter } from './routes/enquiry.routes';
import { orderRouter } from './routes/order.routes';
import { quotationRouter } from './routes/quotation.routes';
import { piRouter } from './routes/pi.routes';
import { documentRouter } from './routes/document.routes';
import { settingsRouter } from './routes/settings.routes';

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Root & Health Checks
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Ambica Engineers ERP Backend API',
    version: '1.0.0',
    documentation: 'Ambica Sales & Document Processing ERP',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      dashboard: '/api/dashboard',
      customers: '/api/customers',
      products: '/api/products',
      enquiries: '/api/enquiries',
      orders: '/api/orders',
      quotations: '/api/quotations',
      pi: '/api/pi',
      documents: '/api/documents',
      settings: '/api/settings'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Ambica Engineers ERP Backend',
    version: '1.0.0',
  });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/customers', customerRouter);
app.use('/api/products', productRouter);
app.use('/api/enquiries', enquiryRouter);
app.use('/api/orders', orderRouter);
app.use('/api/quotations', quotationRouter);
app.use('/api/pi', piRouter);
app.use('/api/documents', documentRouter);
app.use('/api/settings', settingsRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[SERVER ERROR]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Initialize Services and Start Server
async function startServer() {
  try {
    console.log('Initializing Ambica ERP Data Services...');
    await SheetsService.init();
    console.log('Google Sheets / Local Workbook synchronized successfully.');

    app.listen(config.port, () => {
      console.log(`===================================================`);
      console.log(` Ambica Engineers ERP Server running on port ${config.port}`);
      console.log(` Ready for Google Workspace and Cloudflare Pages`);
      console.log(`===================================================`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

startServer();
