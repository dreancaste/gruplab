# GrupLab

GrupLab es una plataforma web para la gestión de grupos de trabajo académicos, tableros Kanban y evaluación de participación. Permite a los docentes administrar materias y a los alumnos colaborar en proyectos mediante tableros ágiles, con cálculo automatizado de métricas de rendimiento y evaluación entre pares.

## Stack Tecnológico

* **Frontend:** Angular 21 (Standalone components, Signals, Angular CDK Drag & Drop).
* **Backend & Infraestructura:** AWS Amplify Gen 2.
* **API:** AWS AppSync (GraphQL).
* **Base de Datos:** Amazon DynamoDB.
* **Autenticación:** Amazon Cognito.
* **Almacenamiento:** Amazon S3 (`gruplabStorage` para adjuntos de tarjetas con vista previa).
* **Estilos:** SCSS modular.

---

## Funcionalidades Implementadas

### Autenticación y Perfiles
* Registro e inicio de sesión con email y contraseña (Cognito).
* Verificación de cuenta mediante código de 6 dígitos.
* Sincronización automática de email/perfil para mostrar nombres legibles en lugar de IDs internos.

### Aulas (Materias) y Roles
* Creación de materias con generación de código de invitación único.
* Unión a un aula mediante código.
* Listado de "Mis Aulas" separado por rol (docente/alumno).
* **Gestión de participantes y promoción de roles:** Los docentes pueden ver los participantes del aula y promover alumnos a profesor (o cambiar su rol).
* **Dashboard Consolidado del Docente:** Vista de KPIs del aula (grupos activos, alumnos inscritos, porcentaje global de avance, promedio de calificaciones, tareas vencidas) y barras comparativas de progreso por grupo.
* Eliminación de aulas en cascada.

### Grupos y Tableros
* **Docentes:** Son administradores de todos los grupos del aula, pueden ver todas las tarjetas e ingresar a cualquier tablero, y agregar o quitar integrantes.
* **Alumnos:** Pueden ver todos los grupos del salón, crear su propio grupo (quedando como administradores sin poder eliminar integrantes existentes), ingresar únicamente a su grupo o solicitar acceso a un grupo existente.
* **Solicitudes de acceso:** Aprobación o rechazo de solicitudes por parte del administrador del grupo o docentes.
* **Tableros Independientes:** Espacios Kanban sin materia asociada, compartibles por código.

### Tablero Kanban (Core)
* 4 columnas: *Backlog, En Progreso, Revisión, Hecho*.
* Funcionalidad *Drag & Drop* nativa (Angular CDK).
* Creación, edición, eliminación y **modal de detalle completo** de Tarjetas (Cards).
* **Adjuntos en S3 con vista previa:** Subida, previsualización inline de imágenes, descarga y eliminación de archivos adjuntos.
* **Alertas de vencimiento:** Indicadores visuales automáticos en tarjetas vencidas o próximas a vencer.
* **Puntuación Docente:** Calificación de 0 a 10 y comentarios de retroalimentación del profesor.

### Métricas, Evaluación e Historial
* **Participación del Equipo:** Visualización porcentual por integrante calculada automáticamente ponderando Esfuerzo (50%), Puntualidad (20%), Calidad/Colaboración (15%) y Evaluación de pares (15%).
* **Evaluación entre Pares:** Evaluación de coordinación, comunicación y responsabilidad al completar tareas.
* **Historial de Actividad Auditable:** Modal de registro cronológico de todas las acciones realizadas en el grupo.

---

## Instalación y Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```
2. **Iniciar el entorno Sandbox de Amplify (opcional si ya existe `amplify_outputs.json`):**
   ```bash
   npx ampx sandbox
   ```
3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm start
   ```
4. Abrir `http://localhost:4200`.
