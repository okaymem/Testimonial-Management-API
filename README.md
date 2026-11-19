# Testimonial Management API

RESTful API для управления видео-отзывами (testimonials). Построен на Node.js, Express.js, MongoDB (Mongoose) с JWT-аутентификацией.

## Содержание

- [Установка и запуск](#установка-и-запуск)
- [Переменные окружения](#переменные-окружения)
- [Документация API](#документация-api)
- [Архитектурные решения](#архитектурные-решения)
- [Выполненные бонусные задачи](#выполненные-бонусные-задачи)
- [Отчёт о выполнении](#отчёт-о-выполнении)

---

## Установка и запуск

### Требования

- Node.js v16+
- Docker (для MongoDB) или локальный MongoDB
- npm

### Быстрый старт

```bash
# 1. Клонирование репозитория
git clone https://github.com/okaymem/Testimonial-Management-API.git
cd Testimonial-Management-API

# 2. Установка зависимостей
npm install

# 3. Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env при необходимости

# 4. Запуск MongoDB через Docker
docker compose up -d

# 5. Запуск сервера
# Режим разработки (с автоперезагрузкой)
npm run dev

# Продакшн
npm start
```

API будет доступен по адресу `http://localhost:3000` (или порт из `.env`).

### Проверка работоспособности

```bash
# Получить токен
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# Проверить эндпоинт (требует токен)
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/testimonials
```

---

## Переменные окружения

| Переменная | Описание | Значение по умолчанию | Обязательная |
|------------|----------|----------------------|--------------|
| `PORT` | Порт сервера | `3000` | Нет |
| `MONGODB_URI` | Строка подключения к MongoDB | `mongodb://127.0.0.1:27017/testimonials` | Да |
| `JWT_SECRET` | Секрет для подписи JWT | `change_me` | Да |
| `JWT_EXPIRY` | Время жизни токена | `7d` | Нет |

**Важно:** В продакшене всегда используйте сильную случайную строку для `JWT_SECRET`.

Пример `.env`:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/testimonials
JWT_SECRET=your-super-secret-random-string-here
JWT_EXPIRY=7d
```

---

## Документация API

### Формат ответов

**Успех:**
```json
{
  "code": 200,
  "status": "success",
  "message": "Описание результата",
  "data": {}
}
```

**Ошибка:**
```json
{
  "code": 400,
  "status": "failure",
  "message": "Описание ошибки"
}
```

### HTTP статус-коды

- `200` — Успех
- `201` — Создано
- `400` — Неверный запрос / ошибка валидации
- `401` — Не авторизован (нет/невалидный токен)
- `403` — Запрещено (доступ к чужим данным)
- `404` — Не найдено
- `429` — Слишком много запросов (rate limit)
- `500` — Внутренняя ошибка сервера

### Аутентификация

Все эндпоинты, кроме `/api/auth/*`, требуют JWT:
```
Authorization: Bearer <token>
```

---

### Auth (без JWT)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/auth/register` | Регистрация (email, password, businessName) → 201 + user + token |
| POST | `/api/auth/login` | Вход → 200 + token |

#### Register
**POST** `/api/auth/register`

**Запрос:**
```json
{
  "email": "owner@business.com",
  "password": "securePassword123",
  "businessName": "My Business"
}
```

**Ответ (201):**
```json
{
  "code": 201,
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "userId": 1,
      "email": "owner@business.com",
      "businessName": "My Business",
      "role": "owner",
      "isActive": true,
      "createdAt": "2026-11-19T10:00:00.000Z",
      "updatedAt": "2026-11-19T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Login
**POST** `/api/auth/login`

**Запрос:**
```json
{
  "email": "owner@business.com",
  "password": "securePassword123"
}
```

**Ответ (200):**
```json
{
  "code": 200,
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Testimonials (требуют JWT)

Все эндпоинты возвращают 403 при попытке доступа к чужим данным. Мягко удалённые (`isDeleted: true`) исключаются из списков и аналитики.

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/testimonials` | Создание (требуется `customerName`) → 201 |
| GET | `/api/testimonials` | Список (query: status, page, limit, sort) → 200 + пагинация |
| GET | `/api/testimonials/search` | Поиск (q, даты, рейтинг, пагинация) → 200 + пагинация |
| GET | `/api/testimonials/:id` | Получить один → 200 |
| PUT | `/api/testimonials/:id` | Частичное обновление → 200 |
| PATCH | `/api/testimonials/:id/status` | Смена статуса (строго: draft→recording→processing→completed→shared) → 200 |
| POST | `/api/testimonials/:id/share` | Шаринг (channels: email/sms/facebook/instagram) → 200 |
| DELETE | `/api/testimonials/:id` | Мягкое удаление (isDeleted=true) → 200 |

#### Create
**POST** `/api/testimonials`

**Запрос:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+1234567890",
  "videoUrl": "https://example.com/video.mp4",
  "rating": 5,
  "text": "Amazing service!",
  "consentGiven": true
}
```

**Ответ (201):**
```json
{
  "code": 201,
  "status": "success",
  "message": "Testimonial created successfully",
  "data": {
    "testimonialId": "uuid-v4-string",
    "userId": 1,
    "customerName": "John Doe",
    "status": "draft",
    "consentGiven": false,
    "sharedChannels": [],
    "isDeleted": false,
    "createdAt": "2026-11-19T10:00:00.000Z",
    "updatedAt": "2026-11-19T10:00:00.000Z"
  }
}
```

Обязательно только `customerName`. Дефолты: `status: "draft"`, `consentGiven: false`, `sharedChannels: []`, `isDeleted: false`.

#### List
**GET** `/api/testimonials`

**Query параметры:**
| Параметр | Тип | Дефолт | Описание |
|----------|-----|--------|----------|
| `status` | string | — | Фильтр по статусу |
| `page` | integer | `1` | Номер страницы |
| `limit` | integer | `10` | Элементов на странице |
| `sort` | string | `createdAt` | Поле сортировки (префикс `-` для DESC) |

**Ответ (200):**
```json
{
  "code": 200,
  "status": "success",
  "message": "Data retrieved successfully",
  "data": [...],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

#### Search
**GET** `/api/testimonials/search`

**Query параметры:**
| Параметр | Тип | Дефолт | Описание |
|----------|-----|--------|----------|
| `q` | string | — | Текстовый поиск по `customerName` и `text` (case-insensitive, частичное совпадение) |
| `createdAfter` | string (ISO) | — | Фильтр: создано не раньше даты |
| `createdBefore` | string (ISO) | — | Фильтр: создано не позже даты |
| `minRating` | integer (1-5) | — | Минимальный рейтинг |
| `maxRating` | integer (1-5) | — | Максимальный рейтинг |
| `page` | integer | `1` | Номер страницы |
| `limit` | integer | `10` | Элементов на странице |
| `sort` | string | `createdAt` | Поле сортировки (префикс `-` для DESC) |

**Пример запроса:**
```
GET /api/testimonials/search?q=john&minRating=4&createdAfter=2025-01-01T00:00:00.000Z&page=1&limit=5
```

**Ответ (200):**
```json
{
  "code": 200,
  "status": "success",
  "message": "Data retrieved successfully",
  "data": [...],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 5,
    "pages": 1
  }
}
```

**Валидация:**
- `createdAfter` не может быть больше `createdBefore`
- `minRating` не может быть больше `maxRating`
- `q` — опциональный, если не указан — поиск не применяется

#### Update Status
**PATCH** `/api/testimonials/:id/status`

**Запрос:**
```json
{ "status": "recording" }
```

**Допустимые переходы (строго):**
```
draft → recording → processing → completed → shared
```

Невалидный переход → 400 с сообщением `"Cannot transition from <from> to <to>"`. При переходе в `shared` устанавливается `sharedAt`.

#### Share
**POST** `/api/testimonials/:id/share`

**Запрос:**
```json
{ "channels": ["email", "facebook"] }
```

**Допустимые каналы:** `email`, `sms`, `facebook`, `instagram`

Поведение:
- Добавляет каналы в `sharedChannels` (без дублей)
- Если статус `completed` → автопереход в `shared` и установка `sharedAt`
- Если статус `shared` → добавляет каналы
- Если статус `draft`/`recording`/`processing` → 400

#### Soft Delete
**DELETE** `/api/testimonials/:id`

Устанавливает `isDeleted: true`, `deletedAt`. Документ остаётся в БД. Исключается из списков/аналитики. Идемпотентен (повторный вызов → 200).

---

### Settings (JWT)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/testimonials/settings` | Получить настройки (null если нет) → 200 |
| POST | `/api/testimonials/settings` | Upsert частичный (только переданные поля) → 200 |

**Настраиваемые поля:**
- `isEnabled` (boolean, дефолт: `false`)
- `defaultVideoLength` (number, дефолт: `10`)
- `videoLengthOptions` (number[], дефолт: `[5,10,15,20,25]`)
- `questionnaire` (string[], дефолт: `["What do you like about our service?"]`)
- `sendingOptions` (string[], дефолт: `["email","sms"]`)
- `thankYouMessage` (string, дефолт: `"Thank you!"`)
- `contactConsent` (object): `{ enabled: boolean (default: true), text: string (default: "Join our mailing list") }`

---

### Analytics (JWT)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/testimonials/analytics` | Query: startDate, endDate (ISO) → 200 с `overview {total, byStatus, averageRating}` и `period` |

**Ответ (200):**
```json
{
  "code": 200,
  "status": "success",
  "message": "Data retrieved successfully",
  "data": {
    "overview": {
      "total": 50,
      "byStatus": {
        "draft": 5,
        "recording": 3,
        "processing": 2,
        "completed": 25,
        "shared": 15
      },
      "averageRating": 4.2
    },
    "period": {
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.999Z"
    }
  }
}
```

- Исключает мягко удалённые
- `byStatus` — счетчики для всех 5 статусов
- `averageRating` — среднее по не-null рейтингам, округлено до 2 знаков
- Агрегация через `$facet` за один запрос к БД

---

## Архитектурные решения

### 1. Технологический стек
- **Node.js + Express**: лёгкий, зрелый, соответствует ТЗ.
- **MongoDB + Mongoose**: документная БД подходит для вложенных структур (`sharedChannels`, `contactConsent`); Mongoose даёт схемы, дефолты, валидацию.
- **JWT (stateless)**: без сессий на сервере, масштабируется горизонтально. Payload: `userId`, `email`.
- **CommonJS (`require`)**: по ТЗ, без TypeScript.

### 2. Модели данных
- **User**: автоинкремент `userId` (Number) вместо `ObjectId` — по ТЗ. Уникальный индекс на `email`.
- **Testimonial**: `testimonialId` — UUID v4 для публичного шаринга. `userId` — Number (FK-like ссылка на User). Статусы/энумы на уровне схемы. Soft delete через `isDeleted` + `deletedAt`.
- **TestimonialSettings**: один документ на пользователя (`userId` unique). Вложенный `contactConsent` с `_id: false`. Дефолты в схеме.

### 3. Индексы
По ТЗ: `testimonialId` (unique), `userId`, `status`, составной `{userId: 1, isDeleted: 1}` для типичных запросов «мои не удалённые».

### 4. Аутентификация и авторизация
- **Middleware**: извлекает `Bearer` токен, верифицирует по `JWT_SECRET`, кладёт в `req.user = {userId, email}`.
- **Проверка владельца**: каждая операция с отзывом/настройками проверяет `testimonial.userId === req.user.userId` → 403 при несовпадении.
- Токен не хранится на сервере — клиент получает в JSON и передаёт в заголовке.

### 5. Валидация
- **Zod** для тела/квери: типизированная, понятные сообщения, строгие энумы.
- **Mongoose** как второй слой: границы рейтинга, обязательные поля, энумы.
- Ошибки в едином формате с указанием поля (например, `"rating: rating must be between 1 and 5"`).

### 6. Обработка ошибок
- Try/catch во всех контроллерах.
- Централизованный middleware в `app.js`: мапит ошибки Mongoose (`ValidationError`, `CastError`, дубль `11000`) в 400 с читаемыми сообщениями.
- Никаких stack trace в ответах; логи в консоль.

### 7. Переходы статусов
Строгий линейный workflow через `STATUS_TRANSITIONS` map. Запрещены прыжки (например, `draft → completed`). Автоустановка `sharedAt` при входе в `shared`.

### 8. Soft Delete
Документы никогда не удаляются физически. `isDeleted: true` + `deletedAt`. Все чтения фильтруют `isDeleted: false`.

### 9. Аналитика через агрегацию
Один `aggregate()` с `$facet` считает `total`, `byStatus`, `averageRating` за один проход. Фильтры по пользователю, датам, `isDeleted: false`.

### 10. Структура проекта
```
/controllers    — хендлеры (auth, testimonials)
/models         — Mongoose-схемы
/routes         — Express-роутеры
/middleware     — auth middleware
/lib            — константы и хелперы ответов
/app.js         — точка входа, подключение к БД, error handlers
/tests          — Jest + mongodb-memory-server (заготовки)
```

---

## Выполненные бонусные задачи

| № | Задача | Статус |
|---|--------|--------|
| 1 | **Rate Limiting** на `/api/auth/*` (5 req/min/IP, 429 при превышении) | ✅ Выполнено |
| 2 | Search (`GET /api/testimonials/search`) | ✅ Выполнено |
| 3 | Bulk Status (`POST /api/testimonials/bulk/status`) | ⏳ Планируется |
| 4 | Export CSV (`GET /api/testimonials/export`) | ⏳ Планируется |
| 5 | Тесты (Jest + mongodb-memory-server) | ⏳ Планируется |

### Детали Rate Limiting (Бонус 1)
- Библиотека: `express-rate-limit`
- Окно: 1 минута (`windowMs: 60000`)
- Лимит: 5 запросов с одного IP (`max: 5`)
- Применяется ко всем `/api/auth/*` (register, login)
- Ответ при превышении: `429` с JSON `{ "code": 429, "status": "failure", "message": "Too many requests, please try again later" }`
- Заголовки: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

---

## Отчёт о выполнении

| Метрика | Значение |
|---------|----------|
| **Затраченное время** | ~12 часов |
| **Выполненные бонусные задачи** | 2 из 5 (Rate Limiting, Search) |
| **Тесты** | Заготовки созданы (`tests/`), требуют доработки setup |

### Что планируется сделать (остальные бонусы)
1. **Bulk Status** — `POST /api/testimonials/bulk/status` с валидацией переходов для каждого ID и отчётом `{updated, failed, errors}`.
2. **Export CSV** — `GET /api/testimonials/export` с заголовками, экранированием, фильтрами, `Content-Disposition: attachment`.
3. **Тесты** — полный набор Jest тестов: статус-транзишены, auth middleware, CRUD эндпоинты, бонусные эндпоинты, in-memory MongoDB.

### Что можно улучшить в будущем
- Атомарный счётчик `userId` (вместо `max+1`) для устранения гонок при одновременной регистрации.
- Rate limiting на остальные эндпоинты, helmet, структурированное логирование (Winston/Pino).
- Версионирование API (`/api/v1/`), Swagger/OpenAPI документация.
- Dockerfile для API, docker-compose для полного стека.
- Refresh-токены с ротацией, вебхуки при смене статуса, курсорная пагинация.

---

## Лицензия

ISC