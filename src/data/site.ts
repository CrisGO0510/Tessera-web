import { mailtoUrl, type WhatsAppContext } from '@/lib/contact';

export interface Link {
  readonly text: string;
  readonly href: string;
}

export interface FooterColumn {
  readonly title: string;
  readonly links: readonly Link[];
}

export type Locale = 'es-CO' | 'es-MX';

interface Site {
  readonly name: string;
  /** Origen del sitio, sin barra final. */
  readonly url: string;
  readonly tagline: string;
  readonly market: { readonly locale: Locale; readonly country: 'CO' | 'MX' };
  readonly contact: { readonly whatsapp: string; readonly email: string };
  readonly deliveryHours: number;
  /** Segunda frase de la barra legal del footer. */
  readonly shippingText: string;
  readonly heroAutoplay: boolean;
  /** Nota junto a cada CTA de WhatsApp («responde en 3 min»): es una promesa comercial, la confirma el cliente. */
  readonly whatsAppNote: string;
  readonly whatsAppMessages: Readonly<Record<WhatsAppContext, string>>;
  readonly nav: readonly Link[];
  readonly businessLink: Link;
  readonly footer: readonly FooterColumn[];
}

// PENDIENTE (spec §12 #1): url, contact y market se sustituyen por los reales antes de H3.
const email = 'hola@tessera.example';

export const site = {
  name: 'Tessera',
  url: 'https://tessera.example',
  tagline: 'Sillas ergonómicas calibradas a la persona que las usa.',
  market: { locale: 'es-MX', country: 'MX' },
  contact: { whatsapp: '525500000000', email },
  deliveryHours: 48,
  shippingText: 'Envíos a todo México · 48 h en zona metropolitana',
  heroAutoplay: true,
  whatsAppNote: 'responde en 3 min',
  whatsAppMessages: {
    categoryBar: 'Hola, quiero que me ayuden a elegir una silla Tessera.',
    delivery: 'Hola, quiero cotizar una silla Tessera. Mi estatura es … y me siento … horas al día.',
    // `{models}` lo rellena la página con los modelos que se están comparando.
    comparison: 'Hola, estoy entre {models} y quiero que me ayuden a decidir.',
  },
  nav: [
    { text: 'Sillas', href: '/catalogo' },
    { text: 'Cómo se ajusta', href: '/sillas-ergonomicas#anatomia' },
    { text: 'Comparar', href: '/comparar' },
    { text: 'Guías', href: '/catalogo#cat-guia' },
  ],
  businessLink: { text: 'Empresas', href: mailtoUrl(email, 'Ventas a empresa') },
  footer: [
    {
      title: 'Decide',
      links: [
        { text: 'Comparador de sillas', href: '/comparar' },
        { text: 'Cómo elegir tu silla', href: '/catalogo#cat-guia' },
        { text: 'Guía de ajustes', href: '/sillas-ergonomicas#anatomia' },
        { text: 'Medidas y estatura', href: '/catalogo#cat-guia' },
      ],
    },
    {
      title: 'Tessera',
      links: [
        { text: 'Ventas a empresa', href: mailtoUrl(email, 'Ventas a empresa') },
        { text: 'Entrega e instalación', href: '/sillas-ergonomicas#entrega' },
        { text: 'Garantía y devoluciones', href: '/sillas-ergonomicas#faq' },
        { text: 'Contacto', href: mailtoUrl(email) },
      ],
    },
  ],
} as const satisfies Site;
