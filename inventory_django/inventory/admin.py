from django.contrib import admin
from .models import Category, DeviceModel, Part, PartRequest

admin.site.register(Category)
admin.site.register(DeviceModel)
admin.site.register(Part)
admin.site.register(PartRequest)
