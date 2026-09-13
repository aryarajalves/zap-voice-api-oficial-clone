import { FiSliders, FiZap, FiSettings } from 'react-icons/fi';

export const PLATFORM_OPTIONS = [
  { value: 'braip',     label: 'Braip' },
  { value: 'cakto',    label: 'Cakto' },
  { value: 'eduzz',    label: 'Eduzz' },
  { value: 'elementor',label: 'Elementor / Webhook Genérico' },
  { value: 'greenn',   label: 'Greenn' },
  { value: 'herospark',label: 'HeroSpark' },
  { value: 'guru',     label: 'Digital Manager Guru' },
  { value: 'hotmart',  label: 'Hotmart' },
  { value: 'hubla',    label: 'Hubla' },
  { value: 'lastlink', label: 'Lastlink' },
  { value: 'kirvano',  label: 'Kirvano' },
  { value: 'kiwify',   label: 'Kiwify' },
  { value: 'monetizze',label: 'Monetizze' },
  { value: 'outra',    label: 'Outra Plataforma' },
  { value: 'pagtrust', label: 'PagTrust' },
  { value: 'pepper',   label: 'Pepper' },
  { value: 'ticto',    label: 'Ticto' },
  { value: 'zapgroup', label: 'ZapGroup' },
];

export const TABS = [
  { id: 'config',   label: 'Configuração', icon: FiSliders },
  { id: 'upsell',   label: 'Upsell',       icon: FiZap     },
  { id: 'gatilhos', label: 'Gatilhos',      icon: FiSettings },
];
