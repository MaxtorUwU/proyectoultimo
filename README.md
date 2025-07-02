# MiPortalEstudiantil

Plataforma web para la gestión de horarios, asignaturas y evaluaciones universitarias, con panel de usuario y panel de administración.

---

## Requisitos

- Node.js (v18 o superior)
- npm
- PostgreSQL
- pgAdmin 4 (opcional, para administrar la base de datos)

---

## Instalación paso a paso

1. **Instala Node.js y npm**
   - Descarga desde [https://nodejs.org/](https://nodejs.org/) (elige la versión LTS).
   - Verifica en la terminal:
     ```sh
     node -v
     npm -v
     ```

2. **Instala PostgreSQL**
   - Descarga desde [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
   - Instala y recuerda el usuario, contraseña y puerto.

3. **Descarga este proyecto**
   - Descarga el ZIP o clona el repositorio:
     ```sh
     git clone <url-del-repo>
     cd proyecto-master
     ```

4. **Instala las dependencias**
   ```sh
   npm install
   ```

5. **Configura el archivo `.env`**
   - Crea un archivo `.env` en la raíz del proyecto con este contenido (ajusta los datos según tu instalación):
     ```
     DB_HOST=localhost
     DB_PORT=5432
     DB_NAME=proyectoful
     DB_USER=postgres
     DB_PASSWORD=tu_password
     SESSION_SECRET=unsecretoseguro
     JWT_SECRET=miSuperClaveSecreta2024!$%&/()
     ```

6. **Crea la base de datos y restaura el backup**
   - Abre pgAdmin 4 o usa la terminal de PostgreSQL.
   - Crea la base de datos:
     ```sql
     CREATE DATABASE proyectoful;
     ```
   - Restaura el backup entregado:
     - En pgAdmin, clic derecho sobre la base de datos → Restore...
     - Selecciona el archivo `.backup`, `.tar` o `.sql` que recibiste.

7. **Inicia el servidor**
   ```sh
   node index.js
   ```

8. **Abre la aplicación**
   - Ve a [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Notas

- La base de datos se debe restaurar **usando el backup entregado**. No es necesario crear tablas manualmente.
- Si tienes problemas con la base de datos, revisa la configuración en `.env`.
- Puedes modificar los estilos en la carpeta `public/css`.
- **Recuperación de contraseña:**  
  El sistema utiliza [Nodemailer](https://nodemailer.com/about/) para enviar correos de recuperación.  
  Por defecto, los enlaces de recuperación usan la URL del servidor donde se ejecuta la app (por ejemplo, `localhost` en desarrollo).  
  Si despliegas la aplicación en producción, puedes modificar el enlace generado para que apunte a tu dominio real (por ejemplo, `https://tudominio.com/auth/restablecer/...`).  
  Nodemailer solo envía el enlace que tú definas en el código, así que puedes personalizarlo según tu entorno.

---

## Estructura del proyecto

- `/controllers` — Lógica de negocio y conexión a la base de datos
- `/routes` — Definición de rutas de la app
- `/views` — Plantillas Handlebars para la interfaz
- `/public` — Archivos estáticos (CSS, imágenes, uploads)
- `/db` — Conexión a la base de datos
- `/middleware` — Middlewares de autenticación

---

---

## Subida de imágenes de perfil (Multer)

La aplicación utiliza [multer](https://www.npmjs.com/package/multer) para permitir que los usuarios y el administrador suban su foto de perfil.

- Las imágenes se almacenan en la carpeta `/public/uploads`.
- El campo del formulario para la foto debe llamarse `foto`.
- Si no subes una imagen, se mantiene la foto anterior o se muestra un avatar por defecto.

**No es necesario configurar nada extra:**  
Multer ya está integrado y configurado en las rutas correspondientes.

---

## Funcionalidades principales

- Registro y login para alumnos, profesores y administrador.
- Panel de usuario: inscripción de asignaturas, simulación de horario, gestión de evaluaciones, perfil personal.
- Panel de administrador:
  - Ver y eliminar mensajes de contacto enviados desde la sección "Ayuda".
  - Ver, filtrar y eliminar usuarios (alumnos y profesores).
  - Editar perfil de administrador (incluye cambio de foto y contraseña).
- Página de ayuda con formulario de contacto (mensajes llegan al panel admin).
- Protección de rutas: solo usuarios logueados pueden acceder a sus paneles; solo admin puede acceder al dashboard de administración.
- Diseño moderno y responsivo.

---

## Créditos

Desarrollado por GRUPO 1

---

