/**
 * Custom hook for Google Analytics tracking
 */

export const useAnalytics = () => {
  const isGtagLoaded = () => {
    if (typeof window === 'undefined') return false;

    const hasDataLayer = Array.isArray(window.dataLayer);
    const hasGtag = typeof window.gtag === 'function';

    if (!hasDataLayer) {
      console.warn('[Analytics] Google Analytics: dataLayer not initialized');
      window.dataLayer = window.dataLayer || [];
    }

    if (!hasGtag) {
      console.warn('[Analytics] Google Analytics: gtag not loaded');
      return false;
    }

    return true;
  };

  const trackPageView = (path: string) => {
    if (!isGtagLoaded()) return;

    try {
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
    if (!isGtagLoaded()) return;

    try {
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