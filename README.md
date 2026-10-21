
# GrupLab 

GrupLab es una plataforma web para la gestión de grupos de trabajo académicos, tableros Kanban y evaluación de participación. Permite a los docentes administrar materias y a los alumnos colaborar en proyectos mediante tableros ágiles, con cálculo automatizado de métricas de rendimiento y evaluación entre pares.

##  Stack Tecnológico

*   **Frontend:** Angular 21 (Standalone components, Signals).
*   **Backend & Infraestructura:** AWS Amplify Gen 2.
*   **API:** AWS AppSync (GraphQL).
*   **Base de Datos:** Amazon DynamoDB.
*   **Autenticación:** Amazon Cognito.
*   **Almacenamiento:** Amazon S3 (para adjuntos de tarjetas).
*   **Estilos:** Tailwind CSS *(asumiendo por las clases en el código, ajustar si es otro)*.

---

##  Funcionalidades Implementadas

### Autenticación y Usuarios
*   Registro e inicio de sesión con email y contraseña (Cognito).
*   Verificación de cuenta mediante código de 6 dígitos.
*   Modelo de Usuario con roles diferenciados (docente/alumno).

### Aulas (Materias)
*   Creación de materias con generación de código de invitación único.
*   Unión a un aula mediante código.
*   Listado de "Mis Aulas" separado por rol (docente/alumno).
*   Eliminación de aulas en cascada.

### Grupos y Tableros
*   Creación y edición de grupos dentro de un aula.
*   Gestión de integrantes (límite de un grupo por materia).
*   Transferencia de rol de administrador al salir de un grupo.
*   **Tableros Independientes:** Espacios Kanban sin materia asociada, compartibles por código.

### Tablero Kanban (Core)
*   4 columnas: *Backlog, En Progreso, Revisión, Hecho*.
*   Funcionalidad *Drag & Drop* nativa (Angular CDK).
*   Creación, edición y eliminación de Tarjetas (Cards).
*   Campos de tarjeta: Título, descripción, peso de esfuerzo, asignados, fecha límite, adjuntos (S3), puntuación docente (0-10) y comentarios del profesor.

### Métricas y Evaluación
*   **Log de Actividad:** Registro interno de acciones (usuario, acción, entidad, timestamp).
*   **Cálculo de Participación:** Fórmula implementada que pondera:
    *   Esfuerzo (50%)
    *   Puntualidad (20%)
    *   Calidad/Colaboración (15%)
    *   Evaluación de pares (15%)
*   **Evaluación entre Pares:** Los alumnos pueden evaluar a sus compañeros en coordinación, comunicación y responsabilidad.

### Testing
*   Archivos de pruebas unitarias (`.spec.ts`) configurados para servicios y componentes principales.

---

##  En Desarrollo / Pendiente (Roadmap Real)

*   **Dashboard del Docente:** Actualmente el componente `dashboard` es un placeholder vacío. Falta la vista general de métricas consolidadas para el profesor.
*   **Visualización de Métricas:** Las métricas se muestran como texto/porcentajes. Falta implementar gráficos (charts) para el análisis visual.
*   **UI del Log de Actividad:** Falta una vista para que el docente pueda auditar el historial de acciones del grupo.
*   **Mostrar Emails/Nombres:** En la vista de evaluación de pares, actualmente se muestran los IDs de los usuarios; falta resolver la relación para mostrar emails o nombres.
*   **Notificaciones:** Sistema de alertas para nuevos comentarios, puntuaciones o vencimientos de fecha límite.
*   **Promover Alumnos:** Funcionalidad para que un docente pueda elevar el rol de un alumno a profesor dentro del aula.
*   **Seguridad Granular:** Las reglas actuales de AppSync usan `allow.authenticated()`. Falta implementar reglas a nivel de `owner` o validaciones estrictas por pertenencia al grupo.
*   **Hosting y CI/CD:** Configuración del despliegue en producción mediante Amplify Hosting.

---

##  Instalación y Ejecución Local

### Requisitos Previos
*   Node.js (v18 o superior)
*   npm o yarn
*   AWS CLI configurado con credenciales válidas (para Amplify)
*   Angular CLI (`npm install -g @angular/cli`)

### Pasos

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/dreancaste/gruplab.git
    cd gruplab
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Iniciar el entorno Sandbox de Amplify:**
    *(Esto levanta los recursos en la nube de AWS y genera el archivo `amplify_outputs.json`)*
    ```bash
    npx ampx sandbox
    ```
    *Dejá esta terminal abierta.*

4.  **Iniciar el servidor de desarrollo de Angular:**
    En una nueva terminal:
    ```bash
    npm start
    ```
    O si usás Angular CLI:
    ```bash
    ng serve
    ```

5.  Abrí tu navegador en `http://localhost:4200`.

---

##  Estructura del Proyecto

*   `amplify/`: Configuración de backend (Auth, Data, Storage). Define el esquema GraphQL y las reglas de acceso.
*   `src/app/core/`: Servicios singleton, guardias de ruta, interceptores.
*   `src/app/features/`: Módulos de la aplicación.
    *   `auth/`: Login, Registro, Verificación.
    *   `aulas/`: Listado y gestión de materias (`mis-aulas`).
    *   `grupos/`: Detalle del grupo y tablero Kanban (`grupo-detalle`).
*   `src/app/shared/`: Componentes reutilizables (botones, modales, etc.).

---
*Última actualización de este README: Octubre 2026.*
