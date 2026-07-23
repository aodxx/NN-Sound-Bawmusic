/**
 * BAWMUSIC — Main App Controller (Alpine.js store)
 */

function app() {
  return {
    currentView: 'dashboard',
    loading: true,
    loadingMessage: 'กำลังเริ่มต้นระบบ...',
    loadingDetail: '',
    loadingTimedOut: false,
    loadingTimer: null,
    darkMode: document.documentElement.getAttribute('data-theme') !== 'light',
    settings: {},
    showInstallBanner: false,
    env: { isIOS: false, isAndroid: false, isInAppBrowser: false, inAppName: '' },
    deferredInstallPrompt: null,
    themeCheckInterval: null,
    pendingBookingCount: 0,
    pendingBookingReady: false,
    pendingBookingTimer: null,
    pendingBookingRequest: false,
    pendingBookingFocusHandler: null,
    pendingBookingVisibilityHandler: null,
    navItems: [
      { view: 'dashboard', icon: 'fa-house', label: 'หน้าหลัก' },
      { view: 'bookings', icon: 'fa-calendar-check', label: 'การจอง' },
      { view: 'customers', icon: 'fa-users', label: 'ลูกค้า' },
      { view: 'equipment', icon: 'fa-boxes-stacked', label: 'อุปกรณ์' },
      { view: 'settings', icon: 'fa-gear', label: 'ตั้งค่า' }
    ],
    viewTitles: {
      dashboard: 'ภาพรวมวันนี้',
      bookings: 'รายการจองทั้งหมด',
      customers: 'จัดการลูกค้า',
      equipment: 'คลังอุปกรณ์',
      analytics: 'สถิติและรายงาน',
      history: 'ประวัติงานที่เสร็จสิ้นแล้ว',
      settings: 'ตั้งค่าระบบ'
    },

    async init() {
      window.__app = this;
      this.loading = true;
      if (!this.ensureApiCompatibility()) {
        this.loadingTimedOut = true;
        this.loadingMessage = 'ไฟล์ระบบโหลดไม่ครบ';
        this.loadingDetail = 'กรุณากด “ลองโหลดใหม่” เพื่อรีเฟรชไฟล์ระบบ';
        return;
      }
      this.loadingMessage = 'กำลังตรวจสอบการเข้าสู่ระบบ...';
      this.loadingDetail = '';
      this.loadingTimedOut = false;
      this.env = Utils.detectEnvironment();

      this.loadingTimer = setTimeout(() => {
        if (!this.loading) return;
        this.loadingTimedOut = true;
        this.loadingMessage = 'ระบบกำลังตอบกลับช้ากว่าปกติ';
        this.loadingDetail = 'ถ้าเกิน 15 วินาที ให้กด “ลองโหลดใหม่”';
      }, 5000);

      let authenticated;
      try {
        authenticated = await Promise.race([
          BawmusicAPI.requireAuth(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('ตรวจสอบ session ใช้เวลานานเกินไป')), 15000))
        ]);
      } catch (e) {
        console.error('App initialization failed:', e);
        this.loadingTimedOut = true;
        this.loadingMessage = 'โหลดระบบไม่สำเร็จ';
        this.loadingDetail = e?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้';
        return;
      } finally {
        if (this.loadingTimer) clearTimeout(this.loadingTimer);
        this.loadingTimer = null;
      }

      if (!authenticated) {
        this.loading = false;
        return;
      }

      // ตรวจจับเวลาซ้ำทุก 5 นาที เพื่อสลับธีมอัตโนมัติ (ถ้าผู้ใช้ยังไม่เคยสลับเองด้วยมือ)
      this.themeCheckInterval = setInterval(() => this.autoApplyTheme(), 5 * 60 * 1000);

      // ดักจับ event ติดตั้งแอป (Android/Chrome เป็นหลัก — เบราว์เซอร์อื่นอาจไม่ยิง event นี้เลย)
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredInstallPrompt = e;
        if (!this.isStandalone() && !sessionStorage.getItem('bawmusic_install_dismissed')) {
          this.showInstallBanner = true;
        }
      });
      window.addEventListener('appinstalled', () => {
        this.showInstallBanner = false;
        this.deferredInstallPrompt = null;
        Utils.toast('success', 'ติดตั้งแอปสำเร็จ');
      });

      // เบราว์เซอร์ที่ไม่รองรับ beforeinstallprompt (iOS Safari, LINE/Facebook in-app) ต้องแนะนำวิธีเอง
      if (!this.isStandalone() && (this.env.isIOS || this.env.isInAppBrowser) && !sessionStorage.getItem('bawmusic_install_dismissed')) {
        this.showInstallBanner = true;
      }

      // แสดงหน้าหลักทันที ไม่รอ getSettings เพราะถ้า Sheets/Apps Script ช้าจะทำให้ทั้งแอปเหมือนหน้าขาว
      this.loading = false;
      this.renderCurrentView();
      this.startPendingBookingWatcher();

      // โหลดชื่อวง/ธีม/แบนเนอร์แบบเบื้องหลัง เมื่อได้ข้อมูลแล้ว Alpine จะอัปเดตหัวหน้าให้เอง
      BawmusicAPI.getSettings()
        .then((settings) => {
          this.settings = settings || {};
        })
        .catch((e) => {
          if (!BawmusicAPI.getSessionToken()) return;
          console.warn('Could not load settings — check API_URL in js/api.js', e);
        });
    },

    startPendingBookingWatcher() {
      if (this.pendingBookingTimer) clearInterval(this.pendingBookingTimer);
      this.refreshPendingBookingNotice(true);
      this.pendingBookingTimer = setInterval(() => this.refreshPendingBookingNotice(false), 45 * 1000);

      if (!this.pendingBookingFocusHandler) {
        this.pendingBookingFocusHandler = () => this.refreshPendingBookingNotice(true);
        window.addEventListener('focus', this.pendingBookingFocusHandler);
      }
      if (!this.pendingBookingVisibilityHandler) {
        this.pendingBookingVisibilityHandler = () => {
          if (document.visibilityState === 'visible') this.refreshPendingBookingNotice(true);
        };
        document.addEventListener('visibilitychange', this.pendingBookingVisibilityHandler);
      }
    },

    async refreshPendingBookingNotice(force) {
      if (!force && document.visibilityState === 'hidden') return;
      if (this.pendingBookingRequest || !BawmusicAPI.getSessionToken()) return;

      this.pendingBookingRequest = true;
      try {
        const list = await BawmusicAPI.listBookings({ status: 'pending' });
        const count = Array.isArray(list) ? list.length : 0;
        const previous = this.pendingBookingCount;
        const wasReady = this.pendingBookingReady;
        this.pendingBookingCount = count;
        this.pendingBookingReady = true;

        if (wasReady && count > previous && typeof Utils !== 'undefined' && Utils.toast) {
          Utils.toast('info', 'มีคำขอจองใหม่ ' + (count - previous) + ' รายการ');
        }
      } catch (error) {
        console.warn('Could not refresh pending booking notice:', error);
      } finally {
        this.pendingBookingRequest = false;
      }
    },

    openPendingBookings() {
      this.setView('bookings');
      window.setTimeout(() => {
        if (window.__openPendingBookings) window.__openPendingBookings();
      }, 0);
    },

    ensureApiCompatibility() {
      if (typeof BawmusicAPI === 'undefined') return false;
      // รองรับกรณี Service Worker ส่ง api.js รุ่นเก่ามาคู่กับ app.js รุ่นใหม่
      if (typeof BawmusicAPI.getSessionToken !== 'function') {
        BawmusicAPI.getSessionToken = () => localStorage.getItem('bawmusic_session_token') || '';
      }
      if (typeof BawmusicAPI.setSessionToken !== 'function') {
        BawmusicAPI.setSessionToken = (token) => {
          if (token) localStorage.setItem('bawmusic_session_token', token);
          else localStorage.removeItem('bawmusic_session_token');
        };
      }
      return typeof BawmusicAPI.requireAuth === 'function'
        && typeof BawmusicAPI.call === 'function';
    },

    async retryLoading() {
      this.loadingMessage = 'กำลังล้างไฟล์แคชเก่า...';
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch (e) {
        console.warn('Could not clear app cache:', e);
      }
      window.location.replace(window.location.pathname + '?refresh=' + Date.now());
    },

    isStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    },

    async installApp() {
      if (this.deferredInstallPrompt) {
        this.deferredInstallPrompt.prompt();
        const { outcome } = await this.deferredInstallPrompt.userChoice;
        this.deferredInstallPrompt = null;
        this.showInstallBanner = false;
        if (outcome !== 'accepted') sessionStorage.setItem('bawmusic_install_dismissed', '1');
        return;
      }
      // ไม่มี native prompt ให้ใช้ — แสดงคำแนะนำตาม browser แทน
      this.showManualInstallInstructions();
    },

    showManualInstallInstructions() {
      const env = this.env;
      let title = 'วิธีติดตั้งแอป';
      let html = '';

      if (env.isInAppBrowser) {
        html = `
          <p style="margin-bottom:10px;">เบราว์เซอร์ในแอป ${env.inAppName} ไม่รองรับการติดตั้งแอปโดยตรง</p>
          <p style="margin-bottom:6px;">1. แตะเมนู <b>⋮</b> หรือ <b>...</b> มุมขวาบน</p>
          <p>2. เลือก <b>"เปิดใน Chrome"</b> หรือ <b>"เปิดในเบราว์เซอร์"</b> แล้วทำตามขั้นตอนอีกครั้ง</p>
        `;
      } else if (env.isIOS) {
        html = `
          <p style="margin-bottom:6px;">1. แตะปุ่มแชร์ <b>􀈂</b> (Share) ด้านล่างจอ Safari</p>
          <p style="margin-bottom:6px;">2. เลื่อนหาแล้วแตะ <b>"เพิ่มไปยังหน้าจอโฮม"</b></p>
          <p>3. แตะ <b>"เพิ่ม"</b> มุมขวาบน</p>
        `;
      } else if (env.isAndroid) {
        html = `
          <p style="margin-bottom:6px;">1. แตะเมนู <b>⋮</b> มุมขวาบนของ Chrome</p>
          <p>2. เลือก <b>"ติดตั้งแอป"</b> หรือ <b>"เพิ่มไปยังหน้าจอโฮม"</b></p>
        `;
      } else {
        html = `<p>มองหาไอคอนติดตั้ง <b>⊕</b> ที่แถบที่อยู่ URL ด้านบนเบราว์เซอร์ แล้วคลิกเพื่อติดตั้ง</p>`;
      }

      Swal.fire({
        title, html, icon: 'info', confirmButtonText: 'เข้าใจแล้ว',
        confirmButtonColor: '#22d3ee', background: Utils.swalBg(), color: Utils.swalColor()
      });
    },

    dismissInstallBanner() {
      this.showInstallBanner = false;
      sessionStorage.setItem('bawmusic_install_dismissed', '1');
    },

    autoApplyTheme() {
      const override = localStorage.getItem('bawmusic_theme_override');
      if (override) return; // ผู้ใช้ตั้งค่าเองแล้ว ไม่ต้องสลับอัตโนมัติ
      const hour = new Date().getHours();
      const theme = (hour >= 6 && hour < 18) ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      this.darkMode = theme === 'dark';
      this.updateThemeColorMeta(theme);
    },

    setView(view) {
      this.currentView = view;
      this.renderCurrentView();
    },

    renderCurrentView() {
      // เรียก render ทันที — แต่ละ render*() จะ set skeleton loader ทันทีอยู่แล้ว
      // (container มีอยู่ใน DOM เสมอ เพราะ x-show ใช้ display:none ไม่ได้ถอดออกจาก DOM)
      switch (this.currentView) {
        case 'dashboard': renderDashboard(); break;
        case 'bookings': renderBookings(); break;
        case 'customers': renderCustomers(); break;
        case 'equipment': renderEquipment(); break;
        case 'analytics': renderAnalytics(); break;
        case 'history': renderHistory(); break;
        case 'settings': renderSettings(); break;
      }
    },

    openBookingForm(id) {
      window.openBookingForm(id);
    },

    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      const theme = this.darkMode ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('bawmusic_theme_override', theme);
      this.updateThemeColorMeta(theme);
      Utils.toast('success', this.darkMode ? 'เปลี่ยนเป็นโหมดมืด' : 'เปลี่ยนเป็นโหมดสว่าง');
    },

    resetThemeToAuto() {
      localStorage.removeItem('bawmusic_theme_override');
      this.autoApplyTheme();
      Utils.toast('success', 'ธีมจะสลับอัตโนมัติตามเวลาอีกครั้ง');
    },

    updateThemeColorMeta(theme) {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f3ff' : '#08080d');
    }
  };
}

// Add 'analytics' to nav on wider screens by inserting between equipment and settings if desired.
// Kept to 5 bottom-nav items per mobile UX best practice; Analytics is reachable via Dashboard quick action.
