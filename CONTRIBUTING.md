# Guía de Contribución (`CONTRIBUTING.md`)

Este documento establece las normas de trabajo en equipo, el flujo de ramas (`TR.01.04`), la convención de mensajes de commit y el proceso de revisión de Pull Requests (`TR.01.06`) para el proyecto **Sistema de Reserva para Gimnasio y Canchas**.

---

## 1. Flujo de Ramas (`TR.01.04`)

1. **Rama principal (`main`):**
   - Contiene únicamente código estable y revisado.
   - **Está protegida:** no se permite hacer `git push` directo a `main`. Todo cambio debe entrar mediante Pull Request (PR).

2. **Nomenclatura de ramas de trabajo:**
   - **Historias de usuario y subtareas funcionales:**
     ```text
     feature/HU0X-descripcion-corta
     ```
     *Ejemplos:*
     - `feature/HU01-registro-cliente`
     - `feature/HU02-crud-recintos`
     - `feature/HU03-transaccion-reservas`
   - **Tareas transversales e infraestructura (`TR`):**
     ```text
     feature/TR0X-descripcion-corta
     ```
     *Ejemplo:*
     - `feature/TR01-estructura-inicial`
   - **Corrección de errores:**
     ```text
     fix/HU0X-descripcion-error
     ```

3. **Ciclo de vida de una rama:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/HU01-registro-cliente
   ```

---

## 2. Convención de Mensajes de Commit (`TR.01.06`)

Utilizamos **Conventional Commits** acompañados del ID de la subtarea (`ST0X.0X` o `TR.0X`):

### Formato
```text
<tipo>(<ID-subtarea>): <descripción breve en imperativo>
```

### Tipos permitidos
- `feat`: Nueva funcionalidad de una subtarea (`ST01.03`, `ST02.02`, etc.).
- `fix`: Corrección de un error.
- `db`: Migraciones, esquemas o seeds de base de datos (`ST01.01`, `ST02.01`, `TR.03`).
- `test`: Creación o ajuste de pruebas automatizadas (`ST01.08`, `ST02.11`, etc.).
- `docs`: Cambios en documentación (`README.md`, `CONTRIBUTING.md`, `docs/`).
- `chore`: Configuración de infraestructura, CI/CD o herramientas (`TR.01`, `TR.02`, `TR.04`).

### Ejemplos válidos
- `chore(TR.01): definir estructura inicial del repositorio y plantillas`
- `db(ST01.01): crear migracion de tabla usuarios con correo unico`
- `feat(ST01.03): implementar endpoint de registro de cliente`
- `test(ST01.08): agregar pruebas de login fallido y bloqueo por rol`

---

## 3. Proceso de Pull Request y Revisión (`TR.01.05`, `TR.01.06`)

1. **Apertura del Pull Request:**
   - Al subir la rama (`git push -u origin feature/HU0X-descripcion`), abrir un Pull Request hacia `main`.
   - Completar obligatoriamente la plantilla `.github/pull_request_template.md`, indicando el **ID de la subtarea (`ST0X.0X`)** y vinculando el issue (`Closes #N`).

2. **Requisitos antes de solicitar revisión:**
   - Verificar que el **Criterio de terminado** de la subtarea se cumpla al 100%.
   - Confirmar que ningún archivo `.env` o credencial local esté incluido en el commit.
   - Asegurar que la suite de pruebas y el pipeline de CI (`TR.04`) estén en verde.

3. **Revisión por pares (Code Review):**
   - Al menos **1 integrante del equipo** debe revisar el PR.
   - El revisor comprobará el criterio de terminado de la subtarea correspondiente.
   - Si hay observaciones, se corrigen en la misma rama antes de aprobar (`Approve`).
   - Una vez aprobado y con las verificaciones en verde, se realiza el **Merge** a `main` y el issue pasa a la columna **Hecho** en el tablero de GitHub Projects.

---

## 4. Tablero de Trabajo (`TR.01.07`)

Todas las subtareas se gestionan en **GitHub Projects** a través de 4 estados:
1. **Por hacer:** Subtarea creada y etiquetada por Historia (`HU01`–`HU05`, `TR`) y Sprint (`Sprint 1`–`Sprint 4`).
2. **En progreso:** Desarrollador asignado trabajando en una rama `feature/...`.
3. **En revisión:** Pull Request abierto con el ID `ST0X.0X` en espera de revisión.
4. **Hecho:** Pull Request fusionado en `main` y criterio de terminado verificado.
