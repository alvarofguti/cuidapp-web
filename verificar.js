// Comprobar un «Registro de cuidados» (paso 53) con la Edge Function `verify-record`.
(function () {
  var config = window.CUIDAPP || {};
  var form = document.getElementById('comprobar');
  var input = document.getElementById('codigo');
  var out = document.getElementById('resultado');
  var button = form.querySelector('button');
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  function day(iso) {
    var p = String(iso).slice(0, 10).split('-');
    return Number(p[2]) + ' de ' + MONTHS[Number(p[1]) - 1] + ' de ' + p[0];
  }
  function hours(minutes) {
    if (minutes < 60) return minutes + ' min';
    return (Math.round((minutes / 60) * 10) / 10).toLocaleString('es-ES') + ' h';
  }
  function show(text, ok) {
    out.textContent = text;
    out.className = 'mensaje ' + (ok ? 'ok' : 'error');
    out.hidden = false;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var code = input.value.replace(/[\s-]/g, '').toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(code)) {
      show('El código tiene 10 letras y números. Revísalo.', false);
      input.focus();
      return;
    }
    button.disabled = true;
    fetch(config.supabaseUrl + '/functions/v1/verify-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code }),
    })
      .then(function (res) {
        return res.json().then(function (body) { return { status: res.status, body: body }; });
      })
      .then(function (r) {
        if (r.status === 200) {
          var b = r.body;
          show(
            'Registro auténtico. Lo hizo ' + (b.holder || 'una persona sin nombre en su perfil') + ' el ' + day(b.issued_at) +
              ' y resume del ' + day(b.from) + ' al ' + day(b.to) + ': ' + b.shifts + (b.shifts === 1 ? ' turno' : ' turnos') +
              ', ' + hours(b.minutes) + '. Si el PDF dice otra cosa, se ha cambiado.',
            true,
          );
        } else if (r.status === 404) {
          show('No hay ningún registro con ese código. Revisa que esté bien escrito.', false);
        } else if (r.status === 429) {
          show('Demasiadas comprobaciones seguidas. Espera un minuto y vuelve a probar.', false);
        } else {
          show('No se ha podido comprobar ahora. Inténtalo más tarde.', false);
        }
      })
      .catch(function () {
        show('No se ha podido comprobar ahora. Revisa la conexión e inténtalo de nuevo.', false);
      })
      .then(function () {
        button.disabled = false;
      });
  });
})();
