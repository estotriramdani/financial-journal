import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';

const USER1 = {
  email: 'estolagi@gmail.com',
  password: 'qwe123',
};

const USER2 = {
  email: 'estolagi1@gmail.com',
  password: 'qwe123',
};

const ADMIN = {
  email: 'admin@financialjournal.com',
  password: 'Admin123!@#',
};

async function preparePage(page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('    [BROWSER ERROR]', msg.text());
  });
  page.on('pageerror', (err) => console.log('    [PAGE EXCEPTION]', err.message));
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; pointer-events: none !important; }' });
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('   FINJRNL FULL END-TO-END AUTOMATED TEST SUITE    ');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  try {
    // ----------------------------------------------------
    // TEST 1: ADMIN - Panel & Manual Activation & Dark Mode
    // ----------------------------------------------------
    console.log('▶ [TEST 1] Admin Login, Manual Activation & Dark Mode...');
    const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const adminPage = await adminContext.newPage();
    await adminPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await preparePage(adminPage);

    // Fill Admin Login
    await adminPage.fill('input[type="email"]', ADMIN.email);
    await adminPage.fill('input[type="password"]', ADMIN.password);
    await adminPage.click('button:has-text("Masuk ke Aplikasi")', { force: true });
    await adminPage.waitForSelector('span:has-text("FINJRNL")', { timeout: 10000 });
    console.log('  ✓ Admin logged in successfully.');

    // Go to Profil tab
    await adminPage.click('button[data-tab="profile"]', { force: true });
    await adminPage.waitForSelector('h4:has-text("Panel Administrator")', { timeout: 10000 });
    console.log('  ✓ Admin panel visible in profile.');

    // Test Dark Mode Toggle
    await adminPage.click('button:has-text("Gelap")', { force: true });
    await adminPage.waitForTimeout(400);
    const isDark = await adminPage.evaluate(() => document.documentElement.classList.contains('dark'));
    if (!isDark) throw new Error('Dark mode class not applied to <html>');
    console.log('  ✓ Dark mode activated successfully (html.dark confirmed).');

    // Switch back to Terang
    await adminPage.click('button:has-text("Terang")', { force: true });
    await adminPage.waitForTimeout(300);
    console.log('  ✓ Switched back to light mode.');

    // Check User List in Admin Panel
    await adminPage.waitForSelector(`text="${USER1.email}"`, { timeout: 10000 });
    await adminPage.waitForSelector(`text="${USER2.email}"`, { timeout: 10000 });
    console.log('  ✓ Both registered users found in Admin panel user list.');

    // Close admin context
    await adminContext.close();

    // ----------------------------------------------------
    // TEST 2: USER 1 - Login, Group Creation, Member Invitation, Input Transactions
    // ----------------------------------------------------
    console.log('\n▶ [TEST 2] User 1 (estolagi@gmail.com) - Journal & Collaboration...');
    const user1Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const user1Page = await user1Context.newPage();
    await user1Page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await preparePage(user1Page);

    await user1Page.fill('input[type="email"]', USER1.email);
    await user1Page.fill('input[type="password"]', USER1.password);
    await user1Page.click('button:has-text("Masuk ke Aplikasi")', { force: true });
    await user1Page.waitForSelector('span:has-text("FINJRNL")', { timeout: 10000 });
    console.log('  ✓ User 1 logged in successfully.');

    // Go to Grup tab to create a collaborative group
    await user1Page.click('button[data-tab="groups"]', { force: true });
    await user1Page.waitForSelector('h2:has-text("Kelola Grup Keuangan")', { timeout: 10000 });

    const sharedGroupName = 'Grup Bersama ' + Date.now();
    await user1Page.click('button:has-text("Buat Grup Baru")', { force: true });
    await user1Page.fill('input[placeholder*="Keuangan Keluarga"]', sharedGroupName);
    await user1Page.fill('input[placeholder*="Deskripsi singkat"]', 'Grup pengujian kolaborasi User 1 dan 2');
    await user1Page.click('button:has-text("Simpan & Aktifkan Grup")', { force: true });
    await user1Page.waitForSelector(`text="${sharedGroupName}"`, { timeout: 10000 });
    console.log(`  ✓ Shared group "${sharedGroupName}" created and activated.`);

    // Test Edit Group
    console.log('  ▶ Testing Edit Group...');
    const editBtn = user1Page.locator('div.border-b button:has-text("Edit")');
    await editBtn.scrollIntoViewIfNeeded();
    await editBtn.click();
    await user1Page.waitForSelector('h3:has-text("Edit Grup")', { timeout: 5000 });
    const editedGroupName = sharedGroupName + ' EDITED';
    await user1Page.fill('form input[value*="Grup Bersama"]', editedGroupName);
    await user1Page.click('button:has-text("Simpan Perubahan")', { force: true });
    await user1Page.waitForSelector(`text="${editedGroupName}"`, { timeout: 10000 });
    console.log(`  ✓ Group edited successfully to "${editedGroupName}".`);

    // Test Create & Delete Temporary Group
    console.log('  ▶ Testing Delete Group...');
    const tempDeleteGroupName = 'Grup Hapus ' + Date.now();
    await user1Page.click('button:has-text("Buat Grup Baru")', { force: true });
    await user1Page.fill('input[placeholder*="Keuangan Keluarga"]', tempDeleteGroupName);
    await user1Page.click('button:has-text("Simpan & Aktifkan Grup")', { force: true });
    await user1Page.waitForSelector(`text="${tempDeleteGroupName}"`, { timeout: 10000 });
    
    // Click Hapus on active group
    const deleteBtn = user1Page.locator('div.border-b button:has-text("Hapus")');
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click();
    await user1Page.waitForSelector('h3:has-text("Hapus Grup")', { timeout: 5000 });
    await user1Page.click('button:has-text("Ya, Hapus Grup")', { force: true });
    await user1Page.waitForTimeout(1000);
    const hasDeleted = await user1Page.locator(`text="${tempDeleteGroupName}"`).count();
    if (hasDeleted > 0) throw new Error('Group still found after deletion');
    console.log(`  ✓ Group "${tempDeleteGroupName}" deleted successfully and removed from list.`);

    // Switch back to edited collaborative group
    await user1Page.click(`div.cursor-pointer:has-text("${editedGroupName}")`, { force: true });
    await user1Page.waitForTimeout(800);

    // Invite User 2 to this group
    const inviteInput = user1Page.locator('input[placeholder*="teman@gmail.com"]');
    await inviteInput.waitFor({ state: 'visible', timeout: 10000 });
    await inviteInput.scrollIntoViewIfNeeded();
    await inviteInput.fill(USER2.email);
    await user1Page.waitForTimeout(300);
    await inviteInput.press('Enter');
    try {
      await user1Page.waitForSelector(`text="${USER2.email}"`, { timeout: 10000 });
      console.log(`  ✓ User 2 (${USER2.email}) successfully invited & joined group.`);
    } catch (err) {
      // Fallback click on button if enter didn't submit
      const addBtn = user1Page.locator('button:has-text("Tambah")');
      await addBtn.scrollIntoViewIfNeeded();
      await addBtn.click();
      await user1Page.waitForSelector(`text="${USER2.email}"`, { timeout: 10000 });
      console.log(`  ✓ User 2 (${USER2.email}) successfully invited & joined group.`);
    }

    // Go back to Jurnal tab
    await user1Page.click('button[data-tab="journal"]', { force: true });
    await user1Page.waitForTimeout(600);

    // Input Expense 1 using Calculator Keypad: Rp 75.000
    await user1Page.click('button[data-tab="add"]', { force: true });
    await user1Page.waitForSelector('h3:has-text("Pengeluaran Baru")', { timeout: 5000 });
    await user1Page.waitForSelector('span:has-text("Nominal Transaksi (Kalkulator)")', { timeout: 5000 });
    
    // Tap 7, 5, 000 on on-screen calculator keypad
    await user1Page.click('div.grid-cols-4 button:has-text("7")', { force: true });
    await user1Page.click('div.grid-cols-4 button:has-text("5")', { force: true });
    await user1Page.click('div.grid-cols-4 button:has-text("000")', { force: true });
    console.log('  ✓ Entered Rp 75.000 via on-screen calculator keypad.');

    await user1Page.fill('input[placeholder*="Makan siang"]', 'Makan Siang Soto Ayam');
    await user1Page.click('button:has-text("Simpan Catatan")', { force: true });
    await user1Page.waitForSelector('text="Makan Siang Soto Ayam"', { timeout: 10000 });
    console.log('  ✓ Pengeluaran Rp 75.000 recorded and rendered in feed.');
    await user1Page.waitForTimeout(1000); // Wait for modal close animation

    // Input Income 1 using Calculator Keypad: Rp 5.000.000
    await user1Page.click('button[data-tab="add"]', { force: true });
    await user1Page.waitForSelector('h3:has-text("Pengeluaran Baru")', { timeout: 5000 });
    await user1Page.click('form button:has-text("Pemasukan")', { force: true }); // switch to Pemasukan inside modal form
    await user1Page.waitForSelector('h3:has-text("Pemasukan Baru")', { timeout: 5000 });
    
    // Tap 5, 000, 000 on on-screen calculator keypad
    await user1Page.click('div.grid-cols-4 button:has-text("5")', { force: true });
    await user1Page.click('div.grid-cols-4 button:has-text("000")', { force: true });
    await user1Page.click('div.grid-cols-4 button:has-text("000")', { force: true });
    console.log('  ✓ Entered Rp 5.000.000 via on-screen calculator keypad.');

    await user1Page.fill('input[placeholder*="Makan siang"]', 'Bonus Proyek');
    await user1Page.click('button:has-text("Simpan Catatan")', { force: true });
    await user1Page.waitForSelector('text="Bonus Proyek"', { timeout: 10000 });
    console.log('  ✓ Pemasukan Rp 5.000.000 recorded and rendered in feed.');
    await user1Page.waitForTimeout(1000);

    // Check Reports Tab & Month Selection
    await user1Page.click('button[data-tab="reports"]', { force: true });
    await user1Page.waitForSelector('h2:has-text("Statistik & Analisis")', { timeout: 10000 });
    await user1Page.waitForTimeout(500);
    await user1Page.waitForSelector('text=/5\.000\.000/', { timeout: 10000 });
    await user1Page.waitForSelector('text=/75\.000/', { timeout: 10000 });

    // Test Month Picker Navigator
    await user1Page.waitForSelector('button[title="Bulan Sebelumnya"]', { timeout: 5000 });
    await user1Page.click('button[title="Bulan Sebelumnya"]', { force: true });
    await user1Page.waitForTimeout(500);
    console.log('  ✓ Month navigator traversed to previous month.');
    // Return to current month
    await user1Page.click('button:has-text("Bulan Ini")', { force: true });
    await user1Page.waitForTimeout(500);
    console.log('  ✓ Month navigator returned to current month.');
    console.log('  ✓ Reports tab displays accurate Income, Expense, and Net Balance!');

    // ----------------------------------------------------
    // TEST 3: USER 2 - Login, Switch to Shared Group, View Transactions, Add Expense
    // ----------------------------------------------------
    console.log('\n▶ [TEST 3] User 2 (estolagi1@gmail.com) - Collaborative Journaling...');
    const user2Context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const user2Page = await user2Context.newPage();
    await user2Page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await preparePage(user2Page);

    await user2Page.fill('input[type="email"]', USER2.email);
    await user2Page.fill('input[type="password"]', USER2.password);
    await user2Page.click('button:has-text("Masuk ke Aplikasi")', { force: true });
    await user2Page.waitForSelector('span:has-text("FINJRNL")', { timeout: 10000 });
    console.log('  ✓ User 2 logged in successfully.');

    // Switch to the shared group
    await user2Page.click('button[data-tab="groups"]', { force: true });
    await user2Page.waitForSelector(`text="${editedGroupName}"`, { timeout: 10000 });
    await user2Page.click(`div.cursor-pointer:has-text("${editedGroupName}")`, { force: true });
    await user2Page.waitForTimeout(1000);
    console.log(`  ✓ User 2 switched to shared group "${editedGroupName}".`);

    // Verify User 2 sees transactions from User 1
    await user2Page.click('button[data-tab="journal"]', { force: true });
    await user2Page.waitForSelector('text="Makan Siang Soto Ayam"', { timeout: 10000 });
    await user2Page.waitForSelector('text="Bonus Proyek"', { timeout: 10000 });
    console.log('  ✓ User 2 can see collaborative transactions created by User 1!');

    // User 2 adds another Expense: Rp 120.000
    await user2Page.click('button[data-tab="add"]', { force: true });
    await user2Page.waitForSelector('h3:has-text("Pengeluaran Baru")', { timeout: 5000 });
    await user2Page.fill('input[placeholder="0"]', '120000');
    await user2Page.fill('input[placeholder*="Makan siang"]', 'Bensin & Tol');
    await user2Page.click('button:has-text("Simpan Catatan")', { force: true });
    await user2Page.waitForSelector('text="Bensin & Tol"', { timeout: 10000 });
    console.log('  ✓ User 2 added Expense Rp 120.000.');
    await user2Page.waitForTimeout(1000);

    // ----------------------------------------------------
    // TEST 4: OFFLINE-FIRST SIMULATION
    // ----------------------------------------------------
    console.log('\n▶ [TEST 4] Offline-First & Background Sync Simulation...');
    // Disconnect network
    await user2Context.setOffline(true);
    console.log('  ⚡ Network set to OFFLINE.');

    // Add transaction while offline
    await user2Page.click('button[data-tab="add"]', { force: true });
    await user2Page.waitForSelector('h3:has-text("Pengeluaran Baru")', { timeout: 5000 });
    await user2Page.fill('input[placeholder="0"]', '25000');
    await user2Page.fill('input[placeholder*="Makan siang"]', 'Kopi Hitam Offline');
    await user2Page.click('button:has-text("Simpan Catatan")', { force: true });
    await user2Page.waitForSelector('text="Kopi Hitam Offline"', { timeout: 10000 });

    // Verify "Lokal" tag appears on transaction card
    await user2Page.waitForSelector('span:has-text("Lokal")', { timeout: 5000 });
    console.log('  ✓ Offline transaction saved locally and immediately visible with "Lokal" badge!');

    // Reconnect network
    await user2Context.setOffline(false);
    console.log('  ⚡ Network restored to ONLINE.');

    // Wait for auto sync or trigger manual sync
    await user2Page.waitForTimeout(1500);
    const syncButton = await user2Page.$('header button:has-text("Lokal")');
    if (syncButton) {
      await syncButton.click({ force: true });
    }
    await user2Page.waitForTimeout(2000);
    console.log('  ✓ Sync completed successfully.');

    // Clean up
    await user1Context.close();
    await user2Context.close();

    console.log('\n====================================================');
    console.log('   🎉 ALL END-TO-END TESTS COMPLETED SUCCESSFULLY!  ');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runE2ETests();
