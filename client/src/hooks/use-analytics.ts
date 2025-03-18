/**
 * Custom hook for Google Analytics tracking
 */

interface WindowWithGtag extends Window {
  gtag?: (...args: any[]) => void;
  dataLayer?: any[];
}

declare const window: WindowWithGtag;

export const useAnalytics = () => {
  const trackPageView = (path: string) => {
    try {
      if (typeof window !== 'undefined' && window.gtag) {
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
      if (typeof window !== 'undefined' && window.gtag) {
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