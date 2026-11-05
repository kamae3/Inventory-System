from django.urls import path
from . import views

urlpatterns = [
    # auth
    path("auth/register/", views.RegisterView.as_view()),
    path("auth/login/", views.LoginView.as_view()),
    path("auth/logout/", views.LogoutView.as_view()),
    path("auth/me/", views.MeView.as_view()),

    # shared
    path("categories/", views.CategoryListView.as_view()),
    path("categories/<int:pk>/models/", views.CategoryModelsView.as_view()),

    # user
    path("user/parts/", views.UserPartListCreateView.as_view()),

    # admin
    path("admin/parts/", views.AdminPartListCreateView.as_view()),
    path("admin/parts/<int:pk>/", views.AdminPartDetailView.as_view()),
    path("admin/part-requests/", views.AdminPartRequestView.as_view()),
    path("admin/models/", views.AdminDeviceModelCreateView.as_view()),
]
