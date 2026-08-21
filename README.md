# Gestor de Credenciales (equipo de 3 personas)

Aplicación web privada para guardar contraseñas y correos del equipo, con:

- **Login real** (Supabase Auth) — solo entran las personas que tú invites, no hay registro público.
- **Bóveda cifrada**: cada contraseña se cifra en el navegador con **AES-256-GCM** usando una
  clave maestra que solo conocen las 3 personas. El servidor (Supabase) **nunca ve las
  contraseñas en texto plano**, solo el texto cifrado.
- Ficha por credencial: servicio, correo, contraseña, **enlaces/campos personalizados**
  (nombre + link, repetibles con un botón "+" — para el sitio web, a qué está atado, endpoints
  de una API, documentación, etc.), **titular/responsable**, categoría (editable por el admin),
  notas, favoritos y orden personal por persona.
- Filtros por categoría, titular, favoritos y búsqueda de texto libre; orden por fecha, nombre o
  a mano (arrastrar y soltar).
- Compartir credenciales con todo el equipo o solo con personas específicas.
- **Actualizaciones en vivo**: si alguien más agrega, edita o elimina algo, se refleja al
  instante sin recargar la página.
- Generador de contraseñas seguras y medidor de fortaleza.
- Auto-bloqueo tras 15 minutos de inactividad, copiar-al-portapapeles con autoborrado a los 20s,
  registro de auditoría (quién creó/editó/compartió cada credencial), papelera lógica (soft
  delete) en vez de borrado irreversible.
- Modo oscuro/claro y vista de tarjetas o de lista, a elección de cada persona.

## Arquitectura

```
Navegador (React + Vite, hosteado en Vercel)
   │  HTTPS
   ▼
Supabase (Postgres + Auth)
   - Auth: valida el login de cada persona (contraseñas con hash, no en texto plano)
   - Postgres + RLS: guarda las credenciales; solo usuarios autenticados pueden leer/escribir
   - Las contraseñas viajan y se guardan YA cifradas por el navegador (AES-256-GCM)
```

No hay backend propio que mantener: Supabase actúa como base de datos + autenticación
("Backend as a Service"), con capa gratuita suficiente para 3 usuarios.

---

## 1. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) → crea una cuenta gratuita → **New project**.
2. Guarda la contraseña de base de datos que te pida (no es la que usarán los 3 usuarios, es solo
   administrativa).
3. Cuando el proyecto esté listo, ve a **SQL Editor** → **New query**, y ejecuta (▶ Run), **en
   este orden**, el contenido completo de cada archivo en [`supabase/`](supabase):
   1. `schema.sql`
   2. `migration_002_roles_categories_sharing.sql`
   3. `migration_003_personal_favorites_order.sql`
   4. `migration_004_lock_ownership_fields.sql`
   5. `migration_005_block_public_signup.sql`
   6. `migration_006_dynamic_links.sql`
   7. `migration_007_realtime.sql`
   8. `migration_008_fix_signup_case_sensitivity.sql`

   Esto crea las tablas, los triggers y las políticas de seguridad (RLS). Si en el futuro
   agrego más migraciones numeradas, corre solo las que aún no hayas ejecutado.
4. Ve a **Authentication → Sign In / Providers → Email** y **activa** "Enable email provider"
   (lo necesitas para poder iniciar sesión). El registro público se bloquea aparte, a nivel de
   base de datos, con `migration_005_block_public_signup.sql` — ver la sección de Seguridad más
   abajo.
5. Ve a **Authentication → Users → Invite user** y agrega los 3 correos del equipo (uno por uno).
   Cada persona recibirá un correo para fijar su contraseña de acceso.
   - Opcional: al invitar, en "User Metadata" puedes agregar `{"full_name": "Nombre Apellido"}`
     para que su nombre se vea bien en la app (si no, se usa la parte del correo antes del `@`).
6. Ve a **Project Settings → API** y copia:
   - **Project URL** → será `VITE_SUPABASE_URL`
   - **anon public key** → será `VITE_SUPABASE_ANON_KEY`
   (la `anon key` está pensada para ser pública en el frontend; la protección real la da RLS).

## 2. Configurar el proyecto localmente

```bash
npm install
cp .env.example .env
# edita .env y pega tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Abre `http://localhost:5173`. Inicia sesión con uno de los 3 correos invitados. La **primera
persona** que entre verá la pantalla "Configurar bóveda por primera vez": ahí se crea la
**clave maestra del equipo** (distinta de la contraseña de login de cada quien). Compártanla
entre los 3 por un medio seguro (en persona o llamada, no por el mismo correo/chat donde
guardan contraseñas). Esa clave no se guarda en ningún lado — si se pierde, las contraseñas
guardadas no se pueden recuperar, así que anótenla en un lugar físico seguro además de
memorizarla.

## 3. Subir el código a GitHub

