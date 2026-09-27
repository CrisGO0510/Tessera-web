import type { BreadcrumbList, FAQPage, Organization, Thing, WebSite, WithContext } from 'schema-dts';

export interface OrganizationData {
  readonly name: string;
  readonly url: string;
  readonly email: string;
  /** Solo dígitos con indicativo. */
  readonly phone: string;
  readonly description: string;
  /** URL absoluta del logo. */
  readonly logo: string;
}

/** `@id` estables: enlazan Organization y WebSite entre sí en todas las páginas. */
export function organizationId(url: string): string {
  return `${url}/#organizacion`;
}

export function websiteId(url: string): string {
  return `${url}/#sitio`;
}

export function organization(data: OrganizationData): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(data.url),
    name: data.name,
    url: data.url,
    logo: data.logo,
    description: data.description,
    email: data.email,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: `+${data.phone}`,
      email: data.email,
    },
  };
}

export function website(name: string, url: string, language: string): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(url),
    name,
    url,
    inLanguage: language,
    publisher: { '@id': organizationId(url) },
  };
}

/** JSON para <script type="application/ld+json">: escapa `<` para que el texto no pueda cerrar la etiqueta. */
export function serializeJsonLd(data: Thing | readonly Thing[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export interface BreadcrumbItem {
  readonly name: string;
  /** URL absoluta. */
  readonly url: string;
}

export function breadcrumbList(items: readonly BreadcrumbItem[]): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqPage(faqs: readonly { readonly question: string; readonly answer: string }[]): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
