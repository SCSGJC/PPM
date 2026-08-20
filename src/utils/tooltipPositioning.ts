// Intelligent tooltip positioning utility
export class TooltipPositioning {
  private static observer: MutationObserver | null = null;
  private static initialized = false;

  static initialize() {
    if (this.initialized) return;
    
    this.initialized = true;
    
    // Set up initial positioning
    this.updateAllTooltips();
    
    // Set up observer for dynamic content
    this.observer = new MutationObserver(() => {
      this.updateAllTooltips();
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['title']
    });
    
    // Update on scroll and resize
    window.addEventListener('scroll', this.throttle(() => this.updateAllTooltips(), 100));
    window.addEventListener('resize', this.throttle(() => this.updateAllTooltips(), 100));
  }
  
  static updateAllTooltips() {
    const elementsWithTooltips = document.querySelectorAll('[title]');
    
    elementsWithTooltips.forEach(element => {
      this.updateTooltipPosition(element as HTMLElement);
    });
  }
  
  static updateTooltipPosition(element: HTMLElement) {
    // Remove existing positioning classes
    element.classList.remove('tooltip-auto-top', 'tooltip-auto-bottom');

    // Skip if element has manual positioning or is in header/sticky areas
    if (element.classList.contains('force-tooltip-top') ||
        element.closest('header') ||
        element.closest('.sticky')) {
      return;
    }

    // Remove force-tooltip-bottom as it often causes overlap issues
    // Let our system handle it instead
    if (element.classList.contains('force-tooltip-bottom')) {
      element.classList.remove('force-tooltip-bottom');
    }

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Calculate distances from viewport edges
    const distanceFromTop = rect.top;
    const distanceFromBottom = viewportHeight - rect.bottom;

    // Check if element is in a section
    const section = this.findContainingSection(element);
    if (section) {
      const sectionRect = section.getBoundingClientRect();
      const elementPositionInSection = (rect.top - sectionRect.top) / sectionRect.height;

      // If element is in top 40% of section, show tooltip below
      // If element is in bottom 40% of section, show tooltip above
      // This prevents overlap with content

      if (elementPositionInSection < 0.4) {
        // Top of section - show below
        element.classList.add('tooltip-auto-bottom');
        return;
      } else if (elementPositionInSection > 0.6) {
        // Bottom of section - show above
        element.classList.add('tooltip-auto-top');
        return;
      }
    }

    // Fallback to viewport-based positioning
    // If more space below, show below; if more space above, show above
    if (distanceFromBottom > distanceFromTop) {
      element.classList.add('tooltip-auto-bottom');
    } else {
      element.classList.add('tooltip-auto-top');
    }

    // Special handling for elements near viewport edges
    // Increase threshold for better overlap prevention
    if (distanceFromTop < 100) {
      // Too close to top, force below
      element.classList.remove('tooltip-auto-top');
      element.classList.add('tooltip-auto-bottom');
    } else if (distanceFromBottom < 100) {
      // Too close to bottom, force above
      element.classList.remove('tooltip-auto-bottom');
      element.classList.add('tooltip-auto-top');
    }
  }
  
  private static findContainingSection(element: HTMLElement): HTMLElement | null {
    // Look for common section containers
    const sectionSelectors = [
      '.bg-white.border.border-gray-200.rounded-2xl', // Card components
      'section',
      '[role="region"]',
      '.space-y-6 > div', // Section containers
      'table tbody',
      '.grid > div'
    ];
    
    for (const selector of sectionSelectors) {
      const section = element.closest(selector) as HTMLElement;
      if (section && section !== element) {
        // Make sure the section has reasonable height (not just a wrapper)
        const rect = section.getBoundingClientRect();
        if (rect.height > 100) {
          return section;
        }
      }
    }
    
    return null;
  }
  
  private static throttle(func: Function, limit: number) {
    let inThrottle: boolean;
    return function(this: any) {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }
  
  static cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.initialized = false;
  }
}

// Auto-initialize when DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      TooltipPositioning.initialize();
    });
  } else {
    TooltipPositioning.initialize();
  }
}