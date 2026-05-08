// src/lib/seo.ts
// ─────────────────────────────────────────────
// Reusable SEO, Metadata, and JSON-LD Schema helper.
// ─────────────────────────────────────────────

import { Metadata } from 'next';

export interface LocalSEOProps {
  city: string;
  title: string;
  description: string;
  keywords: string[];
  address: string;
  locality: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  faqs: { question: string; answer: string }[];
}

export function generateLocalMetadata(props: LocalSEOProps): Metadata {
  return {
    title: props.title,
    description: props.description,
    keywords: props.keywords.join(', '),
    alternates: {
      canonical: `https://khanhub.com.pk/${props.city.toLowerCase()}`,
    },
    openGraph: {
      type: 'website',
      locale: 'en_PK',
      url: `https://khanhub.com.pk/${props.city.toLowerCase()}`,
      siteName: 'Khan Hub',
      title: props.title,
      description: props.description,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: `Khan Hub ${props.city} - Pakistan's Leading Welfare Organization`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: props.title,
      description: props.description,
      images: ['/twitter-image.jpg'],
    },
  };
}

export function generateLocalSchema(props: LocalSEOProps) {
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    '@id': `https://khanhub.com.pk/${props.city.toLowerCase()}#localbusiness`,
    'name': `Khan Hub Medical Center & Welfare Hub - ${props.city}`,
    'description': props.description,
    'url': `https://khanhub.com.pk/${props.city.toLowerCase()}`,
    'telephone': '0300-6395220',
    'priceRange': '$$',
    'image': 'https://khanhub.com.pk/og-image.jpg',
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': props.address,
      'addressLocality': props.locality,
      'addressRegion': 'Punjab',
      'postalCode': props.postalCode,
      'addressCountry': 'PK',
    },
    'geo': {
      '@type': 'GeoCoordinates',
      'latitude': props.latitude,
      'longitude': props.longitude,
    },
    'openingHoursSpecification': {
      '@type': 'OpeningHoursSpecification',
      'dayOfWeek': [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      'opens': '00:00',
      'closes': '23:59',
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': props.faqs.map((faq) => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer,
      },
    })),
  };

  return {
    __html: JSON.stringify({
      '@graph': [localBusinessSchema, faqSchema],
    }),
  };
}
