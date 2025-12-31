require('dotenv').config();

const express = require('express');
const { scrapeLinkedInJobs, scrapeSingleJob } = require('./scraper');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ============================================
// OPTION 1: GOOGLE SHEETS CONFIG FROM ENV VARS (RECOMMENDED)
// ============================================
// Set these in your .env file or export them:
// export GOOGLE_SHEETS_ID="your_spreadsheet_id"
// export GOOGLE_API_KEY="your_api_key"

const DEFAULT_GOOGLE_SHEETS_CONFIG = process.env.GOOGLE_SHEETS_ID && process.env.GOOGLE_API_KEY ? {
  spreadsheetId: process.env.GOOGLE_SHEETS_ID,
  apiKey: process.env.GOOGLE_API_KEY,
  sheets: [
    { name: 'Master', range: 'A:Z' },
    { name: 'Unwanted Jobs', range: 'A:Z' }
  ]
} : null;

// ============================================
// Logging middleware
// ============================================
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================
// Health check
// ============================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'LinkedIn Job Scraper API',
    timestamp: new Date().toISOString(),
    duplicateDetection: DEFAULT_GOOGLE_SHEETS_CONFIG ? 'enabled' : 'disabled'
  });
});

// ============================================
// Main scraping endpoint (Bulk)
// ============================================
app.post('/scrape-jobs', async (req, res) => {
  const { searchUrl, targetCount, googleSheets } = req.body;
  
  // Validation
  if (!searchUrl) {
    return res.status(400).json({ 
      success: false,
      error: 'searchUrl is required' 
    });
  }
  
  if (!targetCount) {
    return res.status(400).json({ 
      success: false,
      error: 'targetCount is required' 
    });
  }
  
  // Determine which Google Sheets config to use
  // Priority: 1. Request body, 2. Environment variables, 3. None
  const googleSheetsConfig = googleSheets || DEFAULT_GOOGLE_SHEETS_CONFIG;
  
  console.log('\n🚀 API Request Received (Bulk)');
  console.log('='.repeat(60));
  console.log(`URL: ${searchUrl}`);
  console.log(`Target: ${targetCount} jobs`);
  console.log(`Duplicate Detection: ${googleSheetsConfig ? 'ENABLED ✅' : 'DISABLED ⚠️'}`);
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // Call scraper with optional Google Sheets config
    const jobs = await scrapeLinkedInJobs(searchUrl, targetCount, googleSheetsConfig);
    
    // Return response
    res.json({
      success: true,
      count: jobs.length,
      duplicateDetectionUsed: googleSheetsConfig ? true : false,
      jobs: jobs
    });
    
    console.log('\n✅ API Response Sent');
    console.log(`Jobs returned: ${jobs.length}\n`);
    
  } catch (error) {
    console.error('\n❌ API Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// Single Job Endpoint
// ============================================
app.post('/scrape-url', async (req, res) => {
  const { jobUrl } = req.body;
  
  // Validation
  if (!jobUrl) {
    return res.status(400).json({ 
      success: false,
      error: 'jobUrl is required' 
    });
  }
  
  console.log('\n🚀 API Request Received (Single URL)');
  console.log('='.repeat(60));
  console.log(`URL: ${jobUrl}`);
  console.log('='.repeat(60));
  console.log('');
  
  try {
    const jobData = await scrapeSingleJob(jobUrl);
    
    if (jobData) {
      res.json({
        success: true,
        job: jobData
      });
      console.log('\n✅ API Response Sent (Single Job)\n');
    } else {
      res.status(404).json({
        success: false,
        error: 'Failed to scrape job details (possibly expired or login required)'
      });
    }
  } catch (error) {
    console.error('\n❌ API Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ============================================
// Start server
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 LinkedIn Scraper API Server Started');
  console.log('='.repeat(60));
  console.log(`📍 Listening on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Bulk endpoint: POST http://localhost:${PORT}/scrape-jobs`);
  console.log(`🎯 Single endpoint: POST http://localhost:${PORT}/scrape-url`);
  
  // Show Google Sheets status
  if (DEFAULT_GOOGLE_SHEETS_CONFIG) {
    console.log('');
    console.log('✅ Google Sheets Duplicate Detection: ENABLED');
    console.log(`   Spreadsheet ID: ${DEFAULT_GOOGLE_SHEETS_CONFIG.spreadsheetId.substring(0, 20)}...`);
    console.log(`   Sheets: ${DEFAULT_GOOGLE_SHEETS_CONFIG.sheets.map(s => s.name).join(', ')}`);
  } else {
    console.log('');
    console.log('⚠️  Google Sheets Duplicate Detection: DISABLED');
    console.log('   Set GOOGLE_SHEETS_ID and GOOGLE_API_KEY to enable');
  }
  
  console.log('='.repeat(60) + '\n');
});

// ============================================
// Graceful shutdown
// ============================================
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});