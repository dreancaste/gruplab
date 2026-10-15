```
# GrupLab

Aplicación web para organizar, supervisar y evaluar el trabajo en grupo dentro de una materia.

GrupLab reemplaza la mezcla de canales dispersos (WhatsApp, Drive, mails) por un único espacio donde el progreso es visible en tiempo real y la participación de cada integrante queda registrada objetivamente.

---

##   Idea del proyecto

En una cursada con trabajos grupales, el docente suele enterarse tarde de quién trabajó y quién no, y coordinar avances entre múltiples grupos a mano es un caos. GrupLab centraliza todo:

- El **docente** ve un tablero general con todos los grupos de su materia, y puede puntuar y comentar el avance.
- Cada **grupo** tiene su propio espacio tipo Kanban, gestionado por un **alumno administrador**.
- Todas las acciones (mover una card, subir un archivo, comentar) quedan registradas en un **log de actividad**, de donde se puede calcular el porcentaje de participación de cada integrante de forma objetiva.
- La estructura es **genérica y reutilizable**: cualquier materia puede crear su tablero desde cero.

El diseño sigue el enfoque de **Diseño Centrado en el Usuario (DCU)**: se definieron perfiles de usuario (docente y estudiante), se relevaron sus necesidades, y cada funcionalidad responde a un requisito concreto.

---

##   Funcionalidades actuales

### Autenticación
- Registro e inicio de sesión con **email y contraseña** (Cognito).
- Verificación de cuenta por código de 6 dígitos enviado al mail.
- Política de contraseña segura (8+ caracteres con mayúscula, minúscula, número y símbolo).

### Aulas (materias)
- Crear un aula como docente → se genera un **código de invitación único** de 6 caracteres.
- Unirse a un aula como alumno con el código.
- Listar "Mis aulas" separando las que cursás como docente y como alumno.
- Eliminar un aula completa (con todos sus grupos y cards en cascada) — solo el admin.

### Grupos dentro de un aula
- Crear grupos (docente o alumno).
- Editar nombre del grupo.
- Gestionar integrantes: el docente puede agregar alumnos del aula; el alumno admin de su grupo también.
- Regla: un alumno solo puede estar en **un grupo por materia**.
- Salir de un grupo → si era admin, el rol pasa al siguiente integrante; si era el único, el grupo se elimina.
- Eliminar grupo completo (si no tiene cards).

### Tableros independientes
- Cualquier usuario puede crear un **tablero independiente** (sin materia asociada) para organizar su propio trabajo.
- Se comparte con un código, igual que las aulas.
- No tiene docente ni puntuación; solo Kanban y gestión de integrantes.

### Tablero Kanban
- 4 columnas: **Backlog · En progreso · Revisión · Hecho**.
- Crear, editar y eliminar tareas (cards).
- **Drag & drop** entre columnas.
- Descripción por card.
- Puntuación del docente (0 a 10) + comentario.
- Adjuntos de archivos (en desarrollo).

### Log de actividad
- Cada acción relevante (crear/mover/editar card, gestionar integrantes, etc.) queda registrada con:
  - Usuario que la hizo.
  - Acción realizada.
  - Entidad afectada.
  - Timestamp.
- Base para el cálculo de porcentaje de participación.

---

##   Stack tecnológico

### Frontend
- **Angular 21** (standalone components, signals)
- **TypeScript**
- **SCSS**
- **@angular/cdk/drag-drop** para el Kanban
- **aws-amplify** para conectar con el backend

### Backend (serverless)
- **AWS Amplify Gen 2** como framework de backend
- **Amazon Cognito** para autenticación
- **AWS AppSync** (GraphQL) para la API
- **Amazon DynamoDB** para la base de datos
- **Amazon S3** para almacenamiento de archivos (en desarrollo)

### Hosting
- **AWS Amplify Hosting** (pendiente de configurar)

### Requisitos
- **Node.js 22** (o 20 LTS — ver sección "Notas")
- **npm 10+**
- **AWS CLI** con perfil configurado
- Cuenta de AWS (Free Tier suficiente)

---

##   Arquitectura

```
┌─────────────────────────────────────┐
│        Angular 21 (frontend)        │
│  - Componentes standalone           │
│  - Signals para estado reactivo     │
│  - Services para lógica de negocio  │
└──────────────┬──────────────────────┘
               │ aws-amplify
               ▼
┌─────────────────────────────────────┐
│      Amplify Gen 2 (backend)        │
│  ┌────────────┬──────────────────┐  │
│  │  Cognito   │  AppSync+        │  │
│  │  (auth)    │  DynamoDB (data) │  │
│  └────────────┴──────────────────┘  │
│  ┌────────────────────────────────┐ │
│  │     S3 (storage)               │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Modelo de datos (DynamoDB)

| Entidad | Descripción | Campos clave |
|---|---|---|
| **Usuario** | Datos básicos del usuario | email, nombre |
| **Materia** | Aula de una materia | nombre, creador, admins, profesores, alumnos, codigoInvitacion |
| **Grupo** | Grupo o tablero independiente | nombre, materiaId (opcional), adminId, integrantes, codigoInvitacion, esIndependiente |
| **Card** | Tarea del Kanban | titulo, descripcion, estado, orden, grupoId, adjuntos, puntuacion, comentarioProfesor |
| **LogActividad** | Registro de acciones | grupoId, usuarioId, accion, entidad, entidadId, timestamp |

---

##   Estructura del proyecto

