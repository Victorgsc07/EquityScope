const API_BASE = 'http://localhost:5000';

let chartInstance = null;
let prediccionChartInstance = null;
let accionesDisponibles = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const analyticsQueries = [
  { title: 'Resumen general', desc: 'Totales y rango de fechas', path: '/api/analiticas/resumen' },
  { title: 'Mayor subida', desc: 'Mejor rendimiento', path: '/api/analiticas/mayor-subida' },
  { title: 'Top mayores subidas', desc: 'Ranking positivo', path: '/api/analiticas/top-mayores-subidas', limit: true },
  { title: 'Mayor caída', desc: 'Peor rendimiento', path: '/api/analiticas/mayor-caida' },
  { title: 'Top mayores caídas', desc: 'Ranking negativo', path: '/api/analiticas/top-mayores-caidas', limit: true },
  { title: 'Mayor variación', desc: 'Rango máximo/mínimo', path: '/api/analiticas/mayor-variacion' },
  { title: 'Más volátiles', desc: 'Volatilidad diaria', path: '/api/analiticas/acciones-mas-volatiles', limit: true },
  { title: 'Más estables', desc: 'Menor volatilidad', path: '/api/analiticas/acciones-mas-estables', limit: true },
  { title: 'Mayor precio histórico', desc: 'Máximo registrado', path: '/api/analiticas/mayor-precio-historico' },
  { title: 'Más cara actual', desc: 'Último cierre alto', path: '/api/analiticas/accion-mas-cara-actual' },
  { title: 'Más barata actual', desc: 'Último cierre bajo', path: '/api/analiticas/accion-mas-barata-actual' },
  { title: 'Mayor volumen', desc: 'Volumen acumulado', path: '/api/analiticas/mayor-volumen' },
  { title: 'Promedio por empresa', desc: 'Cierre promedio', path: '/api/analiticas/promedio-precio-por-empresa' },
  { title: 'Rendimiento sector', desc: 'Promedio por sector', path: '/api/analiticas/rendimiento-por-sector' },
  { title: 'Rendimiento mercado', desc: 'Promedio por mercado', path: '/api/analiticas/rendimiento-por-mercado' },
];

function fullUrl(path) {
  return `${API_BASE}${path}`;
}

async function api(path, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response = await fetch(fullUrl(path), {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      ...options,
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const message = data?.message || data?.error || `Error HTTP ${response.status}`;
      throw new Error(message);
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`La petición tardó demasiado: ${path}`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function toast(message, type = 'ok') {
  const el = $('#toast');
  if (!el) return;

  el.textContent = message;
  el.className = `toast show ${type === 'error' ? 'error' : ''}`;

  setTimeout(() => {
    el.className = 'toast';
  }, 3000);
}

function formatValue(value) {
  if (value === null || value === undefined) return '-';

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString('es-MX')
      : value.toLocaleString('es-MX', { maximumFractionDigits: 2 });
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return value.slice(0, 10);
  }

  return String(value);
}

function normalizeRows(data) {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

function setStatus(text, ok = false, error = false) {
  const el = $('#apiStatus');
  if (!el) return;

  el.textContent = text;
  el.className = error ? 'status-dot error' : ok ? 'status-dot ok' : 'status-dot';
}

function setLastUpdate() {
  const el = $('#lastUpdate');
  if (!el) return;

  el.textContent = `Última actualización: ${new Date().toLocaleString('es-MX')}`;
}

function renderTable(containerSelector, data, options = {}) {
  const container = $(containerSelector);
  if (!container) return;

  const rows = normalizeRows(data);

  if (!rows.length) {
    container.className = 'table-wrap empty';
    container.textContent = 'No se encontraron datos.';
    return;
  }

  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))];

  container.className = 'table-wrap';

  const actionsHeader = options.actions ? '<th>Acciones</th>' : '';
  const head = keys.map(key => `<th>${key}</th>`).join('') + actionsHeader;

  const body = rows.map((row, index) => {
    const cells = keys.map(key => `<td>${formatValue(row[key])}</td>`).join('');

    const actionsCell = options.actions
      ? `<td><div class="table-actions">${options.actions(row, index)}</div></td>`
      : '';

    return `<tr>${cells}${actionsCell}</tr>`;
  }).join('');

  container.innerHTML = `
    <table>
      <thead>
        <tr>${head}</tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>
  `;
}

