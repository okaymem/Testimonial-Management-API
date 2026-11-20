# Testimonial Management API

RESTful API для управления видео-отзывами. Node.js, Express, MongoDB (Mongoose), JWT.

## Установка и запуск

**Требования:** Node.js v16+, Docker, npm

```bash
git clone https://github.com/okaymem/Testimonial-Management-API.git
cd Testimonial-Management-API
npm install
cp .env.example .env
docker compose up -d
npm run dev      # разработка
npm start        # продакшн
```

API: `http://localhost:3000`

**Проверка:**
```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"your@email.com","password":"yourpassword"}'
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/testimonials
```

## Переменные окружения

| Переменная | Описание | По умолчанию | Обязательная |
|------------|----------|--------------|--------------|
| `PORT` | Порт сервера | `3000` | Нет |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/testimonials` | Да |
| `JWT_SECRET` | Секрет для JWT | `change_me` | **Да** |
| `JWT_EXPIRY` | TTL токена | `7d` | Нет |

> В продакшене используйте сильную случайную строку для `JWT_SECRET`.

Пример `.env`:
```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/testimonials
JWT_SECRET=your-super-secret-random-string-here
JWT_EXPIRY=7d
```

## Документация API

### Формат ответов
**Успех:** `{ "code": 200, "status": "success", "message": "...", "data": {} }`  
**Ошибка:** `{ "code": 400, "status": "failure", "message": "..." }`

### HTTP коды
`200` успех, `201` создано, `400` валидация, `401` нет токена, `403` чужой доступ, `404` не найдено, `429` rate limit, `500` сервер

### Аутентификация
```
Authorization: Bearer <token>
```

---

### Auth (без JWT)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/auth/register` | Регистрация → 201 + user + token |
| POST | `/api/auth/login` | Вход → 200 + token |

**Register** — body: `email`, `password`, `businessName`  
**Login** — body: `email`, `password`

---

### Testimonials (JWT)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| POST | `/api/testimonials` | Создать (требуется `customerName`) → 201 |
| GET | `/api/testimonials` | Список (status, page, limit, sort) → 200 + пагинация |
| GET | `/api/testimonials/search` | Поиск (q, даты, рейтинг) → 200 + пагинация |
| POST | `/api/testimonials/bulk/status` | Массовая смена статуса → 200 + отчёт |
| GET | `/api/testimonials/export` | Экспорт CSV → файл |
| GET | `/api/testimonials/:id` | Получить один → 200 |
| PUT | `/api/testimonials/:id` | Частичное обновление → 200 |
| PATCH | `/api/testimonials/:id/status` | Смена статуса (draft→recording→processing→completed→shared) → 200 |
| POST | `/api/testimonials/:id/share` | Шаринг (channels: email/sms/facebook/instagram) → 200 |
| DELETE | `/api/testimonials/:id` | Мягкое удаление → 200 |

**Create** — body: `customerName` (обязательно), `customerEmail`, `customerPhone`, `videoUrl`, `rating` (1-5), `text`, `consentGiven`  
**List** — query: `status`, `page=1`, `limit=10`, `sort=createdAt`  
**Search** — query: `q`, `createdAfter`, `createdBefore`, `minRating`, `maxRating`, `page`, `limit`, `sort`  
**Bulk Status** — body: `{ "testimonialIds": ["id1","id2"], "status": "completed" }` → `{ updated, failed, errors }`  
**Export CSV** — query: как у search + `fields` (колонки через запятую) → `Content-Type: text/csv`, `Content-Disposition: attachment`  
**Status** — body: `{ "status": "recording" }` — строгие переходы, невалидный → 400  
**Share** — body: `{ "channels": ["email","facebook"] }` — 400 если статус draft/recording/processing  
**Delete** — soft delete (`isDeleted=true`), идемпотентен

---

### Settings (JWT)

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| GET | `/api/testimonials/settings` | Получить настройки → 200 |
| POST | `/api/testimonials/settings` | Upsert (частичный) → 200 |

Поля: `isEnabled`, `defaultVideoLength`, `videoLengthOptions`, `questionnaire`, `sendingOptions`, `thankYouMessage`, `contactConsent`

---

### Analytics (JWT)

**GET** `/api/testimonials/analytics?startDate=...&endDate=...` → `{ overview: { total, byStatus, averageRating }, period }`

---

## Архитектурные решения

- **Стек:** Node.js + Express, MongoDB + Mongoose, JWT stateless, CommonJS — по ТЗ
- **Модели:** User (автоинкремент `userId`), Testimonial (UUID `testimonialId`, soft delete), Settings (один на пользователя)
- **Индексы:** `testimonialId` (unique), `userId`, `status`, составной `{userId, isDeleted}`
- **Auth:** Middleware проверяет Bearer токен → `req.user`, 401 если нет/невалиден
- **Owner check:** каждая операция проверяет `testimonial.userId === req.user.userId` → 403
- **Валидация:** Zod (body/query) + Mongoose (schema) — строгие энумы, диапазоны, cross-field refine
- **Ошибки:** try/catch в контроллерах, централизованный middleware мапит Mongoose ошибки в 400, никаких stack trace
- **Статусы:** линейный workflow через `STATUS_TRANSITIONS`, авто `sharedAt`
- **Soft delete:** `isDeleted=true` + `deletedAt`, фильтруется везде
- **Аналитика:** один `$facet` агрегация за запрос
- **Структура:** `/controllers`, `/models`, `/routes`, `/middleware`, `/lib`, `/tests`, `app.js`

---

## Выполненные бонусные задачи

| № | Задача | Статус |
|---|--------|--------|
| 1 | Rate Limiting на `/api/auth/*` (5 req/min/IP) | ✅ |
| 2 | Search (`GET /api/testimonials/search`) | ✅ |
| 3 | Bulk Status (`POST /api/testimonials/bulk/status`) | ✅ |
| 4 | Export CSV (`GET /api/testimonials/export`) | ✅ |
| 5 | Тесты (Mocha + mongodb-memory-server) | ✅ |

---

## Отчёт о выполнении

| Метрика | Значение |
|---------|----------|
| **Затраченное время** | ~12 часов |
| **Выполненные бонусные задачи** | 5 из 5 |
| **Тесты** | 26 тестов (Mocha + Chai + Supertest + mongodb-memory-server) |

---

## Что улучшит при большем времени (3-4 пункта)

1. Атомарный счётчик `userId` вместо `max+1` — убрать гонки при регистрации
2. Rate limiting на остальные эндпоинты, helmet, структурированное логирование (Pino)
3. Версионирование API (`/api/v1/`), OpenAPI/Swagger документация
4. Dockerfile для API, docker-compose для полного стека

---

## Лицензия

ISC