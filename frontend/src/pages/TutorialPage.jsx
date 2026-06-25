import React, { useState } from 'react';
import { FiArrowLeft, FiChevronRight, FiUsers, FiLock, FiExternalLink, FiCompass, FiCopy, FiCheck, FiPhone, FiCreditCard, FiInstagram, FiSettings } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const TUTORIALS = [
  {
    id: 'meta-bm-share',
    title: 'Compartilhar Portfólio Empresarial',
    subtitle: 'Passo 1: Convidar administrador na Meta',
    description: 'Etapa obrigatória para darmos início à criação e configuração da sua API Oficial do WhatsApp e Instagram.',
    icon: FiUsers,
    color: 'from-blue-500 to-indigo-600',
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
  {
    id: 'meta-app-creation',
    title: 'Criação do Aplicativo de Negócios na Meta',
    subtitle: 'Passo 2: Meta for Developers',
    description: 'Aprenda a criar e configurar corretamente o seu aplicativo no portal oficial de desenvolvedores da Meta.',
    icon: FiLock,
    color: 'from-pink-500 to-rose-600',
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
  {
    id: 'whatsapp-phone-verification',
    title: 'Adicionar e Verificar o Número de Telefone',
    subtitle: 'Passo 3: WhatsApp Manager',
    description: 'Como registrar o número comercial na API Oficial, criar a WABA vazia e liberar status pendente.',
    icon: FiPhone,
    color: 'from-green-500 to-emerald-600',
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
  {
    id: 'whatsapp-billing',
    title: 'Configurar Métodos de Pagamento',
    subtitle: 'Passo 4: Faturamento Meta',
    description: 'Passo a passo para vincular um cartão de crédito para cobrir custos de consumo de mensagens da Meta.',
    icon: FiCreditCard,
    color: 'from-amber-500 to-orange-600',
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
  {
    id: 'instagram-linking',
    title: 'Vincular Instagram e Página do Facebook',
    subtitle: 'Passo 5: Conexão Comercial',
    description: 'Etapa necessária para que a automação de DMs do Instagram funcione vinculada a uma página comercial.',
    icon: FiInstagram,
    color: 'from-purple-500 to-fuchsia-600',
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
  {
    id: 'instagram-dm-permissions',
    title: 'Permissão de Acesso a Mensagens do Direct',
    subtitle: 'Passo 6: Chave de Acesso no Celular',
    description: 'Como habilitar a opção interna no app do Instagram para o ZapVoice gerenciar e responder às mensagens.',
    icon: FiSettings,
    color: 'from-rose-500 to-red-600',
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
  {
    id: 'zapvoice-credentials-setup',
    title: 'Conectar Credenciais no ZapVoice',
    subtitle: 'Passo 7: Integração Final',
    description: 'Como associar as credenciais e tokens gerados no painel do ZapVoice para ativar o robô.',
    icon: FiCompass,
    color: 'from-teal-500 to-cyan-600',
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
];

export default function TutorialPage() {
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const getPublicLink = (slug) => {
    return `${window.location.protocol}//${window.location.host}/help/${slug}`;
  };

  const handleCopyLink = (e, slug) => {
    e.stopPropagation();
    const link = getPublicLink(slug);
    navigator.clipboard.writeText(link);
    setCopiedId(slug);
    toast.success('Link público de compartilhamento copiado!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenNewTab = (e, slug) => {
    e.stopPropagation();
    const link = getPublicLink(slug);
    window.open(link, '_blank');
  };

  if (selectedTutorial) {
    const tutorial = TUTORIALS.find(t => t.id === selectedTutorial);
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
        {/* Header de navegação */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedTutorial(null)}
              className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-200 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 transition-all flex items-center justify-center"
            >
              <FiArrowLeft size={18} />
            </button>
            <div>
              <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tutorial Detalhado</span>
              <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{tutorial.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => handleCopyLink(e, tutorial.id)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all border border-gray-200/50 dark:border-white/5 flex items-center gap-2 uppercase tracking-wider"
            >
              {copiedId === tutorial.id ? <FiCheck className="text-green-500" size={14} /> : <FiCopy size={14} />}
              Copiar Link
            </button>
            <button
              onClick={(e) => handleOpenNewTab(e, tutorial.id)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/10 flex items-center gap-2 uppercase tracking-wider"
            >
              <FiExternalLink size={14} />
              Abrir em Nova Aba
            </button>
          </div>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 gap-8">
          {tutorial.steps.map((step, index) => (
            <div key={index} className="bg-white dark:bg-[#1e293b] rounded-3xl border border-gray-100 dark:border-white/5 shadow-md overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-2xl bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-sm">
                      {step.num}
                    </span>
                    <h3 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">{step.title}</h3>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
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
                  <div className="w-full md:w-1/2 rounded-2xl overflow-hidden border border-gray-200/50 dark:border-white/5 bg-gray-50 dark:bg-[#0f172a] shadow-inner">
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
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      {/* Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-white/5">
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10">
          <FiCompass size={220} />
        </div>
        <div className="max-w-2xl relative z-10">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
            Central de Ajuda Técnica
          </span>
          <h2 className="text-3xl font-black tracking-tight mb-2 uppercase">Central de Tutoriais da API</h2>
          <p className="text-gray-300 text-sm leading-relaxed font-medium">
            Selecione um dos guias interativos abaixo para configurar a sua API Oficial do WhatsApp e Instagram passo a passo de forma simples.
          </p>
        </div>
      </div>

      {/* Grid de Cards de Tutoriais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TUTORIALS.map((tutorial) => {
          const Icon = tutorial.icon;
          return (
            <div
              key={tutorial.id}
              onClick={() => setSelectedTutorial(tutorial.id)}
              className="text-left bg-white dark:bg-[#1e293b] hover:bg-gray-50/50 dark:hover:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-white/5 p-6 shadow-md hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 flex flex-col justify-between min-h-[220px] cursor-pointer"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tutorial.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={22} />
                  </div>
                  
                  {/* Botões de Ação Rápida */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleCopyLink(e, tutorial.id)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/5"
                      title="Copiar link público para enviar ao cliente"
                    >
                      {copiedId === tutorial.id ? <FiCheck className="text-green-500" size={14} /> : <FiCopy size={14} />}
                    </button>
                    <button
                      onClick={(e) => handleOpenNewTab(e, tutorial.id)}
                      className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400 rounded-xl transition-all border border-transparent hover:border-gray-200 dark:hover:border-white/5"
                      title="Abrir tutorial público em nova aba"
                    >
                      <FiExternalLink size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                    {tutorial.subtitle}
                  </span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase leading-tight tracking-wide">
                    {tutorial.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed mt-1">
                    {tutorial.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-4">
                Começar Tutorial <FiChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
