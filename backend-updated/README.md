# Meter Express — Backend API

Express + MongoDB (Mongoose) backend for the Meter Express utility app.
Handles authentication, applications, the customer profile, and the shared
staff/admin team chat — everything the frontend (UtilityApp) needs, all
stored in MongoDB.

## 1. Install

```bash
cd backendGA
npm install
```

## 2. Configure MongoDB

### Option A — MongoDB Atlas (recommended, free tier is enough)

1. Go to https://www.mongodb.com/cloud/atlas and create a free account / free
   cluster (M0).
2. Under **Database Access**, create a database user with a username and
   password.
3. Under **Network Access**, add your current IP address (or `0.0.0.0/0` to
   allow access from anywhere — fine for development, tighten this for a
   real production deployment).
4. Click **Connect → Drivers**, copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Paste it into `.env` as `MONGO_URI`, and add a database name before the
   `?`, e.g.:
   ```
   MONGO_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/gasapp?retryWrites=true&w=majority
   ```

### Option B — Local MongoDB

If you have MongoDB installed locally, the default in `.env` already points
at it:
```
MONGO_URI=mongodb://127.0.0.1:27017/gasapp
```
Just make sure `mongod` is running.

## 3. Run

```bash
npm run dev     # nodemon, auto-restarts on changes
# or
npm start       # plain node
```

You should see:
```
MongoDB connected
Server running on port 5000
```

The frontend (UtilityApp) expects the API at `http://localhost:5000/api` by
default — that already matches this server. If you deploy the backend
somewhere else, set `VITE_API_URL` in the frontend's `.env` to your
deployed API's `/api` URL (see `UtilityApp/.env.example`).

## 4. Deploying

Any Node host works (Render, Railway, Fly.io, an EC2 box, etc.). Steps are
always the same:
1. Push this folder to your host.
2. Set the environment variables `MONGO_URI`, `JWT_SECRET`, and `PORT`
   (most hosts set `PORT` for you automatically).
3. Start command: `npm start`.
4. Point your Atlas cluster's **Network Access** allow-list at your host's
   IP (or `0.0.0.0/0`).

## Data model

- **User** — account (Admin / Customer / Staff), plus the customer's saved
  profile fields (phone, company details, default site address).
- **Application** — a single utility application: type, utility, status,
  the customer/staff message thread, internal notes, uploaded document
  metadata, and any open "more information" request.
- **TeamMessage** — one shared staff/admin discussion channel.

## API reference

All routes are prefixed with `/api`. Every route except `/auth/register` and
`/auth/login` requires an `Authorization: Bearer <token>` header (the token
returned by login/register).

### Auth
| Method | Route | Notes |
|---|---|---|
| POST | `/auth/register` | body: `{ role, firstName, lastName, phoneNumber, email, password }` |
| POST | `/auth/login` | body: `{ email, password }` |
| GET | `/auth/me` | current user |

### Applications
| Method | Route | Notes |
|---|---|---|
| GET | `/applications` | Customers see only their own; Admin/Staff see all |
| POST | `/applications` | create |
| GET | `/applications/:ref` | one application |
| PUT | `/applications/:ref` | patch/merge fields (status, assignedStaff, etc.) |
| DELETE | `/applications/:ref` | |
| POST | `/applications/:ref/messages` | `{ channel, author, role, text }` |
| POST | `/applications/:ref/notes` | `{ author, role, text }` |
| POST | `/applications/:ref/documents` | `{ id, name, size, uploadedBy, folder }` (metadata only) |
| DELETE | `/applications/:ref/documents/:docId` | |
| POST | `/applications/:ref/request-info` | staff/admin: `{ question }` |
| POST | `/applications/:ref/respond-info` | customer: `{ responseText }` |
| POST | `/applications/:ref/clear-info` | staff/admin |
| POST | `/applications/:ref/cancel` | customer |

### Customer profile
| Method | Route | Notes |
|---|---|---|
| GET | `/customer/profile` | |
| PUT | `/customer/profile` | |

### Team chat (Admin/Staff only)
| Method | Route | Notes |
|---|---|---|
| GET | `/team-messages` | |
| POST | `/team-messages` | `{ author, role, text }` |

## Notes on file uploads

Document endpoints currently store metadata only (name, size, uploader,
folder, timestamp) — not the file bytes, matching how the frontend already
worked. If you want real file storage/download later, that's a separate,
self-contained addition (e.g. an S3 bucket or GridFS) — it doesn't require
changing anything else in this backend.
