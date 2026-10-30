# Recipe Share API (MERN backend)

Node + Express + MongoDB (Mongoose) REST API for a recipe sharing community.

## Setup
```bash
npm install
cp .env.example .env   # set MONGO_URI and JWT_SECRET
npm run dev
```

## Frontend
`public/index.html` is a single-file frontend served by the API. After `npm run dev`, open http://localhost:5000

## Features
JWT auth, recipe CRUD with image upload, search/filter/sort/pagination, likes, 1-5 ratings,
comments, bookmarks, follow system + following feed, user profiles, admin moderation.

## Endpoints
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | - | `{username,email,password}` |
| POST | /api/auth/login | - | `{email,password}` -> token |
| GET | /api/auth/me | yes | current user |
| GET | /api/recipes | - | `?q&category&tag&author&difficulty&maxTime&sort=latest/popular/rated&page&limit` |
| POST | /api/recipes | yes | multipart: title, description, ingredients (JSON), steps (JSON), tags, category, cookTime, servings, difficulty, image |
| GET | /api/recipes/feed | yes | recipes from followed users |
| GET | /api/recipes/:id | opt | detail (+ liked, myRating, bookmarked) |
| PUT/DELETE | /api/recipes/:id | owner/admin | update / delete |
| POST | /api/recipes/:id/like | yes | toggle like |
| POST | /api/recipes/:id/rate | yes | `{value: 1-5}` |
| POST | /api/recipes/:id/bookmark | yes | toggle bookmark |
| GET/POST | /api/recipes/:id/comments | POST yes | list / add `{text}` |
| DELETE | /api/recipes/:id/comments/:commentId | owner/admin | delete comment |
| GET | /api/users/:id | opt | profile + recipes |
| PUT | /api/users/me | yes | `{username,bio}` + avatar file |
| GET | /api/users/me/bookmarks | yes | saved recipes |
| POST | /api/users/:id/follow | yes | toggle follow |

Send token as `Authorization: Bearer <token>`.
Example ingredients field: `[{"name":"Flour","quantity":"2 cups"}]`.
To make an admin, set `role: "admin"` on a user in MongoDB.

## Structure
`config/ models/ controllers/ routes/ middleware/ utils/ uploads/ server.js`
