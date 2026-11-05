from getpass import getpass

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from inventory.models import Category


class Command(BaseCommand):
    help = "Gumawa ng categories (DESKTOP, POS, CLIQQ) at admin account."

    def add_arguments(self, parser):
        parser.add_argument("--email", default="MyName@gmail.com")

    def handle(self, *args, **opts):
        for name in ["DESKTOP", "POS", "CLIQQ"]:
            Category.objects.get_or_create(name=name)

        email = opts["email"].strip().lower()
        password = getpass("Admin password: ")
        confirmation = getpass("Confirm admin password: ")
        if not password or password != confirmation:
            raise CommandError("Passwords must be non-empty and match.")

        user, created = User.objects.get_or_create(
            username=email,
            defaults={"email": email, "first_name": "Administrator"},
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"Admin account {action}: {email}"))
        self.stdout.write(self.style.SUCCESS("Seed done."))
