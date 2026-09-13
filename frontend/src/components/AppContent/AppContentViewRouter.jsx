import React from 'react';
import PageGuard from './PageGuard';
import FunnelsView from './FunnelsView';
import VendedorHomeView from './VendedorHomeView';

// View Components
import TemplateBulkSender from '../TemplateBulkSender';
import TriggerHistory from '../TriggerHistory';
import BlockedContacts from '../BlockedContacts';
import Users from '../../pages/Users';
import SchedulePage from '../../pages/SchedulePage';
import TemplateCreator from '../TemplateCreator';
import Monitoring from '../../pages/Monitoring';
import Integrations from '../../pages/Integrations';
import WebhookLeads from '../../pages/WebhookLeads';
import ImportHistoryPage from '../../pages/WebhookLeads/ImportHistoryPage';
import AppointmentsPage from '../../pages/WebhookLeads/AppointmentsPage';
import Financial from '../../pages/Financial';
import RecurringSchedules from '../RecurringSchedules';
import StressTest from '../../pages/StressTest';
import BackupDatabase from '../../pages/BackupDatabase';
import HotLeads from '../../pages/HotLeads/HotLeads';
import InstagramAutomation from '../../pages/InstagramAutomation';
import TutorialPage from '../../pages/TutorialPage';
import LogViewer from '../../pages/LogViewer';
import HumanAgents from '../../pages/HumanAgents';
import CheckoutPresellPage from '../../pages/CheckoutPresellPage';
import CapturePageAdmin from '../../pages/CapturePageAdmin';
import EmailMarketingMain from '../EmailMarketing/EmailMarketingMain';

export default function AppContentViewRouter({ logic }) {
  const pagesStatus = logic.user?.pages_status;

  return (
    <div className="p-8 pt-0">
      {logic.currentView === 'blocked' && (
        <PageGuard pageKey="blocked" pagesStatus={pagesStatus}>
          <BlockedContacts />
        </PageGuard>
      )}

      {logic.currentView === 'email_marketing' && <EmailMarketingMain />}
      {logic.currentView === 'users' && <Users />}

      {logic.currentView === 'schedules' && (
        <PageGuard pageKey="schedules" pagesStatus={pagesStatus}>
          <SchedulePage />
        </PageGuard>
      )}

      {logic.currentView === 'monitoring' && <Monitoring />}

      {logic.currentView === 'integrations' && (
        <PageGuard pageKey="integrations" pagesStatus={pagesStatus}>
          <Integrations
            onNavigateToLeads={() => logic.setCurrentView('leads')}
            onNavigateToBulk={() => logic.setCurrentView('bulk_sender')}
            onNavigateToDispatchHistory={() => logic.setCurrentView('history')}
            onNavigateToFunnels={() => logic.setCurrentView('funnels')}
            onNavigateToChat={() => logic.setCurrentView('chat_conversations')}
          />
        </PageGuard>
      )}

      {logic.currentView === 'leads' && (
        <PageGuard pageKey="leads" pagesStatus={pagesStatus}>
          <WebhookLeads
            onNavigateToImportHistory={() => logic.setCurrentView('import_history')}
            onNavigateToIntegrations={() => logic.setCurrentView('integrations')}
            onNavigateToBulk={() => logic.setCurrentView('bulk_sender')}
            onNavigateToDispatchHistory={() => logic.setCurrentView('history')}
            onNavigateToChat={() => logic.setCurrentView('chat_conversations')}
          />
        </PageGuard>
      )}

      {logic.currentView === 'appointments' && (
        <PageGuard pageKey="leads" pagesStatus={pagesStatus}>
          <AppointmentsPage />
        </PageGuard>
      )}

      {logic.currentView === 'import_history' && (
        <PageGuard pageKey="import_history" pagesStatus={pagesStatus}>
          <ImportHistoryPage onNavigateToLeads={() => logic.setCurrentView('leads')} />
        </PageGuard>
      )}

      {logic.currentView === 'financial' && (
        <PageGuard pageKey="financial" pagesStatus={pagesStatus}>
          <Financial />
        </PageGuard>
      )}

      {logic.currentView === 'recurring_schedules' && (
        <PageGuard pageKey="schedules" pagesStatus={pagesStatus}>
          <RecurringSchedules />
        </PageGuard>
      )}

      {logic.currentView === 'capture_page' && (
        <PageGuard pageKey="capture_page" pagesStatus={pagesStatus}>
          <CapturePageAdmin />
        </PageGuard>
      )}

      {logic.currentView === 'pagina_captura' && (
        <PageGuard pageKey="pagina_captura" pagesStatus={pagesStatus}>
          <CheckoutPresellPage
            onNavigateToChat={(contact) => {
              logic.setCurrentView('chat_conversations');
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('select-chat-convo', { detail: contact }));
              }, 100);
            }}
          />
        </PageGuard>
      )}

      {logic.currentView === 'stress_test' && (
        <StressTest
          onStartSuccess={() => logic.setCurrentView('history')}
          onNavigateToHistory={() => logic.setCurrentView('history')}
          onNavigateToIntegrations={() => logic.setCurrentView('integrations')}
          onNavigateToContacts={() => logic.setCurrentView('leads')}
        />
      )}

      {logic.currentView === 'backup_db' && <BackupDatabase />}

      {logic.currentView === 'hot_leads' && (
        <PageGuard pageKey="hot_leads" pagesStatus={pagesStatus}>
          <HotLeads />
        </PageGuard>
      )}

      {logic.currentView === 'instagram_automation' && (
        <PageGuard pageKey="instagram_automation" pagesStatus={pagesStatus}>
          <InstagramAutomation />
        </PageGuard>
      )}

      {logic.currentView === 'tutorial' && <TutorialPage />}
      {logic.currentView === 'log_viewer' && <LogViewer />}

      {logic.currentView === 'human_agents' && (
        <HumanAgents
          onNavigateToChat={(convo) => {
            logic.setCurrentView('chat_conversations');
            setTimeout(() => {
              const event = new CustomEvent('select-chat-convo', { detail: convo });
              window.dispatchEvent(event);
            }, 100);
          }}
        />
      )}

      {logic.currentView === 'bulk_sender' && (
        <PageGuard pageKey="bulk_sender" pagesStatus={pagesStatus}>
          <div className="space-y-8">
            <TemplateBulkSender
              onSuccess={() => logic.setTriggerHistoryRefreshKey(prev => prev + 1)}
              refreshKey={logic.settingsRefreshKey}
              onViewChange={logic.handleViewChange}
            />
          </div>
        </PageGuard>
      )}

      {logic.currentView === 'funnels' && <FunnelsView logic={logic} />}

      {logic.currentView === 'templates' && (
        <PageGuard pageKey="whatsapp" pagesStatus={pagesStatus}>
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TemplateCreator
              refreshKey={logic.settingsRefreshKey}
              onSuccess={() => {
                logic.setSettingsRefreshKey(prev => prev + 1);
              }}
            />
          </div>
        </PageGuard>
      )}

      {logic.currentView === 'history' && (
        <PageGuard pageKey="history" pagesStatus={pagesStatus}>
          <div className="space-y-8">
            <TriggerHistory
              refreshKey={logic.triggerHistoryRefreshKey}
              onNavigateToBulk={() => logic.setCurrentView('bulk_sender')}
              onNavigateToFunnels={() => logic.setCurrentView('funnels')}
              onNavigateToChat={() => logic.setCurrentView('chat_conversations')}
            />
          </div>
        </PageGuard>
      )}

      {logic.currentView === 'vendedor_home' && <VendedorHomeView logic={logic} />}
    </div>
  );
}
