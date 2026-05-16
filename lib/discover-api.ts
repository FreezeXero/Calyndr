export interface DiscoverEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  city: string;
  state: string;
  type: EventType;
  description: string;
  source: string;
  url: string;
  typeColor: string;
}

export type EventType = 'All' | 'Tech' | 'Networking' | 'Academic' | 'Social' | 'Music' | 'Food' | 'Handshake';

const TYPE_COLORS: Record<string, string> = {
  Tech: '#E5E5E5',
  Networking: '#D4D4D4',
  Academic: '#A3A3A3',
  Social: '#FAFAFA',
  Music: '#737373',
  Food: '#525252',
  Handshake: '#E5E5E5',
};

const STUB_EVENTS: DiscoverEvent[] = [
  { id: 'd1', title: 'Seattle AI & ML Meetup', date: '2026-05-20', startTime: '18:00', endTime: '20:00', location: 'Amazon Meeting Center', city: 'Seattle', state: 'WA', type: 'Tech', description: 'Monthly meetup for AI/ML enthusiasts in the Seattle area.', source: 'Meetup', url: 'https://www.meetup.com/seattle-ai-ml/events/d1-stub/', typeColor: TYPE_COLORS.Tech },
  { id: 'd2', title: 'UW Tech Networking Night', date: '2026-05-22', startTime: '17:30', endTime: '20:00', location: 'CSE2 Atrium', city: 'Seattle', state: 'WA', type: 'Networking', description: 'Connect with UW students, alumni, and industry professionals.', source: 'Eventbrite', url: 'https://www.eventbrite.com/e/uw-tech-networking-night-d2-stub', typeColor: TYPE_COLORS.Networking },
  { id: 'd3', title: 'Startup Pitch Competition', date: '2026-05-24', startTime: '14:00', endTime: '18:00', location: 'Galvanize Seattle', city: 'Seattle', state: 'WA', type: 'Tech', description: 'Watch early-stage startups pitch to a panel of investors.', source: 'Luma', url: 'https://luma.com/startup-pitch-competition-stub', typeColor: TYPE_COLORS.Tech },
  { id: 'd4', title: 'Eastside Dev Talks', date: '2026-05-27', startTime: '19:00', endTime: '21:00', location: 'Microsoft Reactor', city: 'Redmond', state: 'WA', type: 'Tech', description: 'Lightning talks from local developers on tools and techniques.', source: 'Meetup', url: 'https://www.meetup.com/redmond-tech/events/d4-stub', typeColor: TYPE_COLORS.Tech },
  { id: 'd5', title: 'UWB Career Networking Social', date: '2026-05-28', startTime: '16:00', endTime: '18:30', location: 'Founders Hall', city: 'Bothell', state: 'WA', type: 'Networking', description: 'Meet employers and alumni at UW Bothell.', source: 'Eventbrite', url: 'https://www.eventbrite.com/e/uwb-networking-social-d5-stub', typeColor: TYPE_COLORS.Networking },
  { id: 'd6', title: 'Hackathon: Build for Good', date: '2026-05-30', startTime: '09:00', endTime: '21:00', location: 'Google Seattle Office', city: 'Seattle', state: 'WA', type: 'Tech', description: '12-hour hackathon focused on social impact projects.', source: 'Luma', url: 'https://luma.com/hackathon-build-for-good-stub', typeColor: TYPE_COLORS.Tech },
  { id: 'd7', title: 'Research Symposium: CS & AI', date: '2026-06-02', startTime: '10:00', endTime: '15:00', location: 'Allen School', city: 'Seattle', state: 'WA', type: 'Academic', description: 'Undergraduate and graduate research presentations.', source: 'Eventbrite', url: 'https://www.eventbrite.com/e/research-symposium-d7-stub', typeColor: TYPE_COLORS.Academic },
  { id: 'd8', title: 'Rooftop Social: Tech Community', date: '2026-06-05', startTime: '18:00', endTime: '21:00', location: 'WeWork South Lake Union', city: 'Seattle', state: 'WA', type: 'Social', description: 'Casual social for anyone working in tech.', source: 'Luma', url: 'https://luma.com/rooftop-tech-social-stub', typeColor: TYPE_COLORS.Social },
];

/** Stub Handshake-style listings — urls are illustrative; swap for real EDU API links when available */
const HANDSHAKE_EVENTS: DiscoverEvent[] = [
  { id: 'h1', title: 'Spring Career & Internship Fair', date: '2026-05-21', startTime: '11:00', endTime: '15:00', location: 'Husky Union Building', city: 'Seattle', state: 'WA', type: 'Handshake', description: 'Meet recruiters from tech, finance, and public sector. Bring resumes.', source: 'Handshake', url: 'https://app.joinhandshake.com/edu/events/stub-uwspringfair-h1', typeColor: TYPE_COLORS.Handshake },
  { id: 'h2', title: 'Employer Info Session: Amazon Pathways', date: '2026-05-23', startTime: '17:00', endTime: '18:30', location: 'Mary Gates Hall', city: 'Seattle', state: 'WA', type: 'Handshake', description: 'Learn about ops leadership internships and full-time roles.', source: 'Handshake', url: 'https://app.joinhandshake.com/edu/events/stub-amazon-pathways-h2', typeColor: TYPE_COLORS.Handshake },
  { id: 'h3', title: 'Handshake Career Trek — Startups', date: '2026-05-26', startTime: '09:30', endTime: '16:00', location: 'South Lake Union', city: 'Seattle', state: 'WA', type: 'Handshake', description: 'Visit offices of partner startups; RSVP required.', source: 'Handshake', url: 'https://app.joinhandshake.com/edu/events/stub-careertrek-startups-h3', typeColor: TYPE_COLORS.Handshake },
  { id: 'h4', title: 'UWB Résumé Café', date: '2026-05-29', startTime: '12:00', endTime: '14:00', location: 'UW Bothell Career Services', city: 'Bothell', state: 'WA', type: 'Handshake', description: 'Drop-in résumé reviews with peer advisors.', source: 'Handshake', url: 'https://app.joinhandshake.com/edu/events/stub-resume-cafe-h4-uwb', typeColor: TYPE_COLORS.Handshake },
  { id: 'h5', title: 'Government & Nonprofit Opportunities Panel', date: '2026-06-03', startTime: '15:30', endTime: '17:00', location: 'Savery Hall', city: 'Seattle', state: 'WA', type: 'Handshake', description: 'Federal and regional hiring timelines plus application tips.', source: 'Handshake', url: 'https://app.joinhandshake.com/edu/events/stub-gov-nonprofit-panel-h5', typeColor: TYPE_COLORS.Handshake },
];

const ALL_FEED = [...STUB_EVENTS, ...HANDSHAKE_EVENTS];

/** AsyncStorage CalEvent ids start with this + discover id + `_` + timestamp */
export function discoverStoredIdPrefix(e: DiscoverEvent): string {
  return e.source === 'Handshake' ? `hs_${e.id}_` : `disc_${e.id}_`;
}

export const fetchDiscoverEvents = async (location: string, type: EventType): Promise<DiscoverEvent[]> => {
  void location;
  await new Promise(r => setTimeout(r, 500));
  const filtered = ALL_FEED.filter(e => type === 'All' || e.type === type);
  return [...filtered].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
};
