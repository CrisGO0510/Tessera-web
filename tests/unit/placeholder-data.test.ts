import { describe, expect, it } from 'vitest';
import { placeholderData } from '@/lib/validation';

const realData = { url: 'https://tessera.com.mx', contact: { whatsapp: '525512345678', email: 'hola@tessera.com.mx' } };

describe('placeholderData', () => {
  it('sin problemas con datos reales', () => {
    expect(placeholderData(realData)).toEqual([]);
  });

  it('detecta dominio, correo y WhatsApp de relleno', () => {
    expect(placeholderData({ url: 'https://tessera.example', contact: { whatsapp: '525500000000', email: 'hola@tessera.example' } })).toHaveLength(3);
  });
});
