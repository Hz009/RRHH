# Guía del portal de Recursos Humanos

**LinguaMeeting HRIS.** Documento de lectura rápida. Octubre 2026.

Este portal es la herramienta interna de Recursos Humanos de LinguaMeeting. Sirve para llevar la plantilla, las vacaciones, los documentos, los préstamos y los pagos desde un solo sitio.

Se abre en el navegador, en `http://localhost:3000`. Si no hay sesión, pide usuario y contraseña. La primera vez que una cuenta es nueva, obliga a cambiar la contraseña.

Hay tres tipos de usuario. Cada uno ve un menú distinto.

- **Admin.** Ve y gestiona todo: altas, sueldos, pagos, aprobaciones.
- **Manager.** Ve a las personas de su equipo y puede aprobar sus vacaciones.
- **Empleado.** Ve su propia ficha, sus vacaciones, sus documentos, sus préstamos y sus pagos.

---

## Lo que ya se puede usar

### Inicio (Dashboard)

Es la primera pantalla después de entrar.

El admin ve cuántos empleados hay, cuántos están activos, préstamos abiertos, vacaciones por aprobar y una estimación de la nómina del mes. También ve pagos pendientes, documentos sin confirmar, vacaciones esperando respuesta y un gráfico de lo pagado en los últimos meses, separado por tipo de contrato.

El manager ve el tamaño de su equipo y las alertas de ese equipo. El empleado ve un resumen personal.

Quien vive en España (y el admin) puede abrir el calendario de festivos nacionales de España. No incluye festivos de comunidades ni locales.

Al entrar, manager y empleado ven un aviso si tienen documentos por leer o vacaciones ya aprobadas.

Si la persona cobra por horas y ficha ella misma, en el inicio aparece el botón de entrada y salida.

### Empleados

Listado de la plantilla. El admin da de alta y edita. El manager solo ve a su equipo. El empleado solo ve su ficha.

Cada persona tiene un perfil con:

- Datos personales: nombre, email, teléfono, nacionalidad, residencia, documento de identidad y dirección.
- Datos laborales: departamento, cargo, fecha de alta, estado (activo, de baja o inactivo) y días de vacaciones al año.
- Tipo de contrato: tiempo completo, tiempo parcial o pago por horas.
- Cómo se cobra: banco, PayPal o Wise, con los datos de la cuenta.
- Sueldo o tarifa por hora, y moneda.
- Bonos del mes y documentos que ya confirmó.

Desde la ficha se abre:

- **Historial salarial.** Cambios de sueldo, con fecha y motivo. El sueldo actual se actualiza solo.
- **Historial de cargo y departamento.** Lo mismo, para puesto y área.
- **Bonos.** Importes extra de un mes. Se suman al pago de ese mes. El admin los crea o los cambia mientras el mes no esté pagado.
- **Tiempo y bolsa de horas.** Fichajes (entrada y salida) y saldo de horas libres. La bolsa es para tiempo completo y parcial. El fichaje es para quien cobra por horas y tiene marcado “fichaje”. El resto de las horas por horas las carga administración a mano, mes a mes.
- **Contraseña de acceso.** El admin puede poner una nueva desde la edición de la ficha.

Al dar de alta a alguien, el portal crea su usuario de acceso con el email de la ficha.

### Vacaciones

Cualquiera puede pedir vacaciones. Se ve el saldo de días, un calendario y el listado de solicitudes.

Admin y manager aprueban o rechazan las de su ámbito. El sistema comprueba que las fechas no se pisen y que no se pidan más días de los que quedan.

### Documentos

Contratos, políticas y otros archivos. El admin los sube y los asigna a una persona o a toda la plantilla. Quien lo recibe lo abre y confirma que lo leyó. El admin ve a quién está asignado y quién falta por confirmar.

### Préstamos

Listado de préstamos, con estado: pendiente, activo, pagado, incumplido o cancelado.

Un empleado puede solicitar uno. El admin lo aprueba o lo rechaza, registra los pagos y ve el saldo y las cuotas.

### Pagos

Solo lo ve el admin. Es la pantalla del menú llamada “Pagos”.

Ahí se elige el mes, se cargan las horas de quien cobra por horas, se ven filtros (persona, tipo de contrato, estado, método de pago) y se registran los pagos del mes. El total incluye el sueldo o las horas, más los bonos de ese periodo.

### Portal del empleado

La vista personal: nombre, departamento y cargo, saldo de la bolsa de horas (si aplica), botón de fichaje (si aplica) e historial de pagos. Cada pago muestra mes, tipo, método, base, bonos, horas y total.

---

## Lo que está en el menú, pero aún no funciona

Estas pantallas existen para no perder el sitio en el menú. Al abrirlas solo dicen que el módulo está preparado para más adelante. La base de datos ya tiene sitio para varios de ellos.

- **Fichaje y asistencia** (la pantalla del menú). El fichaje real no está ahí: está en el inicio, en el portal del empleado y en “Tiempo y bolsa de horas” de la ficha.
- **Roles y permisos.** La pantalla está vacía. Los tres roles sí funcionan en el resto del portal.
- **Auditoría.** Aún no hay pantalla para consultar el historial de cambios. El sistema sí guarda registros por detrás.
- **Organigrama.**
- **Onboarding** (incorporación).
- **Offboarding** (salida).
- **Notificaciones** (el centro de avisos del menú). Los avisos al entrar sí funcionan; esta pantalla todavía no.

Más adelante está pensado añadir recibos en PDF, evaluaciones, avisos por email, beneficios y un segundo factor al entrar. Eso todavía no está.

---

## Quién puede hacer qué

| | Admin | Manager | Empleado |
|---|---|---|---|
| Empleados | Ver, crear y editar a todos | Ver a su equipo | Ver solo su ficha |
| Sueldo, cargo, bonos | Gestionar | Ver los de su equipo | Ver los suyos |
| Vacaciones | Aprobar todas | Aprobar las de su equipo | Pedir y ver las suyas |
| Documentos | Subir y asignar | Ver los de su equipo | Ver los suyos y los globales, y confirmar lectura |
| Préstamos | Aprobar y registrar pagos | Ver los de su equipo | Pedir y ver los suyos |
| Pagos del mes | Registrar | No | Ver su propio historial |
| Festivos de España | Sí | Solo si reside en España | No |
| Auditoría, roles, onboarding, offboarding, organigrama | En el menú, aún sin uso | No aparecen | No aparecen |

---

## Dónde vive la información

Los datos están en Supabase (base de datos, usuarios y archivos). El panel del proyecto es:

https://supabase.com/dashboard/project/iuqpnefqsitxtwsjkdoh

Las contraseñas no se pueden leer desde ahí. Solo se pueden cambiar.
