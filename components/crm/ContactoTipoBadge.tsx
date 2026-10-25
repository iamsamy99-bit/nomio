import { tipoBadgeClass, tipoContactoLabel } from '@/lib/crm/contacto-meta'
import type { TipoContacto } from '@/types'

export default function ContactoTipoBadge({ tipo }: { tipo: TipoContacto | string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tipoBadgeClass(tipo)}`}>
      {tipoContactoLabel(tipo)}
    </span>
  )
}
