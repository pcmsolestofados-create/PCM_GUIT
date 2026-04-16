// ============================================================
//  Sol Estofados — Sistema de Manutenção
//  Integração com Google Sheets via API pública
// ============================================================

const CONFIG = {
  SPREADSHEET_ID: 'seu-id-aqui',
  API_KEY: 'sua-api-key-aqui',
  AUTO_REFRESH_MINUTOS: 5,
  ABA_OS: 'OS',
  ABA_ESTOQUE: 'Estoque',
  COLUNAS: {
    NUM_OS: 0,           // A
    DATA: 1,             // B
    HORA: 2,             // C
    SOLICITANTE: 3,      // D
    SETOR: 6,            // G
    EQUIPAMENTO: 7,      // H
    FALHA: 25,           // Z
    INTERVENCAO: 29,     // AD
    SERVICO: 30,         // AE
    PECA: 31,            // AF
    SEGURANCA: 40,       // AO
    TECNICO: 41,         // AP
    STATUS: 42,          // AQ
  }
};

const app = (() => {

  let OS_DATA = [];
  let ESTOQUE_DATA = [];
  let currentPage = 'dashboard';
  let osFilter = 'Todos';
  let dashTabFilter = 'Todas';

  // ── Inicialização ────────────────────────────────────────
  function init() {
    setupNavigation();
    setupFilters();
    setupSearch();
    loadData();

    if (CONFIG.AUTO_REFRESH_MINUTOS > 0) {
      setInterval(loadData, CONFIG.AUTO_REFRESH_MINUTOS * 60 * 1000);
    }
  }

  // ── Carregamento de dados do Google Sheets ───────────────
  async function loadData() {
    setSyncStatus('loading', 'Sincronizando...');

    try {
      const [osData, estoqueData] = await Promise.all([
        fetchSheet(CONFIG.ABA_OS),
        fetchSheet(CONFIG.ABA_ESTOQUE).catch(() => []),
      ]);

      OS_DATA = parseOS(osData);
      ESTOQUE_DATA = parseEstoque(estoqueData);

      renderCurrentPage();
      setSyncStatus('ok', `Atualizado às ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}`);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setSyncStatus('error', 'Erro ao sincronizar');

      // Se falhar, usa dados locais de exemplo
      if (OS_DATA.length === 0) {
        OS_DATA = DADOS_EXEMPLO;
        ESTOQUE_DATA = ESTOQUE_EXEMPLO;
        renderCurrentPage();
      }
    }
  }

  async function fetchSheet(aba) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(aba)}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.values || [];
  }

  // ── Parsers ──────────────────────────────────────────────
  function parseOS(rows) {
    if (!rows || rows.length < 3) return DADOS_EXEMPLO;
    const C = CONFIG.COLUNAS;
    return rows.slice(2).map((r, i) => ({
      n:         r[C.NUM_OS]      || (i + 1),
      data:      r[C.DATA]        || '',
      hora:      r[C.HORA]        || '',
      sol:       r[C.SOLICITANTE] || '',
      setor:     r[C.SETOR]       || '',
      equip:     r[C.EQUIPAMENTO] || '',
      falha:     r[C.FALHA]       || '',
      tipo:      r[C.INTERVENCAO] || '',
      servico:   r[C.SERVICO]     || '',
      peca:      r[C.PECA]        || '',
      seg:       r[C.SEGURANCA]   || '',
      tec:       r[C.TECNICO]     || '',
      status:    r[C.STATUS]      || 'Aberta',
    })).filter(x => x.equip || x.falha);
  }

  function parseEstoque(rows) {
    if (!rows || rows.length < 2) return ESTOQUE_EXEMPLO;
    return rows.slice(1).map(r => ({
      item: r[0] || '',
      cat:  r[1] || '',
      qty:  parseInt(r[2]) || 0,
      min:  parseInt(r[3]) || 0,
      uso:  r[4] || '',
    })).filter(x => x.item);
  }

  // ── Helpers ──────────────────────────────────────────────
  function groupBy(arr, fn) {
    const m = {};
    arr.forEach(x => { const k = fn(x); m[k] = (m[k] || 0) + 1; });
    return m;
  }
  function sortedEntries(obj) {
    return Object.entries(obj).sort((a, b) => b[1] - a[1]);
  }
  function count(arr, fn) { return arr.filter(fn).length; }
  function isCorretiva(x) { return (x.tipo || '').toLowerCase().includes('corretiva'); }
  function isPreventiva(x) { return (x.tipo || '').toLowerCase().includes('preventiva'); }

  function badgeTipo(x) {
    return isCorretiva(x)
      ? '<span class="badge b-cor">Corretiva</span>'
      : '<span class="badge b-prev">Preventiva</span>';
  }
  function badgeStatus(s) {
    const map = { 'Concluída':'b-conc','Em andamento':'b-and','Aberta':'b-ab','Urgente':'b-urg' };
    return `<span class="badge ${map[s]||'b-ab'}">${s}</span>`;
  }

  function setSyncStatus(type, msg) {
    const el = document.getElementById('sync-status');
    el.className = `badge-live ${type}`;
    el.textContent = msg;
  }

  // ── Navegação ────────────────────────────────────────────
  function setupNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        navigateTo(page);
      });
    });
    document.querySelectorAll('[data-goto]').forEach(el => {
      el.addEventListener('click', () => navigateTo(el.dataset.goto));
    });
  }

  function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`page-${page}`).classList.add('active');
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    const titles = {
      dashboard: 'Dashboard',
      ordens: 'Ordens de Serviço',
      historico: 'Histórico por Equipamento',
      estoque: 'Estoque de Peças',
      tecnicos: 'Técnicos',
      relatorios: 'Relatórios',
    };
    document.getElementById('page-title').textContent = titles[page] || page;
    renderCurrentPage();
  }

  function renderCurrentPage() {
    const renderers = {
      dashboard: renderDashboard,
      ordens: renderOSTable,
      historico: renderHistorico,
      estoque: renderEstoque,
      tecnicos: renderTecnicos,
      relatorios: renderRelatorios,
    };
    renderers[currentPage]?.();
  }

  // ── Dashboard ────────────────────────────────────────────
  function renderDashboard() {
    const total = OS_DATA.length;
    const conc  = count(OS_DATA, x => x.status === 'Concluída');
    const cor   = count(OS_DATA, isCorretiva);
    const prev  = count(OS_DATA, isPreventiva);

    setText('kpi-total', total);
    setText('kpi-conc', conc);
    setText('kpi-conc-pct', `${Math.round(conc / total * 100)}% do total`);
    setText('kpi-cor', cor);
    setText('kpi-cor-pct', `${Math.round(cor / total * 100)}% do total`);
    setText('kpi-prev', prev);
    setText('kpi-prev-pct', `${Math.round(prev / total * 100)}% do total`);

    renderDashTable();
    renderBarChart('setor-chart',   sortedEntries(groupBy(OS_DATA, x => x.setor)).slice(0,6),   '#378ADD');
    renderBarChart('tecnico-chart', sortedEntries(groupBy(OS_DATA, x => x.tec)).slice(0,5),     '#185FA5');
    renderTimeline();
    renderBarChart('intervencao-chart', sortedEntries(groupBy(OS_DATA, x => x.peca)).slice(0,5), '#EF9F27');
    renderEstoqueMini();
  }

  function renderDashTable() {
    let data = OS_DATA.slice().reverse();
    if (dashTabFilter === 'Corretiva') data = data.filter(isCorretiva);
    if (dashTabFilter === 'Preventiva') data = data.filter(isPreventiva);
    data = data.slice(0, 8);
    document.getElementById('dash-tbody').innerHTML = data.map(x => `<tr>
      <td class="os-num">#${x.n}</td>
      <td>${x.setor}</td>
      <td class="truncate">${x.equip}</td>
      ${badgeTipo(x).replace('<span','<td><span').replace('</span>','</span></td>')}
      <td>${x.tec}</td>
      <td>${badgeStatus(x.status)}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">Nenhuma OS encontrada</td></tr>';
  }

  function setupFilters() {
    // Dashboard tabs
    document.querySelectorAll('.tabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        dashTabFilter = tab.dataset.filter || 'Todas';
        renderDashTable();
      });
    });

    // OS filters
    document.querySelectorAll('#os-filters .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#os-filters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        osFilter = btn.dataset.filter || 'Todos';
        renderOSTable();
      });
    });
  }

  function setupSearch() {
    document.getElementById('os-search')?.addEventListener('input', renderOSTable);
    document.getElementById('hist-search')?.addEventListener('input', renderHistorico);
  }

  // ── Gráficos de barra ────────────────────────────────────
  function renderBarChart(containerId, data, color) {
    const el = document.getElementById(containerId);
    if (!el || !data.length) return;
    const max = data[0][1];
    el.innerHTML = data.map(([label, val]) => `
      <div class="bar-row">
        <div class="bar-label" title="${label}">${label}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(val/max*100)}%;background:${color};"></div></div>
        <div class="bar-val">${val}</div>
      </div>`).join('');
  }

  // ── Timeline ─────────────────────────────────────────────
  function renderTimeline() {
    const colors = { 'Concluída':'#639922','Em andamento':'#EF9F27','Aberta':'#378ADD' };
    const recent = OS_DATA.slice().reverse().slice(0, 5);
    document.getElementById('timeline').innerHTML = recent.map((x, i) => `
      <div class="tl-item">
        <div class="tl-dot-col">
          <div class="tl-dot" style="background:${colors[x.status]||'#378ADD'};"></div>
          ${i < 4 ? '<div class="tl-line"></div>' : ''}
        </div>
        <div>
          <div class="tl-title">OS #${x.n} — ${x.equip}</div>
          <div class="tl-time">${x.data} ${x.hora} · ${x.tec}</div>
        </div>
      </div>`).join('');
  }

  // ── Estoque mini ─────────────────────────────────────────
  function renderEstoqueMini() {
    const alertas = ESTOQUE_DATA.filter(x => x.qty < x.min).slice(0, 4);
    document.getElementById('estoque-mini').innerHTML = alertas.length
      ? alertas.map(x => `<div class="estq-item">
          <div><div class="estq-name">${x.item}</div><div class="estq-meta">${x.cat}</div></div>
          <div class="estq-qty ${x.qty <= 2 ? 'qty-low':'qty-warn'}">${x.qty} un</div>
        </div>`).join('')
      : '<div class="empty">Estoque em dia</div>';
  }

  // ── Tabela de OS ─────────────────────────────────────────
  function renderOSTable() {
    const search = (document.getElementById('os-search')?.value || '').toLowerCase();
    let data = OS_DATA.slice().reverse();

    if (osFilter !== 'Todos') {
      if (osFilter === 'Corretiva') data = data.filter(isCorretiva);
      else if (osFilter === 'Preventiva') data = data.filter(isPreventiva);
      else data = data.filter(x => x.status === osFilter);
    }
    if (search) {
      data = data.filter(x =>
        [x.equip, x.setor, x.tec, x.falha, x.servico, String(x.n)]
          .some(f => (f || '').toLowerCase().includes(search))
      );
    }

    document.getElementById('os-tbody').innerHTML = data.map(x => `<tr>
      <td class="os-num">#${x.n}</td>
      <td style="white-space:nowrap;">${x.data}</td>
      <td>${x.setor}</td>
      <td class="truncate" title="${x.equip}">${x.equip}</td>
      <td class="truncate" title="${x.falha}">${x.falha}</td>
      <td>${badgeTipo(x)}</td>
      <td class="truncate" title="${x.servico}" style="max-width:200px;">${x.servico}</td>
      <td>${x.tec}</td>
      <td>${badgeStatus(x.status)}</td>
    </tr>`).join('') || '<tr><td colspan="9" class="empty">Nenhuma OS encontrada</td></tr>';

    document.getElementById('os-count').textContent = `Mostrando ${data.length} de ${OS_DATA.length} ordens de serviço`;
  }

  // ── Histórico por equipamento ────────────────────────────
  function renderHistorico() {
    const search = (document.getElementById('hist-search')?.value || '').toLowerCase();
    const grupos = {};
    OS_DATA.forEach(x => {
      const k = x.equip;
      if (!grupos[k]) grupos[k] = [];
      grupos[k].push(x);
    });

    let keys = Object.keys(grupos).sort();
    if (search) keys = keys.filter(k => k.toLowerCase().includes(search));

    const el = document.getElementById('hist-content');
    if (!keys.length) { el.innerHTML = '<div class="empty">Nenhum equipamento encontrado</div>'; return; }

    el.innerHTML = keys.map(k => {
      const os = grupos[k];
      return `<div style="border-bottom:0.5px solid var(--border);">
        <div style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;background:#F8F9FA;">
          <div style="font-size:12px;font-weight:600;">${k}</div>
          <div style="font-size:11px;color:var(--text-muted);">${os.length} OS · ${os[0].setor}</div>
        </div>
        <table><thead><tr><th>OS</th><th>Data</th><th>Tipo</th><th>Serviço realizado</th><th>Técnico</th><th>Status</th></tr></thead>
        <tbody>${os.map(x => `<tr>
          <td class="os-num">#${x.n}</td>
          <td style="white-space:nowrap;">${x.data}</td>
          <td>${badgeTipo(x)}</td>
          <td class="truncate" style="max-width:240px;" title="${x.servico}">${x.servico}</td>
          <td>${x.tec}</td>
          <td>${badgeStatus(x.status)}</td>
        </tr>`).join('')}</tbody></table>
      </div>`;
    }).join('');
  }

  // ── Estoque ──────────────────────────────────────────────
  function renderEstoque() {
    const crit  = ESTOQUE_DATA.filter(x => x.qty < x.min && x.qty <= 2).length;
    const baixo = ESTOQUE_DATA.filter(x => x.qty < x.min && x.qty > 2).length;
    const ok    = ESTOQUE_DATA.filter(x => x.qty >= x.min).length;

    setText('estq-total', ESTOQUE_DATA.length);
    setText('estq-crit', crit);
    setText('estq-baixo', baixo);
    setText('estq-ok', ok);

    const link = document.getElementById('estq-edit-link');
    if (link) link.onclick = () => window.open(`https://docs.google.com/spreadsheets/d/${CONFIG.SPREADSHEET_ID}`, '_blank');

    document.getElementById('estq-tbody').innerHTML = ESTOQUE_DATA.map(x => {
      let sit, cls;
      if (x.qty <= 2 && x.qty < x.min) { sit = 'Crítico'; cls = 'b-urg'; }
      else if (x.qty < x.min)           { sit = 'Baixo';   cls = 'b-and'; }
      else                               { sit = 'Adequado';cls = 'b-conc'; }
      return `<tr>
        <td style="font-weight:600;">${x.item}</td>
        <td>${x.cat}</td>
        <td style="font-weight:600;color:${x.qty<x.min?'#A32D2D':'#3B6D11'};">${x.qty} un</td>
        <td>${x.min} un</td>
        <td><span class="badge ${cls}">${sit}</span></td>
        <td>${x.uso}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="6" class="empty">Nenhum item cadastrado</td></tr>';
  }

  // ── Técnicos ─────────────────────────────────────────────
  function renderTecnicos() {
    const tecs = {};
    OS_DATA.forEach(x => {
      if (!tecs[x.tec]) tecs[x.tec] = { total:0, cor:0, prev:0, conc:0 };
      tecs[x.tec].total++;
      if (isCorretiva(x))  tecs[x.tec].cor++;
      else                  tecs[x.tec].prev++;
      if (x.status === 'Concluída') tecs[x.tec].conc++;
    });
    const entries = sortedEntries(groupBy(OS_DATA, x => x.tec));

    document.getElementById('tec-kpis').innerHTML = entries.slice(0, 4).map(([tec, val]) => `
      <div class="kpi"><div class="kpi-accent" style="background:#378ADD;"></div>
      <div class="kpi-label">${tec}</div>
      <div class="kpi-val">${val}</div>
      <div class="kpi-sub">OS realizadas</div></div>`).join('');

    document.getElementById('tec-tbody').innerHTML = entries.map(([tec]) => {
      const t = tecs[tec];
      return `<tr>
        <td style="font-weight:600;">${tec}</td>
        <td>${t.total}</td><td>${t.cor}</td><td>${t.prev}</td>
        <td><span class="badge b-conc">${t.conc}</span></td>
      </tr>`;
    }).join('');

    renderBarChart('tec-chart', entries, '#185FA5');
  }

  // ── Relatórios ───────────────────────────────────────────
  function renderRelatorios() {
    const setores = sortedEntries(groupBy(OS_DATA, x => x.setor));
    const equips  = sortedEntries(groupBy(OS_DATA, x => x.equip));
    const tipos   = sortedEntries(groupBy(OS_DATA, x => x.tipo));
    const total   = OS_DATA.length;

    document.getElementById('rel-setores').innerHTML = setores.slice(0, 8).map(([k,v]) =>
      `<div class="stat-pill"><span class="stat-name">${k}</span><span class="stat-count">${v}</span></div>`).join('');

    document.getElementById('rel-equipamentos').innerHTML = equips.slice(0, 8).map(([k,v]) =>
      `<div class="stat-pill"><span class="stat-name">${k}</span><span class="stat-count">${v}</span></div>`).join('');

    document.getElementById('rel-pecas').innerHTML = sortedEntries(groupBy(OS_DATA, x => x.peca)).map(([k,v]) =>
      `<div class="stat-pill"><span class="stat-name">${k}</span><span class="stat-count">${v}</span></div>`).join('');

    document.getElementById('rel-tbody').innerHTML = tipos.map(([k,v]) =>
      `<tr><td>${k}</td><td>${v}</td><td>${Math.round(v/total*100)}%</td></tr>`).join('');
  }

  // ── Utilitários ──────────────────────────────────────────
  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ── Dados de exemplo (fallback sem API) ──────────────────
  const DADOS_EXEMPLO = [
    {n:1,data:"26/11/25",hora:"21:50",sol:"Lucas",setor:"Pantográfica",equip:"Pantográfica 01",falha:"Pulando ponto",tipo:"Manutenção Corretiva",servico:"Substituição da agulha",peca:"Substituição",seg:"Bom",tec:"Lucas",status:"Concluída"},
    {n:2,data:"26/11/25",hora:"23:36",sol:"Rafaela",setor:"Empilhadeira",equip:"Empilhadeira 01",falha:"Suporte quebrado",tipo:"Manutenção Corretiva",servico:"Substituição do suporte",peca:"Substituição",seg:"Bom",tec:"João",status:"Concluída"},
    {n:3,data:"27/11/25",hora:"09:10",sol:"Filipe",setor:"Costura",equip:"Máquina de costura reta",falha:"Desfiando a linha",tipo:"Manutenção Corretiva",servico:"Regulagem da lançadeira",peca:"Reparo",seg:"Bom",tec:"Diogeny",status:"Concluída"},
    {n:4,data:"27/11/25",hora:"15:45",sol:"Wagner",setor:"Produção",equip:"Percintadeira 02",falha:"Deslizando",tipo:"Manutenção Corretiva",servico:"Substituição do filtro pneumático",peca:"Substituição",seg:"Bom",tec:"João",status:"Concluída"},
    {n:5,data:"28/11/25",hora:"08:34",sol:"Marcio",setor:"Espumação",equip:"Bomba TDI",falha:"Mangueira",tipo:"Manutenção Preventiva",servico:"Substituição de mangote",peca:"Substituição",seg:"Bom",tec:"João",status:"Concluída"},
    {n:6,data:"01/12/25",hora:"08:09",sol:"Lucas",setor:"Produção",equip:"Grampeadores",falha:"Lubrificação",tipo:"Manutenção Preventiva",servico:"Lubrificação",peca:"Não",seg:"Bom",tec:"João",status:"Concluída"},
    {n:7,data:"03/12/25",hora:"07:09",sol:"Gustavo",setor:"Marcenaria de Sofá",equip:"Serra fita 3",falha:"Quebrando a serra",tipo:"Manutenção Corretiva",servico:"Solda da serra fita",peca:"Reparo",seg:"Regular",tec:"João",status:"Concluída"},
    {n:8,data:"05/12/25",hora:"08:07",sol:"Filipe",setor:"Costura",equip:"Máquina de costura reta",falha:"Embuchado linha",tipo:"Manutenção Corretiva",servico:"Substituição caixa de bobina",peca:"Substituição",seg:"Bom",tec:"João",status:"Concluída"},
    {n:9,data:"08/12/25",hora:"08:24",sol:"Gustavo",setor:"Marcenaria de Sofá",equip:"Tupia",falha:"Arrebentou correias",tipo:"Manutenção Corretiva",servico:"Substituição das correias",peca:"Substituição",seg:"Bom",tec:"João",status:"Concluída"},
    {n:10,data:"11/12/25",hora:"09:10",sol:"Nilmar",setor:"Corte de espuma",equip:"Laminadora vertical",falha:"Não dá amolação",tipo:"Manutenção Corretiva",servico:"Limpeza sistema de amolação",peca:"Não",seg:"Bom",tec:"Lucas",status:"Concluída"},
  ];

  const ESTOQUE_EXEMPLO = [
    {item:"Agulha industrial",cat:"Costura",qty:8,min:20,uso:"11/12/25"},
    {item:"Correia V A-22",cat:"Transmissão",qty:3,min:5,uso:"08/12/25"},
    {item:"Rolamento 6205",cat:"Rolamentos",qty:1,min:4,uso:"08/12/25"},
    {item:"Óleo hidráulico 68",cat:"Lubrificantes",qty:2,min:5,uso:"09/12/25"},
    {item:"Filtro de ar",cat:"Pneumática",qty:6,min:4,uso:"05/12/25"},
    {item:"Lâmina de corte 10 pol",cat:"Corte",qty:4,min:4,uso:"09/12/25"},
  ];

  return { init, loadData };
})();

document.addEventListener('DOMContentLoaded', app.init);
