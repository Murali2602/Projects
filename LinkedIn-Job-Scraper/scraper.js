const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// NEW: GOOGLE SHEETS API - FETCH JOB IDS
// ============================================
async function fetchJobIdsFromGoogleSheets(config) {
  console.log('\n📂 Loading existing Job IDs from Google Sheets...');
  console.log('='.repeat(60));
  
  const allJobIds = new Set();
  
  if (!config || !config.spreadsheetId || !config.apiKey || !config.sheets) {
    console.log('⚠️  No Google Sheets config provided, skipping duplicate check');
    return allJobIds;
  }
  
  console.log(`Spreadsheet ID: ${config.spreadsheetId}`);
  console.log(`Sheets to load: ${config.sheets.length}`);
  
  for (const sheet of config.sheets) {
    const fullRange = `${sheet.name}!${sheet.range}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${encodeURIComponent(fullRange)}?key=${config.apiKey}`;
    
    console.log(`\n  📋 Fetching: ${sheet.name}...`);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        console.log(`     ❌ Error: ${data.error?.message || 'Unknown error'}`);
        continue;
      }
      
      if (!data.values || data.values.length === 0) {
        console.log(`     ⚠️  Sheet is empty`);
        continue;
      }
      
      // Find Job ID column
      const headers = data.values[0];
      const possibleColumns = ['Job ID', 'JobID', 'job_id', 'ID', 'id'];
      let jobIdColIndex = -1;
      
      for (let i = 0; i < headers.length; i++) {
        if (possibleColumns.includes(headers[i])) {
          jobIdColIndex = i;
          break;
        }
      }
      
      if (jobIdColIndex === -1) {
        console.log(`     ⚠️  Job ID column not found`);
        continue;
      }
      
      // Extract Job IDs
      let count = 0;
      for (let i = 1; i < data.values.length; i++) {
        const row = data.values[i];
        const jobId = row[jobIdColIndex];
        
        if (jobId) {
          const cleanId = String(jobId).replace(/\D/g, '');
          // Only accept Job IDs that are 10 digits (valid LinkedIn format)
          if (cleanId && cleanId.length === 10) {
            allJobIds.add(cleanId);
            count++;
          }
        }
      }
      
      console.log(`     ✅ Loaded ${count} valid Job IDs`);
      
    } catch (error) {
      console.log(`     ❌ Network error: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Total unique Job IDs to skip: ${allJobIds.size}\n`);
  return allJobIds;
}

// ============================================
// EXTRACT JOB ID FROM URL
// ============================================
function extractJobIdFromUrl(url) {
  const match = url.match(/\/jobs\/view\/(\d+)/);
  return match ? match[1] : null;
}

// ============================================
// FILTER DUPLICATE URLS
// ============================================
function filterDuplicateUrls(urls, existingJobIds) {
  if (existingJobIds.size === 0) {
    console.log('ℹ️  No existing Job IDs to filter against\n');
    return urls;
  }
  
  console.log('\n🔍 Filtering duplicate Job IDs...');
  console.log('='.repeat(60));
  
  const filtered = [];
  const duplicates = [];
  
  urls.forEach(url => {
    const jobId = extractJobIdFromUrl(url);
    if (jobId && existingJobIds.has(jobId)) {
      duplicates.push({ url, jobId });
    } else {
      filtered.push(url);
    }
  });
  
  console.log(`Original URLs: ${urls.length}`);
  console.log(`Duplicates found: ${duplicates.length}`);
  console.log(`New URLs to scrape: ${filtered.length}\n`);
  
  if (duplicates.length > 0 && duplicates.length <= 10) {
    console.log('Skipped Job IDs:');
    duplicates.forEach(d => console.log(`  - ${d.jobId}`));
    console.log('');
  } else if (duplicates.length > 10) {
    console.log(`Skipped ${duplicates.length} duplicate jobs (first 10):`);
    duplicates.slice(0, 10).forEach(d => console.log(`  - ${d.jobId}`));
    console.log('');
  }
  
  return filtered;
}

