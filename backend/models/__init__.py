from .base import user_clients, Base
from .auth import User
from .project import Project
from .client import Client, AppConfig, BlockedContact, ContactWindow, RestingContact
from .funnel import Funnel, WebhookConfig, WebhookEvent
from .invitation import UserInvitation, invitation_clients
from .backup import BackupConfig, BackupMetadata
from .instagram_automation import InstagramAutomation, InstagramLog
from .import_history import ContactImportHistory
from .trigger import (
    ScheduledTrigger, 
    MessageStatus, 
    WebhookIntegration, 
    WebhookEventMapping, 
    WebhookHistory, 
    WhatsAppTemplateCache, 
    GlobalVariable, 
    WebhookLead, 
    RecurringTrigger, 
    StatusInfo, 
    ProductStatus,
    RouletteLog,
    RoundRobinState,
    HotLead
)
from .uploaded_media import UploadedMedia

# This allows importing all models from the models package
__all__ = [
    "Base",
    "user_clients",
    "User",
    "Project",
    "Client",
    "AppConfig",
    "BlockedContact",
    "ContactWindow",
    "RestingContact",
    "Funnel",
    "WebhookConfig",
    "WebhookEvent",
    "UserInvitation",
    "invitation_clients",
    "InstagramAutomation",
    "InstagramLog",
    "ScheduledTrigger",
    "MessageStatus",
    "WebhookIntegration",
    "WebhookEventMapping",
    "WebhookHistory",
    "WhatsAppTemplateCache",
    "GlobalVariable",
    "WebhookLead",
    "RecurringTrigger",
    "StatusInfo",
    "ProductStatus",
    "RouletteLog",
    "RoundRobinState",
    "HotLead",
    "BackupConfig",
    "BackupMetadata",
    "ContactImportHistory",
    "UploadedMedia"
]
