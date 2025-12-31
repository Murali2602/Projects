const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login() {
  console.log('Opening LinkedIn for login...');
  
  // Launch browser pointing to the user_Data folder
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: './user_Data', // <--- SAVES SESSION HERE AUTOMATICALLY
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: null // Opens full window size
  });

  const page = await browser.newPage();
  
  try {
    // Go to LinkedIn
    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'networkidle2'
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('👉 ACTION REQUIRED');
    console.log('='.repeat(50));
    console.log('1. Log in manually in the opened browser window.');
    console.log('2. DO NOT close the browser manually.');
    console.log('3. Just wait! The script will detect the login and close itself.');
    console.log('='.repeat(50) + '\n');

    // --- NEW LOGIC: Polling for Login ---
    console.log('⏳ Waiting for successful login...');
    
    while (true) {
      try {
        if (page.isClosed()) {
          throw new Error('Browser window was closed manually before login finished.');
        }

        const currentUrl = page.url();
        
        // Check if we have been redirected to the feed or jobs page
        if (currentUrl.includes('/feed') || currentUrl.includes('/jobs')) {
          console.log('\n✅ Login detected! (URL contains /feed or /jobs)');
          break; // Exit the loop
        }

        // Wait 1 second before checking again
        await sleep(1000);
        
      } catch (err) {
        // If getting URL fails (e.g. navigation happening), just ignore and retry
        await sleep(1000);
      }
    }

    // --- STABILIZATION STEP ---
    console.log('💾 Stabilizing... (Waiting 5s to ensure Chrome saves profile data)');
    await sleep(5000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    console.log('🔒 Closing browser safely to flush user_Data...');
    await browser.close();
    console.log('✅ Session saved successfully. You can now run the scraper.');
    process.exit(0);
  }
}

login();