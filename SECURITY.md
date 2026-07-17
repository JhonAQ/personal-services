# Sistema de Seguridad - Buscador de Libretas

## 🔒 Capas de Seguridad Implementadas

### 1. **Sistema de Tokens de Acceso**

- Cada solicitud debe obtener primero un token temporal
- Los tokens permiten **hasta 3 usos** (HEAD para verificar, GET para descargar, 1 de respaldo)
- Expiran en **5 minutos**
- Cada token está vinculado a un CUI específico

**Flujo:**

```
Usuario → POST /api/auth/token (con CUI)
       → Recibe token temporal
       → GET /api/libreta/{cui}?token={token}
       → Token se invalida automáticamente
```

### 2. **Rate Limiting por IP**

Múltiples límites según el tipo de operación:

| Endpoint                    | Límite            | Ventana de Tiempo |
| --------------------------- | ----------------- | ----------------- |
| `/api/auth/token`           | 20 peticiones     | 1 minuto          |
| `/api/libreta/{cui}` (GET)  | 15 descargas      | 1 minuto          |
| `/api/libreta/{cui}` (HEAD) | 30 verificaciones | 1 minuto          |

**Headers de respuesta:**

- `X-RateLimit-Limit`: Límite máximo
- `X-RateLimit-Remaining`: Peticiones restantes
- `X-RateLimit-Reset`: Timestamp de reinicio
- `Retry-After`: Segundos hasta poder reintentar (cuando se excede el límite)

### 3. **Validaciones de Seguridad**

- ✅ Validación de formato de CUI (8 dígitos)
- ✅ Validación de tokens (existencia, expiración, correspondencia con CUI)
- ✅ Prevención de enumeración (HEAD también requiere token)
- ✅ Detección de IP real (soporte para proxies con `x-forwarded-for`)

### 4. **Limpieza Automática**

- Tokens expirados se eliminan cada **2 minutos**
- Entradas de rate limit se eliminan cada **5 minutos**
- Previene saturación de memoria en el servidor

## 🛡️ Protección contra Ataques

### Ataques Prevenidos:

1. **Acceso directo no autorizado** ❌
   - Sin token válido, no hay acceso al PDF
2. **Enumeración de CUIs** ❌
   - Incluso verificar existencia requiere token
3. **Scraping masivo** ❌
   - Rate limiting agresivo por IP
4. **Abuso de tokens** ❌
   - Tokens limitados a 3 usos
5. **Tokens antiguos** ❌
   - Expiración automática en 5 minutos

## 📊 Respuestas de Error

### 400 Bad Request

```json
{ "error": "CUI inválido. Debe tener 8 dígitos." }
```

### 401 Unauthorized

```json
{ "error": "Token de acceso requerido" }
```

### 403 Forbidden

```json
{ "error": "Token inválido o expirado" }
{ "error": "Token no corresponde al CUI solicitado" }
{ "error": "Token ha excedido el límite de uso" }
```

### 429 Too Many Requests

```json
{
  "error": "Demasiadas solicitudes. Intenta nuevamente más tarde.",
  "retryAfter": 45
}
```

## 🔧 Configuración Avanzada

Para ajustar los límites, edita `/src/lib/security.ts`:

```typescript
// Máximo de usos por token
maxUsage: 3, // Permitir 3 usos (HEAD, GET, respaldo)

// Expiración de tokens
expiresAt: now + 5 * 60 * 1000
//               ^^^^^^^
//           5 minutos en ms
```

## 🚀 Mejoras Futuras Opcionales

1. **CAPTCHA** - Agregar reCAPTCHA v3 para mayor seguridad
2. **Autenticación** - Requerir login de usuario
3. **Redis** - Para rate limiting distribuido en múltiples servidores
4. **Logging** - Registrar intentos sospechosos
5. **Geolocalización** - Restringir por región geográfica
6. **Webhooks** - Notificar sobre actividad inusual

## 📝 Notas de Implementación

- **Almacenamiento en memoria**: Los tokens y rate limits se almacenan en memoria del servidor
- **No persistente**: Se reinicia si el servidor se reinicia
- **Producción**: Considera usar Redis para almacenamiento persistente y compartido
- **Escalabilidad**: Para múltiples instancias del servidor, implementa rate limiting centralizado
