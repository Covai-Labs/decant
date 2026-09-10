export const SITE = {
  name: 'Decant',
  url: 'https://decant.covai.org',
  github: 'https://github.com/Covai-Labs/decant',
  chromeStore: '#',
  firefoxAddons: '#',
};

export function softwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    operatingSystem: 'Chrome, Firefox, Edge',
    applicationCategory: 'UtilitiesApplication',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: SITE.url,
    downloadUrl: SITE.github,
  };
}
