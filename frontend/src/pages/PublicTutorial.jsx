import React from 'react';
import { FiExternalLink } from 'react-icons/fi';

const TUTORIALS_DATA = {
  'meta-bm-share': {
    title: 'Compartilhar Portfólio Empresarial',
    subtitle: 'Passo 1: Convidar administrador na Meta',
    description: 'Etapa obrigatória para darmos início à criação e configuração da sua API Oficial do WhatsApp e Instagram.',
    steps: [
      {
        num: '01',
        title: 'Selecionar Negócio no Portfólio',
        text: 'Entre no painel de seleção de negócios do Meta Business Suite e clique no portfólio (BM) da empresa que você deseja gerenciar.',
        image: '/tut_passo1_1.png'
      },
      {
        num: '02',
        title: 'Acessar as Configurações de Pessoas',
        text: 'Vá no menu lateral esquerdo em "Configurações do Negócio" > "Usuários" > "Pessoas" e clique no botão azul "Convidar Pessoas" no canto superior direito.',
        image: '/tut_passo1_2.png',
        url: 'https://business.facebook.com/settings'
      },
      {
        num: '03',
        title: 'Inserir e-mail de suporte da nossa equipe',
        text: 'Digite o endereço de e-mail de suporte fornecido pelo ZapVoice no campo de e-mail e clique em "Avançar".',
        image: '/tut_passo1_3.png'
      },
      {
        num: '04',
        title: 'Definir Acesso Administrativo (Gerenciar)',
        text: 'Sob a área de permissões de "Acesso total", marque a opção de "Gerenciar" e clique no botão azul "Avançar".',
        image: '/tut_passo1_4.png'
      },
      {
        num: '05',
        title: 'Atribuir Ativos de Negócios (Opcional)',
        text: 'Nesta etapa, selecione as Páginas e Contas correspondentes se desejar compartilhar agora. Caso contrário, você pode apenas clicar em "Avançar".',
        image: '/tut_passo1_5.png'
      },
      {
        num: '06',
        title: 'Enviar Convite Final',
        text: 'Revise as permissões concedidas de acesso total à equipe e clique no botão azul para concluir o envio do convite.',
        image: '/tut_passo1_6.png'
      }
    ]
  },
  'meta-app-creation': {
    title: 'Criação do Aplicativo de Negócios na Meta',
    subtitle: 'Passo 2: Meta for Developers',
    description: 'Aprenda a criar e configurar corretamente o seu aplicativo no portal oficial de desenvolvedores da Meta.',
    steps: [
      {
        num: '01',
        title: 'Acessar "Meus Aplicativos" na Meta',
        text: 'Acesse o portal Meta for Developers e clique no botão localizado no canto superior direito da tela principal para ver a listagem de aplicativos.',
        image: '/tut_passo2_1.png',
        url: 'https://developers.facebook.com/'
      },
      {
        num: '02',
        title: 'Iniciar Criação de Aplicativo',
        text: 'Clique no botão azul "Criar aplicativo" para dar início ao assistente de configuração de novos aplicativos da Meta.',
        image: '/tut_passo2_2.png'
      },
      {
        num: '03',
        title: 'Definir Nome e E-mail de Contato',
        text: 'Preencha o formulário informando o nome comercial do aplicativo e o e-mail de contato técnico oficial. Em seguida, clique no botão "Avançar".',
        image: '/tut_passo2_3.png'
      },
      {
        num: '04',
        title: 'Selecionar Casos de Uso (Business Messaging)',
        text: 'Selecione a opção "Business Messaging" e marque as plataformas que você pretende utilizar (WhatsApp, Instagram ou ambas) de acordo com a sua necessidade. Depois de selecionar, clique em "Avançar".',
        image: '/tut_passo2_4.png'
      },
      {
        num: '05',
        title: 'Vincular ao Portfólio Empresarial (BM)',
        text: 'Selecione o Portfólio Empresarial (Business Manager) correspondente à conta de negócios do seu cliente que gerenciará o aplicativo.',
        image: '/tut_passo2_5.png'
      },
      {
        num: '06',
        title: 'Revisar Configurações',
        text: 'Confirme todas as informações inseridas na tela de revisão e clique em "Avançar" para prosseguir para a etapa final de criação.',
        image: '/tut_passo2_6.png'
      },
      {
        num: '07',
        title: 'Finalizar Criação do Aplicativo',
        text: 'Clique no botão final "Criar aplicativo" para que o seu app seja registrado com sucesso no ecossistema de desenvolvedores da Meta.',
        image: '/tut_passo2_7.png'
      }
    ]
  },
  'whatsapp-phone-verification': {
    title: 'Adicionar e Verificar o Número de Telefone',
    subtitle: 'Passo 3: WhatsApp Manager',
    description: 'Como registrar o número comercial na API Oficial, criar a WABA vazia e liberar status pendente.',
    steps: [
      {
        num: '01',
        title: 'Excluir Conta Existente no Celular',
        text: 'O número de telefone usado na API Oficial não pode estar ativo no aplicativo do WhatsApp comum ou Business no celular. Abra o app, vá em Configurações > Conta > Apagar minha conta para liberá-lo antes de prosseguir.',
      },
      {
        num: '02',
        title: 'Criar a WABA sem Número Associado (Fluxo Recomendado)',
        text: 'Se você ainda não possui uma Conta Comercial do WhatsApp (WABA), vá em "Contas do WhatsApp" no Business Manager e crie a WABA vazia sem número associado primeiro para evitar falhas de integração.',
      },
      {
        num: '03',
        title: 'Vincular o Número e Escolher Verificação',
        text: 'Dentro da WABA criada, vá no WhatsApp Manager, insira o número do telefone com código de área (+55...) e selecione receber o código de 6 dígitos via SMS ou Ligação telefônica.',
      },
      {
        num: '04',
        title: 'Liberar Número se Ficar como "Pendente" (Pending)',
        text: 'Caso o número fique travado em pendente no painel, o administrador deve fazer uma chamada POST manual para registrar o pin: POST https://graph.facebook.com/v25.0/{Phone-Number-ID}/register enviando o JSON {"messaging_product": "whatsapp", "pin": "123456"} com o Bearer Token do Usuário do Sistema.',
      }
    ]
  },
  'whatsapp-billing': {
    title: 'Configurar Métodos de Pagamento',
    subtitle: 'Passo 4: Faturamento Meta',
    description: 'Passo a passo para vincular um cartão de crédito para cobrir custos de consumo de mensagens da Meta.',
    steps: [
      {
        num: '01',
        title: 'Acessar Cobrança do Gerenciador de Negócios',
        text: 'Entre no painel de Cobrança e Pagamentos do seu Business Manager e selecione a conta de faturamento correspondente à sua WABA.',
        url: 'https://business.facebook.com/billing_settings'
      },
      {
        num: '02',
        title: 'Adicionar Cartão de Crédito',
        text: 'Selecione "Formas de pagamento", clique em "Adicionar" e insira um cartão de crédito internacional válido. Este cartão será debitado automaticamente de acordo com as conversas iniciadas.',
      }
    ]
  },
  'instagram-linking': {
    title: 'Vincular Instagram e Página do Facebook',
    subtitle: 'Passo 5: Conexão Comercial',
    description: 'Etapa necessária para que a automação de DMs do Instagram funcione vinculada a uma página comercial.',
    steps: [
      {
        num: '01',
        title: 'Alterar Instagram para Conta Profissional',
        text: 'Abra as configurações do Instagram no celular e mude o tipo de conta para "Profissional" (Business ou Creator).',
      },
      {
        num: '02',
        title: 'Conectar com a Página do Facebook',
        text: 'Nas configurações do Perfil do Instagram, vá em "Página" e selecione ou crie uma Página do Facebook correspondente para fazer a vinculação comercial.',
      }
    ]
  },
  'instagram-dm-permissions': {
    title: 'Permissão de Acesso a Mensagens do Direct',
    subtitle: 'Passo 6: Chave de Acesso no Celular',
    description: 'Como habilitar a opção interna no app do Instagram para o ZapVoice gerenciar e responder às mensagens.',
    steps: [
      {
        num: '01',
        title: 'Acessar Configurações de Mensagens no Celular',
        text: 'Abra o Instagram no celular, acesse Configurações e atividade > Mensagens e respostas ao story > Controles de mensagens.',
      },
      {
        num: '02',
        title: 'Ativar "Permitir acesso a mensagens"',
        text: 'Role até o final da tela e, sob a seção "Ferramentas conectadas", ative a chave "Permitir acesso a mensagens". Sem isso, a automação não receberá as DMs.',
      }
    ]
  },
  'zapvoice-credentials-setup': {
    title: 'Conectar Credenciais no ZapVoice',
    subtitle: 'Passo 7: Integração Final',
    description: 'Como associar as credenciais e tokens gerados no painel do ZapVoice para ativar o robô.',
    steps: [
      {
        num: '01',
        title: 'Acessar Configurações de Automação do Instagram',
        text: 'No painel administrativo do ZapVoice, selecione o cliente ativo e acesse a aba "Automação Instagram" > Configurações (ícone de engrenagem).',
      },
      {
        num: '02',
        title: 'Colar ID da Conta Comercial e Token',
        text: 'Cole o ID da Conta do Instagram Business e o Page Access Token gerados anteriormente nas Configurações da Meta e salve a conexão.',
      },
      {
        num: '03',
        title: 'Configurar Webhook na Meta',
        text: 'Copie a URL de Webhook exibida na tela e configure-a nas opções de Webhook do seu aplicativo da Meta for Developers com as assinaturas de "messages" e "comments".',
      }
    ]
  }
};

