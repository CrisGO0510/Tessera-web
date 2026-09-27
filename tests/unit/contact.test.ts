import { describe, expect, it } from 'vitest';
import { mailtoUrl, messageWithModels, whatsAppUrl } from '@/lib/contact';

describe('whatsAppUrl', () => {
  it('arma la URL de wa.me con el mensaje codificado', () => {
    expect(whatsAppUrl('573001234567', 'Hola, ¿me ayudas?')).toBe(
      'https://wa.me/573001234567?text=Hola%2C%20%C2%BFme%20ayudas%3F',
    );
  });

  it('rechaza números con signos o espacios', () => {
    expect(() => whatsAppUrl('+57 300 123 4567', 'x')).toThrow(/inválido/);
  });
});

describe('mailtoUrl', () => {
  it('sin asunto', () => {
    expect(mailtoUrl('hola@tessera.co')).toBe('mailto:hola@tessera.co');
  });

  it('con asunto codificado', () => {
    expect(mailtoUrl('hola@tessera.co', 'Ventas a empresa')).toBe('mailto:hola@tessera.co?subject=Ventas%20a%20empresa');
  });

  it('rechaza correos mal formados', () => {
    expect(() => mailtoUrl('hola@')).toThrow(/inválido/);
  });
});

describe('messageWithModels', () => {
  it('nombra los modelos como alternativa', () => {
    expect(messageWithModels('Estoy entre {models}.', ['Duna', 'Vega', 'Ígnea'], 'es-MX')).toBe('Estoy entre Duna, Vega o Ígnea.');
  });

  it('sin modelos usa una frase genérica', () => {
    expect(messageWithModels('Estoy entre {models}.', [], 'es-MX')).toBe('Estoy entre varios modelos.');
  });

  it('deja intacta una plantilla sin marca', () => {
    expect(messageWithModels('Hola.', ['Duna'], 'es-MX')).toBe('Hola.');
  });
});
