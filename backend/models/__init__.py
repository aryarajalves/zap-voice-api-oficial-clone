from .base import user_clients, Base
from .auth import User
from .client import Client, AppConfig, BlockedContact, ContactWindow
from .funnel import Funnel, WebhookConfig, WebhookEvent
from .invitation import UserInvitation, invitation_clients
from .backup import BackupConfig, BackupMetadata
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
    ProductStatus
)

# This allows importing all models from the models package
__all__ = [
    "Base",
    "user_clients",
    "User",
    "Client",
    "AppConfig",
    "BlockedContact",
    "ContactWindow",
    "Funnel",
    "WebhookConfig",
    "WebhookEvent",
    "UserInvitation",
    "invitation_clients",
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
    "BackupConfig",
    "BackupMetadata"
]
