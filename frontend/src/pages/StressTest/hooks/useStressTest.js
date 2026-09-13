import { useAuth } from '../../../AuthContext';
import { useClient } from '../../../contexts/ClientContext';
import { useStressMonitoring } from './useStressMonitoring';
import { useStressScaleForm } from './useStressScaleForm';
import { useStressContactsTest } from './useStressContactsTest';
import { useStressWebhookTest } from './useStressWebhookTest';

// Reexportação modular retrocompatível
export { PLATFORM_EVENT_OPTIONS } from '../constants/platformEventOptions';
export { generateWebhookPayload } from '../utils/payloadGenerators';
export { ALL_ERRORS } from '../constants/stressErrors';

export function useStressTest(onStartSuccess) {
  const { user } = useAuth();
  const { activeClient } = useClient();

  const monitoring = useStressMonitoring(activeClient);
  const form = useStressScaleForm(activeClient, monitoring, onStartSuccess);
  const contacts = useStressContactsTest(activeClient);
  const webhook = useStressWebhookTest(activeClient, form.testType);

  return {
    user,
    activeClient,
    ...form,
    ...monitoring,
    ...contacts,
    ...webhook,
  };
}
