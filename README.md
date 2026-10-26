# GrupLab

GrupLab es una plataforma web colaborativa para la gestión de grupos de trabajo académicos, seguimiento mediante tableros Kanban y evaluación objetiva de la participación estudiantil.

---

## Objetivo del Proyecto

Centralizar en un único entorno web la organización, supervisión y evaluación de trabajos grupales universitarios o escolares, reemplazando canales dispersos por un espacio donde el avance sea trazable en tiempo real:

* **Para el docente:** Supervisar todos los grupos de sus materias desde un dashboard consolidado, gestionar participantes y roles, establecer fechas límite, calificar entregas (tanto por tarea como a nivel grupal e individual) y auditar el historial de actividad.
* **Para los alumnos:** Autogestionar sus grupos de trabajo, planificar y ejecutar tareas en un tablero Kanban con revisión entre compañeros, compartir entregables adjuntos y realizar co-evaluaciones de desempeño.
* **Arquitectura Serverless directa:** Operar íntegramente sobre servicios administrados de **AWS Amplify Gen 2** (**Amazon Cognito**, **AWS AppSync GraphQL**, **Amazon DynamoDB** y **Amazon S3**), comunicando el cliente Angular directamente con AppSync y S3 mediante credenciales seguras sin depender de servidores intermedios ni de **Amazon API Gateway**.

---

## Stack Tecnológico

* **Frontend:** Angular 21 (Standalone Components, Signals, Zoneless change detection, `@angular/cdk/drag-drop`).
* **Backend & Infraestructura (IaC):** AWS Amplify Gen 2 (`@aws-amplify/backend` sobre AWS CDK / CloudFormation).
* **API de Datos:** AWS AppSync (API GraphQL tipada con resolvers directos a DynamoDB).
* **Base de Datos:** Amazon DynamoDB (6 tablas NoSQL: `Usuario`, `Materia`, `Grupo`, `Card`, `EvaluacionPar`, `LogActividad`).
* **Autenticación y Autorización:** Amazon Cognito (User Pool con verificación por email + Identity Pool con roles IAM para S3).
* **Almacenamiento de Archivos:** Amazon S3 (`gruplabStorage` con rutas protegidas `cards/*` y URLs firmadas).
* **Estilos y UI:** SCSS modular con estética SaaS moderna, barra de navegación glassmórfica y modales de confirmación integrados en la aplicación.
* **Testing:** Vitest + Angular TestBed (`.spec.ts`).

---

## Funcionalidades Implementadas

### 1. Autenticación y Resolución de Perfiles
* Registro e inicio de sesión con email y contraseña mediante **Amazon Cognito** (`@aws-amplify/ui-angular` en español).
* Verificación de cuenta mediante código de 6 dígitos enviado por correo.
* **Sincronización y resolución de emails (`PERFILES_GLOBAL`):** Asociación automática de `userId` con el correo electrónico del usuario para mostrar nombres/emails legibles en toda la plataforma en lugar de UUIDs internos.

### 2. Aulas (Materias) y Gestión de Roles
* Creación de aulas con generación automática de un **código de invitación único** de 6 caracteres.
* Listado en **Mis Aulas** separado según el rol del usuario (*Como Docente* / *Como Alumno*).
* **Incorporación y baja de alumnos:**
  * Los alumnos pueden unirse ingresando el código de invitación.
  * Los docentes pueden **agregar alumnos directamente por email o ID** y **dar de baja alumnos del aula** (removiéndolos automáticamente de los grupos de esa materia).
* **Gestión de jerarquía docente:** Los administradores pueden promover alumnos al rol de **Profesor** y degradar profesores a alumnos.
* **Dashboard Consolidado del Docente:** Vista de KPIs globales del aula (grupos activos, alumnos inscritos, porcentaje global de avance, promedio de calificaciones y tareas vencidas) junto con barras comparativas de progreso por grupo.
* **Eliminación en cascada:** Borrado completo de un aula junto con todos sus grupos y tarjetas mediante confirmación integrada en la app.

### 3. Grupos de Trabajo y Tableros Independientes
* **Control total para Docentes:** Los docentes (`creadorId`, `admins` y `profesores`) son administradores de todos los grupos del aula; pueden ingresar a cualquier tablero, gestionar sus tarjetas, agregar o quitar integrantes individualmente y eliminar grupos.
* **Autogestión para Alumnos:**
  * Visualización de todos los grupos del aula e identificación de sus integrantes.
  * Creación de grupo propio (quedando como administrador del grupo) o **solicitud de acceso** a un grupo existente.
  * **Regla de unicidad:** Un alumno solo puede pertenecer a un grupo por materia.
