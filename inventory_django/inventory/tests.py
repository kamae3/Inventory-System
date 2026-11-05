from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase


class AccountApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin@example.com",
            email="admin@example.com",
            password="secure-admin-password",
            is_staff=True,
        )
        self.admin_token = Token.objects.create(user=self.admin)

    def test_homepage_serves_frontend_assets(self):
        response = self.client.get("/", HTTP_HOST="localhost")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "IT-IMS")
        self.assertContains(response, "/static/inventory/script.js")

    def test_admin_login_returns_admin_role_and_token(self):
        response = self.client.post(
            "/api/auth/login/",
            {
                "email": "admin@example.com",
                "password": "secure-admin-password",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], "admin")
        self.assertTrue(response.data["token"])

    def test_only_authenticated_admin_can_register_an_admin(self):
        payload = {
            "name": "New Admin",
            "email": "new-admin@example.com",
            "password": "secure-new-admin-password",
            "role": "admin",
        }
        response = self.client.post(
            "/api/auth/register/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 403)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Token {self.admin_token.key}"
        )
        response = self.client.post(
            "/api/auth/register/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(User.objects.get(email="new-admin@example.com").is_staff)
