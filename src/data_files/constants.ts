import ogImageSrc from '@images/social.png';

export const SITE = {
  title: 'Qianxi Packaging',
  tagline: 'Custom Corrugated Boxes Manufacturer in China',
  description:
    'Chengdu Qianxi Packaging Materials Co., Ltd. — Custom corrugated box manufacturer in China. 3-ply, 5-ply and 7-ply boxes with custom sizes and printed packaging.',
  description_short:
    'Custom corrugated boxes manufactured in Chengdu, China — 3-ply, 5-ply and 7-ply, custom sizes and printing.',
  url: 'https://qianxipack.com',
  author: 'Whereby',
};

export const COMPANY = {
  name: 'Chengdu Qianxi Packaging Materials Co., Ltd.',
  nameZh: '成都芊西包装材料有限公司',
  address: {
    en: 'Building 22, No. 301 Lianhua Road, Baiguo Street, Jintang County, Chengdu, Sichuan, China',
    zh: '四川省成都市金堂县白果街道莲花路301号淮州智造新谷22栋1层',
  },
  email: 'wmz85474491@gmail.com',
  whatsapp: '+852 5284 7430',
  coordinates: {
    lat: 30.6822917,
    lng: 104.5567195,
    dms: {
      lat: "30°40'56.2501\"N",
      lng: "104°33'24.1903\"E",
    },
  },
};

export const SEO = {
  title: SITE.title,
  description: SITE.description,
  structuredData: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: COMPANY.name,
    url: SITE.url,
    description: SITE.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Building 22, No. 301 Lianhua Road, Baiguo Street, Huaizhou Zhizao Xingu',
      addressLocality: 'Jintang County, Chengdu',
      addressRegion: 'Sichuan',
      addressCountry: 'CN',
      postalCode: '610400',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: COMPANY.email,
      contactType: 'sales',
    },
  },
};

export const OG = {
  locale: 'en_US',
  type: 'website',
  url: SITE.url,
  title: `${SITE.title} — Factory Direct Corrugated Box Manufacturer`,
  description:
    'Custom corrugated boxes from Chengdu Qianxi Packaging. 3-ply, 5-ply and 7-ply boxes with custom sizes and printing.',
  image: ogImageSrc,
};

export const partnersData: Array<{
  icon: string;
  name: string;
  href: string;
}> = [];
