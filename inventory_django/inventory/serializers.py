from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Category, DeviceModel, Part, PartRequest


class RegisterSerializer(serializers.Serializer):
    """Input Details -> Incomplete/Invalid? -> 'Credentials INVALID'"""
    name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Email ay gamit na.")
        return value

    def create(self, data):
        return User.objects.create_user(
            username=data["email"],
            email=data["email"],
            password=data["password"],
            first_name=data["name"].strip(),
        )  # is_staff=False -> user lang


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]


class DeviceModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceModel
        fields = ["id", "category", "name"]


class PartSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    model_name = serializers.CharField(source="model.name", read_only=True, default=None)
    created_by_name = serializers.CharField(source="created_by.first_name", read_only=True)

    class Meta:
        model = Part
        fields = [
            "id", "category", "category_name", "model", "model_name",
            "type_of_part", "serial_number", "date", "deployment_location",
            "status", "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class UserPartSerializer(PartSerializer):
    """User ay hindi pwedeng mag-set ng status."""
    class Meta(PartSerializer.Meta):
        read_only_fields = PartSerializer.Meta.read_only_fields + ["status"]


class PartRequestSerializer(serializers.ModelSerializer):
    serial_number = serializers.CharField(source="part.serial_number", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.first_name", read_only=True)

    class Meta:
        model = PartRequest
        fields = ["id", "part", "serial_number", "requested_by_name", "note", "status", "created_at"]
        read_only_fields = ["status", "created_at"]
