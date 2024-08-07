# urls.py
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from rest_framework.routers import DefaultRouter
from data.admin import PartAdmin
from data.views import MachineModelViewSet, PartViewSet, animation_presigned_url, avatar_presigned_url, get_csrf_token, interact_with_ai

router = DefaultRouter()
router.register(r'machine-models', MachineModelViewSet)
router.register(r'parts', PartViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),  # Admin URL
    path('admin/data/part/upload-excel/', admin.site.admin_view(PartAdmin.upload_excel), name='upload_excel'),
    path('api/', include(router.urls)),  # API URLs
    path('api/interact-with-ai', interact_with_ai, name='interact_with_ai'),
    path('api/avatar_presigned_url', avatar_presigned_url, name='avatar_presigned_url'),
    path('api/animation_presigned_url', animation_presigned_url, name='animation_presigned_url'),
    path('api/get-csrf-token/', get_csrf_token, name='get_csrf_token')
]+ static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
