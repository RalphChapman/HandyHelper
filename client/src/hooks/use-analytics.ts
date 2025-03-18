/**
 * Custom hook for Google Analytics tracking
 */

export const useAnalytics = () => {
  const isGtagLoaded = () => {
    try {
      const hasDataLayer = typeof window !== 'undefined' && 
             typeof window.dataLayer === 'object';
      const hasGtag = typeof window !== 'undefined' && 
             typeof window.gtag === 'function';

      if (!hasDataLayer) {
        console.warn('Google Analytics: dataLayer not initialized');
        // Initialize dataLayer as fallback
        if (typeof window !== 'undefined') {
          window.dataLayer = window.dataLayer || [];
        }
      }

      if (!hasGtag) {
        console.warn('Google Analytics: gtag not loaded');
      }

      return hasDataLayer && hasGtag;
    } catch (error) {
      console.error('Error checking Google Analytics initialization:', error);
      return false;
    }
  };

  const trackPageView = (path: string) => {
    try {
      if (isGtagLoaded()) {
        window.gtag('event', 'page_view', {
          page_path: path,
          send_to: 'G-8Z36SFYZBB'
        });
      }
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  };

  const trackEvent = (eventName: string, eventParams: Record<string, any> = {}) => {
    try {
      if (isGtagLoaded()) {
        window.gtag('event', eventName, {
          ...eventParams,
          send_to: 'G-8Z36SFYZBB'
        });
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  return {
    trackPageView,
    trackEvent,
  };
};