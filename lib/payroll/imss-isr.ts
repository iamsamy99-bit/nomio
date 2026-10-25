/**
 * Tasas IMSS 2026 y tabla ISR 2026 mensual (SAT Art. 96 LISR).
 * Solo cuotas obreras — las patronales se muestran informativamente en el recibo.
 */

export const UMA_DIARIA_2026 = 113.14        // DOF 2026
export const SBC_MAX_DIAS = 25               // tope: 25 UMAs diarias
export const SBC_MAX_DIARIO = UMA_DIARIA_2026 * SBC_MAX_DIAS // $2,828.50

// Cuotas obreras IMSS (% sobre SBC acumulado del período)
const IMSS_OBRERO_TASA = 0.03275 // 0.40 + 1.125 + 0.625 + 1.125 = 3.275%

/**
 * IMSS obrero = 3.275% del SBC del período.
 * SBC diario se topa a 25 UMAs.
 */
export function calcularIMSSObrero(sbcDiario: number, diasTrabajados: number): number {
  const sbcCapped = Math.min(sbcDiario, SBC_MAX_DIARIO)
  return round2(sbcCapped * diasTrabajados * IMSS_OBRERO_TASA)
}

// Tabla ISR mensual 2026 (SAT — DOF enero 2026)
// [limiteInferior, limiteSuperior, cuotaFija, tasaSobreExcedente]
const TABLA_ISR_MENSUAL: [number, number, number, number][] = [
  [0.01,       746.04,    0,          0.0192],
  [746.04,     6_332.05,  14.32,      0.0640],
  [6_332.05,   11_128.01, 371.83,     0.1088],
  [11_128.01,  12_935.82, 893.63,     0.1600],
  [12_935.82,  15_487.71, 1_182.88,   0.1792],
  [15_487.71,  31_236.49, 1_640.18,   0.2136],
  [31_236.49,  49_233.00, 5_004.12,   0.2352],
  [49_233.00,  93_993.90, 9_236.89,   0.3000],
  [93_993.90,  125_325.20, 22_665.17, 0.3200],
  [125_325.20, 375_975.61, 32_691.18, 0.3400],
  [375_975.61, Infinity,   117_912.32, 0.3500],
]

/**
 * ISR mensual retenido según tabla SAT 2026.
 * ingresoMensual = total bruto del período (extrapolado o real).
 */
export function calcularISRMensual(ingresoMensual: number): number {
  if (ingresoMensual <= 0) return 0
  for (const [li, ls, cuota, tasa] of TABLA_ISR_MENSUAL) {
    if (ingresoMensual >= li && ingresoMensual < ls) {
      return round2(cuota + (ingresoMensual - li) * tasa)
    }
  }
  return 0
}

/**
 * Convierte ISR mensual a proporcional según días del período sobre 30.
 * @deprecated Subestima el ISR porque la base es solo sbcDiario*30 e ignora
 * horas extra y conceptos del período. Usar calcularISRPeriodo con el ingreso
 * bruto real. Se conserva por compatibilidad.
 */
export function calcularISRProporcional(sbcDiario: number, diasTrabajados: number): number {
  const ingresoMensualEquivalente = sbcDiario * 30
  const isrMensual = calcularISRMensual(ingresoMensualEquivalente)
  const proporcion = Math.min(diasTrabajados / 30, 1)
  return round2(isrMensual * proporcion)
}

/**
 * ISR retenido del período sobre el ingreso BRUTO real pagado (salario base +
 * horas extra + conceptos de suma), no solo el salario base. Cumple Art. 96 LISR
 * (ISR sobre el ingreso total del período). Extrapola el promedio diario del
 * período a una base mensual de 30 días, aplica la tabla SAT y reescala a los
 * días trabajados.
 */
export function calcularISRPeriodo(ingresoPeriodo: number, diasTrabajados: number): number {
  if (ingresoPeriodo <= 0 || diasTrabajados <= 0) return 0
  const ingresoMensualEquivalente = (ingresoPeriodo / diasTrabajados) * 30
  const isrMensual = calcularISRMensual(ingresoMensualEquivalente)
  const proporcion = Math.min(diasTrabajados / 30, 1)
  return round2(isrMensual * proporcion)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
