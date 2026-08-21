# Gestor de Credenciales (equipo de 3 personas)

Aplicación web privada para guardar contraseñas y correos del equipo, con:

- **Login real** (Supabase Auth) — solo entran las personas que tú invites, no hay registro público.
- **Bóveda cifrada**: cada contraseña se cifra en el navegador con **AES-256-GCM** usando una
  clave maestra que solo conocen las 3 personas. El servidor (Supabase) **nunca ve las
  contraseñas en texto plano**, solo el texto cifrado.
- Ficha por credencial: servicio, correo, contraseña, **a qué está atado** (tarjeta, dominio,
  cliente, etc.), **titular/responsable**, categoría, notas, favoritos.
- Filtros por categoría, titular, favoritos y búsqueda de texto libre; orden por fecha o nombre.
- Generador de contraseñas seguras y medidor de fortaleza.
- Auto-bloqueo tras 15 minutos de inactividad, copiar-al-portapapeles con autoborrado a los 20s,
  registro de quién creó/editó cada credencial, papelera lógica (soft delete) en vez de borrado
  irreversible.

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
3. Cuando el proyecto esté listo, ve a **SQL Editor** → **New query**, pega el contenido completo
   de [`supabase/schema.sql`](supabase/schema.sql) y ejecútalo (▶ Run). Esto crea las tablas,
   los triggers y las políticas de seguridad (RLS).
4. Ve a **Authentication → Providers → Email** y **desactiva** "Allow new users to sign up"
   (o equivalente "Enable email signups"). Así nadie puede crearse una cuenta por su cuenta;
   solo entran las personas que tú invites.
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

Usa un **repositorio privado** en GitHub (Settings → General → Danger Zone si necesitas
cambiarlo). El `.gitignore` ya excluye tu `.env`, así que las claves de Supabase no se suben.

## 4. Desplegar en Vercel (automático)

El repo es privado, así que en vez de GitHub Pages (que solo publica repos privados en el plan
Enterprise) se usa Vercel, que sí tiene plan gratis con repos privados.

1. Entra a [vercel.com](https://vercel.com) → **Add New → Project**.
2. Autoriza a Vercel a acceder a tu organización/repo de GitHub si te lo pide, y selecciona
   `Sandbox-Transformacion-GC/gestor-credenciales`.
3. Vercel detecta automáticamente que es un proyecto **Vite** — no cambies nada del build command
   ni del output directory por defecto.
4. Antes de darle a Deploy (o después, en **Settings → Environment Variables**), agrega:
   - `VITE_SUPABASE_URL` → `https://wibkzheavbyjxiwctkxz.supabase.co`
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
- **CSP** (Content-Security-Policy) restrictiva en `index.html`.
- Nunca se usa la `service_role key` de Supabase (esa sí es secreta) en el frontend; solo la
  `anon key`, diseñada para exponerse en el navegador.

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