function renderCards(summary) {
  const container = $('#summaryCards');
  if (!container) return;

  const cards = [
    {
      label: 'Empresas',
      value: summary?.total_empresas ?? 0,
      hint: 'Registradas en la base',
    },
    {
      label: 'Registros de precios',
      value: summary?.total_registros_precios ?? 0,
      hint: 'Datos históricos',
    },
    {
      label: 'Sectores',
      value: summary?.total_sectores ?? 0,
      hint: 'Clasificación económica',
    },
    {
      label: 'Mercados',
      value: summary?.total_mercados ?? 0,
      hint: 'Bolsas disponibles',
    },
  ];

  container.innerHTML = cards.map(card => `
    <article class="card">
      <div class="label">${card.label}</div>
      <div class="value">${formatValue(card.value)}</div>
      <div class="hint">${card.hint}</div>
    </article>
  `).join('');
}

function renderChart(rows) {
  const canvas = $('#topChart');

  if (!canvas || typeof Chart === 'undefined') {
    return;
  }

  const cleanRows = normalizeRows(rows);

  const labels = cleanRows.map(row => row.ticker || row.nombre || 'N/A');

  const values = cleanRows.map(row => {
    return Number(
      row.cambio_porcentual ??
      row.subida_porcentual ??
      row.rendimiento_porcentual ??
      row.variacion_porcentual ??
      0
    );
  });

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Cambio %',
          data: values,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#111827',
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#64748b',
          },
          grid: {
            color: '#e2e8f0',
          },
        },
        y: {
          ticks: {
            color: '#64748b',
          },
          grid: {
            color: '#e2e8f0',
          },
        },
      },
    },
  });
}

function renderAcciones(rows) {
  const container = $('#accionesGrid');
  if (!container) return;

  const search = ($('#accionesSearchInput')?.value || '').trim().toLowerCase();

  const filtered = normalizeRows(rows).filter(row => {
    if (!search) return true;

    return [
      row.ticker,
      row.nombre,
      row.nombre_sector,
      row.sector,
      row.nombre_mercado,
      row.mercado,
      row.pais,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search);
  });

  if (!filtered.length) {
    container.className = 'acciones-grid empty';
    container.textContent = search
      ? 'No hay acciones que coincidan con el filtro.'
      : 'No se encontraron acciones disponibles.';
    return;
  }

  container.className = 'acciones-grid';

  container.innerHTML = filtered.map(row => `
    <article class="accion-card">
      <div class="accion-top">
        <span class="accion-ticker">${formatValue(row.ticker)}</span>
        <span class="accion-id">ID ${formatValue(row.id_empresa)}</span>
      </div>

      <div class="accion-nombre">${formatValue(row.nombre)}</div>

      <div class="accion-meta">
        ${formatValue(row.nombre_sector || row.sector || 'Sector no indicado')}<br>
        ${formatValue(row.nombre_mercado || row.mercado || 'Mercado no indicado')} · ${formatValue(row.pais)}
      </div>

      <button class="secondary" onclick="consultarHistorialAccion('${String(row.ticker).replace(/'/g, '')}')">
        Ver historial
      </button>
    </article>
  `).join('');
}

function llenarSelectPredicciones(rows) {
  const select = $('#prediccionTickerSelect');
  if (!select) return;

  const tickers = normalizeRows(rows);

  if (!tickers.length) {
    select.innerHTML = '<option value="">No hay tickers disponibles</option>';
    return;
  }

  select.innerHTML = `
    <option value="">Selecciona una acción</option>
    ${tickers.map(row => `
      <option value="${formatValue(row.ticker)}">
        ${formatValue(row.ticker)} — ${formatValue(row.nombre)}
      </option>
    `).join('')}
  `;
}

async function cargarTickersPrediccion() {
  try {
    const tickers = await api('/api/predicciones/tickers');
    llenarSelectPredicciones(tickers);
  } catch (error) {
    console.warn(error);

    if (accionesDisponibles.length) {
      llenarSelectPredicciones(accionesDisponibles);
      return;
    }

    const select = $('#prediccionTickerSelect');

    if (select) {
      select.innerHTML = '<option value="">Error al cargar tickers</option>';
    }
  }
}

