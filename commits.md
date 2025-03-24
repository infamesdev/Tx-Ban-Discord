## **Guía para escribir Commits**

### **Estructura básica**

```
<tipo>[ámbito opcional]: <descripción>

[cuerpo opcional]

[nota(s) al pie opcional(es)]
```

### **Tipos principales de commits**

- **`feat:`** Añade una nueva funcionalidad al proyecto.
  - Ejemplo: `feat: add user authentication`
- **`fix:`** Corrige un error en el código.
  - Ejemplo: `fix: resolve crash on login`
- **`BREAKING CHANGE:`** Indica un cambio que rompe compatibilidad con versiones anteriores.
  - Ejemplo: `feat!: migrate API to v2`

### **Otros tipos útiles**

- **`build:`** Cambios relacionados con el sistema de construcción o dependencias.
  - Ejemplo: `build: update webpack to v5`
- **`chore:`** Tareas generales o de mantenimiento sin impacto en el código ejecutable.
  - Ejemplo: `chore: update README`
- **`ci:`** Cambios en configuración de integración continua.
  - Ejemplo: `ci: add GitHub Actions workflow`
- **`docs:`** Actualizaciones o cambios en la documentación.
  - Ejemplo: `docs: add API usage examples`
- **`style:`** Cambios que no afectan el comportamiento (espacios, formato, etc.).
  - Ejemplo: `style: reformat code`
- **`refactor:`** Reorganización o mejora del código sin cambiar su funcionalidad.
  - Ejemplo: `refactor: optimize user data fetching`
- **`perf:`** Mejoras en el rendimiento.
  - Ejemplo: `perf: reduce image loading time`
- **`test:`** Adición o corrección de pruebas.
  - Ejemplo: `test: add unit tests for login feature`

---

### **Cómo escribir un commit**

#### 1. **Título**

Incluye el tipo, un ámbito opcional (entre paréntesis) y una descripción clara del cambio.

- **Formato:** `<tipo>[ámbito opcional]: <descripción>`
- **Ejemplo:**
  ```
  feat(auth): add OAuth2 support
  ```

#### 2. **Cuerpo (opcional)**

Proporciona más contexto o detalles si es necesario. Separa el cuerpo del título con una línea en blanco.

- **Ejemplo:**

  ```
  fix: handle null values in user data

  Fixed an issue where null values in the user data caused the app to crash when rendering the profile page.
  ```

#### 3. **Notas al pie (opcional)**

Incluye información adicional, como referencias a tickets o cambios de ruptura.

- **Ejemplo con un cambio de ruptura:**

  ```
  refactor!: drop support for Node.js 12

  BREAKING CHANGE: The application now requires Node.js 14 or higher.
  ```

- **Ejemplo con referencias:**

  ```
  fix: resolve crash on login

  Closes #123
  ```

---

### **Consejos prácticos**

1. **Mantén los títulos cortos y claros:** Usa un máximo de 72 caracteres.
2. **Haz commits pequeños y específicos:** Esto facilita la revisión y el seguimiento de cambios.
3. **Usa ámbitos opcionales:** Son útiles para indicar qué parte del código afecta el cambio.
   - Ejemplo: `feat(ui): add dark mode toggle`
4. **No olvides los BREAKING CHANGES:** Asegúrate de destacarlos correctamente en el título o en las notas al pie.
5. **Revisa tu mensaje antes de confirmar:** Utiliza herramientas como `git commit --verbose`.

---

### **Ejemplos comunes**

#### **Agregar una nueva funcionalidad**

```
feat(parser): add support for JSON parsing
```

#### **Corregir un error**

```
fix(api): resolve incorrect error response on 404
```

#### **Documentación**

```
docs: update installation instructions in README
```

#### **Cambio de ruptura**

```
feat!: remove deprecated configuration options

BREAKING CHANGE: The 'legacy' option has been removed. Use 'modern' instead.
```
