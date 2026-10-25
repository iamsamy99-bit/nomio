interface LukaIconProps {
  size?: number
  /** Color del sparkle principal. Default blanco para fondo oscuro. */
  color?: string
  /** Color del acento secundario. Default verde-teal de marca. */
  accent?: string
}

/**
 * Icono de marca para el asistente "Luka AI".
 * Sparkle de 4 puntas (lenguaje visual universal de IA) con un acento
 * verde-teal que conecta con el gradiente de la N de Nomiextra.
 */
export function LukaIcon({ size = 24, color = '#FAF6EF', accent = '#3DDC84' }: LukaIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      {/* Sparkle principal: estrella de 4 puntas con lados cóncavos */}
      <path
        d="M12 2.5
           C12.6 6.7 13.3 7.4 17.5 8
           C13.3 8.6 12.6 9.3 12 13.5
           C11.4 9.3 10.7 8.6 6.5 8
           C10.7 7.4 11.4 6.7 12 2.5 Z"
        fill={color}
      />
      {/* Sparkle secundario, abajo-derecha, en acento de marca */}
      <path
        d="M17.5 13.5
           C17.8 16 18.1 16.3 20.5 16.6
           C18.1 16.9 17.8 17.2 17.5 19.7
           C17.2 17.2 16.9 16.9 14.5 16.6
           C16.9 16.3 17.2 16 17.5 13.5 Z"
        fill={accent}
      />
      {/* Punto de acento pequeño, abajo-izquierda */}
      <circle cx="7.5" cy="17" r="1.6" fill={color} opacity="0.85" />
    </svg>
  )
}

export default LukaIcon
