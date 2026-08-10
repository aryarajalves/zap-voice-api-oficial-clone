from .base import user_clients, Base
from .auth import User
from .project import Project
from .client import Client, AppConfig, BlockedContact, ContactWindow, RestingContact
from .funnel import Funnel, WebhookConfig, WebhookEvent
from .invitation import UserInvitation, invitation_clients
from .backup import BackupConfig, BackupMetadata
from .instagram_automation import InstagramAutomation, InstagramLog
from .import_history import ContactImportHistory
from .import_row_result import ImportRowResult
from .chat import ChatConversation, ChatMessage
from .trigger import (
    ScheduledTrigger,
    TriggerFolder,
    MessageStatus,
    WebhookIntegration,
    WebhookEventMapping,
    WebhookHistory,
    WhatsAppTemplateCache,
    GlobalVariable,
    WebhookLead,
    ContactTemplateHistory,
    RecurringTrigger,
    StatusInfo,
    ProductStatus,
    RouletteLog,
    RoundRobinState,
    HotLead
)
from .uploaded_media import UploadedMedia
from .api_key import ApiKey
from .chat_label import ChatLabel
from .checkout_presell import CheckoutConfig, CheckoutLead
from .capture_page import CapturePageConfig, CapturePageLead
from .email import EmailConfig, EmailTemplate, EmailDispatch, EmailInbound

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
    "TriggerFolder",
    "MessageStatus",
    "WebhookIntegration",
    "WebhookEventMapping",
    "WebhookHistory",
    "WhatsAppTemplateCache",
    "GlobalVariable",
    "WebhookLead",
    "ContactTemplateHistory",
    "RecurringTrigger",
    "StatusInfo",
    "ProductStatus",
    "RouletteLog",
    "RoundRobinState",
    "HotLead",
    "BackupConfig",
    "BackupMetadata",
    "ContactImportHistory",
    "ImportRowResult",
    "UploadedMedia",
    "ChatConversation",
    "ChatMessage",
    "ApiKey",
    "CheckoutConfig",
    "CheckoutLead",
    "CapturePageConfig",
    "CapturePageLead",
    "EmailConfig",
    "EmailTemplate",
    "EmailDispatch",
    "EmailInbound"
]

