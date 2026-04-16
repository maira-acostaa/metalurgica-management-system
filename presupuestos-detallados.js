const express = require('express');
const router = express.Router();
const db = require('../database');

const ESTADO_RESEÑADO = 'RESEÑADO';
const ESTADO_ARCHIVADO = 'ARCHIVADO';
const DIAS_PARA_ARCHIVAR_DESDE_VENCIMIENTO = 30;

const normalizeEstado = (estado) => {
  if (!estado) return 'PENDIENTE';
  const normalized = estado.toString().toUpperCase();
  if (normalized === 'SEÑADO') return ESTADO_RESEÑADO;
  return normalized;
};

const insertarHistorial = ({ presupuestoId, accion, estadoAnterior = null, estadoNuevo = null, createdBy = null }) => {
  if (!presupuestoId || !accion) return;

  db.run(
    `
      INSERT INTO presupuesto_historial (
        presupuesto_id,
        accion,
        estado_anterior,
        estado_nuevo,
        created_at,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      presupuestoId,
      accion,
      estadoAnterior,
      estadoNuevo,
      new Date().toISOString(),
      createdBy
    ],
    (err) => {
      if (err) {
        console.error('Error al registrar historial del presupuesto:', err.message);
      }
    }
  );
};

const obtenerTotalArchivados = (done) => {
  db.get(
    `SELECT COUNT(*) as total FROM presupuestos_detallados WHERE UPPER(estado) = '${ESTADO_ARCHIVADO}'`,
    [],
    (err, row) => {
      if (err) {
        console.error('Error al contar presupuestos archivados:', err.message);
        done(0);
        return;
      }
      done(Number(row?.total || 0));
    }
  );
};

const actualizarEstadosAutomaticosPresupuestos = (done) => {
  const vencimientoCalculadoSql = `
    CASE
      WHEN fecha_vencimiento IS NOT NULL THEN date(fecha_vencimiento)
      ELSE date(created_at, '+' || IFNULL(validez_dias, 30) || ' days')
    END
  `;

  const selectVenciblesSql = `
    SELECT id, estado
    FROM presupuestos_detallados
    WHERE activo = 1
      AND UPPER(estado) NOT IN ('FACTURADO', 'VENCIDO', '${ESTADO_ARCHIVADO}')
      AND (${vencimientoCalculadoSql}) < date('now')
  `;

  db.all(selectVenciblesSql, [], (selectErr, vencibles) => {
    if (selectErr) {
      console.error('Error al buscar presupuestos vencidos:', selectErr.message);
      obtenerTotalArchivados((archivados) => done({ archivados }));
      return;
    }

    const continuarConArchivado = () => {
      const selectArchivablesSql = `
        SELECT id, estado
        FROM presupuestos_detallados
        WHERE activo = 1
          AND UPPER(estado) = 'VENCIDO'
          AND date((${vencimientoCalculadoSql}), '+${DIAS_PARA_ARCHIVAR_DESDE_VENCIMIENTO} days') < date('now')
      `;

      db.all(selectArchivablesSql, [], (archivableErr, archivables) => {
        if (archivableErr) {
          console.error('Error al buscar presupuestos para archivar:', archivableErr.message);
          obtenerTotalArchivados((archivados) => done({ archivados }));
          return;
        }

        if (!archivables || archivables.length === 0) {
          obtenerTotalArchivados((archivados) => done({ archivados }));
          return;
        }

        const idsArchivables = archivables.map((item) => item.id);
        const placeholdersArchivables = idsArchivables.map(() => '?').join(',');

        db.run(
          `
            UPDATE presupuestos_detallados
            SET estado = '${ESTADO_ARCHIVADO}', activo = 0
            WHERE id IN (${placeholdersArchivables})
          `,
          idsArchivables,
          (archiveUpdateErr) => {
            if (archiveUpdateErr) {
              console.error('Error al archivar presupuestos vencidos:', archiveUpdateErr.message);
              obtenerTotalArchivados((archivados) => done({ archivados }));
              return;
            }

            archivables.forEach((item) => {
              insertarHistorial({
                presupuestoId: item.id,
                accion: `Presupuesto archivado automáticamente (${DIAS_PARA_ARCHIVAR_DESDE_VENCIMIENTO} días después del vencimiento)`,
                estadoAnterior: normalizeEstado(item.estado),
                estadoNuevo: ESTADO_ARCHIVADO
              });
            });

            obtenerTotalArchivados((archivados) => done({ archivados }));
          }
        );
      });
    };

    if (!vencibles || vencibles.length === 0) {
      continuarConArchivado();
      return;
    }

    const ids = vencibles.map((item) => item.id);
    const placeholders = ids.map(() => '?').join(',');

    db.run(
      `
        UPDATE presupuestos_detallados
        SET estado = 'VENCIDO'
        WHERE id IN (${placeholders})
      `,
      ids,
      (updateErr) => {
        if (updateErr) {
          console.error('Error al actualizar presupuestos vencidos:', updateErr.message);
          done();
          return;
        }

        vencibles.forEach((item) => {
          insertarHistorial({
            presupuestoId: item.id,
            accion: 'Estado actualizado automáticamente por vencimiento',
            estadoAnterior: normalizeEstado(item.estado),
            estadoNuevo: 'VENCIDO'
          });
        });

        continuarConArchivado();
      }
    );
  });
};

// GET - Obtener todos los presupuestos detallados (público)
router.get('/', (req, res) => {
  actualizarEstadosAutomaticosPresupuestos((automaticos) => {
  const scope = (req.query.scope || 'activos').toString().toLowerCase();
  // Archivados visibles solo durante 30 días desde que fueron archivados.
  // La fecha de archivado = vencimiento + DIAS_PARA_ARCHIVAR_DESDE_VENCIMIENTO.
  // "Visible 30 días tras el archivado" => vencimiento + (30 + 30) días >= hoy.
  const vencimientoSql = `CASE WHEN pd.fecha_vencimiento IS NOT NULL THEN pd.fecha_vencimiento ELSE date(pd.created_at, '+' || IFNULL(pd.validez_dias, 30) || ' days') END`;
  const whereClause = scope === 'archivados'
    ? `UPPER(pd.estado) = 'ARCHIVADO' AND date((${vencimientoSql}), '+${DIAS_PARA_ARCHIVAR_DESDE_VENCIMIENTO * 2} days') >= date('now')`
    : 'pd.activo = 1';

  const sql = `
    SELECT 
      pd.*,
      c.nombre as cliente_nombre,
      c.email as cliente_email,
      c.telefono as cliente_telefono,
      c.direccion as cliente_direccion
    FROM presupuestos_detallados pd
    LEFT JOIN clientes c ON pd.cliente_id = c.id
    WHERE ${whereClause}
    ORDER BY
      CASE UPPER(pd.estado)
        WHEN 'PENDIENTE' THEN 1
        WHEN 'RESEÑADO' THEN 2
        WHEN 'SEÑADO' THEN 2
        WHEN 'FACTURADO' THEN 3
        WHEN 'VENCIDO' THEN 4
        ELSE 5
      END,
      pd.created_at DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error al obtener presupuestos:', err);
      return res.status(500).json({ error: err.message });
    }
    
    // Para cada presupuesto, obtener sus items
    const presupuestos = [];
    let processedCount = 0;

    if (rows.length === 0) {
      return res.json({ presupuestos: [], archivados: automaticos?.archivados || 0 });
    }

    rows.forEach((presupuesto) => {
      presupuesto.estado = normalizeEstado(presupuesto.estado);

      const itemsSql = 'SELECT * FROM presupuesto_items WHERE presupuesto_id = ?';

      db.all(itemsSql, [presupuesto.id], (itemsErr, items = []) => {
        if (itemsErr) {
          console.error('Error al obtener items:', itemsErr);
        }

        const historySql = `
          SELECT id, accion, estado_anterior, estado_nuevo, created_at
          FROM presupuesto_historial
          WHERE presupuesto_id = ?
          ORDER BY datetime(created_at) ASC, id ASC
        `;

        db.all(historySql, [presupuesto.id], (historyErr, historial = []) => {
          if (historyErr) {
            console.error('Error al obtener historial del presupuesto:', historyErr);
          }

          presupuesto.items = items;
          presupuesto.historial = historial;
          presupuestos.push(presupuesto);
          processedCount++;

          if (processedCount === rows.length) {
            res.json({ presupuestos: presupuestos, archivados: automaticos?.archivados || 0 });
          }
        });
      });
    });
  });
  });
});

