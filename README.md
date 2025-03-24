# TxAdmin - Discord Bot

Esta es una herramienta de Discord que permite consultar los usuarios baneados en tu servidor de FiveM. Su propósito es facilitar la gestión de baneos directamente desde Discord, sin necesidad de iniciar el juego o acceder al servidor FiveM.

> [!IMPORTANT]
> Es necesario tener acceso al panel de TxAdmin para utilizar esta herramienta.

El bot puede funcionar desde localhost o instalado en otro servidor, siempre que tenga acceso a la URL de TxAdmin.

## Configuración

Para configurar el bot, es necesario editar el archivo `.env` con los parámetros de tu servidor FiveM y Discord. Puedes encontrar un ejemplo en [`data/.env.example`](./data/.env.example).

### Parámetros requeridos:

```env
# TXADMIN
TX_ADMIN_BASE_URL=    # URL de tu instancia de TXAdmin (ej. http://XXX.XXX.XXX.XXX:40120 o http://localhost:40120)
TX_ADMIN_USERNAME=    # Nombre de usuario de TXAdmin (se recomienda usuario con permisos limitados a ban)
TX_ADMIN_PASSWORD=    # Contraseña de TXAdmin

# RUTAS
ERROR_SCREENSHOTS_PATH=./data/errors
DATA_STORAGE_PATH=./data/storage

# ENTORNO
NODE_ENV=production   # development | production

# DISCORD
DISCORD_BOT_TOKEN=    # Token del bot de Discord
allowedChannelsCommand=1315766185740206080 # ID del canal de Discord donde el bot escuchará los comandos
```

## Ejecución

Para ejecutar el bot:

```bash
# Instalar dependencias
npm install

# Ejecutar en modo producción (configuración por defecto)
npm start

# Otros modos de ejecución
npm run dev    # Modo desarrollo
npm run prod   # Modo producción explícito
```

## Gestión de errores

El bot guarda capturas de pantalla de los errores en la carpeta `data/errors`. Estas capturas se pueden consultar en caso de que el bot no funcione correctamente. Además, el bot registra un log de errores en la consola y en `data/errors/error-log.txt`.

## Documentación técnica

### Descripción General
Este proyecto implementa un sistema automatizado de gestión para servidores FiveM a través de la interfaz txAdmin, permitiendo la autenticación programática y ejecución de operaciones administrativas.

### Estructura del Proyecto

#### Módulos Principales

1. **`error.js`**: Manejo y registro de errores
    - Captura de pantalla automática cuando ocurren errores
    - Registro detallado con contexto y trazas
    - Organización de archivos por timestamp

2. **`config.js`**: Gestión de configuración
    - Carga de variables de entorno desde `.env`
    - Configuración del navegador según el entorno
    - Obtención centralizada de parámetros

3. **`login.js`**: Autenticación con txAdmin
    - Automatización del inicio de sesión
    - Manejo de elementos de interfaz
    - Extracción de cookies y tokens de seguridad

4. **`index.js`**: Punto de entrada
    - Orquestación del proceso completo
    - Integración de los módulos

### Características Principales

- **Automatización del navegador**: Soporte para modos headless/visible
- **Persistencia de sesión**: Almacenamiento de credenciales entre ejecuciones
- **Gestión de configuración**: Adaptación según el entorno
- **Robustez**: Manejo detallado de errores y excepciones

### Requisitos del Sistema
- Node.js
- Puppeteer
- Archivo `.env` configurado
- Permisos de escritura en disco

### Flujo de Ejecución
1. Carga de configuración
2. Inicialización del navegador
3. Autenticación en txAdmin
4. Extracción y almacenamiento de credenciales

### Próximas Funcionalidades
- Integración avanzada con Discord