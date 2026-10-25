import { redirect } from 'next/navigation'

// El alta de nóminas se hace exclusivamente por el wizard. Esta ruta legacy
// (formulario directo + vista de detalle editable) quedó reemplazada por el
// flujo del wizard, único lugar para crear y editar una nómina.
export default function NuevaNominaRedirect() {
  redirect('/dashboard/nomina/nueva/wizard')
}
