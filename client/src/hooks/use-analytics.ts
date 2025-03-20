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
        console.warn('[Analytics] Google Analytics: dataLayer not initialized');
        // Initialize dataLayer as fallback
        if (typeof window !== 'undefined') {
          window.dataLayer = window.dataLayer || [];
        }
      }

      if (!hasGtag) {
        console.warn('[Analytics] Google Analytics: gtag not loaded');
        return false;
      }

      console.log('[Analytics] Google Analytics initialized successfully');
      return hasDataLayer && hasGtag;
    } catch (error) {
      console.error('[Analytics] Error checking Google Analytics initialization:', error);
      return false;
    }
  };

  const trackPageView = (path: string) => {
    try {
      if (!isGtagLoaded()) {
        console.warn('[Analytics] Skipping page view tracking - GA not loaded');
        return;
      }

      console.log('[Analytics] Tracking page view:', path);
      window.gtag('event', 'page_view', {
        page_path: path,
        send_to: 'G-8Z36SFYZBB'
      });
    } catch (error) {
      console.error('[Analytics] Error tracking page view:', error);
    }
  };

  const trackEvent = (eventName: string, eventParams: Record<string, any> = {}) => {
    try {
      if (!isGtagLoaded()) {
        console.warn('[Analytics] Skipping event tracking - GA not loaded');
        return;
      }

      console.log('[Analytics] Tracking event:', eventName, eventParams);
      window.gtag('event', eventName, {
        ...eventParams,
        send_to: 'G-8Z36SFYZBB'
      });
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  };

  return {
    trackPageView,
    trackEvent,
  };
};