```
gruplab/
├── amplify/                      # Backend (Amplify Gen 2)
│   ├── auth/
│   │   └── resource.ts           # Configuración de Cognito
│   ├── data/
│   │   └── resource.ts           # Schema GraphQL + DynamoDB
│   ├── storage/                  # (a crear) S3 para adjuntos
│   │   └── resource.ts
│   ├── backend.ts                # Punto de entrada del backend
│   └── tsconfig.json
│
├── src/
│   ├── app/
│   │   ├── pages/
│   │   │   ├── mis-aulas/        # Listado de aulas + tableros
│   │   │   ├── aula-detalle/     # Vista dentro de un aula
│   │   │   └── grupo-detalle/    # Tablero Kanban
│   │   ├── services/
│   │   │   ├── auth.ts           # Autenticación
│   │   │   └── materia.ts        # Lógica de materias, grupos, cards
│   │   ├── app.ts                # Componente raíz
│   │   ├── app.routes.ts         # Rutas
│   │   └── app.config.ts
│   ├── main.ts                   # Bootstrap + config Amplify
│   └── styles.scss
│
├── amplify_outputs.json          # Config autogenerada por Amplify
├── package.json
└── README.md
```

---

##   Cómo ejecutar el proyecto

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU-USUARIO/gruplab.git
cd gruplab
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar credenciales de AWS

Verificá que tengas el archivo `~/.aws/credentials` con un perfil válido:

```
[tu-perfil]
aws_access_key_id = ...
aws_secret_access_key = ...
```

Y en `~/.aws/config`:

```
[profile tu-perfil]
region = sa-east-1
```

### 4. Levantar el backend (sandbox)

En una terminal:

```bash
npx ampx sandbox --profile tu-perfil
```

Dejá esta terminal abierta. El sandbox escucha cambios en `amplify/` y redespliega automáticamente. La primera vez tarda varios minutos.

 **Solo un sandbox a la vez.** No ejecutes este comando en dos terminales simultáneas.

### 5. Levantar el frontend

En otra terminal:

```bash
ng serve --open
```

Se abre en `http://localhost:4200`.

---

## 🔄 Flujo de trabajo diario

| Comando | Qué hace |
|---|---|
| `npx ampx sandbox --profile tu-perfil` | Levanta el backend y sincroniza cambios |
| `ng serve` | Levanta el frontend en local |
| `git add . && git commit -m "..." && git push` | Sube cambios a GitHub |
| `npx ampx sandbox delete --profile tu-perfil` | Elimina el sandbox de AWS |

---

##  Roles y permisos

| Rol | Alcance | Puede hacer |
|---|---|---|
| **Admin de aula** | Toda la materia | Todo: crear/eliminar el aula, gestionar grupos, puntuar, ver todos los grupos, promover roles |
| **Profesor** | Toda la materia | Ver todos los grupos, puntuar, comentar |
| **Admin de grupo** | Su grupo | Editar nombre del grupo, agregar/quitar integrantes, gestionar cards |
| **Alumno** | Su grupo | Mover cards, crear/editar/eliminar tareas, subir adjuntos |

---

##  Roadmap

### Completado 
- [x] Autenticación con Cognito
- [x] Modelo de datos (Materia, Grupo, Card, LogActividad)
- [x] Crear y unirse a aulas con código
- [x] Crear y gestionar grupos
- [x] Kanban con drag & drop
- [x] Puntuar y comentar cards (docente)
- [x] Tableros independientes (sin materia)
- [x] Log de actividad (registro)
- [x] Eliminar aulas, grupos y cards
- [x] Gestión de integrantes del grupo

### En desarrollo 
- [ ] Adjuntos de archivos con S3
- [ ] Vista del log de actividad para el docente
- [ ] Mostrar emails en lugar de IDs en la lista de integrantes

### Pendiente 
- [ ] Dashboard de participación con gráficos
- [ ] Reglas de seguridad más estrictas (por grupo y por rol)
- [ ] Promover alumnos a profesores (gestión de jerarquías)
- [ ] Notificaciones (nuevo comentario, nueva puntuación)
- [ ] Deploy en producción con Amplify Hosting
- [ ] Plan de evaluación con usuarios (tests de usabilidad, SUS)

---

##  Contexto académico

Este proyecto se desarrolla siguiendo el enfoque de **Diseño Centrado en el Usuario (DCU)**:

1. **Investigación y contexto de uso**: análisis de cómo trabajan actualmente docentes y estudiantes en materias con trabajos grupales.
2. **Personas**: se definieron dos arquetipos (docente y estudiante) con objetivos y frustraciones.
3. **Mapa de experiencia actual (as-is)**: identificación de los puntos de dolor.
4. **Requisitos de usuario**: cada necesidad se tradujo en un requisito concreto, y cada requisito en una funcionalidad específica.
5. **Prototipo y evaluación**: test de usabilidad con prototipo navegable, entrevistas post-tarea, cuestionario SUS.
6. **Ciclo iterativo**: los resultados de evaluación se comparan con los requisitos y se ajusta el diseño.

---

##  Notas

- **Node.js 22 en Windows**: puede dar un error conocido (`Cannot find module 'resource.js'`) durante el deploy del sandbox. Si ocurre, la solución más fiable es usar **Node.js 20 LTS**. Alternativamente, se ha resuelto excluyendo la carpeta `amplify` del `tsconfig.json` raíz y usando `moduleResolution: bundler` en el tsconfig local.
- **Sandbox vs producción**: el sandbox es un entorno de desarrollo aislado en AWS. Cada usuario tiene su propio sandbox (identificado por el nombre de usuario de la máquina). No afecta a producción.
- **Región**: el proyecto usa `sa-east-1` (São Paulo) por cercanía a Argentina.
- **Free Tier**: todo el proyecto entra en la capa gratuita de AWS.

---
