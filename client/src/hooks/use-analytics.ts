/**
 * Custom hook for Google Analytics tracking
 */
export const useAnalytics = () => {
  const trackPageView = (path: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: path,
      });
    }
  };

  const trackEvent = (eventName: string, eventParams: Record<string, any> = {}) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, eventParams);
    }
  };

  return {
    trackPageView,
    trackEvent,
  };
};
