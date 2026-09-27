export type WhatsAppContext = 'categoryBar' | 'delivery' | 'comparison';

const MODELS_PLACEHOLDER = '{models}';

/**
 * Rellena `{models}` en la plantilla de un mensaje de WhatsApp con los modelos que la
 * página ya conoce («Tessera Duna, Tessera Mora Pro o Tessera Ígnea»): así el asesor no
 * tiene que preguntar lo que el cliente estaba mirando. Sin modelos, frase genérica.
 */
export function messageWithModels(template: string, models: readonly string[], locale: string): string {
  const text = models.length > 0 ? new Intl.ListFormat(locale, { type: 'disjunction' }).format(models) : 'varios modelos';
  return template.replaceAll(MODELS_PLACEHOLDER, text);
}

/** Número en formato internacional sin signos: solo dígitos, con indicativo de país. */
export function whatsAppUrl(phone: string, message: string): string {
  if (!/^\d{10,15}$/.test(phone)) {
    throw new Error(`Número de WhatsApp inválido: "${phone}". Usa solo dígitos con indicativo, p. ej. 573001234567.`);
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function mailtoUrl(email: string, subject?: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`Correo inválido: "${email}".`);
  }
  return subject === undefined ? `mailto:${email}` : `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