// GET - Obtener un presupuesto detallado por ID
router.get('/:id', (req, res) => {
  const { id } = req.params;

  actualizarEstadosAutomaticosPresupuestos(() => {
  const sql = `
    SELECT 
      pd.*,
      c.nombre as cliente_nombre,
      c.email as cliente_email,
      c.telefono as cliente_telefono,
      c.direccion as cliente_direccion
    FROM presupuestos_detallados pd
    LEFT JOIN clientes c ON pd.cliente_id = c.id
    WHERE pd.id = ? AND (pd.activo = 1 OR UPPER(pd.estado) = 'ARCHIVADO')
  `;

  db.get(sql, [id], (err, presupuesto) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    presupuesto.estado = normalizeEstado(presupuesto.estado);

    // Obtener items del presupuesto
    const itemsSql = 'SELECT * FROM presupuesto_items WHERE presupuesto_id = ?';

    db.all(itemsSql, [id], (itemsErr, items = []) => {
      if (itemsErr) {
        console.error('Error al obtener items:', itemsErr);
        presupuesto.items = [];
      } else {
        presupuesto.items = items;
      }

      const historySql = `
        SELECT id, accion, estado_anterior, estado_nuevo, created_at
        FROM presupuesto_historial
        WHERE presupuesto_id = ?
        ORDER BY datetime(created_at) ASC, id ASC
      `;

      db.all(historySql, [id], (historyErr, historial = []) => {
        if (historyErr) {
          console.error('Error al obtener historial del presupuesto:', historyErr.message);
        }

        presupuesto.historial = historial;
        res.json({ presupuesto: presupuesto });
      });
    });
  });
  });
});