// ============================================
// HELPER: LAUNCH BROWSER
// ============================================
async function launchBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    userDataDir: './user_Data',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });
}

// ============================================
// HELPER: OPTIMIZE PAGE
// ============================================
async function optimizePage(page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

// ============================================
// STEP 1: COLLECT JOB URLS FROM SEARCH
// ============================================
async function collectJobUrls(searchUrl, targetCount = 50) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  
  await optimizePage(page);

  console.log('\n🔍 STEP 1: Collecting Job URLs');
  console.log('='.repeat(60));
  console.log(`Target: ${targetCount} jobs`);
  console.log(`URL: ${searchUrl}\n`);

  try {
    console.log('📋 Loading search page...');
    await page.goto(searchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await sleep(5000); 
    console.log('✓ Page loaded successfully\n');
  } catch (error) {
    console.log(`❌ Error loading page: ${error.message}`);
    await browser.close();
    return [];
  }

  const allJobUrls = new Set();
  let currentPage = 1;
  const maxPages = Math.ceil(targetCount / 25);

  while (allJobUrls.size < targetCount && currentPage <= maxPages) {
    console.log(`📄 PAGE ${currentPage}`);
    console.log('─'.repeat(60));

    console.log('  Scrolling to load jobs...');
    for (let scroll = 0; scroll < 5; scroll++) {
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await sleep(1000);
    }

    const pageUrls = await page.evaluate(() => {
      const urls = new Set();
      
      const occludableElements = document.querySelectorAll('[data-occludable-job-id]');
      occludableElements.forEach(el => {
        const jobId = el.getAttribute('data-occludable-job-id');
        if (jobId) {
          urls.add(`https://www.linkedin.com/jobs/view/${jobId}/`);
        }
      });

      const jobLinks = document.querySelectorAll('a[href*="/jobs/view/"]');
      jobLinks.forEach(link => {
        const href = link.href;
        if (href && href.includes('/jobs/view/')) {
          const match = href.match(/\/jobs\/view\/(\d+)/);
          if (match) {
            urls.add(`https://www.linkedin.com/jobs/view/${match[1]}/`);
          }
        }
      });

      return Array.from(urls);
    });

    const previousCount = allJobUrls.size;
    pageUrls.forEach(url => allJobUrls.add(url));
    const newJobsFound = allJobUrls.size - previousCount;

    console.log(`  URLs extracted: ${pageUrls.length}`);
    console.log(`  New unique: ${newJobsFound}`);
    console.log(`  Total: ${allJobUrls.size}\n`);

    if (allJobUrls.size >= targetCount) {
      console.log(`✅ Reached target of ${targetCount} jobs!\n`);
      break;
    }

    if (newJobsFound === 0) {
      console.log('⚠️  No new jobs on this page\n');
      break;
    }

    const nextPageClicked = await page.evaluate(() => {
      const paginationButtons = document.querySelectorAll('button[aria-label*="Page"]');
      const currentBtn = Array.from(paginationButtons).find(btn =>
        btn.getAttribute('aria-current') === 'true'
      );

      if (currentBtn) {
        const currentPageNum = parseInt(currentBtn.textContent.trim());
        const nextBtn = Array.from(paginationButtons).find(btn =>
          parseInt(btn.textContent.trim()) === currentPageNum + 1
        );

        if (nextBtn && !nextBtn.disabled) {
          nextBtn.click();
          return true;
        }
      }

      const nextButton = document.querySelector('button[aria-label*="next" i]');
      if (nextButton && !nextButton.disabled) {
        nextButton.click();
        return true;
      }

      return false;
    });

    if (!nextPageClicked) {
      console.log('⚠️  No more pages\n');
      break;
    }

    console.log('✓ Moving to next page...\n');
    await sleep(4000);
    currentPage++;
  }

  await browser.close();

  const finalUrls = Array.from(allJobUrls).slice(0, targetCount);
  console.log('='.repeat(60));
  console.log(`✅ Collected ${finalUrls.length} job URLs\n`);

  return finalUrls;
}

// ============================================
// STEP 2: SCRAPE INDIVIDUAL JOB DETAILS
// ============================================
async function scrapeJobDetails(browser, url, index, total) {
  const page = await browser.newPage();
  
  await optimizePage(page);

  try {
    console.log(`[${index}/${total}] Scraping: ${url}`);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    await sleep(2000);

    const needsLogin = await page.evaluate(() => {
      return document.querySelector('.authwall-join-form') !== null || 
             document.querySelector('form.login__form') !== null;
    });

    if (needsLogin) {
      console.log(`  ⚠️  Login required - session may have expired`);
      await page.close();
      return null;
    }

    const jobData = await page.evaluate(() => {
      const getText = (sel) => document.querySelector(sel)?.innerText?.trim() || '';
      const getAttribute = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) || '';

      const locationElement = document.querySelector('div.job-details-jobs-unified-top-card__primary-description-container');
      let location = '';
      if (locationElement) {
        const firstSpan = locationElement.querySelector('span.tvm__text.tvm__text--low-emphasis');
        location = firstSpan?.innerText?.trim() || '';
      }

      const infoSpans = Array.from(document.querySelectorAll('span.tvm__text.tvm__text--low-emphasis')).map(e => e.innerText.trim());
      const salaryInfo = infoSpans.filter(text => text.includes('$') && text.includes('/')).join(' | ');
      const postedAt = infoSpans.find(text => text.match(/ago|days?|hours?|weeks?|months?/i)) || '';
      const applicantsCount = infoSpans.find(text => text.match(/\d+\s+applicants?/i)) || '';

      const descriptionHtml = document.querySelector('div.jobs-description-content__text')?.innerHTML
        || document.querySelector('div.jobs-description__content')?.innerHTML
        || '';

      const descriptionText = document.querySelector('div.jobs-description-content__text')?.innerText
        || document.querySelector('div.jobs-description__content')?.innerText
        || '';

      const foundEmails = descriptionHtml.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];
      const foundUrls = descriptionHtml.match(/(https?:\/\/[^\s"<>()]+)/g) || [];

      return {
        id: window.location.pathname.replace(/\D/g, ''),
        title: getText('div.job-details-jobs-unified-top-card__job-title h1'),
        companyName: getText('div.job-details-jobs-unified-top-card__company-name a'),
        companyLinkedinUrl: getAttribute('div.job-details-jobs-unified-top-card__company-name a', 'href'),
        jobUrl: window.location.href,
        applyUrl: '',
        location,
        postedAt,
        salaryInfo,
        descriptionText,
        jobPosterName: getText('div.hirer-card__hirer-information strong'),
        jobPosterTitle: getText('div.hirer-card__job-poster'),
        jobPosterProfileUrl: getAttribute('div.hirer-card__hirer-information a', 'href'),
        applicantsCount,
        foundEmails,
        foundUrls
      };
    });

    let applyUrl = '';
    const newTabPromise = new Promise((resolve) => {
      browser.on('targetcreated', async (target) => {
        try {
          const newPage = await target.page();
          if (newPage && !newPage.url().includes('linkedin.com')) {
            await sleep(1500);
            applyUrl = newPage.url();
            resolve(applyUrl);
          }
        } catch (err) {}
      });
    });

    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await sleep(800);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await sleep(400);

    const externalApplySelector = '#jobs-apply-button-id';
    const hasExternalApply = await page.$(externalApplySelector).catch(() => null);

    if (hasExternalApply) {
      try {
        await page.waitForFunction(
          (selector) => {
            const button = document.querySelector(selector);
            return button && !button.disabled && button.offsetParent !== null;
          },
          { timeout: 10000 },
          externalApplySelector
        );

        const applyButton = await page.$(externalApplySelector);
        await page.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), applyButton);
        await sleep(300);
        await page.evaluate(el => el.click(), applyButton);
        await Promise.race([newTabPromise, sleep(6000)]);
      } catch (e) {
        // Silent fail
      }
    } else {
      const easyApplyButton = await page.$('button.jobs-apply-button').catch(() => null);
      if (easyApplyButton) {
        await easyApplyButton.click();
        await sleep(1500);
        const modalUrl = await page.evaluate(() =>
          document.querySelector('.artdeco-modal [href^="mailto:"], .artdeco-modal a[href^="https:"]')?.href || ''
        );
        if (modalUrl) applyUrl = modalUrl;
      }
    }

    if (!applyUrl && jobData.foundUrls && jobData.foundUrls.length) {
      applyUrl = jobData.foundUrls[0];
    }

    if (!applyUrl && jobData.foundEmails && jobData.foundEmails.length) {
      applyUrl = 'mailto:' + jobData.foundEmails[0];
    }

    jobData.applyUrl = applyUrl;
    delete jobData.foundEmails;
    delete jobData.foundUrls;

    console.log(`  ✅ ${jobData.title} at ${jobData.companyName}`);
    await page.close();
    return jobData;

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    await page.close();
    return null;
  }
}

