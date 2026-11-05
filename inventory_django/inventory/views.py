from django.contrib.auth import authenticate
from rest_framework import generics
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, DeviceModel, Part, PartRequest
from .permissions import IsAdminAccount
from .serializers import (
    CategorySerializer, DeviceModelSerializer, PartRequestSerializer,
    PartSerializer, RegisterSerializer, UserPartSerializer,
)


# ---------------- AUTH ----------------
class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [TokenAuthentication]

    def post(self, request):
        role = request.data.get("role", "user")
        if role not in ("user", "admin"):
            return Response({"error": "Invalid account role."}, status=400)
        if role == "admin" and not (
            request.user.is_authenticated and request.user.is_staff
        ):
            return Response(
                {"error": "Only an admin can create another admin account."},
                status=403,
            )

        s = RegisterSerializer(data=request.data)
        if not s.is_valid():
            return Response({"error": "Credentials INVALID", "details": s.errors}, status=400)
        user = s.save()
        if role == "admin":
            user.is_staff = True
            user.save(update_fields=["is_staff"])
        # "Back to the log in page" -> frontend ang magre-redirect
        return Response({"message": "Account created. Mag-log in na."}, status=201)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get("email") or "").lower()
        user = authenticate(username=email, password=request.data.get("password") or "")
        if not user:
            return Response({"error": "Maling email o password."}, status=401)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "role": "admin" if user.is_staff else "user",
            "redirect": "/admin/dashboard" if user.is_staff else "/user/dashboard",
            "user": {"id": user.id, "name": user.first_name, "email": user.email},
        })


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"message": "Logged out."})


class MeView(APIView):
    def get(self, request):
        u = request.user
        return Response({
            "id": u.id, "name": u.first_name, "email": u.email,
            "role": "admin" if u.is_staff else "user",
        })


# ---------------- SHARED ----------------
class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class CategoryModelsView(generics.ListAPIView):
    serializer_class = DeviceModelSerializer

    def get_queryset(self):
        return DeviceModel.objects.filter(category_id=self.kwargs["pk"])


# ---------------- USER DASHBOARD ----------------
class UserPartListCreateView(generics.ListCreateAPIView):
    """POST = 'Are the information correct?' Yes -> save | No -> INVALID INFORMATION"""
    serializer_class = UserPartSerializer

    def get_queryset(self):
        qs = Part.objects.filter(created_by=self.request.user).select_related("category", "model", "created_by")
        cat = self.request.query_params.get("category_id")
        return qs.filter(category_id=cat) if cat else qs

    def create(self, request, *args, **kwargs):
        s = self.get_serializer(data=request.data)
        if not s.is_valid():
            return Response({"error": "INVALID INFORMATION", "details": s.errors}, status=400)
        s.save(created_by=request.user)
        return Response({"message": "Saved to database", "part": s.data}, status=201)


# ---------------- ADMIN DASHBOARD ----------------
class AdminPartListCreateView(generics.ListCreateAPIView):
    """GET = show parts per category/model | POST = 'Are you adding information?' Yes"""
    serializer_class = PartSerializer
    permission_classes = [IsAdminAccount]

    def get_queryset(self):
        qs = Part.objects.select_related("category", "model", "created_by")
        p = self.request.query_params
        if p.get("category_id"):
            qs = qs.filter(category_id=p["category_id"])
        if p.get("model_id"):
            qs = qs.filter(model_id=p["model_id"])
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminPartDetailView(generics.RetrieveUpdateAPIView):
    """Show/update parts, date, serial number + update Location, Status"""
    queryset = Part.objects.select_related("category", "model", "created_by")
    serializer_class = PartSerializer
    permission_classes = [IsAdminAccount]


class AdminPartRequestView(generics.ListCreateAPIView):
    """'Are requesting parts?' Yes -> Proceed to request part -> DB"""
    queryset = PartRequest.objects.select_related("part", "requested_by")
    serializer_class = PartRequestSerializer
    permission_classes = [IsAdminAccount]

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)


class AdminDeviceModelCreateView(generics.CreateAPIView):
    queryset = DeviceModel.objects.all()
    serializer_class = DeviceModelSerializer
    permission_classes = [IsAdminAccount]
