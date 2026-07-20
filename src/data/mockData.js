export const devices = {
  thisDevice: {
    name: 'My Laptop',
    status: 'Online',
    os: 'Windows 11 Pro',
    ip: '192.168.1.10',
    type: 'laptop',
  },
  pairedDevices: [
    {
      id: 'phone-1',
      name: 'My Phone',
      type: 'phone',
      os: 'Android • 192.168.1.14',
      status: 'Active now',
      isActive: true,
    },
    {
      id: 'web-1',
      name: 'NOVA Web',
      type: 'web',
      os: 'Chrome • Windows',
      status: '2 min ago',
      isActive: false,
    }
  ],
  otherDevices: [
    {
      id: 'office-pc',
      name: 'Office PC',
      type: 'desktop',
      os: 'Windows 11 Pro',
      status: 'Offline',
      ip: '192.168.1.20',
      isActive: false,
    },
    {
      id: 'home-pc',
      name: 'Home PC',
      type: 'desktop',
      os: 'Windows 11 Pro',
      status: 'Offline',
      ip: '192.168.1.15',
      isActive: false,
    },
    {
      id: 'work-laptop',
      name: 'Work Laptop',
      type: 'laptop',
      os: 'Windows 11 Pro',
      status: 'Offline',
      ip: '192.168.1.25',
      isActive: false,
    }
  ]
};

export const apps = [
  { id: 'vscode', name: 'VS Code', icon: 'Code', category: 'Developer' },
  { id: 'chrome', name: 'Google Chrome', icon: 'Chrome', category: 'Browser' },
  { id: 'spotify', name: 'Spotify', icon: 'Music', category: 'Media' },
  { id: 'figma', name: 'Figma', icon: 'Layers', category: 'Design' },
  { id: 'notion', name: 'Notion', icon: 'FileText', category: 'Productivity' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'MessageCircle', category: 'Social' },
  { id: 'telegram', name: 'Telegram', icon: 'Send', category: 'Social' },
  { id: 'slack', name: 'Slack', icon: 'Slack', category: 'Social' },
  { id: 'zoom', name: 'Zoom', icon: 'Video', category: 'Social' }
];

export const fileSystem = {
  drives: [
    { name: 'Local Disk (C:)', size: '120 GB / 238 GB', type: 'drive' },
    { name: 'Local Disk (D:)', size: '315 GB / 512 GB', type: 'drive' }
  ],
  folders: [
    { name: 'Documents', items: '248 files', type: 'folder' },
    { name: 'Downloads', items: '1,420 files', type: 'folder' },
    { name: 'Pictures', items: '832 files', type: 'folder' },
    { name: 'Videos', items: '94 files', type: 'folder' },
    { name: 'Music', items: '312 files', type: 'folder' }
  ]
};

export const activityLogs = [
  {
    id: 'act-1',
    description: 'Remote session started by My Phone',
    time: '9:41 AM',
    type: 'session_start',
    device: 'My Phone'
  },
  {
    id: 'act-2',
    description: 'File transferred - Screenshot.png',
    time: '9:35 AM',
    type: 'file_transfer',
    file: 'Screenshot.png'
  },
  {
    id: 'act-3',
    description: 'Remote session ended by My Phone',
    time: '9:20 AM',
    type: 'session_end',
    device: 'My Phone'
  },
  {
    id: 'act-4',
    description: 'Settings changed - Display',
    time: '9:10 AM',
    type: 'settings',
    detail: 'Display'
  },
  {
    id: 'act-5',
    description: 'File downloaded - Photo.png',
    time: '8:30 AM',
    type: 'file_download',
    file: 'Photo.png'
  }
];

export const fileTransfers = [
  {
    id: 'ft-1',
    name: 'Document.pdf',
    size: '1.2 MB',
    direction: 'to',
    device: 'My Phone',
    time: '9:36 AM',
    type: 'pdf',
  },
  {
    id: 'ft-2',
    name: 'Photo.png',
    size: '2.5 MB',
    direction: 'from',
    device: 'My Phone',
    time: '9:30 AM',
    type: 'image',
  }
];

export const systemMetrics = {
  cpu: {
    usage: 23,
    model: 'Intel i5-1135G7',
    temp: '44°C',
  },
  ram: {
    usage: 45,
    total: '16 GB',
    used: '7.2 GB',
  },
  disk: {
    usage: 62,
    total: '512 GB',
    used: '312 GB',
  },
  battery: {
    level: 78,
    status: 'Charging',
  },
  network: {
    upload: '12.4 Mbps',
    download: '8.6 Mbps',
  },
  uptime: '2h 48m',
};
