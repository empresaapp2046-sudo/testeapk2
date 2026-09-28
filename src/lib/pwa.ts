/**
 * Registro do modo offline (service worker).
 * Nunca registra em desenvolvimento nem no preview do Lovable, mas registra
 * normalmente no app publicado, em domínio próprio e no uso local (localhost),
 * para que o sistema abra sem internet.
 */
function isPreviewHost(host: string) {
  return (
    host.startsWith('id-preview--') ||
    host.startsWith('preview--') ||
    host === 'lovableproject.com' ||
    host.endsWith('.lovableproject.com') ||
    host === 'lovableproject-dev.com' ||
    host.endsWith('.lovableproject-dev.com') ||
    host === 'beta.lovable.dev' ||
    host.endsWith('.beta.lovable.dev')
  );
}

async function unregisterAppWorkers() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((r) => (r.active?.scriptURL || r.installing?.scriptURL || '').includes('/sw.js'))
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignora */
  }
}

export function registerOfflineSupport() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  const host = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const refused =
    !import.meta.env.PROD ||
    window.self !== window.top ||
    isPreviewHost(host) ||
    params.get('sw') === 'off';

  if (refused) {
    void unregisterAppWorkers();
    return;
  }

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      // Garante que quem já instalou o aplicativo receba a cópia offline mais
      // recente, sem depender de fechar e abrir várias vezes.
      await registration.update();
    } catch (error) {
      console.warn('Modo offline indisponível:', error);
    }
  };

  // React pode executar este efeito depois do evento "load". Nesse caso,
  // esperar novamente por esse evento impediria o registro para sempre.
  if (document.readyState === 'complete') {
    void register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
}
