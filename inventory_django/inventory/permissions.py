from rest_framework.permissions import BasePermission


class IsAdminAccount(BasePermission):
    """'Does the account for admin?' -> YES. Admin = is_staff."""
    message = "Admin lang ang may access."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)
