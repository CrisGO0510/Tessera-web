import { describe, expect, it } from 'vitest';
import { breadcrumbList, faqPage, organization, serializeJsonLd, website } from '@/lib/schema';

describe('organization', () => {
  it('incluye el punto de contacto con teléfono y correo', () => {
    const org = organization({
      name: 'Tessera',
      url: 'https://tessera.co',
      email: 'hola@tessera.co',
      phone: '573001234567',
      description: 'Sillas ergonómicas',
      logo: 'https://tessera.co/logo.png',
    });
    expect(org).toMatchObject({
      '@type': 'Organization',
      '@id': 'https://tessera.co/#organizacion',
      logo: 'https://tessera.co/logo.png',
      contactPoint: { '@type': 'ContactPoint', telephone: '+573001234567', email: 'hola@tessera.co' },
    });
  });
});

describe('website', () => {
  it('declara el idioma', () => {
    expect(website('Tessera', 'https://tessera.co', 'es-CO')).toMatchObject({ '@type': 'WebSite', inLanguage: 'es-CO' });
  });

  it('enlaza la organización como editora por su @id', () => {
    expect(website('Tessera', 'https://tessera.co', 'es-CO')).toMatchObject({
      '@id': 'https://tessera.co/#sitio',
      publisher: { '@id': 'https://tessera.co/#organizacion' },
    });
  });
});

describe('serializeJsonLd', () => {
  it('escapa < para no cerrar el script', () => {
    const json = serializeJsonLd({ '@type': 'Thing', name: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json)).toMatchObject({ name: '</script><script>alert(1)</script>' });
  });
});

describe('breadcrumbList', () => {
  it('numera las posiciones desde 1', () => {
    expect(
      breadcrumbList([
        { name: 'Inicio', url: 'https://tessera.co/sillas-ergonomicas' },
        { name: 'Sillas', url: 'https://tessera.co/catalogo' },
      ]),
    ).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio' },
        { '@type': 'ListItem', position: 2, name: 'Sillas', item: 'https://tessera.co/catalogo' },
      ],
    });
  });
});

describe('faqPage', () => {
  it('convierte cada FAQ en Question con su Answer', () => {
    expect(faqPage([{ question: '¿Llega armada?', answer: 'Sí.' }])).toMatchObject({
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: '¿Llega armada?', acceptedAnswer: { '@type': 'Answer', text: 'Sí.' } }],
    });
  });
});
