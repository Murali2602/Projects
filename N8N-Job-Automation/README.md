# AI-Powered Job Application Automation with N8N

An intelligent N8N workflow that automates cybersecurity job hunting by scraping LinkedIn postings, analyzing job fit with AI, and generating tailored resumes for qualified opportunities.

![Workflow Status](https://img.shields.io/badge/status-active-success.svg)
![N8N](https://img.shields.io/badge/n8n-workflow-orange.svg)
[![Blog Post](https://img.shields.io/badge/Blog%20Post-Ghost%20CMS-15171A?logo=ghost&logoColor=white)](https://ezynix.com/projects/n8n-job-automation/)

## Overview

This automation processes 40-50 cybersecurity job postings daily, scoring each position based on skills match and automatically generating customized resumes for qualified roles (65%+ match). What used to take 2-3 hours of manual work now runs in 5-10 minutes.

### Key Features

- **Automated Job Scraping** - Fetches up to 100 daily cybersecurity jobs from LinkedIn
- **AI Job Analysis** - Uses Google Gemini to rate job fit (0-100 score) based on your complete skill inventory
- **Smart Resume Tailoring** - OpenAI GPT optimizes Summary and Skills sections for each qualified job
- **Complete Tracking** - Logs everything to Google Sheets with links to tailored resumes
- **Auto Organization** - Creates dated folders with Word and PDF versions of each resume
- **Duplicate Prevention** - Cross-references multiple sheets to avoid reprocessing jobs

## Architecture

![N8N Job Automation Overview](https://github.com/user-attachments/assets/d1bda91b-ff5c-44c5-99df-f1110b6c9f8c)

## 🛠️ Tech Stack

- **Workflow Engine**: N8N (self-hosted)
- **AI Models**: 
  - Google Gemini 1.5 (Job Analysis)
  - OpenAI GPT-4o-mini (Resume Optimization)
- **Integrations**:
  - Google Docs API
  - Google Drive API
  - Google Sheets API
  - Custom LinkedIn Scraper (separate Node.js/Puppeteer service)
- **Output Parsing**: Structured JSON schemas for consistent AI responses

## 📦 What's Included

- `n8n-job-automation-workflow-sanitized.json` - Complete N8N workflow (import-ready)
- `README.md` - This file
- `prompts/` - Directory containing full AI agent prompts
  - `job-analysis-prompt.md` - Job matching system prompt
  - `resume-optimization-prompt.md` - Resume tailoring system prompt
- `schemas/` - JSON output schemas for structured parsing
- `docs/` - Additional documentation and setup guides

## 🚀 Setup Instructions

### Prerequisites

1. **N8N Installation** (self-hosted or cloud)
   ```bash
   docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
   ```

2. **Required Google Cloud APIs** (enable in GCP Console):
   - Google Docs API
   - Google Drive API
   - Google Sheets API

3. **API Keys**:
   - Google Cloud Service Account (or OAuth2)
   - OpenAI API key
   - Google AI (Gemini) API key

4. **LinkedIn Scraper** (separate service - see scraper repo)
   - Must return JSON with: `id`, `title`, `companyName`, `location`, `descriptionText`, `applyUrl`, `jobUrl`

### Installation Steps

1. **Import Workflow**
   - Open N8N
   - Go to Workflows → Import from File
   - Select `n8n-job-automation-workflow-sanitized.json`

2. **Configure Credentials**
   - Add Google Docs OAuth2 credentials
   - Add Google Drive OAuth2 credentials
   - Add Google Sheets OAuth2 credentials
   - Add OpenAI API credentials
   - Add Google Gemini API credentials

3. **Set Up Google Workspace**

   **Create these Google Docs:**
   - Main Resume (your complete resume template)
   - Draft Resume (N8N-compatible template with `{Summary}` and `{Skills}` placeholders)

   **Create these Google Sheets:**
   - **MasterSkills Sheet** with columns:
     - `Category` (e.g., "Security Tools", "Programming")
     - `Skill` (e.g., "Wireshark", "Python")
     - `Level` (basic/intermediate/advanced)
     - `Evidence` (homelab/co-op/certification/college/personal project)

   - **Job Applications Tracker** with sheets:
     - `Master` - For qualified jobs
     - `Unwanted Jobs` - For rejected jobs (<65% match)

   **Create Google Drive folder structure:**
   ```
   Job Postings/
   ├── Cybersecurity Jobs/
   ```

4. **Update Node References**

   Replace `YOUR_DOCUMENT_ID` placeholders with your actual IDs:
   - `Get Main Resume` node → Your main resume Doc ID
   - `Get N8N Draft Resume` node → Your draft template Doc ID
   - `Get Skills` node → Your MasterSkills Sheet ID
   - `Append row in sheet` nodes → Your tracker Sheet ID
   - `Create Daily Job Postings Folder` node → Your root folder ID

5. **Configure LinkedIn Scraper**
   - Update `HTTP Request` node with your scraper endpoint
   - Modify search parameters (keywords, location, date range)

6. **Test the Workflow**
   - Click "Execute workflow" button
   - Monitor each node's output
   - Check Google Sheets for logged jobs
   - Verify resume generation in Google Drive

## 📝 Customization Guide

### Adjusting Job Match Threshold

In the `45% or Higher Qualification` node:
```javascript
{{ $json.output.rating.toNumber() }} >= 65  // Change 65 to your threshold
```
---

### Search Parameters

Edit the `HTTP Request` node JSON body:
```json
{
  "searchUrl": "https://www.linkedin.com/jobs/search?keywords=YOUR_KEYWORDS&location=YOUR_LOCATION&f_TPR=r604800&f_JT=F",
  "targetCount": 100
}
```

Parameters:
- `keywords` - Job title/role keywords
- `location` - Geographic filter
- `f_TPR=r604800` - Posted in last 7 days (604800 seconds)
- `f_JT=F` - Full-time only
- `targetCount` - Max jobs to fetch

## 🧠 AI Agent Prompts

The full system prompts are available in the `prompts/` directory. Key features:

### Job Analysis Agent
- Compares job requirements against MasterSkills inventory
- Considers skill proficiency levels (basic/intermediate/advanced)
- Evaluates experience context (homelab vs. professional)
- Returns 0-100 match score with detailed justification

### Resume Optimization Agent
- Rewrites Summary with 7-10 job-specific keywords
- Creates 3-5 dynamic skill categories matching job posting language
- Prioritizes relevant skills from MasterSkills
- Maintains authenticity (only includes verified skills)
- Uses accurate experience attribution (homelab/co-op/college)

## 📊 Output Examples

### Google Sheets Tracker
| Date | Company Name | Job Title | Rating | Enhanced Resume | Apply URL | Status |
|------|--------------|-----------|--------|-----------------|-----------|--------|
| 2025-12-10 | Acme Corp | Security Analyst | 78 | [Doc Link] | [Apply] | Ready |
| 2025-12-10 | Tech Inc | SOC Analyst | 82 | [Doc Link] | [Apply] | Applied |

### Generated Resume Structure
```
Professional Summary (tailored)
───────────────────────────
3-4 sentences with job-specific keywords

Skills (dynamic categories)
───────────────────────────
• SECURITY OPERATIONS & SIEM
  Splunk, Wazuh, Security Onion, QRadar, ELK Stack...

• NETWORKING & INFRASTRUCTURE
  Wireshark, TCP/IP, VLANs, pfSense, Suricata...

• CLOUD & IDENTITY MANAGEMENT
  AWS, Azure AD, Okta, IAM policies...

[Rest of original resume unchanged]
```

## 🔧 Troubleshooting

### Common Issues

**"No jobs returned"**
- Check scraper is running (`curl http://localhost:3000/scrape-jobs`)
- Verify LinkedIn search URL returns results in browser
- Check rate limiting/captcha issues in scraper logs

**"AI agent timeout"**
- Increase timeout in node settings (Options → Timeout)
- Simplify prompts or reduce MasterSkills inventory size
- Check API rate limits

**"Resume not generated"**
- Verify `{Summary}` and `{Skills}` placeholders exist in draft template
- Check Google Docs API permissions
- Review `Format All Content` node output for errors

**"Duplicate jobs appearing"**
- Ensure Job ID columns exist in both tracker sheets
- Check `Check for Duplicates` node is executing
- Verify sheet names match exactly

---

## 📈 Performance & Costs

**Execution Time**: 20-40 minutes for 40-50 jobs

**API Costs** (approximate per run):
- Google Gemini: Free (job analysis)
- OpenAI GPT-5o-mini: ~$0.15 (resume generation) for 30-40 resumes
- Google Workspace APIs: Free
- **Total**: ~$0.10-0.20 per workflow run

**Monthly Cost** (daily runs): ~$5

## 🛡️ Security & Privacy

- All data stored in your Google Workspace
- API keys stored in N8N credentials (encrypted)
- No third-party data sharing
- Resume data never leaves your infrastructure
- LinkedIn scraper should respect robots.txt and rate limits
---

## 🔗 Related Projects

- **LinkedIn Scraper** - [Coming soon] Puppeteer-based job scraper
- **Portfolio Post** - [Read Blog Post](https://ezynix.com/projects/n8n-job-automation/)

---

**⚠️ Disclaimer**: This tool is for personal use. Ensure compliance with LinkedIn's Terms of Service and use rate limiting to avoid account restrictions. The author is not responsible for any misuse.