// POST - Crear nuevo presupuesto detallado (público)
router.post('/', (req, res) => {
  const { 
    cliente_id, 
    nombre_cliente, 
    email_cliente, 
    telefono_cliente,
    tipo_trabajo, 
    descripcion,
    largo,
    ancho, 
    tipo_material,
    precio_metro_cuadrado,
    cantidad,
    precio_material_unitario,
    subtotal_material,
    tiempo_estimado_horas,
    precio_hora_mano_obra,
    subtotal_mano_obra,
    total, 
    validez_dias,
    fecha_vencimiento, 
    observaciones 
  } = req.body;
  
  if (!nombre_cliente || !email_cliente || !tipo_trabajo || !tipo_material) {
    return res.status(400).json({ 
      error: 'Nombre del cliente, email, tipo de trabajo y tipo de material son obligatorios' 
    });
  }

  const cantidadValue = Number(cantidad) || 0;
  const precioMaterialUnitarioValue = Number(precio_material_unitario) || 0;
  const tiempoEstimadoHorasValue = Number(tiempo_estimado_horas) || 0;
  const precioHoraManoObraValue = Number(precio_hora_mano_obra) || 0;

  if (cantidadValue <= 0 || precioMaterialUnitarioValue <= 0 || tiempoEstimadoHorasValue <= 0 || precioHoraManoObraValue <= 0) {
    return res.status(400).json({ 
      error: 'Cantidad, precios y tiempo estimado deben ser mayores a cero' 
    });
  }

  const subtotalMaterialValue = Number(subtotal_material) || cantidadValue * precioMaterialUnitarioValue;
  const subtotalManoObraValue = Number(subtotal_mano_obra) || tiempoEstimadoHorasValue * precioHoraManoObraValue;
  const totalValue = Number(total) || subtotalMaterialValue + subtotalManoObraValue;
  const validezDiasValue = parseInt(validez_dias, 10) || 30;

  // Generar número de presupuesto
  db.get('SELECT COUNT(*) as count FROM presupuestos_detallados', [], (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const numeroPresupuesto = `PRES-${String(countResult.count + 1).padStart(4, '0')}`;
    const fechaActual = new Date().toISOString();
    const fechaVencimiento = fecha_vencimiento || new Date(Date.now() + validezDiasValue * 24 * 60 * 60 * 1000).toISOString();

    const sql = `
      INSERT INTO presupuestos_detallados (
        numero_presupuesto, cliente_id, nombre_cliente, email_cliente, telefono_cliente,
        tipo_trabajo, descripcion, largo, ancho, tipo_material, precio_metro_cuadrado,
        cantidad, precio_material_unitario, subtotal_material, tiempo_estimado_horas,
        precio_hora_mano_obra, subtotal_mano_obra, total, validez_dias, fecha_vencimiento,
        observaciones, estado, created_at, created_by, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, 1)
    `;

    const createdBy = req.user && req.user.userId ? req.user.userId : null;

    db.run(sql, [
      numeroPresupuesto,
      cliente_id || null,
      nombre_cliente,
      email_cliente,
      telefono_cliente || null,
      tipo_trabajo,
      descripcion || null,
      largo || null,
      ancho || null,
      tipo_material,
      precio_metro_cuadrado || null,
      cantidadValue,
      precioMaterialUnitarioValue,
      subtotalMaterialValue,
      tiempoEstimadoHorasValue,
      precioHoraManoObraValue,
      subtotalManoObraValue,
      totalValue,
      validezDiasValue,
      fechaVencimiento,
      observaciones || '',
      fechaActual,
      createdBy
    ], function(err) {
      if (err) {
        console.error('Error al crear presupuesto:', err);
        return res.status(500).json({ error: err.message });
      }

      const presupuestoId = this.lastID;

      insertarHistorial({
        presupuestoId,
        accion: 'Presupuesto creado',
        estadoAnterior: null,
        estadoNuevo: 'PENDIENTE',
        createdBy
      });

      // Obtener el presupuesto completo creado
      const getPresupuestoSql = `
        SELECT 
          pd.*,
          c.nombre as cliente_nombre,
          c.email as cliente_email,
          c.telefono as cliente_telefono,
          c.direccion as cliente_direccion
        FROM presupuestos_detallados pd
        LEFT JOIN clientes c ON pd.cliente_id = c.id
        WHERE pd.id = ?
      `;

      db.get(getPresupuestoSql, [presupuestoId], (err, newPresupuesto) => {
        if (err) {
          console.error('Error al obtener presupuesto creado:', err);
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json({ 
          mensaje: 'Presupuesto creado exitosamente',
          presupuesto: newPresupuesto
        });
      });
    });
  });
});

// PUT - Actualizar estado del presupuesto (público)
router.put('/:id/estado', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const estadosValidos = ['PENDIENTE', ESTADO_RESEÑADO, 'FACTURADO', 'VENCIDO'];
  const estadoFinal = normalizeEstado(estado);
  if (!estadosValidos.includes(estadoFinal)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  db.get('SELECT id, estado FROM presupuestos_detallados WHERE id = ? AND activo = 1', [id], (findErr, presupuestoActual) => {
    if (findErr) {
      return res.status(500).json({ error: findErr.message });
    }
    if (!presupuestoActual) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    const estadoAnterior = normalizeEstado(presupuestoActual.estado);
    const sql = 'UPDATE presupuestos_detallados SET estado = ? WHERE id = ? AND activo = 1';

    db.run(sql, [estadoFinal, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    const createdBy = req.user && req.user.userId ? req.user.userId : null;
    insertarHistorial({
      presupuestoId: Number(id),
      accion: estadoFinal === ESTADO_RESEÑADO ? 'Cliente lo RESEÑÓ' : `Estado actualizado a ${estadoFinal}`,
      estadoAnterior,
      estadoNuevo: estadoFinal,
      createdBy
    });

    res.json({ mensaje: 'Estado actualizado exitosamente' });
  });
  });
});

// POST - Convertir presupuesto a factura (público)
router.post('/:id/convertir-factura', (req, res) => {
  const { id } = req.params;

  // Obtener presupuesto
  db.get('SELECT * FROM presupuestos_detallados WHERE id = ? AND activo = 1 AND UPPER(estado) IN ("PENDIENTE", "SEÑADO", "RESEÑADO")', [id], (err, presupuesto) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado, ya convertido a factura o no disponible para conversión' });
    }

    // Generar número de factura
    db.get('SELECT COUNT(*) as count FROM facturas', [], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const numeroFactura = `FAC-${String(countResult.count + 1).padStart(3, '0')}`;
      
      // Crear factura
      const facturaSql = `
        INSERT INTO facturas (
          numero_factura, presupuesto_id, cliente_id, nombre_cliente, 
          email_cliente, total, estado, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)
      `;

      const createdBy = req.user && req.user.userId ? req.user.userId : null;

      db.run(facturaSql, [
        numeroFactura, id, presupuesto.cliente_id, presupuesto.nombre_cliente,
        presupuesto.email_cliente, presupuesto.total, new Date().toISOString(), createdBy
      ], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Actualizar el estado del presupuesto a 'facturado'
        db.run('UPDATE presupuestos_detallados SET estado = "FACTURADO" WHERE id = ? AND activo = 1', [id], (updateErr) => {
          if (updateErr) {
            console.error('Error al actualizar estado del presupuesto:', updateErr);
          } else {
            const createdBy = req.user && req.user.userId ? req.user.userId : null;
            insertarHistorial({
              presupuestoId: Number(id),
              accion: 'Se FACTURÓ',
              estadoAnterior: normalizeEstado(presupuesto.estado),
              estadoNuevo: 'FACTURADO',
              createdBy
            });
          }
        });

        res.status(201).json({ 
          mensaje: 'Presupuesto convertido a factura exitosamente',
          numero_factura: numeroFactura,
          factura_id: this.lastID
        });
      });
    });
  });
});

// DELETE - Eliminar presupuesto (público)
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT id, estado FROM presupuestos_detallados WHERE id = ? AND activo = 1', [id], (findErr, presupuesto) => {
    if (findErr) {
      return res.status(500).json({ error: findErr.message });
    }
    if (!presupuesto) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' });
    }

    db.run('UPDATE presupuestos_detallados SET activo = 0 WHERE id = ? AND activo = 1', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Presupuesto no encontrado' });
      }

      const createdBy = req.user && req.user.userId ? req.user.userId : null;
      insertarHistorial({
        presupuestoId: Number(id),
        accion: 'Presupuesto eliminado (borrado lógico)',
        estadoAnterior: normalizeEstado(presupuesto.estado),
        estadoNuevo: null,
        createdBy
      });

      res.json({ mensaje: 'Presupuesto desactivado exitosamente' });
    });
  });
});

module.exports = router;