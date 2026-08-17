import React, { useState, useEffect, useLayoutEffect } from 'react';
import { FiCheckCircle, FiShield, FiLock, FiArrowRight, FiRefreshCw, FiChevronDown, FiSearch } from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';
import { getApiUrl } from '../config';

export default function PublicCheckoutPage({ slug }) {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Título em cache para evitar qualquer milissegundo de flicker do ZapVoice ao atualizar
  const cachedTitle = typeof window !== 'undefined' && slug ? sessionStorage.getItem(`checkout_title_${slug}`) : null;

  // Configuração da Página carregada do servidor
  const [pageConfig, setPageConfig] = useState({
    title: cachedTitle || 'Aplicação Mentoria',
    page_tab_title: cachedTitle || undefined,
    description: 'Preencha seus dados para continuar com sua aplicação',
    badge_text: '⚡ Vagas Limitadas',
    destination_url: 'https://whatsapp.com',
    button_text: 'Continuar com Aplicação →'
  });

  // Campos do formulário
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ddi, setDdi] = useState('+55');
  const [phone, setPhone] = useState('');

  // Dropdown pesquisável de DDI
  const [ddiDropdownOpen, setDdiDropdownOpen] = useState(false);
  const [ddiSearch, setDdiSearch] = useState('');

  // Lista completa de países e DDIs
  const ddiOptions = [
    { code: 'BR', name: 'Brasil', dialCode: '+55', flag: '🇧🇷' },
    { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
    { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
    { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸' },
    { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴' },
    { code: 'MZ', name: 'Moçambique', dialCode: '+258', flag: '🇲🇿' },
    { code: 'AF', name: 'Afeganistão', dialCode: '+93', flag: '🇦🇫' },
    { code: 'AL', name: 'Albânia', dialCode: '+355', flag: '🇦🇱' },
    { code: 'DZ', name: 'Argélia', dialCode: '+213', flag: '🇩🇿' },
    { code: 'AS', name: 'Samoa Americana', dialCode: '+1684', flag: '🇦🇸' },
    { code: 'AD', name: 'Andorra', dialCode: '+376', flag: '🇦🇩' },
    { code: 'AI', name: 'Anguilla', dialCode: '+1264', flag: '🇦🇮' },
    { code: 'AG', name: 'Antigua e Barbuda', dialCode: '+1268', flag: '🇦🇬' },
    { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
    { code: 'AM', name: 'Armênia', dialCode: '+374', flag: '🇦🇲' },
    { code: 'AW', name: 'Aruba', dialCode: '+297', flag: '🇦🇼' },
    { code: 'AU', name: 'Austrália', dialCode: '+61', flag: '🇦🇺' },
    { code: 'AT', name: 'Áustria', dialCode: '+43', flag: '🇦🇹' },
    { code: 'AZ', name: 'Azerbaijão', dialCode: '+994', flag: '🇦🇿' },
    { code: 'BS', name: 'Bahamas', dialCode: '+1242', flag: '🇧🇸' },
    { code: 'BH', name: 'Bahrein', dialCode: '+973', flag: '🇧🇭' },
    { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
    { code: 'BB', name: 'Barbados', dialCode: '+1246', flag: '🇧🇧' },
    { code: 'BY', name: 'Belarus', dialCode: '+375', flag: '🇧🇾' },
    { code: 'BE', name: 'Bélgica', dialCode: '+32', flag: '🇧🇪' },
    { code: 'BZ', name: 'Belize', dialCode: '+501', flag: '🇧🇿' },
    { code: 'BJ', name: 'Benin', dialCode: '+229', flag: '🇧🇯' },
    { code: 'BM', name: 'Bermudas', dialCode: '+1441', flag: '🇧🇲' },
    { code: 'BT', name: 'Butão', dialCode: '+975', flag: '🇧🇹' },
    { code: 'BO', name: 'Bolívia', dialCode: '+591', flag: '🇧🇴' },
    { code: 'BA', name: 'Bósnia e Herzegovina', dialCode: '+387', flag: '🇧🇦' },
    { code: 'BW', name: 'Botswana', dialCode: '+267', flag: '🇧🇼' },
    { code: 'BN', name: 'Brunei', dialCode: '+673', flag: '🇧🇳' },
    { code: 'BG', name: 'Bulgária', dialCode: '+359', flag: '🇧🇬' },
    { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
    { code: 'BI', name: 'Burundi', dialCode: '+257', flag: '🇧🇮' },
    { code: 'KH', name: 'Camboja', dialCode: '+855', flag: '🇰🇭' },
    { code: 'CM', name: 'Camarões', dialCode: '+237', flag: '🇨🇲' },
    { code: 'CA', name: 'Canadá', dialCode: '+1', flag: '🇨🇦' },
    { code: 'CV', name: 'Cabo Verde', dialCode: '+238', flag: '🇨🇻' },
    { code: 'KY', name: 'Ilhas Cayman', dialCode: '+1345', flag: '🇰🇾' },
    { code: 'CF', name: 'República Centro-Africana', dialCode: '+236', flag: '🇨🇫' },
    { code: 'TD', name: 'Chade', dialCode: '+235', flag: '🇹🇩' },
    { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
    { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
    { code: 'CO', name: 'Colômbia', dialCode: '+57', flag: '🇨🇴' },
    { code: 'KM', name: 'Comores', dialCode: '+269', flag: '🇰🇲' },
    { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬' },
    { code: 'CD', name: 'Congo (RDC)', dialCode: '+243', flag: '🇨🇩' },
    { code: 'CK', name: 'Ilhas Cook', dialCode: '+682', flag: '🇨CK' },
    { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
    { code: 'CI', name: 'Costa do Marfim', dialCode: '+225', flag: '🇨🇮' },
    { code: 'HR', name: 'Croácia', dialCode: '+385', flag: '🇭🇷' },
    { code: 'CU', name: 'Cuba', dialCode: '+53', flag: '🇨🇺' },
    { code: 'CY', name: 'Chipre', dialCode: '+357', flag: '🇨🇾' },
    { code: 'CZ', name: 'República Tcheca', dialCode: '+420', flag: '🇨🇿' },
    { code: 'DK', name: 'Dinamarca', dialCode: '+45', flag: '🇩🇰' },
    { code: 'DJ', name: 'Djibuti', dialCode: '+253', flag: '🇩🇯' },
    { code: 'DM', name: 'Dominica', dialCode: '+1767', flag: '🇩🇲' },
    { code: 'DO', name: 'República Dominicana', dialCode: '+1', flag: '🇩🇴' },
    { code: 'EC', name: 'Equador', dialCode: '+593', flag: '🇪🇨' },
    { code: 'EG', name: 'Egito', dialCode: '+20', flag: '🇪🇬' },
    { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻' },
    { code: 'GQ', name: 'Guiné Equatorial', dialCode: '+240', flag: '🇬🇶' },
    { code: 'ER', name: 'Eritreia', dialCode: '+291', flag: '🇪🇷' },
    { code: 'EE', name: 'Estônia', dialCode: '+372', flag: '🇪🇪' },
    { code: 'ET', name: 'Etiópia', dialCode: '+251', flag: '🇪🇹' },
    { code: 'FK', name: 'Ilhas Malvinas', dialCode: '+500', flag: '🇫🇰' },
    { code: 'FO', name: 'Ilhas Faroe', dialCode: '+298', flag: '🇫🇴' },
    { code: 'FJ', name: 'Fiji', dialCode: '+679', flag: '🇫🇯' },
    { code: 'FI', name: 'Finlândia', dialCode: '+358', flag: '🇫🇮' },
    { code: 'FR', name: 'França', dialCode: '+33', flag: '🇫🇷' },
    { code: 'GF', name: 'Guiana Francesa', dialCode: '+594', flag: '🇬🇫' },
    { code: 'PF', name: 'Polinésia Francesa', dialCode: '+689', flag: '🇵🇫' },
    { code: 'GA', name: 'Gabão', dialCode: '+241', flag: '🇬🇦' },
    { code: 'GM', name: 'Gâmbia', dialCode: '+220', flag: '🇬🇲' },
    { code: 'GE', name: 'Geórgia', dialCode: '+995', flag: '🇬🇪' },
    { code: 'DE', name: 'Alemanha', dialCode: '+49', flag: '🇩🇪' },
    { code: 'GH', name: 'Gana', dialCode: '+233', flag: '🇬🇭' },
    { code: 'GI', name: 'Gibraltar', dialCode: '+350', flag: '🇬🇮' },
    { code: 'GR', name: 'Grécia', dialCode: '+30', flag: '🇬🇷' },
    { code: 'GL', name: 'Groenlândia', dialCode: '+299', flag: '🇬🇱' },
    { code: 'GD', name: 'Granada', dialCode: '+1473', flag: '🇬🇩' },
    { code: 'GP', name: 'Guadalupe', dialCode: '+590', flag: '🇬🇵' },
    { code: 'GU', name: 'Guam', dialCode: '+1671', flag: '🇬🇺' },
    { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹' },
    { code: 'GN', name: 'Guiné', dialCode: '+224', flag: '🇬🇳' },
    { code: 'GW', name: 'Guiné-Bissau', dialCode: '+245', flag: '🇬🇼' },
    { code: 'GY', name: 'Guiana', dialCode: '+592', flag: '🇬🇾' },
    { code: 'HT', name: 'Haiti', dialCode: '+509', flag: '🇭🇹' },
    { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳' },
    { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
    { code: 'HU', name: 'Hungria', dialCode: '+36', flag: '🇭🇺' },
    { code: 'IS', name: 'Islândia', dialCode: '+354', flag: '🇮🇸' },
    { code: 'IN', name: 'Índia', dialCode: '+91', flag: '🇮🇳' },
    { code: 'ID', name: 'Indonésia', dialCode: '+62', flag: '🇮🇩' },
    { code: 'IR', name: 'Irã', dialCode: '+98', flag: '🇮🇷' },
    { code: 'IQ', name: 'Iraque', dialCode: '+964', flag: '🇮🇶' },
    { code: 'IE', name: 'Irlanda', dialCode: '+353', flag: '🇮🇪' },
    { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
    { code: 'IT', name: 'Itália', dialCode: '+39', flag: '🇮🇹' },
    { code: 'JM', name: 'Jamaica', dialCode: '+1876', flag: '🇯🇲' },
    { code: 'JP', name: 'Japão', dialCode: '+81', flag: '🇯🇵' },
    { code: 'JO', name: 'Jordânia', dialCode: '+962', flag: '🇯🇴' },
    { code: 'KZ', name: 'Cazaquistão', dialCode: '+7', flag: '🇰🇿' },
    { code: 'KE', name: 'Quênia', dialCode: '+254', flag: '🇰🇪' },
    { code: 'KI', name: 'Kiribati', dialCode: '+686', flag: '🇰🇮' },
    { code: 'KP', name: 'Coreia do Norte', dialCode: '+850', flag: '🇰🇵' },
    { code: 'KR', name: 'Coreia do Sul', dialCode: '+82', flag: '🇰🇷' },
    { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
    { code: 'KG', name: 'Quirguistão', dialCode: '+996', flag: '🇰🇬' },
    { code: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦' },
    { code: 'LV', name: 'Letônia', dialCode: '+371', flag: '🇱🇻' },
    { code: 'LB', name: 'Líbano', dialCode: '+961', flag: '🇱🇧' },
    { code: 'LS', name: 'Lesoto', dialCode: '+266', flag: '🇱🇸' },
    { code: 'LR', name: 'Libéria', dialCode: '+231', flag: '🇱🇷' },
    { code: 'LY', name: 'Líbia', dialCode: '+218', flag: '🇱🇾' },
    { code: 'LI', name: 'Liechtenstein', dialCode: '+423', flag: '🇱🇮' },
    { code: 'LT', name: 'Lituânia', dialCode: '+370', flag: '🇱🇹' },
    { code: 'LU', name: 'Luxemburgo', dialCode: '+352', flag: '🇱🇺' },
    { code: 'MO', name: 'Macau', dialCode: '+853', flag: '🇲🇴' },
    { code: 'MK', name: 'Macedônia do Norte', dialCode: '+389', flag: '🇲🇰' },
    { code: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬' },
    { code: 'MW', name: 'Malawi', dialCode: '+265', flag: '🇲🇼' },
    { code: 'MY', name: 'Malásia', dialCode: '+60', flag: '🇲🇾' },
    { code: 'MV', name: 'Maldivas', dialCode: '+960', flag: '🇲🇻' },
    { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
    { code: 'MT', name: 'Malta', dialCode: '+356', flag: '🇲🇹' },
    { code: 'MH', name: 'Ilhas Marshall', dialCode: '+692', flag: '🇲🇭' },
    { code: 'MQ', name: 'Martinica', dialCode: '+596', flag: '🇲🇶' },
    { code: 'MR', name: 'Mauritânia', dialCode: '+222', flag: '🇲🇷' },
    { code: 'MU', name: 'Maurício', dialCode: '+230', flag: '🇲🇺' },
    { code: 'MX', name: 'México', dialCode: '+52', flag: '🇲🇽' },
    { code: 'FM', name: 'Micronésia', dialCode: '+691', flag: '🇫🇲' },
    { code: 'MD', name: 'Moldova', dialCode: '+373', flag: '🇲🇩' },
    { code: 'MC', name: 'Mônaco', dialCode: '+377', flag: '🇲🇨' },
    { code: 'MN', name: 'Mongólia', dialCode: '+976', flag: '🇲🇳' },
    { code: 'ME', name: 'Montenegro', dialCode: '+382', flag: '🇲🇪' },
    { code: 'MS', name: 'Montserrat', dialCode: '+1664', flag: '🇲🇸' },
    { code: 'MA', name: 'Marrocos', dialCode: '+212', flag: '🇲🇦' },
    { code: 'MZ', name: 'Moçambique', dialCode: '+258', flag: '🇲🇿' },
    { code: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲' },
    { code: 'NA', name: 'Namíbia', dialCode: '+264', flag: '🇳🇦' },
    { code: 'NR', name: 'Nauru', dialCode: '+674', flag: '🇳🇷' },
    { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
    { code: 'NL', name: 'Países Baixos', dialCode: '+31', flag: '🇳🇱' },
    { code: 'NC', name: 'Nova Caledônia', dialCode: '+687', flag: '🇳🇨' },
    { code: 'NZ', name: 'Nova Zelândia', dialCode: '+64', flag: '🇳🇿' },
    { code: 'NI', name: 'Nicarágua', dialCode: '+505', flag: '🇳🇮' },
    { code: 'NE', name: 'Níger', dialCode: '+227', flag: '🇳🇪' },
    { code: 'NG', name: 'Nigéria', dialCode: '+234', flag: '🇳🇬' },
    { code: 'NU', name: 'Niue', dialCode: '+683', flag: '🇳🇺' },
    { code: 'NF', name: 'Ilha Norfolk', dialCode: '+672', flag: '🇳🇫' },
    { code: 'MP', name: 'Ilhas Marianas do Norte', dialCode: '+1670', flag: '🇲🇵' },
    { code: 'NO', name: 'Noruega', dialCode: '+47', flag: '🇳🇴' },
    { code: 'OM', name: 'Omã', dialCode: '+968', flag: '🇴🇲' },
    { code: 'PK', name: 'Paquistão', dialCode: '+92', flag: '🇵🇰' },
    { code: 'PW', name: 'Palau', dialCode: '+680', flag: '🇵🇼' },
    { code: 'PS', name: 'Palestina', dialCode: '+970', flag: '🇵🇸' },
    { code: 'PA', name: 'Panamá', dialCode: '+507', flag: '🇵🇦' },
    { code: 'PG', name: 'Papua-Nova Guiné', dialCode: '+675', flag: '🇵🇬' },
    { code: 'PY', name: 'Paraguai', dialCode: '+595', flag: '🇵🇾' },
    { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
    { code: 'PH', name: 'Filipinas', dialCode: '+63', flag: '🇵🇭' },
    { code: 'PL', name: 'Polônia', dialCode: '+48', flag: '🇵🇱' },
    { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
    { code: 'PR', name: 'Porto Rico', dialCode: '+1', flag: '🇵🇷' },
    { code: 'QA', name: 'Catar', dialCode: '+974', flag: '🇶🇦' },
    { code: 'RO', name: 'Romênia', dialCode: '+40', flag: '🇷🇴' },
    { code: 'RU', name: 'Rússia', dialCode: '+7', flag: '🇷🇺' },
    { code: 'RW', name: 'Ruanda', dialCode: '+250', flag: '🇷🇼' },
    { code: 'KN', name: 'São Cristóvão e Nevis', dialCode: '+1869', flag: '🇰🇳' },
    { code: 'LC', name: 'Santa Lúcia', dialCode: '+1758', flag: '🇱🇨' },
    { code: 'VC', name: 'São Vicente e Granadinas', dialCode: '+1784', flag: '🇻🇨' },
    { code: 'WS', name: 'Samoa', dialCode: '+685', flag: '🇼🇸' },
    { code: 'SM', name: 'San Marino', dialCode: '+378', flag: '🇸🇲' },
    { code: 'ST', name: 'São Tomé e Príncipe', dialCode: '+239', flag: '🇸🇹' },
    { code: 'SA', name: 'Arábia Saudita', dialCode: '+966', flag: '🇸🇦' },
    { code: 'SN', name: 'Senegal', dialCode: '+221', flag: '🇸🇳' },
    { code: 'RS', name: 'Sérvia', dialCode: '+381', flag: '🇷🇸' },
    { code: 'SC', name: 'Seychelles', dialCode: '+248', flag: '🇸🇨' },
    { code: 'SL', name: 'Serra Leoa', dialCode: '+232', flag: '🇸🇱' },
    { code: 'SG', name: 'Singapura', dialCode: '+65', flag: '🇸🇬' },
    { code: 'SK', name: 'Eslováquia', dialCode: '+421', flag: '🇸🇰' },
    { code: 'SI', name: 'Eslovênia', dialCode: '+386', flag: '🇸🇮' },
    { code: 'SB', name: 'Ilhas Salomão', dialCode: '+677', flag: '🇸🇧' },
    { code: 'SO', name: 'Somália', dialCode: '+252', flag: '🇸🇴' },
    { code: 'ZA', name: 'África do Sul', dialCode: '+27', flag: '🇿🇦' },
    { code: 'SS', name: 'Sudão do Sul', dialCode: '+211', flag: '🇸🇸' },
    { code: 'ES', name: 'Espanha', dialCode: '+34', flag: '🇪🇸' },
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
    { code: 'SD', name: 'Sudão', dialCode: '+249', flag: '🇸🇩' },
    { code: 'SR', name: 'Suriname', dialCode: '+597', flag: '🇸🇷' },
    { code: 'SZ', name: 'Suazilândia', dialCode: '+268', flag: '🇸🇿' },
    { code: 'SE', name: 'Suécia', dialCode: '+46', flag: '🇸🇪' },
    { code: 'CH', name: 'Suíça', dialCode: '+41', flag: '🇨🇭' },
    { code: 'SY', name: 'Síria', dialCode: '+963', flag: '🇸🇾' },
    { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
    { code: 'TJ', name: 'Tajiquistão', dialCode: '+992', flag: '🇹🇯' },
    { code: 'TZ', name: 'Tanzânia', dialCode: '+255', flag: '🇹🇿' },
    { code: 'TH', name: 'Tailândia', dialCode: '+66', flag: '🇹🇭' },
    { code: 'TL', name: 'Timor-Leste', dialCode: '+670', flag: '🇹🇱' },
    { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
    { code: 'TK', name: 'Tokelau', dialCode: '+690', flag: '🇹🇰' },
    { code: 'TO', name: 'Tonga', dialCode: '+676', flag: '🇹🇴' },
    { code: 'TT', name: 'Trinidad e Tobago', dialCode: '+1868', flag: '🇹🇹' },
    { code: 'TN', name: 'Tunísia', dialCode: '+216', flag: '🇹TN' },
    { code: 'TR', name: 'Turquia', dialCode: '+90', flag: '🇹🇷' },
    { code: 'TM', name: 'Turcomenistão', dialCode: '+993', flag: '🇹🇲' },
    { code: 'TC', name: 'Ilhas Turks e Caicos', dialCode: '+1649', flag: '🇹🇨' },
    { code: 'TV', name: 'Tuvalu', dialCode: '+688', flag: '🇹🇻' },
    { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
    { code: 'UA', name: 'Ucrânia', dialCode: '+380', flag: '🇺🇦' },
    { code: 'AE', name: 'Emirados Árabes Unidos', dialCode: '+971', flag: '🇦🇪' },
    { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧' },
    { code: 'US', name: 'Estados Unidos', dialCode: '+1', flag: '🇺🇸' },
    { code: 'UY', name: 'Uruguai', dialCode: '+598', flag: '🇺🇾' },
    { code: 'UZ', name: 'Uzbequistão', dialCode: '+998', flag: '🇺🇿' },
    { code: 'VU', name: 'Vanuatu', dialCode: '+678', flag: '🇻🇺' },
    { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
    { code: 'VN', name: 'Vietnã', dialCode: '+84', flag: '🇻🇳' },
    { code: 'VG', name: 'Ilhas Virgens Britânicas', dialCode: '+1284', flag: '🇻🇬' },
    { code: 'VI', name: 'Ilhas Virgens Americanas', dialCode: '+1340', flag: '🇻🇮' },
    { code: 'WF', name: 'Wallis e Futuna', dialCode: '+681', flag: '🇼🇫' },
    { code: 'EH', name: 'Saara Ocidental', dialCode: '+212', flag: '🇪🇭' },
    { code: 'YE', name: 'Iêmen', dialCode: '+967', flag: '🇾🇪' },
    { code: 'ZM', name: 'Zâmbia', dialCode: '+260', flag: '🇿🇲' },
    { code: 'ZW', name: 'Zimbábue', dialCode: '+263', flag: '🇿🇼' }
  ];

  // País selecionado atualmente
  const selectedCountry = ddiOptions.find(o => o.dialCode === ddi) || ddiOptions[0];

  // Lista filtrada de DDI em tempo real pela busca (nome, DDI ou código)
  const filteredDdiOptions = ddiOptions.filter(opt => {
    if (!ddiSearch.trim()) return true;
    const term = ddiSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nameNorm = opt.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const codeNorm = opt.code.toLowerCase();
    const dialNorm = opt.dialCode.replace(/\D/g, '');
    const termDigits = term.replace(/\D/g, '');

    return nameNorm.includes(term) ||
           codeNorm.includes(term) ||
           opt.dialCode.includes(term) ||
           (termDigits && dialNorm.includes(termDigits));
  });

  // Carregar dados da página por slug
  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoadingConfig(true);
        const res = await fetch(getApiUrl(`/api/checkout-presell/public/${slug}`));
        if (res.ok) {
          const data = await res.json();
          setPageConfig(data);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error(err);
        setNotFound(true);
      } finally {
        setLoadingConfig(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug]);

  // Definir Título da Aba do Navegador sincronamente (evita flicker do "ZapVoice")
  useLayoutEffect(() => {
    const titleToApply = pageConfig?.page_tab_title || pageConfig?.title || cachedTitle || 'Aplicação Mentoria';
    document.title = titleToApply;
    if (slug && titleToApply) {
      sessionStorage.setItem(`checkout_title_${slug}`, titleToApply);
    }
  }, [pageConfig, slug, cachedTitle]);

  // Função utilitária para remover o DDI se o usuário digitar/colar o DDI no campo de texto do telefone
  const sanitizePhoneNumber = (val, currentDdi = ddi) => {
    let digits = val.replace(/\D/g, '');
    const ddiDigits = currentDdi.replace(/\D/g, '');

    // Se começar com o DDI (ex: 55) e tiver mais de 11 dígitos, remove o prefixo do DDI
    if (ddiDigits && digits.startsWith(ddiDigits) && digits.length > 11) {
      digits = digits.slice(ddiDigits.length);
    }

    // Se a opção selecionada for Brasil (+55), limitar a 11 dígitos (2 DDD + 9 número)
    if (ddiDigits === '55' && digits.length > 11) {
      digits = digits.slice(0, 11);
    }

    return digits;
  };

  // Ler Query Params para Pré-populamento automático nativamente sem react-router-dom
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paramName = searchParams.get('name') || searchParams.get('nome') || '';
    const paramEmail = searchParams.get('email') || '';
    const paramPhone = searchParams.get('phone') || searchParams.get('telefone') || searchParams.get('zap') || '';

    if (paramName) setName(paramName);
    if (paramEmail) setEmail(paramEmail);
    if (paramPhone) {
      setPhone(sanitizePhoneNumber(paramPhone, '+55'));
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error('Preencha todos os campos para continuar.', { position: 'top-right' });
      return;
    }

    try {
      setSubmitting(true);
      const cleanPhoneNumbers = phone.replace(/\D/g, '');
      const cleanDdiNumbers = ddi.replace(/\D/g, '');
      const fullPhone = `${cleanDdiNumbers}${cleanPhoneNumbers}`;

      const res = await fetch(getApiUrl(`/api/checkout-presell/public/${slug}/submit`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: fullPhone
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Inscrição realizada com sucesso! Redirecionando...', {
          position: 'top-right',
          duration: 3500
        });

        // Redirecionar para URL de destino prepopulada
        if (data.redirect_url) {
          setTimeout(() => {
            window.location.href = data.redirect_url;
          }, 800);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || 'Erro ao processar sua inscrição. Tente novamente.', {
          position: 'top-right'
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao enviar dados. Tente novamente.', {
        position: 'top-right'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-[#070a12] text-white flex items-center justify-center p-4 font-sans">
        <div className="flex flex-col items-center gap-3">
          <FiRefreshCw className="animate-spin text-blue-500" size={32} />
          <p className="text-sm text-gray-400 font-medium">Carregando página de aplicação...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#070a12] text-white flex items-center justify-center p-4 font-sans">
        <div className="text-center space-y-4 max-w-md bg-[#0e1322] p-8 rounded-3xl border border-gray-800 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-2xl font-bold">
            404
          </div>
          <h1 className="text-2xl font-bold">Página não encontrada</h1>
          <p className="text-gray-400 text-sm">O link digitado não existe ou a página foi desativada pelo administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a12] text-white font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Componente de Toasts no Canto Superior Direito */}
      <Toaster position="top-right" reverseOrder={false} />

      {/* Elementos de Iluminação Neon de Fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Conteúdo Centralizado */}
      <div className="w-full max-w-md mx-auto space-y-6 relative z-10">

        {/* Header Superior: Badge + Título */}
        <div className="text-center space-y-3">
          {pageConfig.badge_text && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-400 text-xs font-semibold shadow-lg shadow-blue-500/10">
              <span>{pageConfig.badge_text}</span>
            </div>
          )}

          {/* Título Principal */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {pageConfig.title || 'Aplicação Mentoria'}
          </h1>

          {/* Descrição / Subtítulo */}
          {pageConfig.description && (
            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
              {pageConfig.description}
            </p>
          )}
        </div>

        {/* Card do Formulário (Glassmorphism Escuro) */}
        <div className="bg-[#0e1322]/90 backdrop-blur-xl border border-gray-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo Nome Completo */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Nome Completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
                className="w-full px-4 py-3.5 bg-[#141b2d] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-medium"
              />
            </div>

            {/* Campo E-mail */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Seu melhor Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-3.5 bg-[#141b2d] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-medium"
              />
            </div>

            {/* Campo WhatsApp com DDI Customizado Pesquisável */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                WhatsApp
              </label>
              <div className="flex gap-2 relative">

                {/* Dropdown Pesquisável Customizado */}
                <div className="relative">
                  {/* Botão Gatilho */}
                  <button
                    type="button"
                    onClick={() => setDdiDropdownOpen(!ddiDropdownOpen)}
                    className="h-full flex items-center justify-between gap-1.5 px-3 py-3.5 bg-[#141b2d] border border-gray-700/60 rounded-xl text-white hover:border-blue-500 focus:outline-none focus:border-blue-500 transition-all text-sm font-medium cursor-pointer min-w-[120px]"
                  >
                    <span className="text-base">{selectedCountry.flag}</span>
                    <span className="font-mono text-xs text-gray-300 font-bold">{selectedCountry.dialCode}</span>
                    <FiChevronDown className={`text-gray-400 transition-transform ${ddiDropdownOpen ? 'rotate-180' : ''}`} size={14} />
                  </button>

                  {/* Modal/Menu suspenso com campo de busca */}
                  {ddiDropdownOpen && (
                    <>
                      {/* Backdrop para fechar ao clicar fora */}
                      <div className="fixed inset-0 z-40" onClick={() => setDdiDropdownOpen(false)} />

                      <div className="absolute left-0 top-full mt-2 w-72 max-h-80 bg-[#0e1322] border border-gray-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100">
                        {/* Campo de Busca Sticky */}
                        <div className="p-2.5 border-b border-gray-800 bg-[#141b2d]">
                          <div className="relative">
                            <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
                            <input
                              type="text"
                              value={ddiSearch}
                              onChange={(e) => setDdiSearch(e.target.value)}
                              placeholder="Buscar por país ou DDI (ex: 55, Brasil)..."
                              autoFocus
                              className="w-full pl-8 pr-3 py-1.5 bg-[#0e1322] border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Lista de Países Filtrados */}
                        <div className="overflow-y-auto divide-y divide-gray-800/40 max-h-60">
                          {filteredDdiOptions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">Nenhum país encontrado</div>
                          ) : (
                            filteredDdiOptions.map((opt) => (
                              <button
                                key={`${opt.code}-${opt.dialCode}`}
                                type="button"
                                onClick={() => {
                                  setDdi(opt.dialCode);
                                  setPhone(prev => sanitizePhoneNumber(prev, opt.dialCode));
                                  setDdiDropdownOpen(false);
                                  setDdiSearch('');
                                }}
                                className={`w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-blue-600/20 transition-colors text-xs ${opt.dialCode === ddi ? 'bg-blue-600/30 text-white font-semibold' : 'text-gray-300'}`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-base">{opt.flag}</span>
                                  <span className="font-medium truncate">{opt.name}</span>
                                </div>
                                <span className="font-mono text-gray-400 font-bold ml-2 shrink-0">{opt.dialCode}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Number Input (Apenas DDD + Número) */}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))}
                  placeholder="85 99999-9999"
                  required
                  className="w-full px-4 py-3.5 bg-[#141b2d] border border-gray-700/60 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Botão de Envio Principal */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 flex items-center justify-center gap-2 text-base"
            >
              {submitting ? (
                <>
                  <FiRefreshCw className="animate-spin" size={18} />
                  <span>Enviando dados...</span>
                </>
              ) : (
                <>
                  <span>{pageConfig.button_text || 'Continuar com Aplicação →'}</span>
                </>
              )}
            </button>
          </form>

          {/* Selo de Segurança */}
          <div className="pt-2 border-t border-gray-800/60 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
            <FiShield size={14} className="text-gray-400" />
            <span>Seus dados estão seguros e protegidos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