```bash
git init
git add .
git commit -m "Gestor de credenciales inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

El `.gitignore` ya excluye tu `.env`, así que las claves de Supabase no se suben al repo.

> El repo de este proyecto es público. Eso es seguro porque el código no contiene secretos (las
> claves se inyectan al compilar) — pero si prefieres privado, ten en cuenta que Vercel/Netlify en
> plan gratis no despliegan repos **privados de una organización** de GitHub (sí de una cuenta
> personal). Si tu repo vive en una organización, o lo haces público o usas un plan pago.

## 4. Desplegar en Vercel (automático)

1. Entra a [vercel.com](https://vercel.com) → **Add New → Project**.
2. Autoriza a Vercel a acceder a tu cuenta/organización de GitHub si te lo pide, y selecciona el
   repo de este proyecto.
3. Vercel detecta automáticamente que es un proyecto **Vite** — no cambies nada del build command
   ni del output directory por defecto.
4. Antes de darle a Deploy (o después, en **Settings → Environment Variables**), agrega:
   - `VITE_SUPABASE_URL` → la URL de tu proyecto de Supabase
   - `VITE_SUPABASE_ANON_KEY` → tu anon/public key de Supabase
5. **Deploy**. En 1-2 minutos te da una URL final (algo como
   `https://gestor-credenciales.vercel.app`).

De ahí en adelante, cada `git push` a `main` vuelve a desplegar solo — no hace falta repetir estos
pasos.

## 5. Seguridad — resumen de las capas aplicadas

- **Autenticación real** por persona vía Supabase Auth (hash seguro de contraseñas, sin registro
  público).
- **Row Level Security** en Postgres: solo usuarios autenticados pueden leer/escribir, y cada
  fila registra quién la creó/modificó.
- **Cifrado de extremo a extremo para las contraseñas**: AES-256-GCM derivado con PBKDF2
  (250,000 iteraciones) desde la clave maestra del equipo; el valor cifrado es lo único que
  llega a la base de datos.
- **HTTPS** en tránsito (Vercel y Supabase lo fuerzan).
- **Auto-bloqueo** de la bóveda tras 15 min inactivo (borra la clave de cifrado de la memoria).
- **Portapapeles con autoborrado** a los 20 segundos tras copiar una contraseña.
- **Papelera lógica** (soft delete): "Eliminar" no borra físicamente el registro, evita pérdidas
  accidentales.
- **CSP** (Content-Security-Policy) restrictiva, aplicada dos veces: como cabecera HTTP real
  (`vercel.json`, incluye `frame-ancestors` contra clickjacking) y como respaldo en `index.html`.
  Limitada al dominio exacto de tu proyecto de Supabase.
- Cabeceras adicionales en `vercel.json`: `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`.
- **Registro de auditoría** (`audit_log`): queda constancia de quién creó, eliminó o cambió con
  quién se comparte cada credencial, y cuándo. Consultable desde el SQL Editor de Supabase:
  `select * from audit_log order by created_at desc;`.
- Nunca se usa la `service_role key` de Supabase (esa sí es secreta) en el frontend; solo la
  `anon key`, diseñada para exponerse en el navegador.
- A nivel de base de datos, nadie puede reasignar de quién es una credencial ni tocar su fecha de
  creación desde fuera de la app (protegido con un trigger, no solo con la interfaz).
- **Copia de seguridad** (⚙️ Configuración, solo admin): exporta toda la bóveda a un archivo. Las
  contraseñas quedan en el archivo tal como están cifradas (nunca en texto plano), así que es tan
  seguro como la base de datos misma. Sirve para recuperación ante desastres si Supabase llegara a
  perder datos — el plan gratis tiene retención de backups limitada, así que exportar de vez en
  cuando (y guardar el archivo en un lugar de confianza, ej. OneDrive del equipo) es la única red
  de seguridad adicional que tienen hoy.

### ⚠️ Registro público: cerrado a nivel de base de datos, no en el dashboard

El dashboard de Supabase no permite dejar el login activado sin también permitir registro público,
así que eso se cierra aparte con `migration_005_block_public_signup.sql` (lista blanca de correos
+ trigger). Confirma que la corriste.

**Para agregar a una 4ta persona en el futuro:**
1. SQL Editor: `insert into public.allowed_signup_emails (email) values ('correo@dominio.com');`
2. Recién después, créala en **Authentication → Users → Add user**. Si te saltas el paso 1, la
   creación falla con un mensaje de "Registro no permitido" (funcionando como debe).

El mínimo de la contraseña de login está en 12 caracteres (**Authentication → Sign In / Providers
→ Email → Minimum password length**) — no afecta la clave maestra de la bóveda (esa ya exige 10+
desde la app). Solo aplica a contraseñas nuevas o cambiadas; si alguien tiene una más corta de
antes, puede actualizarla desde **Cambiar mi contraseña** en la app.

**Importante:** ningún sistema es 100% infalible. Evita reutilizar la clave maestra del equipo
en otros sitios, y si alguien deja el equipo, cambia esa clave maestra (implica volver a guardar
todas las credenciales existentes, ya que quedarán cifradas con la clave vieja) y revócale el
acceso en Supabase (**Authentication → Users → borrar/deshabilitar**).

## Scripts

```bash
npm run dev       # desarrollo local
npm run build     # build de producción (dist/)
npm run preview   # sirve el build localmente para probarlo
npm run lint      # revisa el código
```
