const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  // Set viewport to see dashboard clearly
  await page.setViewport({ width: 1440, height: 900 });

  // Listen to console and error events
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  // Helper to wait and screenshot
  const takeScreenshot = async (name) => {
    const filename = path.join(__dirname, `${name}.png`);
    await page.screenshot({ path: filename, fullPage: true });
    console.log(`Screenshot saved: ${filename}`);
  };

  try {
    // 1. Navigate to Register
    console.log('Navigating to http://localhost/register...');
    await page.goto('http://localhost/register', { waitUntil: 'networkidle2' });
    await takeScreenshot('1_register_page');

    // Fill in registration details
    const uniqueEmail = `ui_user_${Date.now()}@risklens.com`;
    console.log(`Registering new user: ${uniqueEmail}`);
    await page.type('#name', 'UI E2E Tester');
    await page.type('#email', uniqueEmail);
    await page.type('#password', 'SecurePass123!');
    await page.select('#role', 'RISK_MANAGER');

    // Submit form
    console.log('Submitting registration form...');
    await page.evaluate(() => document.querySelector('button[type="submit"]').click());
    // Wait for either the dashboard user panel or an alert error to appear
    await page.waitForFunction(() => {
      return document.querySelector('.nav-user') !== null || document.querySelector('.alert-error') !== null;
    }, { timeout: 15000 });


    // Check URL or any error
    const currentUrl = page.url();
    console.log(`Current URL after registration: ${currentUrl}`);
    await takeScreenshot('2_after_registration');

    // Verify authentication on Dashboard
    if (currentUrl.endsWith('/') || currentUrl.includes('/dashboard') || page.$('.nav-user') !== null) {
      console.log('Registration succeeded and navigated to Dashboard!');
    } else {
      const errorText = await page.evaluate(() => {
        const errEl = document.querySelector('.alert-error');
        return errEl ? errEl.textContent : 'Unknown error';
      });
      throw new Error(`Registration failed on UI: ${errorText}`);
    }

    // Verify details on dashboard
    const userRoleElement = await page.waitForSelector('.user-badge');
    const userRole = await page.evaluate(el => el.textContent, userRoleElement);
    const userNameElement = await page.waitForSelector('.nav-user span:not(.user-badge)');
    const userName = await page.evaluate(el => el.textContent, userNameElement);

    console.log(`Logged in User Name on UI: ${userName}`);
    console.log(`Logged in User Role on UI: ${userRole}`);

    if (userName !== 'UI E2E Tester' || userRole !== 'RISK_MANAGER') {
      throw new Error(`User name or role mismatch on UI! Found Name: ${userName}, Role: ${userRole}`);
    }

    // 2. Test Logout
    console.log('Clicking Logout...');
    await page.evaluate(() => document.querySelector('.btn-logout').click());
    await page.waitForSelector('#email'); // Wait for login page input

    console.log(`Current URL after logout: ${page.url()}`);
    await takeScreenshot('3_after_logout');

    if (!page.url().includes('/login')) {
      throw new Error('Logout did not redirect to login page!');
    }

    // 3. Test Login
    console.log('Logging in with newly created account...');
    await page.type('#email', uniqueEmail);
    await page.type('#password', 'SecurePass123!');
    
    await page.evaluate(() => document.querySelector('button[type="submit"]').click());
    await page.waitForSelector('.nav-user'); // Wait for dashboard nav-user info


    console.log(`Current URL after login: ${page.url()}`);
    await takeScreenshot('4_dashboard_after_login');

    if (!page.url().endsWith('/') && !page.url().includes('/dashboard')) {
      throw new Error('Login failed to redirect back to Dashboard!');
    }

    console.log('ALL E2E FLOW TESTS COMPLETED SUCCESSFULLY THROUGH THE BROWSER UI!');
    console.log(`New Account Created: ${uniqueEmail} / SecurePass123!`);

  } catch (error) {
    console.error('E2E TEST FAILED:', error.message);
    const bodyHtml = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync(path.join(__dirname, 'error_dom.html'), bodyHtml);
    console.log('Saved DOM HTML to error_dom.html');
    await takeScreenshot('error_screenshot');
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