async function checkApi() {
  setStatus('● Conectando...', false, false);

  try {
    await api('/');
    setStatus('● Backend conectado', true, false);
    return true;
  } catch (error) {
    setStatus('● Backend sin conexión', false, true);
    toast(error.message, 'error');
    return false;
  }
}

async function loadResumen() {
  try {
    const summary = await api('/api/analiticas/resumen');
    renderCards(summary);
    setLastUpdate();
  } catch (error) {
    console.error(error);
    toast(`Error en resumen: ${error.message}`, 'error');
  }
}

async function loadGrafica() {
  try {
    const top = await api('/api/analiticas/top-mayores-subidas?limit=5');
    renderChart(top);
  } catch (error) {
    console.error(error);
    toast(`Error en gráfica: ${error.message}`, 'error');
  }
}

async function loadAcciones() {
  try {
    accionesDisponibles = await api('/api/empresas');
    renderAcciones(accionesDisponibles);
  } catch (error) {
    console.error(error);

    const container = $('#accionesGrid');

    if (container) {
      container.className = 'acciones-grid empty';
      container.textContent = `Error al cargar acciones: ${error.message}`;
    }

    toast(`Error en acciones: ${error.message}`, 'error');
  }
}

async function loadDashboard() {
  const connected = await checkApi();

  if (!connected) {
    return;
  }

  await Promise.allSettled([
    loadResumen(),
    loadGrafica(),
    loadAcciones(),
    cargarTickersPrediccion(),
  ]);
}

window.consultarHistorialAccion = async (ticker) => {
  location.hash = '#individuales';

  const title = $('#individualTitle');
  const result = $('#individualResult');

  if (title) title.textContent = `Historial ${ticker}`;

  if (result) {
    result.className = 'table-wrap empty';
    result.textContent = 'Cargando historial...';
  }

  try {
    const data = await api(`/api/analiticas/historial/${ticker}`);
    renderTable('#individualResult', data);
  } catch (error) {
    if (result) {
      result.className = 'table-wrap empty';
      result.textContent = error.message;
    }

    toast(error.message, 'error');
  }
};

function buildAnalyticsButtons() {
  const container = $('#analyticsButtons');
  if (!container) return;

  container.innerHTML = analyticsQueries.map((query, index) => `
    <button class="query-btn" data-index="${index}">
      ${query.title}
      <span>${query.desc}</span>
    </button>
  `).join('');

  $$('.query-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const query = analyticsQueries[Number(button.dataset.index)];

      let path = query.path;

      if (query.limit) {
        const limit = $('#limitInput')?.value || 5;
        path += `?limit=${limit}`;
      }

      const title = $('#analyticsTitle');
      const result = $('#analyticsResult');

      if (title) title.textContent = query.title;

      if (result) {
        result.className = 'table-wrap empty';
        result.textContent = 'Cargando...';
      }

      try {
        const data = await api(path);
        renderTable('#analyticsResult', data);
      } catch (error) {
        if (result) {
          result.className = 'table-wrap empty';
          result.textContent = error.message;
        }

        toast(error.message, 'error');
      }
    });
  });
}

async function quickSearch() {
  const input = $('#quickSearchInput');
  const resultsContainer = $('#quickSearchResults');

  if (!input || !resultsContainer) return;

  const text = input.value.trim();

  if (!text) {
    toast('Escribe algo para buscar.', 'error');
    return;
  }

  try {
    const results = await api(`/api/analiticas/buscar?texto=${encodeURIComponent(text)}`);

    const rows = normalizeRows(results);

    if (!rows.length) {
      resultsContainer.innerHTML = '<div class="result-pill">Sin resultados.</div>';
      return;
    }

    resultsContainer.innerHTML = rows.map(row => `
      <div class="result-pill">
        <strong>${formatValue(row.ticker)} — ${formatValue(row.nombre)}</strong>
        <span>${formatValue(row.nombre_sector || '')} · ${formatValue(row.nombre_mercado || '')} · ${formatValue(row.pais || '')}</span>
      </div>
    `).join('');
  } catch (error) {
    resultsContainer.innerHTML = `<div class="result-pill">${error.message}</div>`;
    toast(error.message, 'error');
  }
}