export default function PublicTutorial({ slug }) {
  const tutorial = TUTORIALS_DATA[slug];

  if (!tutorial) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-gray-100 flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-black mb-2 uppercase text-red-500">Tutorial não encontrado</h2>
        <p className="text-gray-400 text-sm">O link acessado é inválido ou foi removido.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-gray-100 p-6 md:p-12 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header da Página Pública */}
        <div className="border-b border-white/5 pb-8 space-y-3">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
            {tutorial.subtitle}
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white uppercase">{tutorial.title}</h1>
          <p className="text-sm text-gray-400 max-w-2xl font-medium leading-relaxed">{tutorial.description}</p>
        </div>

        {/* Listagem de Passos */}
        <div className="space-y-8">
          {tutorial.steps.map((step, index) => (
            <div key={index} className="bg-[#1e293b] rounded-3xl border border-white/5 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 font-black flex items-center justify-center text-sm">
                      {step.num}
                    </span>
                    <h3 className="text-base font-black text-white uppercase tracking-wider">{step.title}</h3>
                  </div>
                  
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">
                    {step.text}
                  </p>

                  {step.url && (
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/10 uppercase tracking-wider"
                    >
                      Acessar link oficial <FiExternalLink size={12} />
                    </a>
                  )}
                </div>

                {step.image && (
                  <div className="w-full md:w-1/2 rounded-2xl overflow-hidden border border-white/5 bg-[#0f172a] shadow-inner">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-auto object-cover max-h-[350px]"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-white/5">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">
            GERADO AUTOMATICAMENTE POR ZAPVOICE &copy; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
