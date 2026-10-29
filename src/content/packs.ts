import type { Localized, Prompt, Topic } from './types';

/**
 * Three extra free conversations (C06, A06, B06), part of the catalogue from the first launch (D46).
 * They are free for everyone and never part of the paid collection. Bundled like everything else.
 */

const pair = (en: string, nl: string): Localized => ({ en, nl });
const prompt = (id: string, chapter: Localized, text: Localized, nudge: Localized): Prompt =>
  ({ id, chapter, text, nudge, quickEligible: false, sceneState: `pack-${id}` });

/** Handoff v1.3 §92/§98/§104 backlog drafts, added by owner decision (D35, D46). Still needs editorial review. */
export const packTopics: readonly Topic[] = [
  {
    id: 'C06', version: '1.0',
    title: pair('Our next chapter', 'Ons volgende hoofdstuk'),
    invitation: pair('Explore hopes without needing a complete plan.', 'Verken wensen zonder een volledig plan te moeten hebben.'),
    theme: 'whats-next',
    about: pair('Talk about what you hope for, what you want to keep, and one small step, without needing every answer.', 'Praat over wat je hoopt, wat je wilt behouden en een kleine stap, zonder dat alles al vast moet liggen.'),
    intensity: 'personal', minutes: 12, access: 'free', artFamily: 'window',
    tags: { en: ['future', 'hopes', 'change', 'next chapter'], nl: ['toekomst', 'wensen', 'verandering', 'volgend hoofdstuk'] },
    prompts: [
      prompt('C06-01', pair('Looking ahead', 'Vooruitkijken'), pair('When you picture the next part of our life, what do you hope feels different?', 'Als je aan het volgende stukje van ons leven denkt, wat hoop je dat anders voelt?'), pair('We can talk about a feeling rather than a milestone.', 'We kunnen over een gevoel praten in plaats van een mijlpaal.')),
      prompt('C06-02', pair('What stays', 'Wat blijft'), pair('What would you most like us to keep as things change?', 'Wat wil je het liefst behouden als dingen veranderen?'), pair('A habit, a value, or a way we treat each other.', 'Een gewoonte, een waarde of een manier waarop we met elkaar omgaan.')),
      prompt('C06-03', pair('The unknown', 'Het onbekende'), pair('What part of the future feels uncertain for you?', 'Welk stukje van de toekomst voelt voor jou onzeker?'), pair('Share only the part you want to explore tonight.', 'Deel alleen het stukje dat je vanavond wilt verkennen.')),
      prompt('C06-04', pair('Being alongside', 'Naast elkaar staan'), pair('What would help you feel supported while we work things out?', 'Wat helpt je om je gesteund te voelen terwijl we dingen uitzoeken?'), pair('A specific kind of support can be easier to understand.', 'Een concrete vorm van steun kan makkelijker te begrijpen zijn.')),
      prompt('C06-05', pair('A first step', 'Een eerste stap'), pair('What is one conversation or small step we would like to return to?', 'Op welk gesprek of welke kleine stap willen we later terugkomen?'), pair('We can leave the rest open.', 'De rest mogen we openlaten.')),
    ],
    closing: pair('Would you like to keep a hope, a question, or nothing for now?', 'Wil je een wens, een vraag of voorlopig niets bewaren?'),
  },
  {
    id: 'A06', version: '1.0',
    title: pair('A season we got through', 'Een periode waar we doorheen kwamen'),
    invitation: pair('A gentle look back, only if both of you want to.', 'Rustig terugkijken, alleen als jullie dat allebei willen.'),
    theme: 'our-story',
    about: pair('Look back at a period you got through together: what helped, what you noticed, and what you carry with you.', 'Kijk terug op een periode waar jullie samen doorheen kwamen: wat hielp, wat je merkte en wat je meeneemt.'),
    intensity: 'personal', minutes: 12, access: 'free', artFamily: 'notebook',
    tags: { en: ['hard times', 'support', 'looking back', 'resilience'], nl: ['moeilijke tijd', 'steun', 'terugkijken', 'veerkracht'] },
    prompts: [
      prompt('A06-01', pair('Choose the distance', 'Kies wat goed voelt'), pair('Is there a past period we both feel comfortable looking back on?', 'Is er een periode waarop we allebei vandaag rustig willen terugkijken?'), pair('Choose something that feels manageable today. We can choose another topic.', 'Kies iets wat vandaag goed voelt. We kunnen ook een ander onderwerp nemen.')),
      prompt('A06-02', pair('What helped', 'Wat hielp'), pair('What small thing helped you during that time?', 'Welk klein ding hielp jou toen?'), pair('A person, a routine, or something you could rely on.', 'Een persoon, een gewoonte of iets waarop je kon rekenen.')),
      prompt('A06-03', pair('What you noticed', 'Wat jij merkte'), pair('What did I do that you appreciated then?', 'Wat deed ik toen dat je waardeerde?'), pair('It can be something I did not realize mattered.', 'Het mag iets zijn waarvan ik niet wist dat het belangrijk was.')),
      prompt('A06-04', pair('A fuller picture', 'Een completer beeld'), pair('Is there something about your experience you would like me to understand?', 'Is er iets over jouw ervaring dat je me wilt laten begrijpen?'), pair('Share only what you want to share. Listening is enough.', 'Vertel alleen wat je wilt vertellen. Luisteren is genoeg.')),
      prompt('A06-05', pair('What we carry', 'Wat we meenemen'), pair('What would you like us to remember from how we got through it?', 'Wat wil je onthouden van hoe we erdoorheen kwamen?'), pair('A small source of support, not a lesson we have to force.', 'Een kleine steun, zonder dat we er een les van moeten maken.')),
    ],
    closing: pair('Would you like to keep a thought, or simply leave this conversation here?', 'Wil je een gedachte bewaren, of dit gesprek gewoon hier laten?'),
  },
  {
    id: 'B06', version: '1.0',
    title: pair('What money means to us', 'Wat geld voor ons betekent'),
    invitation: pair('Explore perspectives before making decisions.', 'Ontdek elkaars blik voor jullie beslissingen nemen.'),
    theme: 'us-today',
    about: pair('Where your feelings about money come from, what feels worthwhile, and how to talk about it more calmly. No amounts needed.', 'Waar je gevoel over geld vandaan komt, wat de moeite waard voelt en hoe jullie er rustiger over praten. Zonder bedragen.'),
    intensity: 'direct', minutes: 12, access: 'free', artFamily: 'notebook',
    tags: { en: ['money', 'values', 'spending', 'perspectives'], nl: ['geld', 'waarden', 'uitgaven', 'perspectieven'] },
    prompts: [
      prompt('B06-01', pair('A familiar feeling', 'Een vertrouwd gevoel'), pair('What feeling comes up for you when we talk about money?', 'Welk gevoel komt bij je op als we over geld praten?'), pair('You can describe it without sharing amounts.', 'Je kunt het beschrijven zonder bedragen te noemen.')),
      prompt('B06-02', pair('Where it began', 'Waar het begon'), pair('What did the people around you teach you about money?', 'Wat hebben de mensen om je heen je over geld geleerd?'), pair('Which idea has stayed with you?', 'Welk idee is je bijgebleven?')),
      prompt('B06-03', pair('What feels worthwhile', 'Wat de moeite waard voelt'), pair('What kind of spending feels most worthwhile to you?', 'Welke uitgaven voelen voor jou het meest de moeite waard?'), pair('What does it give you beyond the thing itself?', 'Wat geven ze je, naast het ding zelf?')),
      prompt('B06-04', pair('A different lens', 'Een andere blik'), pair('Where do you think we see money differently?', 'Waar kijken we volgens jou anders naar geld?'), pair('What would you like me to understand about your view?', 'Wat wil je dat ik over jouw blik begrijp?')),
      prompt('B06-05', pair('A calmer conversation', 'Een rustiger gesprek'), pair('What would make future money conversations feel clearer or calmer?', 'Wat kan toekomstige gesprekken over geld duidelijker of rustiger maken?'), pair('One communication preference, rather than a financial decision.', 'Een voorkeur voor hoe we praten, geen financiële beslissing.')),
    ],
    closing: pair('Would you like to save a preference for how we talk about this?', 'Wil je een voorkeur bewaren voor hoe we hierover praten?'),
  },
];

