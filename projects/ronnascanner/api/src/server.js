import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import dotenv from 'dotenv';
import { ServerResumeParser } from './parsers/parser.js';
import { ClaudeAnalyzer } from './analyzers/claudeAnalyzer.js';
import { EmailService } from './services/emailService.js';
import { StripeService } from './services/stripeService.js';
import { ATSAnalyzer } from './analyzers/atsAnalyzer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
  }
});

// Services
const parser = new ServerResumeParser();
const claudeAnalyzer = new ClaudeAnalyzer();
const atsAnalyzer = new ATSAnalyzer();
const emailService = new EmailService();
const stripeService = new StripeService();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Routes
app.post('/api/analyze', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const resumeText = await parser.parse(req.file.path, req.file.mimetype);
    const analysis = await atsAnalyzer.analyze(resumeText);
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      score: analysis.score,
      issues: analysis.issues.slice(0, 3),
      breakdown: {
        keywords: analysis.breakdown.keywords.score,
        sections: analysis.breakdown.sections.score,
        formatting: analysis.breakdown.formatting.score,
        length: analysis.breakdown.length.score,
        contact: analysis.breakdown.contact.score
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: 'Failed to analyze resume' });
  }
});

app.post('/api/analyze/premium', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { paymentId } = req.body;
    if (!paymentId) return res.status(402).json({ error: 'Payment required' });

    const payment = await stripeService.verifyPayment(paymentId);
    if (!payment.paid) return res.status(402).json({ error: 'Payment not confirmed' });

    const resumeText = await parser.parse(req.file.path, req.file.mimetype);
    const atsAnalysis = await atsAnalyzer.analyze(resumeText);
    const premiumAnalysis = await claudeAnalyzer.analyzePremium(resumeText, atsAnalysis.score, atsAnalysis.issues);
    
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      score: atsAnalysis.score,
      basicAnalysis: atsAnalysis,
      premiumAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Premium analysis error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, error: 'Failed to perform premium analysis' });
  }
});

app.post('/api/email/report', async (req, res) => {
  try {
    const { email, analysis } = req.body;
    if (!email || !analysis) return res.status(400).json({ error: 'Email and analysis required' });
    
    await emailService.sendFreeReport(email, analysis);
    res.json({ success: true, message: 'Report sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
});

app.post('/api/payment/create-checkout', async (req, res) => {
  try {
    const { userId, email, analysisId } = req.body;
    const session = await stripeService.createCheckoutSession(userId, email, analysisId);
    res.json(session);
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const result = await stripeService.handleWebhook(req.body, req.headers['stripe-signature']);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: 'Webhook error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ success: false, error: error.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Resume Analyzer API on port ${PORT}`);
  console.log(`Frontend: ${process.env.FRONTEND_URL}`);
});

export default app;
