/**
 * @arcanus/theme — responsive-menu.js
 * Mobile menu toggle helper for hamburger navigation
 * 
 * Usage:
 *   <script src="responsive-menu.js"><\/script>
 *   ResponsiveMenu.init();
 */

const ResponsiveMenu = (() => {
  const ACTIVE_CLASS = 'is-open';
  let isOpen = false;

  const elements = {
    hamburger: null,
    sidebar: null,
    scrim: null,
  };

  /**
   * Initialize menu toggle functionality
   */
  function init() {
    elements.hamburger = document.querySelector('.hamburger');
    elements.sidebar = document.querySelector('.sidebar');
    elements.scrim = document.querySelector('.sidebar-scrim');

    if (!elements.hamburger || !elements.sidebar) {
      console.warn('ResponsiveMenu: Missing .hamburger or .sidebar element');
      return;
    }

    // Create scrim if it doesn't exist
    if (!elements.scrim) {
      elements.scrim = document.createElement('div');
      elements.scrim.className = 'sidebar-scrim';
      document.body.appendChild(elements.scrim);
    }

    attachListeners();
    setupMediaQueryListener();
  }

  /**
   * Attach event listeners
   */
  function attachListeners() {
    // Hamburger button click
    elements.hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });

    // Scrim click to close
    elements.scrim.addEventListener('click', close);

    // Sidebar nav item clicks close the menu
    const navItems = elements.sidebar.querySelectorAll('.nav-item');
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        close();
      });
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    });
  }

  /**
   * Setup media query listener to close menu on resize to desktop
   */
  function setupMediaQueryListener() {
    const mediaQuery = window.matchMedia('(min-width: 768px)');

    const handleChange = (e) => {
      if (e.matches && isOpen) {
        close();
      }
    };

    // Modern API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    }
    // Legacy API
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }
  }

  /**
   * Toggle menu open/closed
   */
  function toggle() {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }

  /**
   * Open menu
   */
  function open() {
    isOpen = true;
    elements.hamburger.classList.add(ACTIVE_CLASS);
    elements.sidebar.classList.add(ACTIVE_CLASS);
    elements.scrim.classList.add(ACTIVE_CLASS);
    document.body.style.overflow = 'hidden'; // Prevent scrolling
  }

  /**
   * Close menu
   */
  function close() {
    isOpen = false;
    elements.hamburger.classList.remove(ACTIVE_CLASS);
    elements.sidebar.classList.remove(ACTIVE_CLASS);
    elements.scrim.classList.remove(ACTIVE_CLASS);
    document.body.style.overflow = ''; // Restore scrolling
  }

  /**
   * Check if menu is open
   */
  function getIsOpen() {
    return isOpen;
  }

  return {
    init,
    toggle,
    open,
    close,
    getIsOpen,
  };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ResponsiveMenu.init);
} else {
  ResponsiveMenu.init();
}