function claseTendencia(tendencia) {
  const t = String(tendencia || '').toLowerCase();

  if (t.includes('alcista')) return 'trend-alcista';
  if (t.includes('bajista')) return 'trend-bajista';
  if (t.includes('mixta')) return 'trend-mixta';

  return 'trend-estable';
}

function renderPrediccionCards(data) {
  const container = $('#prediccionCards');
  if (!container) return;

  const promedio = data.promedio_movil || {};
  const regresion = data.regresion_lineal || {};

  container.innerHTML = `
    <article class="prediction-card">
      <div class="label">Ticker</div>
      <div class="value">${formatValue(data.ticker)}</div>
      <div class="hint">${formatValue(data.nombre)}</div>
    </article>

    <article class="prediction-card">
      <div class="label">Último cierre</div>
      <div class="value">$${formatValue(data.ultimo_precio_cierre)}</div>
      <div class="hint">${formatValue(data.fecha_ultimo_registro)}</div>
    </article>

    <article class="prediction-card">
      <div class="label">Precio estimado</div>
      <div class="value">$${formatValue(regresion.precio_estimado)}</div>
      <div class="hint">${formatValue(regresion.dias_a_predecir)} días</div>
    </article>

    <article class="prediction-card">
      <div class="label">Conclusión</div>
      <div class="value ${claseTendencia(data.conclusion_general)}">${formatValue(data.conclusion_general)}</div>
      <div class="hint">${formatValue(regresion.cambio_porcentual_estimado)}%</div>
    </article>

    <article class="prediction-card">
      <div class="label">Promedio móvil corto</div>
      <div class="value">$${formatValue(promedio.promedio_corto)}</div>
      <div class="hint">${formatValue(promedio.dias_corto)} días</div>
    </article>

    <article class="prediction-card">
      <div class="label">Promedio móvil largo</div>
      <div class="value">$${formatValue(promedio.promedio_largo)}</div>
      <div class="hint">${formatValue(promedio.dias_largo)} días</div>
    </article>

    <article class="prediction-card">
      <div class="label">Tendencia promedio móvil</div>
      <div class="value ${claseTendencia(promedio.tendencia)}">${formatValue(promedio.tendencia)}</div>
      <div class="hint">${formatValue(promedio.diferencia_porcentual)}%</div>
    </article>

    <article class="prediction-card">
      <div class="label">Tendencia regresión</div>
      <div class="value ${claseTendencia(regresion.tendencia)}">${formatValue(regresion.tendencia)}</div>
      <div class="hint">${formatValue(regresion.cambio_estimado)}</div>
    </article>
  `;
}

function renderPrediccionChart(regresionData, ultimoPrecio) {
  const canvas = $('#prediccionChart');

  if (!canvas || typeof Chart === 'undefined') return;

  const predicciones = normalizeRows(regresionData.predicciones_por_dia || []);

  const labels = ['Actual', ...predicciones.map(p => `Día ${p.dia}`)];
  const values = [
    Number(ultimoPrecio),
    ...predicciones.map(p => Number(p.precio_estimado))
  ];

  if (prediccionChartInstance) {
    prediccionChartInstance.destroy();
  }

  prediccionChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `Predicción ${regresionData.ticker}`,
          data: values,
          tension: 0.35,
          fill: false,
          borderWidth: 2,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#111827',
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#64748b',
          },
          grid: {
            color: '#e2e8f0',
          },
        },
        y: {
          ticks: {
            color: '#64748b',
          },
          grid: {
            color: '#e2e8f0',
          },
        },
      },
    },
  });
}

