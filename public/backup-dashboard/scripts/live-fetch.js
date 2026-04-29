/**
 * Misma tabla y orden que export-from-supabase.js — usa cliente Supabase ya autenticado (anon + sesión).
 * Expone una sola función en window para backup-dashboard/index.html
 */
(function (global) {
  var PAGE = 1000;

  function fetchAllPages(supabase, makeQuery) {
    return new Promise(function (resolve, reject) {
      var all = [];
      var from = 0;
      function next() {
        makeQuery()
          .range(from, from + PAGE - 1)
          .then(function (res) {
            var data = res.data;
            var error = res.error;
            if (error) {
              reject(error);
              return;
            }
            if (!data || data.length === 0) {
              resolve(all);
              return;
            }
            for (var i = 0; i < data.length; i++) all.push(data[i]);
            if (data.length < PAGE) {
              resolve(all);
              return;
            }
            from += PAGE;
            next();
          })
          .catch(reject);
      }
      next();
    });
  }

  function loadTable(supabase, table, buildQuery, onWarn) {
    return fetchAllPages(supabase, function () {
      return buildQuery(supabase.from(table).select('*'));
    }).catch(function (err) {
      if (typeof onWarn === 'function') onWarn(table, err);
      return [];
    });
  }

  /**
   * @param {import('@supabase/supabase-js').SupabaseClient} supabase
   */
  global.backupDashboardFetchLive = function backupDashboardFetchLive(supabase, onWarn) {
    var w = onWarn || function (t, e) {
      console.warn('[backup-dashboard] tabla', t, e && e.message ? e.message : e);
    };
    var exportedAt = new Date().toISOString();
    return Promise.all([
      loadTable(supabase, 'gerentes', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'clientes', function (q) { return q.order('name', { ascending: true }); }, w),
      loadTable(supabase, 'clientes_acceso', function (q) { return q.order('id', { ascending: true }); }, w),
      loadTable(supabase, 'gastos', function (q) { return q.order('mes', { ascending: false }); }, w),
      loadTable(supabase, 'cobros', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'garantias', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'manual', function (q) { return q.order('fecha', { ascending: false }); }, w),
      loadTable(supabase, 'cobranza_bandeja', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'cobranza_eventos', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'tareas_equipo', function (q) { return q.order('id', { ascending: true }); }, w),
      loadTable(supabase, 'tareas_clientes', function (q) { return q.order('nombre', { ascending: true }); }, w),
      loadTable(supabase, 'tareas_kanban', function (q) { return q.order('columna', { ascending: true }).order('orden', { ascending: true }); }, w),
      loadTable(supabase, 'tareas_tickets', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'tareas_workload', function (q) { return q.order('id', { ascending: true }); }, w),
      loadTable(supabase, 'tareas_calendario', function (q) { return q.order('anio', { ascending: false }).order('mes', { ascending: false }).order('dia', { ascending: true }); }, w),
      loadTable(supabase, 'tareas_ticket_comentarios', function (q) { return q.order('created_at', { ascending: true }); }, w),
      loadTable(supabase, 'creativos_clientes', function (q) { return q.order('name', { ascending: true }); }, w),
      loadTable(supabase, 'creativos_productos', function (q) { return q.order('name', { ascending: true }); }, w),
      loadTable(supabase, 'creativos_editores', function (q) { return q.order('name', { ascending: true }); }, w),
      loadTable(supabase, 'creativos_proyectos', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'finanzas_app_ingresos', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'finanzas_app_gastos', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'finanzas_app_cuentas_cobrar', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'finanzas_app_deudas', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'finanzas_app_sueldos', function (q) { return q.order('created_at', { ascending: false }); }, w),
      loadTable(supabase, 'finanzas_app_impuestos', function (q) { return q.order('created_at', { ascending: false }); }, w),
    ]).then(function (rows) {
      return {
        dataSource: 'live',
        schemaVersion: 2,
        exportedAt: exportedAt,
        gerentes: rows[0],
        clientes: rows[1],
        clientes_acceso: rows[2],
        gastos: rows[3],
        cobros: rows[4],
        garantias: rows[5],
        manual: rows[6],
        cobranza_bandeja: rows[7],
        cobranza_eventos: rows[8],
        tareas_equipo: rows[9],
        tareas_clientes: rows[10],
        tareas_kanban: rows[11],
        tareas_tickets: rows[12],
        tareas_workload: rows[13],
        tareas_calendario: rows[14],
        tareas_ticket_comentarios: rows[15],
        creativos_clientes: rows[16],
        creativos_productos: rows[17],
        creativos_editores: rows[18],
        creativos_proyectos: rows[19],
        finanzas_app_ingresos: rows[20],
        finanzas_app_gastos: rows[21],
        finanzas_app_cuentas_cobrar: rows[22],
        finanzas_app_deudas: rows[23],
        finanzas_app_sueldos: rows[24],
        finanzas_app_impuestos: rows[25],
      };
    });
  };
})(typeof window !== 'undefined' ? window : this);
