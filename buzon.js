// Buzón de la portada (paso 28d): manda el mensaje a la Edge Function `web-feedback`, que comprueba
// el «no soy un robot» de Cloudflare Turnstile y lo envía por correo a hola@tutelia.app.
(function () {
  var config = window.CUIDAPP || {};
  var form = document.getElementById('form-buzon');
  if (!form) return;
  var button = form.querySelector('button[type="submit"]');
  var status = document.getElementById('buzon-estado');
  var widget = null;

  var errors = {
    invalid_message: 'Escribe tu mensaje (como mucho 2.000 caracteres).',
    invalid_email: 'Revisa el correo: parece que no está bien escrito.',
    captcha_failed: 'No hemos podido comprobar que no eres un robot. Vuelve a intentarlo.',
    rate_limited: 'Has enviado varios mensajes seguidos. Espera un minuto y vuelve a intentarlo.',
  };
  var generic = 'No se ha podido enviar. Inténtalo más tarde o escríbenos a hola@tutelia.app.';

  function show(text, ok) {
    status.textContent = text;
    status.className = 'mensaje ' + (ok ? 'ok' : 'error');
    status.hidden = false;
  }

  if (!config.turnstileSiteKey) {
    button.disabled = true;
    show('El buzón estará disponible muy pronto. Mientras, escríbenos a hola@tutelia.app.', false);
    return;
  }

  // Lo llama el script de Turnstile al cargar (parámetro onload de su URL).
  window.tuteliaTurnstile = function () {
    widget = window.turnstile.render('#buzon-robot', {
      sitekey: config.turnstileSiteKey,
      language: 'es',
      theme: 'auto',
    });
  };
  // El script de Cloudflare solo se carga si el buzón está configurado.
  var script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=tuteliaTurnstile';
  script.async = true;
  document.head.appendChild(script);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    status.hidden = true;
    var token = widget !== null && window.turnstile ? window.turnstile.getResponse(widget) : '';
    if (!token) {
      show('Espera a que termine la comprobación de que no eres un robot (o marca la casilla) y vuelve a enviar.', false);
      return;
    }
    button.disabled = true;
    fetch(config.supabaseUrl + '/functions/v1/web-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: form.elements.message.value,
        email: form.elements.email.value,
        website: form.elements.website.value,
        token: token,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) {
          form.reset();
          show('¡Gracias! Hemos recibido tu mensaje y lo leeremos con calma.', true);
        } else {
          show(errors[result.data && result.data.error] || generic, false);
        }
      })
      .catch(function () {
        show(generic, false);
      })
      .then(function () {
        button.disabled = false;
        if (window.turnstile && widget !== null) window.turnstile.reset(widget);
      });
  });
})();
