export type CoachTip = {
  id: string
  title: string
  body: string
}

export const COACH_TIPS: CoachTip[] = [
  {
    id: 'order',
    title: 'Best order after wake',
    body: 'Water → breakfast if hungry → rest ~60 min → scoop → lift → lunch → scoops/meals through the day → night scoop → sleep. Hungry at wake = food before scoop.',
  },
  {
    id: 'scoops',
    title: '4 scoops',
    body: 'Split across the day. Sip 15–20 min. Don’t stack a huge meal and a scoop in the same 30 minutes.',
  },
  {
    id: 'lift',
    title: 'Training',
    body: 'Mon/Wed Day A · Tue/Thu Day B · Fri optional · weekends off. Block 1 is enough on low-energy days.',
  },
  {
    id: 'weight',
    title: 'When to weigh',
    body: 'Once per day max. After wake → bathroom → weigh → then food/scoops. Same conditions every time. Sunday is the main weekly log. Ignore 1–3 lb daily swings — track the weekly trend.',
  },
  {
    id: 'wake',
    title: 'Wake time box',
    body: 'Optional note of when you got up. Helps you see sleep patterns. Leave blank if you don’t care.',
  },
  {
    id: 'sleep',
    title: 'Wack sleep',
    body: 'Can’t sleep 30 min after early wake → soft start. Cap naps at 20–45 min. Don’t pull another all-nighter to “fix” the day.',
  },
  {
    id: 'supps',
    title: 'Supplements',
    body: 'Multi daily. Creatine when training. Immune optional. Turmeric paused if gut is loose. Test complex won’t grow you — food + lifts will.',
  },
  {
    id: 'nightlife',
    title: 'Rave / late nights',
    body: 'Eat + scoop before you leave. Scoop when you get home. Next wake = new day for scoops.',
  },
]
