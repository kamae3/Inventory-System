# Inventory Backend (Django + Django REST Framework)

## Setup (Windows)

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed --email MyName@gmail.com
python manage.py runserver
```

The seed command creates the starter categories, then securely prompts for and confirms an admin password. The local SQLite database is `db.sqlite3`; keep it safe, because it contains account records and inventory data. The password is stored as a Django password hash, not in the frontend.

The default login email is prefilled in the frontend. Never add the admin password to HTML or JavaScript files.

For production, set a private `DJANGO_SECRET_KEY`, set `DJANGO_DEBUG=false`, and configure `DJANGO_ALLOWED_HOSTS`. The built-in defaults are for local development only.

## Flow chart -> Endpoint
| Flow chart | Endpoint |
|---|---|
| Register / Credentials INVALID | `POST /api/auth/register/` |
| Log in (may role + redirect) | `POST /api/auth/login/` |
| Log out | `POST /api/auth/logout/` |
| Select category | `GET /api/categories/` |
| Show models | `GET /api/categories/<id>/models/` |
| User: enter part info -> save | `POST /api/user/parts/` |
| User: view saved | `GET /api/user/parts/` |
| Admin: show parts | `GET /api/admin/parts/?category_id=&model_id=` |
| Admin: add information | `POST /api/admin/parts/` |
| Admin: update parts/date/serial/location/status | `PATCH /api/admin/parts/<id>/` |
| Admin: request part | `POST /api/admin/part-requests/` |
| Admin: add model | `POST /api/admin/models/` |

Header para sa lahat maliban register/login: `Authorization: Token <token>`

Admin = account na `is_staff=True`. Pwede ring i-manage sa `/django-admin/`.