// ============================================
// MAIN SCRAPER WITH GOOGLE SHEETS INTEGRATION
// ============================================
async function scrapeLinkedInJobs(searchUrl, targetCount, googleSheetsConfig = null) {
  console.log('\n🚀 LinkedIn Job Scraper');
  console.log('='.repeat(60));
  console.log(`Target: ${targetCount} jobs\n`);

  // Load existing Job IDs from Google Sheets if config provided
  let existingJobIds = new Set();
  if (googleSheetsConfig) {
    existingJobIds = await fetchJobIdsFromGoogleSheets(googleSheetsConfig);
  }

  // Step 1: Collect job URLs
  const jobUrls = await collectJobUrls(searchUrl, targetCount);

  if (jobUrls.length === 0) {
    console.log('❌ No job URLs found. Exiting.');
    return [];
  }

  // Filter out duplicates
  const filteredUrls = filterDuplicateUrls(jobUrls, existingJobIds);

  if (filteredUrls.length === 0) {
    console.log('✅ All jobs are duplicates. Nothing new to scrape!');
    return [];
  }

  console.log(`✅ ${filteredUrls.length} new jobs to scrape\n`);

  // Step 2: Scrape jobs sequentially
  console.log('🔍 STEP 2: Scraping Job Details');
  console.log('='.repeat(60));
  console.log('');

  const browser = await launchBrowser();
  const jobs = [];

  for (let i = 0; i < filteredUrls.length; i++) {
    const jobData = await scrapeJobDetails(browser, filteredUrls[i], i + 1, filteredUrls.length);
    if (jobData) {
      jobs.push(jobData);
    }
    if (i < filteredUrls.length - 1) {
      await sleep(2000);
    }
  }

  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Total jobs scraped: ${jobs.length}/${filteredUrls.length}`);
  console.log(`❌ Failed: ${filteredUrls.length - jobs.length}`);
  if (existingJobIds.size > 0) {
    console.log(`🔄 Duplicates skipped: ${jobUrls.length - filteredUrls.length}`);
  }
  console.log('');

  return jobs;
}

// ============================================
// SINGLE URL SCRAPER
// ============================================
async function scrapeSingleJob(jobUrl) {
  console.log('\n🚀 Single Job Scraper');
  console.log('='.repeat(60));
  console.log(`URL: ${jobUrl}\n`);

  const browser = await launchBrowser();
  
  try {
    const jobData = await scrapeJobDetails(browser, jobUrl, 1, 1);
    await browser.close();
    return jobData;
  } catch (error) {
    console.log(`❌ Error in single scrape: ${error.message}`);
    await browser.close();
    throw error;
  }
}

module.exports = {
  scrapeLinkedInJobs,
  scrapeSingleJob
};