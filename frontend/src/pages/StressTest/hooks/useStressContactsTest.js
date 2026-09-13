import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../../../config';
import { fetchWithAuth } from '../../../AuthContext';

export function useStressContactsTest(activeClient) {
  const [contactsCount, setContactsCount] = useState(() => {
    const s = localStorage.getItem('stress_test_contacts_count');
    return s ? parseInt(s) : 500;
  });
  const [contactsTagCount, setContactsTagCount] = useState(() => {
    const s = localStorage.getItem('stress_test_contacts_tag_count');
    return s ? parseInt(s) : 3;
  });
  const [contactsImportResult, setContactsImportResult] = useState(null);
  const [isContactsRunning, setIsContactsRunning] = useState(false);

  useEffect(() => {
    localStorage.setItem('stress_test_contacts_count', contactsCount.toString());
    localStorage.setItem('stress_test_contacts_tag_count', contactsTagCount.toString());
  }, [contactsCount, contactsTagCount]);

  const handleStartContactsTest = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!activeClient) return;

    if (contactsCount <= 0 || contactsCount > 50000) {
      toast.error("Informe entre 1 e 50.000 contatos.");
      return;
    }

    setIsContactsRunning(true);
    setContactsImportResult(null);
    const loadingToast = toast.loading(`Importando ${contactsCount.toLocaleString('pt-BR')} contatos fictícios...`);

    try {
      const res = await fetchWithAuth(`${API_URL}/stress-test/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number_of_contacts: parseInt(contactsCount),
          number_of_random_tags: parseInt(contactsTagCount),
        }),
      }, activeClient.id);

      if (res.ok) {
        const data = await res.json();
        setContactsImportResult({ imported: data.imported, test_tag: data.test_tag });
        toast.success(`${data.imported.toLocaleString('pt-BR')} contatos importados!`, { id: loadingToast, duration: 4000 });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || 'Erro ao importar contatos.', { id: loadingToast });
      }
    } catch (err) {
      toast.error('Erro de conexão.', { id: loadingToast });
    } finally {
      setIsContactsRunning(false);
    }
  };

  return {
    contactsCount,
    setContactsCount,
    contactsTagCount,
    setContactsTagCount,
    contactsImportResult,
    setContactsImportResult,
    isContactsRunning,
    handleStartContactsTest
  };
}