async function calcularPrediccion(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  const ticker = String(formData.get('ticker')).trim().toUpperCase();
  const dias = Number(formData.get('dias')) || 7;
  const historial = Number(formData.get('historial')) || 90;
  const corto = Number(formData.get('corto')) || 7;
  const largo = Number(formData.get('largo')) || 30;

  if (!ticker) {
    toast('Selecciona un ticker.', 'error');
    return;
  }

  const cards = $('#prediccionCards');
  const result = $('#prediccionResult');

  if (cards) {
    cards.innerHTML = `
      <article class="prediction-empty">
        Calculando predicción para ${ticker}...
      </article>
    `;
  }

  if (result) {
    result.className = 'table-wrap empty';
    result.textContent = 'Cargando detalle de predicción...';
  }

  try {
    const completaPath = `/api/predicciones/completa/${ticker}?dias=${dias}&historial=${historial}&corto=${corto}&largo=${largo}`;
    const regresionPath = `/api/predicciones/regresion-lineal/${ticker}?dias=${dias}&historial=${historial}`;

    const [completa, regresion] = await Promise.all([
      api(completaPath),
      api(regresionPath),
    ]);

    renderPrediccionCards(completa);
    renderPrediccionChart(regresion, completa.ultimo_precio_cierre);

    const detalle = [
      {
        metodo: 'Promedio móvil',
        ticker: completa.ticker,
        promedio_corto: completa.promedio_movil?.promedio_corto,
        promedio_largo: completa.promedio_movil?.promedio_largo,
        diferencia_porcentual: completa.promedio_movil?.diferencia_porcentual,
        tendencia: completa.promedio_movil?.tendencia,
      },
      {
        metodo: 'Regresión lineal',
        ticker: completa.ticker,
        precio_actual: completa.ultimo_precio_cierre,
        precio_estimado: completa.regresion_lineal?.precio_estimado,
        cambio_estimado: completa.regresion_lineal?.cambio_estimado,
        cambio_porcentual: completa.regresion_lineal?.cambio_porcentual_estimado,
        tendencia: completa.regresion_lineal?.tendencia,
      },
      {
        metodo: 'Conclusión general',
        ticker: completa.ticker,
        precio_actual: completa.ultimo_precio_cierre,
        precio_estimado: completa.regresion_lineal?.precio_estimado,
        cambio_estimado: completa.regresion_lineal?.cambio_estimado,
        cambio_porcentual: completa.regresion_lineal?.cambio_porcentual_estimado,
        tendencia: completa.conclusion_general,
      },
      {
        metodo: 'Aviso',
        ticker: completa.ticker,
        precio_actual: '-',
        precio_estimado: '-',
        cambio_estimado: '-',
        cambio_porcentual: '-',
        tendencia: 'Estimación estadística basada en datos históricos. No constituye asesoría financiera.',
      },
    ];

    renderTable('#prediccionResult', detalle);

    toast(`Predicción calculada para ${ticker}.`);
  } catch (error) {
    if (cards) {
      cards.innerHTML = `
        <article class="prediction-empty">
          Error al calcular predicción: ${error.message}
        </article>
      `;
    }

    if (result) {
      result.className = 'table-wrap empty';
      result.textContent = error.message;
    }

    toast(error.message, 'error');
  }
}

function limpiarPrediccion() {
  const cards = $('#prediccionCards');
  const result = $('#prediccionResult');
  const select = $('#prediccionTickerSelect');

  if (cards) {
    cards.innerHTML = `
      <article class="prediction-empty">
        Selecciona un ticker y calcula una predicción.
      </article>
    `;
  }

  if (result) {
    result.className = 'table-wrap empty';
    result.textContent = 'Aquí aparecerán los datos detallados de la predicción.';
  }

  if (select) {
    select.value = '';
  }

  if (prediccionChartInstance) {
    prediccionChartInstance.destroy();
    prediccionChartInstance = null;
  }
}

function getFormData(form) {
  const data = Object.fromEntries(new FormData(form).entries());

  Object.keys(data).forEach(key => {
    if (data[key] === '') {
      delete data[key];
    } else if ([
      'id_empresa',
      'id_sector',
      'id_mercado',
      'id_precio',
      'volumen',
    ].includes(key)) {
      data[key] = Number(data[key]);
    } else if (key.startsWith('precio_')) {
      data[key] = Number(data[key]);
    }
  });

  return data;
}

async function loadEmpresas() {
  const data = await api('/api/empresas');

  renderTable('#empresasResult', data, {
    actions: row => `
      <button class="secondary" onclick='editEmpresa(${JSON.stringify(row).replaceAll("'", "&apos;")})'>Editar</button>
      <button class="danger" onclick="deleteEmpresa(${row.id_empresa})">Eliminar</button>
    `,
  });
}

