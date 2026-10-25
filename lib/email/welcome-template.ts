const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export function buildWelcomeEmail(name?: string): string {
  const firstName = name?.split(' ')[0] ?? 'por aquí'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a NomiExtra</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F4F2;font-family:'Inter Tight',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F4F2;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:700;color:#1C1917;letter-spacing:-0.5px;">NomiExtra</span>
              <span style="display:block;font-size:11px;color:#78716C;letter-spacing:0.1em;text-transform:uppercase;margin-top:3px;">Nóminas para construcción</span>
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="background:#2D6A4F;border-radius:16px;padding:40px 40px 36px;">
              <div style="font-size:32px;margin-bottom:16px;">🏗️</div>
              <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#FFFFFF;line-height:1.3;">
                Bienvenido, ${firstName}
              </h1>
              <p style="margin:0;font-size:15px;color:#A7D8BE;line-height:1.6;">
                Tu cuenta en NomiExtra está lista. Ya puedes gestionar nóminas, registrar trabajadores y controlar asistencias desde un solo lugar.
              </p>
            </td>
          </tr>

          <!-- Steps -->
          <tr>
            <td style="padding-top:12px;background:#FFFFFF;border-radius:16px;border:1px solid #E7E5E4;margin-top:12px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 40px;">
                <tr>
                  <td>
                    <p style="margin:0 0 20px;font-size:12px;font-weight:700;color:#1C1917;text-transform:uppercase;letter-spacing:0.08em;">Empieza en 3 pasos</p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width:32px;height:32px;background:#E8F3ED;border-radius:8px;font-size:14px;font-weight:700;color:#2D6A4F;line-height:32px;text-align:center;">1</div>
                        </td>
                        <td valign="top" style="padding-left:12px;">
                          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#1C1917;">Configura tu empresa</p>
                          <p style="margin:0;font-size:13px;color:#78716C;">Nombre, logo, IMSS e ISR según tus necesidades.</p>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width:32px;height:32px;background:#E8F3ED;border-radius:8px;font-size:14px;font-weight:700;color:#2D6A4F;line-height:32px;text-align:center;">2</div>
                        </td>
                        <td valign="top" style="padding-left:12px;">
                          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#1C1917;">Agrega a tus trabajadores</p>
                          <p style="margin:0;font-size:13px;color:#78716C;">Modalidad de pago (día, hora o sueldo fijo) y tarifas.</p>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td width="40" valign="top">
                          <div style="width:32px;height:32px;background:#E8F3ED;border-radius:8px;font-size:14px;font-weight:700;color:#2D6A4F;line-height:32px;text-align:center;">3</div>
                        </td>
                        <td valign="top" style="padding-left:12px;">
                          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#1C1917;">Genera tu primera nómina</p>
                          <p style="margin:0;font-size:13px;color:#78716C;">Registra asistencias y en minutos la nómina está lista.</p>
                        </td>
                      </tr>
                    </table>

                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-radius:10px;background:#2D6A4F;">
                          <a href="${APP_URL}/dashboard"
                             style="display:inline-block;padding:14px 28px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;">
                            Ir a mi dashboard →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#A8A29E;">NomiExtra · Nóminas para construcción en México</p>
              <p style="margin:6px 0 0;font-size:12px;color:#A8A29E;">¿Tienes dudas? Responde este correo y te ayudamos.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
