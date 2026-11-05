from django.conf import settings
from django.db import models


class Category(models.Model):
    """DESKTOP, POS, CLIQQ"""
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name


class DeviceModel(models.Model):
    """Desktop PC's Models / POS Models / CLIQQ Models"""
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="models")
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ("category", "name")

    def __str__(self):
        return f"{self.category.name} - {self.name}"


class Part(models.Model):
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="parts")
    model = models.ForeignKey(DeviceModel, on_delete=models.SET_NULL, null=True, blank=True, related_name="parts")
    type_of_part = models.CharField(max_length=100)
    serial_number = models.CharField(max_length=100, unique=True)
    date = models.DateField()
    deployment_location = models.CharField(max_length=200)
    status = models.CharField(max_length=50, default="available")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="parts")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.type_of_part} ({self.serial_number})"


class PartRequest(models.Model):
    part = models.ForeignKey(Part, on_delete=models.CASCADE, related_name="requests")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    note = models.TextField(blank=True)
    status = models.CharField(max_length=30, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-id"]
