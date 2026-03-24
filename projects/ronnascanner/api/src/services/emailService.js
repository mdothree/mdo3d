import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Email Service
 * Sends resume analysis reports via email
 */

export class EmailService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendFreeReport(email, analysis) {
    try {
      const htmlContent = this.generateFreeReportHTML(analysis);

      const mailOptions = {
        from: `"Resume Analyzer" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Your Resume ATS Score: ${analysis.score}/100`,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Free report sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  async sendPremiumReport(email, analysis, premiumAnalysis) {
    try {
      const htmlContent = this.generatePremiumReportHTML(analysis, premiumAnalysis);

      const mailOptions = {
        from: `"Resume Analyzer" <${process.env.SMTP_USER}>`,
        to: email,
        subject: `Your Premium Resume Analysis - ${analysis.score}/100`,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Premium report sent:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  generateFreeReportHTML(analysis) {
    const scoreColor = analysis.score >= 75 ? '#10b981' : analysis.score >= 50 ? '#f59e0b' : '#ef4444';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px; }
    .score-box { background: white; border: 3px solid ${scoreColor}; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .score { font-size: 48px; font-weight: bold; color: ${scoreColor}; }
    .issues { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .issue { padding: 10px; margin: 10px 0; background: white; border-left: 4px solid #f59e0b; }
    .cta { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; display: inline-block; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Your Resume ATS Analysis</h1>
    <p>Here's how your resume performs with Applicant Tracking Systems</p>
  </div>

  <div class="score-box">
    <div class="score">${analysis.score}/100</div>
    <p style="color: ${scoreColor}; font-weight: bold; font-size: 18px;">
      ${analysis.score >= 75 ? 'Good!' : analysis.score >= 50 ? 'Needs Improvement' : 'Needs Significant Improvement'}
    </p>
  </div>

  <div class="issues">
    <h2>Top Issues Found</h2>
    ${analysis.issues.map(issue => `
      <div class="issue">
        <strong>${issue.title}</strong><br>
        <span style="color: #6b7280;">${issue.description}</span>
      </div>
    `).join('')}
  </div>

  <div style="text-align: center;">
    <h3>Want the Full Analysis?</h3>
    <p>Get AI-powered rewrite suggestions, industry keywords, and detailed improvement recommendations.</p>
    <a href="${process.env.WEBSITE_URL || 'https://resume-analyzer.com'}/upgrade" class="cta">
      Upgrade to Premium - $29
    </a>
  </div>

  <div class="footer">
    <p>Resume Analyzer - Make your resume ATS-friendly</p>
    <p><a href="${process.env.WEBSITE_URL || 'https://resume-analyzer.com'}">Visit Website</a></p>
  </div>
</body>
</html>
    `;
  }

  generatePremiumReportHTML(analysis, premiumAnalysis) {
    // TODO: Generate comprehensive premium report HTML
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    /* Premium styling */
  </style>
</head>
<body>
  <h1>Premium Resume Analysis Report</h1>
  <h2>ATS Score: ${analysis.score}/100</h2>
  
  <!-- Full detailed analysis -->
  <div>
    ${JSON.stringify(premiumAnalysis, null, 2)}
  </div>
</body>
</html>
    `;
  }

  async sendWelcomeEmail(email, name) {
    try {
      const mailOptions = {
        from: `"Resume Analyzer" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Welcome to Resume Analyzer!',
        html: `
          <h1>Welcome, ${name}!</h1>
          <p>Thanks for signing up for Resume Analyzer.</p>
          <p>Upload your resume anytime to get instant ATS feedback.</p>
          <a href="${process.env.WEBSITE_URL}">Get Started</a>
        `
      };

      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Welcome email error:', error);
      return { success: false };
    }
  }
}
