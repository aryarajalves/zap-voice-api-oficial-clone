import { toast } from 'react-hot-toast';
import { META_APP_ID, META_CONFIG_ID } from '../../../config';

export const handleMetaEmbeddedSignupHelper = (setFormData) => {
    if (!META_APP_ID || !META_CONFIG_ID) {
        toast.error("Configurações da Meta incompletas no arquivo .env (META_APP_ID ou META_CONFIG_ID ausentes).");
        return;
    }

    if (!window.FB) {
        toast.error("O SDK do Facebook ainda não foi carregado. Aguarde um instante ou verifique bloqueadores de anúncios.");
        return;
    }

    window.FB.login((response) => {
        if (response.authResponse) {
            const accessToken = response.authResponse.accessToken;
            
            const toastId = toast.loading("Autenticado! Buscando contas e números do WhatsApp na Meta...");

            fetch(`https://graph.facebook.com/v19.0/me/whatsapp_business_accounts?access_token=${accessToken}`)
                .then(res => res.json())
                .then(wabaData => {
                    if (wabaData.data && wabaData.data.length > 0) {
                        const waba = wabaData.data[0];
                        const wabaId = waba.id;

                        fetch(`https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?access_token=${accessToken}`)
                            .then(res => res.json())
                            .then(phoneData => {
                                let phoneId = "";
                                if (phoneData.data && phoneData.data.length > 0) {
                                    phoneId = phoneData.data[0].id;
                                }

                                setFormData(prev => ({
                                    ...prev,
                                    WA_ACCESS_TOKEN: accessToken,
                                    WA_BUSINESS_ACCOUNT_ID: wabaId,
                                    WA_PHONE_NUMBER_ID: phoneId
                                }));

                                toast.success("Conectado com sucesso! Os campos WABA ID, Phone ID e Access Token foram preenchidos de forma automática.", { id: toastId });
                            })
                            .catch(err => {
                                console.error("Erro ao carregar números de telefone da Meta:", err);
                                setFormData(prev => ({
                                    ...prev,
                                    WA_ACCESS_TOKEN: accessToken,
                                    WA_BUSINESS_ACCOUNT_ID: wabaId
                                }));
                                toast.success("Conectado! WABA ID e Access Token preenchidos (não foi possível autodescobrir o Phone ID).", { id: toastId });
                            });
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            WA_ACCESS_TOKEN: accessToken
                        }));
                        toast.success("Conectado! Access Token preenchido (nenhuma conta comercial WhatsApp encontrada).", { id: toastId });
                    }
                })
                .catch(err => {
                    console.error("Erro ao carregar WABA da Meta:", err);
                    setFormData(prev => ({
                        ...prev,
                        WA_ACCESS_TOKEN: accessToken
                    }));
                    toast.success("Conectado! Access Token preenchido (erro ao autodescobrir contas).", { id: toastId });
                });

        } else {
            toast.error("Conexão cancelada ou não autorizada.");
        }
    }, {
        config_id: META_CONFIG_ID,
        response_type: 'token',
        override_default_response_type: true,
        scope: 'whatsapp_business_management,whatsapp_business_messaging'
    });
};
