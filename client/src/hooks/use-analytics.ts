/**
 * Custom hook for Google Analytics tracking
 * Enhanced for proper GA4 implementation with debugging
 */

// GA4 Measurement ID
const GA_MEASUREMENT_ID = 'G-8Z36SFYZBB';

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
      
      // Enhanced page_view event with more parameters for GA4
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_path: path,
        page_location: window.location.href,
        debug_mode: true,
        send_to: GA_MEASUREMENT_ID
      });
    } catch (error) {
      console.error('[Analytics] Error tracking page view:', error);
    }
  };

  const trackEvent = (eventName: string, eventParams: Record<string, any> = {}) => {
    if (!isGtagLoaded()) return;

    try {
      console.log('[Analytics] Tracking event:', eventName, eventParams);
      
      // Enhanced event tracking with explicit parameters
      window.gtag('event', eventName, {
        ...eventParams,
        debug_mode: true,
        send_to: GA_MEASUREMENT_ID
      });
    } catch (error) {
      console.error('[Analytics] Error tracking event:', error);
    }
  };

  // Helper to track user engagement
  const trackEngagement = (action: string, category: string, label: string, value?: number) => {
    trackEvent('engagement', {
      engagement_action: action,
      engagement_category: category,
      engagement_label: label,
      engagement_value: value
    });
  };

  return {
    trackPageView,
    trackEvent,
    trackEngagement
  };
};