window.editEmpresa = (row) => {
  const form = $('#empresaForm');
  if (!form) return;

  form.id_empresa.value = row.id_empresa || '';
  form.ticker.value = row.ticker || '';
  form.nombre.value = row.nombre || '';
  form.id_sector.value = row.id_sector || '';
  form.id_mercado.value = row.id_mercado || '';
  form.pais.value = row.pais || '';
  form.fecha_fundacion.value = row.fecha_fundacion ? String(row.fecha_fundacion).slice(0, 10) : '';

  location.hash = '#empresas';
};

window.deleteEmpresa = async (id) => {
  if (!confirm('¿Eliminar esta empresa?')) return;

  try {
    await api(`/api/empresas/${id}`, {
      method: 'DELETE',
    });

    toast('Empresa eliminada.');
    await loadEmpresas();
    await loadAcciones();
    await loadResumen();
    await cargarTickersPrediccion();
  } catch (error) {
    toast(error.message, 'error');
  }
};

async function loadPrecios() {
  const data = await api('/api/precios');

  renderTable('#preciosResult', data, {
    actions: row => `
      <button class="secondary" onclick='editPrecio(${JSON.stringify(row).replaceAll("'", "&apos;")})'>Editar</button>
      <button class="danger" onclick="deletePrecio(${row.id_precio})">Eliminar</button>
    `,
  });
}

window.editPrecio = (row) => {
  const form = $('#precioForm');
  if (!form) return;

  form.id_precio.value = row.id_precio || '';
  form.id_empresa.value = row.id_empresa || '';
  form.fecha.value = row.fecha ? String(row.fecha).slice(0, 10) : '';
  form.precio_apertura.value = row.precio_apertura || '';
  form.precio_cierre.value = row.precio_cierre || '';
  form.precio_maximo.value = row.precio_maximo || '';
  form.precio_minimo.value = row.precio_minimo || '';
  form.volumen.value = row.volumen || '';

  location.hash = '#precios';
};

window.deletePrecio = async (id) => {
  if (!confirm('¿Eliminar este registro de precio?')) return;

  try {
    await api(`/api/precios/${id}`, {
      method: 'DELETE',
    });

    toast('Precio eliminado.');
    await loadPrecios();
    await loadResumen();
  } catch (error) {
    toast(error.message, 'error');
  }
};

