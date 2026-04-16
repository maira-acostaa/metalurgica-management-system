function calcularPresupuesto({
  costoMaterial,
  costoManoObra,
  porcentajeDesperdicio = 10,
  margenGanancia = 30
}) {
  if (costoMaterial < 0 || costoManoObra < 0) {
    throw new Error('Los costos deben ser valores positivos');
  }

  if (porcentajeDesperdicio < 0 || porcentajeDesperdicio > 100) {
    throw new Error('El porcentaje de desperdicio debe estar entre 0 y 100');
  }

  if (margenGanancia < 0 || margenGanancia > 100) {
    throw new Error('El margen de ganancia debe estar entre 0 y 100');
  }

  const montoDesperdicio = (costoMaterial * porcentajeDesperdicio) / 100;
  
  const subtotal = costoMaterial + costoManoObra + montoDesperdicio;
  
  const montoMargen = (subtotal * margenGanancia) / 100;
  
  const total = subtotal + montoMargen;

  return {
    desglose: {
      costoMaterial: Math.round(costoMaterial * 100) / 100,
      costoManoObra: Math.round(costoManoObra * 100) / 100,
      montoDesperdicio: Math.round(montoDesperdicio * 100) / 100,
      porcentajeDesperdicio,
      montoMargen: Math.round(montoMargen * 100) / 100,
      margenGanancia
    },
    subtotal: Math.round(subtotal * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}

function calcularCostoMaterial({
  precioPorMetro,
  largo,
  ancho,
  cantidad = 1
}) {
  if (precioPorMetro < 0 || largo < 0 || ancho < 0 || cantidad < 1) {
    throw new Error('Los parámetros deben ser valores positivos');
  }

  const superficieUnitaria = largo * ancho;
  const superficieTotal = superficieUnitaria * cantidad;
  const costoTotal = superficieTotal * precioPorMetro;

  return {
    superficieUnitaria: Math.round(superficieUnitaria * 100) / 100,
    superficieTotal: Math.round(superficieTotal * 100) / 100,
    cantidad,
    precioPorMetro: Math.round(precioPorMetro * 100) / 100,
    costoTotal: Math.round(costoTotal * 100) / 100
  };
}

function calcularCostoManoObra({
  tarifaHoraria,
  horasEstimadas,
  multiplicadorComplejidad = 1
}) {
  if (tarifaHoraria < 0 || horasEstimadas < 0 || multiplicadorComplejidad < 0) {
    throw new Error('Los parámetros deben ser valores positivos');
  }

  const horasAjustadas = horasEstimadas * multiplicadorComplejidad;
  const costoTotal = horasAjustadas * tarifaHoraria;

  return {
    tarifaHoraria: Math.round(tarifaHoraria * 100) / 100,
    horasEstimadas: Math.round(horasEstimadas * 100) / 100,
    multiplicadorComplejidad: Math.round(multiplicadorComplejidad * 100) / 100,
    horasAjustadas: Math.round(horasAjustadas * 100) / 100,
    costoTotal: Math.round(costoTotal * 100) / 100
  };
}

function calcularPresupuestoArticulos({
  articulos,
  porcentajeDesperdicio = 10,
  margenGanancia = 30
}) {
  if (!Array.isArray(articulos) || articulos.length === 0) {
    throw new Error('Debe proporcionar al menos un artículo');
  }

  let costoMaterial = 0;
  let costoManoObra = 0;

  const articulosCalculados = articulos.map(articulo => {
    const cantidad = articulo.cantidad || 1;
    const precioUnitario = articulo.precioUnitario || 0;
    const subtotal = cantidad * precioUnitario;

    if (articulo.tipo === 'material') {
      costoMaterial += subtotal;
    } else if (articulo.tipo === 'mano_obra') {
      costoManoObra += subtotal;
    } else {
      costoMaterial += subtotal;
    }

    return {
      ...articulo,
      subtotal: Math.round(subtotal * 100) / 100
    };
  });

  const presupuesto = calcularPresupuesto({
    costoMaterial,
    costoManoObra,
    porcentajeDesperdicio,
    margenGanancia
  });

  return {
    ...presupuesto,
    articulos: articulosCalculados
  };
}

function obtenerMultiplicadorComplejidad(complejidad) {
  const multiplicadores = {
    'baja': 0.8,
    'media': 1.0,
    'alta': 1.5
  };

  return multiplicadores[complejidad?.toLowerCase()] || 1.0;
}

module.exports = {
  calcularPresupuesto,
  calcularCostoMaterial,
  calcularCostoManoObra,
  calcularPresupuestoArticulos,
  obtenerMultiplicadorComplejidad
};
