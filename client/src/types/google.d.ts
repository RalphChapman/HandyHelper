declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google.maps {
  export type Libraries = Array<'drawing' | 'geometry' | 'localContext' | 'places' | 'visualization'>;
}

export {};