* **Flujo de Solicitudes de Acceso:** Aprobación o rechazo de solicitudes por parte del administrador del grupo o de los docentes del aula.
* **Calificación Final del Grupo y por Integrante:** Banner y modal de evaluación grupal donde el docente asigna la **nota final del grupo**, un comentario general de devolución y **notas individuales diferenciadas por integrante**.
* **Tableros Independientes:** Espacios Kanban sin materia asociada para proyectos libres, compartibles mediante código de invitación.

### 4. Tablero Kanban (Core)
* **4 columnas de flujo:** *Backlog · En Progreso · Revisión · Hecho* con *Drag & Drop* nativo (`@angular/cdk/drag-drop`).
* **Gestión ágil de tareas (Cards):**
  * Creación en un solo paso (habilitada incluso en grupos recién creados sin otros miembros), edición, eliminación con modal de confirmación in-app y **modal de detalle completo**.
  * **Peso de esfuerzo:** Estimación en 3 niveles (*1 · Chico*, *3 · Mediano*, *5 · Grande*).
  * **Asignación múltiple:** Selección de uno o varios integrantes responsables de la tarea.
* **Fechas límite exclusivas del Docente y Alertas:** Solo los docentes pueden definir o modificar la fecha de entrega de una tarea; las tarjetas muestran alertas visuales automáticas cuando están vencidas o próximas a vencer.
* **Revisión entre compañeros:** Control de calidad antes de mover tareas a *Hecho* (registro de quién revisó la tarjeta y cuándo).
* **Puntuación y Feedback Docente en Tarjetas:** Calificación de 0 a 10 y comentarios de retroalimentación del profesor, visibles mediante insignias (*badges*) directamente en la tarjeta del tablero.
* **Adjuntos en Amazon S3 con vista previa:** Subida de archivos por tarjeta (`cards/{cardId}/*`), previsualización inline de imágenes mediante URLs firmadas, descarga y eliminación segura.

### 5. Métricas de Participación, Co-evaluación e Historial
* **Cálculo Automatizado de Participación:** Desglose porcentual por integrante calculado a partir de:
  * **Esfuerzo completado (50%)**
  * **Puntualidad en entregas (20%)**
  * **Calidad y colaboración en revisiones (15%)**
  * **Evaluación entre pares (15%)**
* **Evaluación entre Pares (`EvaluacionPar`):** Al finalizar tareas, los compañeros evalúan del 1 al 5 la *coordinación*, *comunicación* y *responsabilidad* de los integrantes asignados.
* **Historial de Actividad Auditable (`LogActividad`):** Registro cronológico inmutable (`read` / `create`) de las acciones realizadas en el grupo, consultable desde un modal de auditoría.

---

## Estructura del Proyecto

```text
gruplab/
├── amplify/                        # Backend Serverless (AWS Amplify Gen 2)
│   ├── auth/resource.ts            # Configuración de Amazon Cognito (login por email)
│   ├── data/resource.ts            # Esquema GraphQL (AppSync) y modelos de DynamoDB
│   ├── storage/resource.ts         # Bucket S3 (gruplabStorage) y reglas de acceso en cards/*
│   └── backend.ts                  # Definición principal del backend (auth, data, storage)
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── dashboard/          # Dashboard consolidado de métricas del docente
│   │   ├── pages/
│   │   │   ├── mis-aulas/          # Listado de materias (docente/alumno) y tableros independientes
│   │   │   ├── aula-detalle/       # Vista del aula, grupos, participantes, roles y dashboard
│   │   │   └── grupo-detalle/      # Tablero Kanban, adjuntos S3, métricas, notas y actividad
│   │   ├── services/
│   │   │   ├── auth.ts             # Sesión de Cognito y atributos del usuario actual
│   │   │   └── materia.ts          # Lógica de negocio, CRUD GraphQL, S3, permisos y métricas
│   │   ├── app.ts                  # Shell principal, barra de navegación y Amplify Authenticator
│   │   └── app.routes.ts           # Definición de rutas de la SPA
│   ├── main.ts                     # Inicialización de Amplify y traducciones al español
│   └── styles.scss                 # Variables globales, tipografía y estilos base SaaS
├── amplify_outputs.json            # Configuración autogenerada del entorno AWS
└── package.json
```

---

## Instalación y Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```
2. **Iniciar el entorno Sandbox de Amplify (opcional si ya contás con `amplify_outputs.json`):**
   ```bash
   npx ampx sandbox
   ```
3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm start
   ```
4. Abrir `http://localhost:4200` en el navegador.

5. **Ejecutar pruebas unitarias:**
   ```bash
   npm test
   ```