function setupForms() {
  const prediccionForm = $('#prediccionForm');

  if (prediccionForm) {
    prediccionForm.addEventListener('submit', calcularPrediccion);
  }

  const empresaForm = $('#empresaForm');

  if (empresaForm) {
    empresaForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      try {
        const data = getFormData(event.target);
        const id = data.id_empresa;

        delete data.id_empresa;

        await api(id ? `/api/empresas/${id}` : '/api/empresas', {
          method: id ? 'PUT' : 'POST',
          body: JSON.stringify(data),
        });

        toast(id ? 'Empresa actualizada.' : 'Empresa creada.');
        event.target.reset();

        await loadEmpresas();
        await loadAcciones();
        await loadResumen();
        await cargarTickersPrediccion();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }

  const precioForm = $('#precioForm');

  if (precioForm) {
    precioForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      try {
        const data = getFormData(event.target);
        const id = data.id_precio;

        delete data.id_precio;

        await api(id ? `/api/precios/${id}` : '/api/precios', {
          method: id ? 'PUT' : 'POST',
          body: JSON.stringify(data),
        });

        toast(id ? 'Precio actualizado.' : 'Precio creado.');
        event.target.reset();

        await loadPrecios();
        await loadResumen();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }

  const getEmpresaByIdForm = $('#getEmpresaByIdForm');

  if (getEmpresaByIdForm) {
    getEmpresaByIdForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const id = new FormData(event.target).get('id');

      try {
        $('#individualTitle').textContent = `Empresa ID ${id}`;
        const data = await api(`/api/empresas/${id}`);
        renderTable('#individualResult', data);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }

  const getPrecioByIdForm = $('#getPrecioByIdForm');

  if (getPrecioByIdForm) {
    getPrecioByIdForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const id = new FormData(event.target).get('id');

      try {
        $('#individualTitle').textContent = `Precio ID ${id}`;
        const data = await api(`/api/precios/${id}`);
        renderTable('#individualResult', data);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }

  const historialTickerForm = $('#historialTickerForm');

  if (historialTickerForm) {
    historialTickerForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const ticker = new FormData(event.target).get('ticker').trim().toUpperCase();

      try {
        $('#individualTitle').textContent = `Historial ${ticker}`;
        const data = await api(`/api/analiticas/historial/${ticker}`);
        renderTable('#individualResult', data);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }

  const compararForm = $('#compararForm');

  if (compararForm) {
    compararForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const tickers = new FormData(event.target).get('tickers');

      try {
        $('#individualTitle').textContent = `Comparación: ${tickers}`;
        const data = await api(`/api/analiticas/comparar?tickers=${encodeURIComponent(tickers)}`);
        renderTable('#individualResult', data);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }
}

function setupEvents() {
  const refreshAllBtn = $('#refreshAllBtn');

  if (refreshAllBtn) {
    refreshAllBtn.addEventListener('click', loadDashboard);
  }

  const quickSearchBtn = $('#quickSearchBtn');

  if (quickSearchBtn) {
    quickSearchBtn.addEventListener('click', quickSearch);
  }

  const quickSearchInput = $('#quickSearchInput');

  if (quickSearchInput) {
    quickSearchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        quickSearch();
      }
    });
  }

  const loadAccionesBtn = $('#loadAccionesBtn');

  if (loadAccionesBtn) {
    loadAccionesBtn.addEventListener('click', async () => {
      await loadAcciones();
      await cargarTickersPrediccion();
    });
  }

  const accionesSearchInput = $('#accionesSearchInput');

  if (accionesSearchInput) {
    accionesSearchInput.addEventListener('input', () => {
      renderAcciones(accionesDisponibles);
    });
  }

  const clearPrediccionBtn = $('#clearPrediccionBtn');

  if (clearPrediccionBtn) {
    clearPrediccionBtn.addEventListener('click', limpiarPrediccion);
  }

  const clearAnalyticsBtn = $('#clearAnalyticsBtn');

  if (clearAnalyticsBtn) {
    clearAnalyticsBtn.addEventListener('click', () => {
      const result = $('#analyticsResult');
      if (!result) return;

      result.className = 'table-wrap empty';
      result.textContent = 'Selecciona una consulta.';
    });
  }

  const clearIndividualBtn = $('#clearIndividualBtn');

  if (clearIndividualBtn) {
    clearIndividualBtn.addEventListener('click', () => {
      const result = $('#individualResult');
      if (!result) return;

      result.className = 'table-wrap empty';
      result.textContent = 'Haz una consulta individual.';
    });
  }

  const loadEmpresasBtn = $('#loadEmpresasBtn');

  if (loadEmpresasBtn) {
    loadEmpresasBtn.addEventListener('click', () => {
      loadEmpresas().catch(error => toast(error.message, 'error'));
    });
  }

  const loadPreciosBtn = $('#loadPreciosBtn');

  if (loadPreciosBtn) {
    loadPreciosBtn.addEventListener('click', () => {
      loadPrecios().catch(error => toast(error.message, 'error'));
    });
  }

  const loadSectoresBtn = $('#loadSectoresBtn');

  if (loadSectoresBtn) {
    loadSectoresBtn.addEventListener('click', async () => {
      try {
        const data = await api('/api/sectores');
        renderTable('#sectoresResult', data);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }

  const loadMercadosBtn = $('#loadMercadosBtn');

  if (loadMercadosBtn) {
    loadMercadosBtn.addEventListener('click', async () => {
      try {
        const data = await api('/api/mercados');
        renderTable('#mercadosResult', data);
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  }

  const resetEmpresaForm = $('#resetEmpresaForm');

  if (resetEmpresaForm) {
    resetEmpresaForm.addEventListener('click', () => {
      $('#empresaForm')?.reset();
    });
  }

  const resetPrecioForm = $('#resetPrecioForm');

  if (resetPrecioForm) {
    resetPrecioForm.addEventListener('click', () => {
      $('#precioForm')?.reset();
    });
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('nav a');

    if (!link) return;

    $$('nav a').forEach(a => a.classList.remove('active'));
    link.classList.add('active');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  buildAnalyticsButtons();
  setupEvents();
  setupForms();
  loadDashboard();
});