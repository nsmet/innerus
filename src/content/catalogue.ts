import type { Language, Theme, ThemeId, Topic } from './types';
import { storyRevisions } from './storytelling';
import { packTopics } from './packs';

/**
 * The fifteen-topic launch catalogue from handoff v1.3, sections 86-103:
 * A01-A05, B01-B05, C01-C05, plus the free A06/B06/C06 from src/content/packs.ts (D46), which
 * are available from the start and are not part of the paid collection.
 * Original v1.0 text is retained for existing sessions. New sessions use the owner-directed
 * story revision below (23 October 2026), with independently mapped question illustrations.
 * Stable IDs intentionally do not depend on the displayed language or wording.
 */
const originalTopics: readonly Topic[] = [
  {
    id: 'A01',
    version: '1.0',
    title: { en: 'Our first date', nl: 'Onze eerste date' },
    invitation: {
      en: 'A little trip back to the beginning.',
      nl: 'Even terug naar het begin.',
    },
    theme: 'our-story',
    about: {
      en: 'Revisit the hours before, first impressions, the little details, two perspectives and looking back.',
      nl: 'Ga terug naar de uren ervoor, de eerste indruk, de kleine details, twee herinneringen en terugkijken.',
    },
    intensity: 'light',
    minutes: 10,
    access: 'free',
    artFamily: 'cafe',
    tags: {
      en: ['first date', 'beginning', 'memories', 'cafe'],
      nl: ['eerste date', 'begin', 'herinneringen', 'café'],
    },
    prompts: [
      {
        id: 'A01-01',
        chapter: { en: 'Before we met', nl: 'Voor we elkaar zagen' },
        text: {
          en: 'What do you remember about the hours before our first date?',
          nl: 'Wat herinner je je van de uren voor onze eerste date?',
        },
        nudge: {
          en: 'Were you excited, nervous, or trying to seem completely relaxed?',
          nl: 'Was je enthousiast, zenuwachtig, of deed je alsof je helemaal ontspannen was?',
        },
        quickEligible: true,
        sceneState: 'cafe-window-two-cups',
      },
      {
        id: 'A01-02',
        chapter: { en: 'First impressions', nl: 'De eerste indruk' },
        text: {
          en: 'What was the first thing you noticed about me?',
          nl: 'Wat viel je als eerste aan mij op?',
        },
        nudge: {
          en: 'Was it what you expected?',
          nl: 'Was het zoals je had verwacht?',
        },
        quickEligible: true,
        sceneState: 'cafe-window-light',
      },
      {
        id: 'A01-03',
        chapter: { en: 'The little details', nl: 'De kleine details' },
        text: {
          en: 'What tiny detail from that day has stayed with you?',
          nl: 'Welk klein detail van die dag is je bijgebleven?',
        },
        nudge: {
          en: 'A look, a smell, something one of us said.',
          nl: 'Een blik, een geur, iets wat een van ons zei.',
        },
        quickEligible: true,
        sceneState: 'cafe-coat-or-receipt',
      },
      {
        id: 'A01-04',
        chapter: { en: 'Two perspectives', nl: 'Twee herinneringen' },
        text: {
          en: 'Which part of that day do we remember differently?',
          nl: 'Welk stukje van die dag herinneren we ons anders?',
        },
        nudge: {
          en: 'Both versions can exist. What did each of us notice?',
          nl: 'Beide versies mogen bestaan. Wat viel ieder van ons op?',
        },
        quickEligible: false,
        sceneState: 'cafe-two-cups-table-detail',
      },
      {
        id: 'A01-05',
        chapter: { en: 'Looking back', nl: 'Als we terugkijken' },
        text: {
          en: 'What would surprise those two people about us today?',
          nl: 'Wat zou die twee mensen verbazen aan wie we vandaag zijn?',
        },
        nudge: {
          en: 'What would they be glad to hear?',
          nl: 'Wat zouden ze fijn vinden om te horen?',
        },
        quickEligible: false,
        sceneState: 'cafe-settled-table',
      },
    ],
    closing: {
      en: 'Is there a little detail from this conversation you would like to keep?',
      nl: 'Is er een klein detail uit dit gesprek dat je wilt bewaren?',
    },
  },
  {
    id: 'A02',
    version: '1.0',
    title: { en: 'A place we would go back to', nl: 'Een plek waar we terug naartoe willen' },
    invitation: {
      en: 'Some places stay with us.',
      nl: 'Sommige plekken blijven bij ons.',
    },
    theme: 'our-story',
    about: {
      en: 'Return to the place, its atmosphere, your memory of it, what it meant, and what you could bring home.',
      nl: 'Ga terug naar de plek, de sfeer, jouw herinnering, wat het betekende en wat je kunt meenemen naar nu.',
    },
    intensity: 'light',
    minutes: 10,
    access: 'collection',
    artFamily: 'travel',
    tags: {
      en: ['place', 'memories', 'favourite place', 'travel'],
      nl: ['plek', 'herinneringen', 'favoriete plek', 'reizen'],
    },
    prompts: [
      {
        id: 'A02-01',
        chapter: { en: 'The place', nl: 'De plek' },
        text: {
          en: 'Which place would you take us back to for one afternoon?',
          nl: 'Naar welke plek zou je ons voor een middag terug meenemen?',
        },
        nudge: {
          en: 'It can be somewhere nearby, not only a big trip.',
          nl: 'Het mag ook een plek dichtbij zijn.',
        },
        quickEligible: false,
        sceneState: 'travel-open-folded-map',
      },
      {
        id: 'A02-02',
        chapter: { en: 'The atmosphere', nl: 'De sfeer' },
        text: {
          en: 'What made being there together feel different?',
          nl: 'Wat maakte het bijzonder om daar samen te zijn?',
        },
        nudge: {
          en: 'Think of a sound, a smell, or a little routine.',
          nl: 'Denk aan een geluid, een geur of een klein ritueel.',
        },
        quickEligible: false,
        sceneState: 'travel-place-vignette',
      },
      {
        id: 'A02-03',
        chapter: { en: 'Your memory', nl: 'Jouw herinnering' },
        text: {
          en: 'What do you remember that I might have forgotten?',
          nl: 'Wat herinner jij je dat ik misschien vergeten ben?',
        },
        nudge: {
          en: 'Tell me a small part I may have missed.',
          nl: 'Vertel een klein stukje dat ik misschien gemist heb.',
        },
        quickEligible: false,
        sceneState: 'travel-plain-keepsake',
      },
      {
        id: 'A02-04',
        chapter: { en: 'What mattered', nl: 'Wat het betekende' },
        text: {
          en: 'What do you think we needed at that time?',
          nl: 'Wat denk je dat we toen nodig hadden?',
        },
        nudge: {
          en: 'Did the place give us some of that?',
          nl: 'Gaf die plek ons daar iets van?',
        },
        quickEligible: false,
        sceneState: 'travel-unlettered-postcard',
      },
      {
        id: 'A02-05',
        chapter: { en: 'Bring a little home', nl: 'Neem iets mee naar nu' },
        text: {
          en: 'What could we bring from that time into our life now?',
          nl: 'Wat kunnen we uit die tijd meenemen naar ons leven nu?',
        },
        nudge: {
          en: 'Choose something small enough to try.',
          nl: 'Kies iets kleins dat we kunnen proberen.',
        },
        quickEligible: false,
        sceneState: 'travel-objects-beside-map',
      },
    ],
    closing: {
      en: 'What image from that place would you like to remember?',
      nl: 'Welk beeld van die plek wil je onthouden?',
    },
  },
  {
    id: 'A03',
    version: '1.0',
    title: { en: 'Our first home', nl: 'Ons eerste huis' },
    invitation: {
      en: 'The life we made in those rooms. Choose this when you have shared a home.',
      nl: 'Het leven dat we daar opbouwden. Kies dit als jullie hebben samengewoond.',
    },
    theme: 'our-story',
    about: {
      en: 'Step inside again, with your routines, what you learned together, a different view and a little keepsake.',
      nl: 'Kom even binnen, met jullie gewoontes, wat jullie samen ontdekten, een andere blik en iets om te bewaren.',
    },
    intensity: 'personal',
    minutes: 10,
    access: 'collection',
    artFamily: 'kitchen',
    tags: {
      en: ['first home', 'living together', 'memories', 'home'],
      nl: ['eerste huis', 'samenwonen', 'herinneringen', 'thuis'],
    },
    prompts: [
      {
        id: 'A03-01',
        chapter: { en: 'Step inside', nl: 'Kom even binnen' },
        text: {
          en: 'What do you picture first when you think of our first home?',
          nl: 'Wat zie je als eerste voor je als je aan ons eerste huis denkt?',
        },
        nudge: {
          en: 'A room, an object, or a particular moment.',
          nl: 'Een kamer, een voorwerp of een bepaald moment.',
        },
        quickEligible: false,
        sceneState: 'kitchen-doorway',
      },
      {
        id: 'A03-02',
        chapter: { en: 'Our routines', nl: 'Onze gewoontes' },
        text: {
          en: 'What small routine made it feel like ours?',
          nl: 'Welke kleine gewoonte maakte het echt van ons?',
        },
        nudge: {
          en: 'Was there something we always did without planning it?',
          nl: 'Was er iets wat we altijd deden zonder het te plannen?',
        },
        quickEligible: false,
        sceneState: 'kitchen-cups-on-table',
      },
      {
        id: 'A03-03',
        chapter: { en: 'Learning together', nl: 'Samen ontdekken' },
        text: {
          en: 'What did living there teach you about us?',
          nl: 'Wat heb je daar over ons geleerd?',
        },
        nudge: {
          en: 'Something funny or ordinary counts too.',
          nl: 'Iets grappigs of alledaags telt ook mee.',
        },
        quickEligible: false,
        sceneState: 'kitchen-small-tea-towel',
      },
      {
        id: 'A03-04',
        chapter: { en: 'A different view', nl: 'Een andere blik' },
        text: {
          en: 'What did you love there that I may not have noticed?',
          nl: 'Wat vond jij daar fijn dat ik misschien niet opmerkte?',
        },
        nudge: {
          en: 'Tell me what you saw in it.',
          nl: 'Vertel me wat jij erin zag.',
        },
        quickEligible: false,
        sceneState: 'kitchen-plant-or-lamp',
      },
      {
        id: 'A03-05',
        chapter: { en: 'A little keepsake', nl: 'Iets om te bewaren' },
        text: {
          en: 'What would you keep from that home if you could?',
          nl: 'Wat zou je van dat huis willen bewaren als dat kon?',
        },
        nudge: {
          en: 'It can be a thing or a feeling.',
          nl: 'Het mag een voorwerp of een gevoel zijn.',
        },
        quickEligible: false,
        sceneState: 'kitchen-settled-tabletop',
      },
    ],
    closing: {
      en: 'Is there something from that home we could enjoy again?',
      nl: 'Is er iets uit dat huis waarvan we opnieuw kunnen genieten?',
    },
  },
  {
    id: 'A04',
    version: '1.0',
    title: { en: 'A trip we still talk about', nl: 'Een reis waar we nog over praten' },
    invitation: {
      en: 'Revisit the parts that made it our adventure.',
      nl: 'Ga terug naar wat het ons avontuur maakte.',
    },
    theme: 'our-story',
    about: {
      en: 'Choose a journey and revisit the unexpected, your travelling selves, a hidden highlight and another adventure.',
      nl: 'Kies een reis en beleef het onverwachte, jullie onderweg, een klein hoogtepunt en een nieuw avontuur.',
    },
    intensity: 'light',
    minutes: 10,
    access: 'collection',
    artFamily: 'travel',
    tags: {
      en: ['trip', 'travel', 'holiday', 'adventure'],
      nl: ['reis', 'reizen', 'vakantie', 'avontuur'],
    },
    prompts: [
      {
        id: 'A04-01',
        chapter: { en: 'Choose a journey', nl: 'Kies een reis' },
        text: {
          en: 'Which trip or day away would you like to revisit tonight?',
          nl: 'Welke reis of welk dagje weg wil je vanavond opnieuw beleven?',
        },
        nudge: {
          en: 'It does not need to have been far away.',
          nl: 'Het hoeft niet ver weg geweest te zijn.',
        },
        quickEligible: false,
        sceneState: 'travel-map-and-bag',
      },
      {
        id: 'A04-02',
        chapter: { en: 'The unexpected', nl: 'Het onverwachte' },
        text: {
          en: 'What happened that we could not have planned?',
          nl: 'Wat gebeurde er dat we niet hadden kunnen plannen?',
        },
        nudge: {
          en: 'A detour, a surprise, or something that went a little wrong.',
          nl: 'Een omweg, een verrassing of iets wat een beetje misliep.',
        },
        quickEligible: false,
        sceneState: 'travel-folded-paper-route',
      },
      {
        id: 'A04-03',
        chapter: { en: 'Our travelling selves', nl: 'Wij onderweg' },
        text: {
          en: 'What did you enjoy about me on that trip?',
          nl: 'Wat vond je fijn aan mij op die reis?',
        },
        nudge: {
          en: 'When did you see a side of me you liked?',
          nl: 'Wanneer zag je een kant van mij die je fijn vond?',
        },
        quickEligible: false,
        sceneState: 'travel-two-cups',
      },
      {
        id: 'A04-04',
        chapter: { en: 'Your hidden highlight', nl: 'Jouw kleine hoogtepunt' },
        text: {
          en: 'What was your favourite moment that I might not choose?',
          nl: 'Wat was jouw favoriete moment dat ik misschien niet zou kiezen?',
        },
        nudge: {
          en: 'Tell me why it stayed with you.',
          nl: 'Vertel waarom het je is bijgebleven.',
        },
        quickEligible: false,
        sceneState: 'travel-unlettered-postcard',
      },
      {
        id: 'A04-05',
        chapter: { en: 'Another adventure', nl: 'Een nieuw avontuur' },
        text: {
          en: 'What would we like a little more of on our next trip?',
          nl: 'Waarvan willen we iets meer op onze volgende reis?',
        },
        nudge: {
          en: 'Think about how we spend the time, not just the destination.',
          nl: 'Denk aan hoe we onze tijd doorbrengen, niet alleen aan de bestemming.',
        },
        quickEligible: false,
        sceneState: 'travel-notebook-beside-map',
      },
    ],
    closing: {
      en: 'What would you put on a postcard from that trip?',
      nl: 'Wat zou je op een kaartje van die reis schrijven?',
    },
  },
  {
    id: 'A05',
    version: '1.0',
    title: { en: 'How our little rituals began', nl: 'Hoe onze kleine rituelen begonnen' },
    invitation: {
      en: 'The things that quietly became ours.',
      nl: 'De dingen die ongemerkt van ons werden.',
    },
    theme: 'our-story',
    about: {
      en: 'Something you do, how it began, what it gives you, another little thing, and making some room for it.',
      nl: 'Iets wat jullie doen, hoe het begon, wat het jullie geeft, nog iets kleins, en er wat ruimte voor maken.',
    },
    intensity: 'light',
    minutes: 8,
    access: 'collection',
    artFamily: 'kitchen',
    tags: {
      en: ['rituals', 'habits', 'traditions', 'routine'],
      nl: ['rituelen', 'gewoontes', 'tradities', 'routine'],
    },
    prompts: [
      {
        id: 'A05-01',
        chapter: { en: 'Something we do', nl: 'Iets wat we doen' },
        text: {
          en: 'What is a small thing we do that feels especially like us?',
          nl: 'Welk klein ding dat we doen voelt echt als iets van ons?',
        },
        nudge: {
          en: 'A phrase, a meal, a greeting, or a silly habit.',
          nl: 'Een uitspraak, een maaltijd, een begroeting of een gekke gewoonte.',
        },
        quickEligible: false,
        sceneState: 'kitchen-two-breakfast-cups',
      },
      {
        id: 'A05-02',
        chapter: { en: 'The beginning', nl: 'Het begin' },
        text: {
          en: 'Do you remember how that started?',
          nl: 'Weet je nog hoe dat begon?',
        },
        nudge: {
          en: 'If we remember differently, what is each version?',
          nl: 'Als we het anders herinneren, hoe gaat ieders versie?',
        },
        quickEligible: false,
        sceneState: 'kitchen-small-spoon',
      },
      {
        id: 'A05-03',
        chapter: { en: 'What it gives us', nl: 'Wat het ons geeft' },
        text: {
          en: 'What do you like about keeping that ritual?',
          nl: 'Wat vind je fijn aan dat ritueel?',
        },
        nudge: {
          en: 'Does it bring comfort, fun, or a moment together?',
          nl: 'Geeft het rust, plezier of een moment samen?',
        },
        quickEligible: false,
        sceneState: 'kitchen-folded-napkin',
      },
      {
        id: 'A05-04',
        chapter: { en: 'Another little thing', nl: 'Nog iets kleins' },
        text: {
          en: 'Which other habit of ours would you miss if it disappeared?',
          nl: 'Welke andere gewoonte van ons zou je missen als die verdween?',
        },
        nudge: {
          en: 'It may be something we barely talk about.',
          nl: 'Misschien iets waarover we bijna nooit praten.',
        },
        quickEligible: false,
        sceneState: 'kitchen-familiar-table-object',
      },
      {
        id: 'A05-05',
        chapter: { en: 'Make some room', nl: 'Geef het wat ruimte' },
        text: {
          en: 'Is there a small ritual we would like to bring back?',
          nl: 'Is er een klein ritueel dat we willen terugbrengen?',
        },
        nudge: {
          en: 'We can try it once without making a rule of it.',
          nl: 'We kunnen het een keer proberen zonder er een regel van te maken.',
        },
        quickEligible: false,
        sceneState: 'kitchen-quiet-complete-arrangement',
      },
    ],
    closing: {
      en: 'Which little ritual deserves a place in our memories?',
      nl: 'Welk klein ritueel verdient een plek in onze herinneringen?',
    },
  },
  {
    id: 'B01',
    version: '1.0',
    title: { en: 'An ordinary Tuesday', nl: 'Een gewone dinsdag' },
    invitation: {
      en: 'Find something good in the everyday.',
      nl: 'Ontdek iets fijns in het alledaagse.',
    },
    theme: 'us-today',
    about: {
      en: 'The everyday, being a small team, the difference one gesture makes, what could feel easier, and this week.',
      nl: 'Het alledaagse, een klein team zijn, het verschil van één gebaar, wat makkelijker kan voelen, en deze week.',
    },
    intensity: 'light',
    minutes: 8,
    access: 'free',
    artFamily: 'kitchen',
    tags: {
      en: ['everyday', 'week', 'team', 'kitchen'],
      nl: ['alledaags', 'week', 'team', 'keuken'],
    },
    prompts: [
      {
        id: 'B01-01',
        chapter: { en: 'The everyday', nl: 'Het alledaagse' },
        text: {
          en: 'What tiny part of our week would you keep exactly as it is?',
          nl: 'Welk klein stukje van onze week zou je precies zo willen houden?',
        },
        nudge: {
          en: 'It can be something I barely notice.',
          nl: 'Het mag iets zijn dat ik amper opmerk.',
        },
        quickEligible: true,
        sceneState: 'kitchen-table-daylight',
      },
      {
        id: 'B01-02',
        chapter: { en: 'A small team', nl: 'Een klein team' },
        text: {
          en: 'When did we last feel like a team, even over something small?',
          nl: 'Wanneer voelden we ons voor het laatst een team, al was het om iets kleins?',
        },
        nudge: {
          en: 'Think of an ordinary moment rather than a big achievement.',
          nl: 'Denk aan een gewoon moment, niet alleen aan iets groots.',
        },
        quickEligible: true,
        sceneState: 'kitchen-second-cup',
      },
      {
        id: 'B01-03',
        chapter: { en: 'The difference', nl: 'Het verschil' },
        text: {
          en: 'What did I do in that moment that made a difference?',
          nl: 'Wat deed ik op dat moment dat een verschil maakte?',
        },
        nudge: {
          en: 'What would you like me to know about it?',
          nl: 'Wat wil je dat ik daarover weet?',
        },
        quickEligible: false,
        sceneState: 'kitchen-small-plate',
      },
      {
        id: 'B01-04',
        chapter: { en: 'A little easier', nl: 'Een beetje makkelijker' },
        text: {
          en: 'Which part of an ordinary day could feel a little easier for us?',
          nl: 'Welk stukje van een gewone dag kan voor ons wat makkelijker voelen?',
        },
        nudge: {
          en: 'We do not have to solve it tonight. Start with understanding it.',
          nl: 'We hoeven het vanavond niet op te lossen. Begin met elkaar te begrijpen.',
        },
        quickEligible: false,
        sceneState: 'kitchen-folded-tea-towel',
      },
      {
        id: 'B01-05',
        chapter: { en: 'This week', nl: 'Deze week' },
        text: {
          en: 'What could we make a little more enjoyable together this week?',
          nl: 'Wat kunnen we deze week samen een beetje fijner maken?',
        },
        nudge: {
          en: 'Choose something small and realistic.',
          nl: 'Kies iets kleins en haalbaars.',
        },
        quickEligible: true,
        sceneState: 'kitchen-settled-breakfast',
      },
    ],
    closing: {
      en: 'What small part of today would you like to keep?',
      nl: 'Welk klein stukje van vandaag wil je bewaren?',
    },
  },
  {
    id: 'B02',
    version: '1.0',
    title: { en: 'What helps me unwind', nl: 'Wat mij helpt ontspannen' },
    invitation: {
      en: 'Understand the space and company we need.',
      nl: 'Ontdek welke rust en welk gezelschap we nodig hebben.',
    },
    theme: 'us-today',
    about: {
      en: 'The end of the day, a helpful gesture, quiet or company, your different rhythms and an easier evening.',
      nl: 'Het einde van de dag, een fijn gebaar, rust of gezelschap, jullie eigen ritme en een fijnere avond.',
    },
    intensity: 'personal',
    minutes: 8,
    access: 'collection',
    artFamily: 'window',
    tags: {
      en: ['unwind', 'relax', 'rest', 'evening'],
      nl: ['ontspannen', 'rust', 'avond', 'tot rust komen'],
    },
    prompts: [
      {
        id: 'B02-01',
        chapter: { en: 'The day ends', nl: 'De dag zit erop' },
        text: {
          en: 'What tells you that a long day is finally over?',
          nl: 'Waaraan merk je dat een lange dag eindelijk voorbij is?',
        },
        nudge: {
          en: 'What helps you switch gears?',
          nl: 'Wat helpt je om over te schakelen?',
        },
        quickEligible: false,
        sceneState: 'window-open-window',
      },
      {
        id: 'B02-02',
        chapter: { en: 'A helpful gesture', nl: 'Een fijn gebaar' },
        text: {
          en: 'What do I do that helps you relax?',
          nl: 'Wat doe ik dat je helpt ontspannen?',
        },
        nudge: {
          en: 'Something small that I might overlook.',
          nl: 'Iets kleins waaraan ik misschien voorbijga.',
        },
        quickEligible: false,
        sceneState: 'window-cup-on-sill',
      },
      {
        id: 'B02-03',
        chapter: { en: 'Quiet or company', nl: 'Rust of gezelschap' },
        text: {
          en: 'How can I tell whether you need quiet or company?',
          nl: 'Hoe kan ik merken of je rust of gezelschap nodig hebt?',
        },
        nudge: {
          en: 'What makes that easier to ask for?',
          nl: 'Wat maakt het makkelijker om dat te vragen?',
        },
        quickEligible: false,
        sceneState: 'window-cushion-on-chair',
      },
      {
        id: 'B02-04',
        chapter: { en: 'Our different rhythms', nl: 'Ons eigen ritme' },
        text: {
          en: 'Where do our ways of unwinding differ?',
          nl: 'Waarin verschillen onze manieren om te ontspannen?',
        },
        nudge: {
          en: 'What would you like me to understand about yours?',
          nl: 'Wat wil je dat ik over jouw manier begrijp?',
        },
        quickEligible: false,
        sceneState: 'window-second-small-object',
      },
      {
        id: 'B02-05',
        chapter: { en: 'An easier evening', nl: 'Een fijnere avond' },
        text: {
          en: 'What could we try on the next busy day?',
          nl: 'Wat kunnen we op de volgende drukke dag proberen?',
        },
        nudge: {
          en: 'One small idea, with no obligation.',
          nl: 'Een klein idee, zonder verplichting.',
        },
        quickEligible: false,
        sceneState: 'window-settled-window-crop',
      },
    ],
    closing: {
      en: 'Is there a helpful little reminder you would like to save?',
      nl: 'Is er een kleine, fijne herinnering die je wilt bewaren?',
    },
  },
  {
    id: 'B03',
    version: '1.0',
    title: { en: 'Feeling appreciated', nl: 'Je gewaardeerd voelen' },
    invitation: {
      en: 'The ways we notice each other.',
      nl: 'De manieren waarop we elkaar zien.',
    },
    theme: 'us-today',
    about: {
      en: 'A recent moment, quiet contributions, the thanks that lands, what you see in each other, and a little more.',
      nl: 'Een recent moment, wat stilletjes gebeurt, welke dank aankomt, wat jullie in elkaar zien, en een beetje meer.',
    },
    intensity: 'direct',
    minutes: 10,
    access: 'collection',
    artFamily: 'notebook',
    tags: {
      en: ['appreciation', 'gratitude', 'thanks', 'feeling seen'],
      nl: ['waardering', 'dankbaarheid', 'bedankt', 'gezien worden'],
    },
    prompts: [
      {
        id: 'B03-01',
        chapter: { en: 'A recent moment', nl: 'Een recent moment' },
        text: {
          en: 'When did you recently feel appreciated by me?',
          nl: 'Wanneer voelde je je onlangs door mij gewaardeerd?',
        },
        nudge: {
          en: 'What specifically made you feel that way?',
          nl: 'Wat gaf je precies dat gevoel?',
        },
        quickEligible: false,
        sceneState: 'notebook-open-notebook-pencil',
      },
      {
        id: 'B03-02',
        chapter: { en: 'Quiet contributions', nl: 'Wat stilletjes gebeurt' },
        text: {
          en: 'What do you do for us that I might not notice?',
          nl: 'Wat doe jij voor ons dat ik misschien niet opmerk?',
        },
        nudge: {
          en: 'Something you would like me to understand better.',
          nl: 'Iets wat je me beter wilt laten begrijpen.',
        },
        quickEligible: false,
        sceneState: 'notebook-unlettered-folded-note',
      },
      {
        id: 'B03-03',
        chapter: { en: 'What lands', nl: 'Wat bij je aankomt' },
        text: {
          en: 'What kind of thanks means the most to you?',
          nl: 'Welke vorm van dankbaarheid betekent het meest voor jou?',
        },
        nudge: {
          en: 'Words, time, affection, practical help, or something else.',
          nl: 'Woorden, tijd, genegenheid, praktische hulp of iets anders.',
        },
        quickEligible: false,
        sceneState: 'notebook-plain-envelope',
      },
      {
        id: 'B03-04',
        chapter: { en: 'What I see', nl: 'Wat ik zie' },
        text: {
          en: 'What is something I appreciate about you that I do not say often enough?',
          nl: 'Wat waardeer ik aan jou dat ik niet vaak genoeg zeg?',
        },
        nudge: {
          en: 'Make it a particular thing, not a perfect speech.',
          nl: 'Maak het concreet. Het hoeft geen perfecte toespraak te zijn.',
        },
        quickEligible: false,
        sceneState: 'notebook-small-sprig',
      },
      {
        id: 'B03-05',
        chapter: { en: 'A little more', nl: 'Een beetje meer' },
        text: {
          en: 'What would you enjoy a little more of this week?',
          nl: 'Waarvan zou je deze week graag iets meer hebben?',
        },
        nudge: {
          en: 'Ask for one concrete, manageable thing.',
          nl: 'Vraag om iets concreets en haalbaars.',
        },
        quickEligible: false,
        sceneState: 'notebook-gathered-writing-table',
      },
    ],
    closing: {
      en: 'Would you like to keep a sentence of appreciation?',
      nl: 'Wil je een zin van waardering bewaren?',
    },
  },
  {
    id: 'B04',
    version: '1.0',
    title: { en: 'The things that make us laugh', nl: 'De dingen waar we om lachen' },
    invitation: {
      en: 'Make room for our particular kind of fun.',
      nl: 'Maak ruimte voor onze eigen soort plezier.',
    },
    theme: 'us-today',
    about: {
      en: 'An easy laugh, jokes that are only yours, funny sides, the mood for play and a little invitation.',
      nl: 'Een spontane lach, typische grapjes, jullie grappige kant, de sfeer om speels te zijn en een kleine uitnodiging.',
    },
    intensity: 'light',
    minutes: 8,
    access: 'collection',
    artFamily: 'garden',
    tags: {
      en: ['laugh', 'fun', 'humour', 'inside jokes', 'play'],
      nl: ['lachen', 'plezier', 'humor', 'grapjes', 'speels'],
    },
    prompts: [
      {
        id: 'B04-01',
        chapter: { en: 'An easy laugh', nl: 'Een spontane lach' },
        text: {
          en: 'What made us laugh together recently?',
          nl: 'Waarom hebben we onlangs samen gelachen?',
        },
        nudge: {
          en: 'It can be very silly.',
          nl: 'Het mag heel onnozel zijn.',
        },
        quickEligible: false,
        sceneState: 'garden-table',
      },
      {
        id: 'B04-02',
        chapter: { en: 'Only us', nl: 'Typisch wij' },
        text: {
          en: 'What is an inside joke of ours that would confuse someone else?',
          nl: 'Welk grapje van ons zou iemand anders niet begrijpen?',
        },
        nudge: {
          en: 'Tell the story of how it became ours.',
          nl: 'Vertel hoe het iets van ons werd.',
        },
        quickEligible: false,
        sceneState: 'garden-two-cups',
      },
      {
        id: 'B04-03',
        chapter: { en: 'Your funny side', nl: 'Jouw grappige kant' },
        text: {
          en: 'What funny little thing about me do you secretly enjoy?',
          nl: 'Van welk grappig trekje van mij geniet je stiekem?',
        },
        nudge: {
          en: 'Keep it kind enough that we can both enjoy it.',
          nl: 'Hou het lief, zodat we er allebei van kunnen genieten.',
        },
        quickEligible: false,
        sceneState: 'garden-patterned-napkin',
      },
      {
        id: 'B04-04',
        chapter: { en: 'The mood', nl: 'De sfeer' },
        text: {
          en: 'When do we find it easiest to be playful together?',
          nl: 'Wanneer lukt het ons het makkelijkst om samen speels te zijn?',
        },
        nudge: {
          en: 'What gives that moment room?',
          nl: 'Wat geeft dat moment ruimte?',
        },
        quickEligible: false,
        sceneState: 'garden-playful-paper-shape',
      },
      {
        id: 'B04-05',
        chapter: { en: 'A little invitation', nl: 'Een kleine uitnodiging' },
        text: {
          en: 'What would be a fun, low-effort thing to do together soon?',
          nl: 'Wat is iets leuks dat we binnenkort zonder veel moeite samen kunnen doen?',
        },
        nudge: {
          en: 'Something we would actually look forward to.',
          nl: 'Iets waar we echt naar uitkijken.',
        },
        quickEligible: false,
        sceneState: 'garden-settled-picnic',
      },
    ],
    closing: {
      en: 'Is there a joke or little scene from tonight worth keeping?',
      nl: 'Is er een grapje of klein moment van vanavond dat we willen bewaren?',
    },
  },
  {
    id: 'B05',
    version: '1.0',
    title: { en: 'Making time for us', nl: 'Tijd maken voor ons' },
    invitation: {
      en: 'Notice the moments where we find each other.',
      nl: 'Ontdek de momenten waarop we elkaar vinden.',
    },
    theme: 'us-today',
    about: {
      en: 'A recent connection, what made it good, the busy parts, your preferences and a small opening.',
      nl: 'Onlangs samen, wat het fijn maakte, de drukke stukken, wat jullie fijn vinden en een kleine opening.',
    },
    intensity: 'personal',
    minutes: 10,
    access: 'collection',
    artFamily: 'notebook',
    tags: {
      en: ['time together', 'quality time', 'busy', 'connection'],
      nl: ['tijd samen', 'quality time', 'druk', 'verbinding'],
    },
    prompts: [
      {
        id: 'B05-01',
        chapter: { en: 'A recent connection', nl: 'Onlangs samen' },
        text: {
          en: 'When did you last feel that we really had time for each other?',
          nl: 'Wanneer voelde je voor het laatst dat we echt tijd voor elkaar hadden?',
        },
        nudge: {
          en: 'What was happening around us?',
          nl: 'Wat gebeurde er om ons heen?',
        },
        quickEligible: false,
        sceneState: 'notebook-notebook-two-chairs',
      },
      {
        id: 'B05-02',
        chapter: { en: 'What made it good', nl: 'Wat het fijn maakte' },
        text: {
          en: 'What made that time feel different from simply being in the same room?',
          nl: 'Wat maakte die tijd anders dan gewoon in dezelfde kamer zijn?',
        },
        nudge: {
          en: 'What did we do or notice?',
          nl: 'Wat deden we of wat merkten we op?',
        },
        quickEligible: false,
        sceneState: 'notebook-cup',
      },
      {
        id: 'B05-03',
        chapter: { en: 'The busy parts', nl: 'De drukke stukken' },
        text: {
          en: 'What tends to crowd our time together lately?',
          nl: 'Wat neemt de laatste tijd vaak onze tijd samen in?',
        },
        nudge: {
          en: 'Describe the situation without assigning blame.',
          nl: 'Beschrijf de situatie zonder iemand de schuld te geven.',
        },
        quickEligible: false,
        sceneState: 'notebook-folded-paper-marker',
      },
      {
        id: 'B05-04',
        chapter: { en: 'Our preferences', nl: 'Wat we fijn vinden' },
        text: {
          en: 'What kind of time together feels most like a gift to you?',
          nl: 'Welke tijd samen voelt voor jou echt als een cadeau?',
        },
        nudge: {
          en: 'It can be quiet, active, planned, or spontaneous.',
          nl: 'Het mag rustig, actief, gepland of spontaan zijn.',
        },
        quickEligible: false,
        sceneState: 'notebook-small-lamp',
      },
      {
        id: 'B05-05',
        chapter: { en: 'A small opening', nl: 'Een kleine opening' },
        text: {
          en: 'Where could we make a little room for that?',
          nl: 'Waar kunnen we daar wat ruimte voor maken?',
        },
        nudge: {
          en: 'An invitation is enough. We do not need a new rule.',
          nl: 'Een uitnodiging is genoeg. We hoeven geen nieuwe regel te maken.',
        },
        quickEligible: false,
        sceneState: 'notebook-open-settled',
      },
    ],
    closing: {
      en: 'Would you like to keep an idea for a little time together?',
      nl: 'Wil je een idee voor wat tijd samen bewaren?',
    },
  },
  {
    id: 'C01',
    version: '1.0',
    title: { en: 'A Saturday of our own', nl: 'Een zaterdag voor ons' },
    invitation: {
      en: 'A small adventure, made by us.',
      nl: 'Een klein avontuur van ons.',
    },
    theme: 'whats-next',
    about: {
      en: 'A free morning, your part of the day, a small surprise, how it ends, and what you could actually make happen.',
      nl: 'Een vrije ochtend, jouw stukje van de dag, een kleine verrassing, hoe het eindigt, en wat jullie echt kunnen laten gebeuren.',
    },
    intensity: 'light',
    minutes: 8,
    access: 'free',
    artFamily: 'garden',
    tags: {
      en: ['Saturday', 'weekend', 'adventure', 'garden'],
      nl: ['zaterdag', 'weekend', 'avontuur', 'tuin'],
    },
    prompts: [
      {
        id: 'C01-01',
        chapter: { en: 'A free morning', nl: 'Een vrije ochtend' },
        text: {
          en: 'We have a Saturday with no obligations. Where do we start?',
          nl: 'We hebben een zaterdag zonder verplichtingen. Waar beginnen we?',
        },
        nudge: {
          en: 'Keep it close to home, or imagine something bigger.',
          nl: 'Hou het dichtbij, of droom wat groter.',
        },
        quickEligible: true,
        sceneState: 'garden-gate-path',
      },
      {
        id: 'C01-02',
        chapter: { en: 'Your part', nl: 'Jouw stukje' },
        text: {
          en: 'What would you put in the middle of that day?',
          nl: 'Wat zou jij in het midden van die dag plannen?',
        },
        nudge: {
          en: 'Choose something that feels like you.',
          nl: 'Kies iets wat echt bij jou past.',
        },
        quickEligible: false,
        sceneState: 'garden-picnic-cloth',
      },
      {
        id: 'C01-03',
        chapter: { en: 'A small surprise', nl: 'Een kleine verrassing' },
        text: {
          en: 'What would make the day different from our usual weekend?',
          nl: 'Wat zou die dag anders maken dan ons gewone weekend?',
        },
        nudge: {
          en: 'A little surprise is enough.',
          nl: 'Een kleine verrassing is genoeg.',
        },
        quickEligible: false,
        sceneState: 'garden-small-basket',
      },
      {
        id: 'C01-04',
        chapter: { en: 'Our ending', nl: 'Onze afsluiter' },
        text: {
          en: 'How would you like to end that day together?',
          nl: 'Hoe zou je die dag samen willen afsluiten?',
        },
        nudge: {
          en: 'Think about the feeling as well as the activity.',
          nl: 'Denk aan het gevoel, niet alleen aan de activiteit.',
        },
        quickEligible: false,
        sceneState: 'garden-two-cups',
      },
      {
        id: 'C01-05',
        chapter: { en: 'Make a little real', nl: 'Maak iets echt' },
        text: {
          en: 'Which part could we actually make happen?',
          nl: 'Welk stukje kunnen we echt laten gebeuren?',
        },
        nudge: {
          en: 'What is the easiest first step?',
          nl: 'Wat is de makkelijkste eerste stap?',
        },
        quickEligible: false,
        sceneState: 'garden-settled-weekend',
      },
    ],
    closing: {
      en: 'What little plan would you like to keep?',
      nl: 'Welk klein plan wil je bewaren?',
    },
  },
  {
    id: 'C02',
    version: '1.0',
    title: { en: 'A dream we keep postponing', nl: 'Een droom die we blijven uitstellen' },
    invitation: {
      en: 'Give a small wish some room.',
      nl: 'Geef een kleine wens wat ruimte.',
    },
    theme: 'whats-next',
    about: {
      en: 'The wish, what it means, your other wishes, the hesitation and one little step.',
      nl: 'De wens, wat die betekent, jullie andere wensen, de aarzeling en een kleine stap.',
    },
    intensity: 'personal',
    minutes: 12,
    access: 'collection',
    artFamily: 'window',
    tags: {
      en: ['dream', 'wish', 'bucket list', 'someday'],
      nl: ['droom', 'wens', 'bucketlist', 'ooit'],
    },
    prompts: [
      {
        id: 'C02-01',
        chapter: { en: 'The wish', nl: 'De wens' },
        text: {
          en: 'What is something you would still love us to do?',
          nl: 'Wat zou je nog heel graag samen willen doen?',
        },
        nudge: {
          en: 'It does not have to be a big life goal.',
          nl: 'Het hoeft geen groot levensdoel te zijn.',
        },
        quickEligible: false,
        sceneState: 'window-window-distant-landscape',
      },
      {
        id: 'C02-02',
        chapter: { en: 'What it means', nl: 'Wat het betekent' },
        text: {
          en: 'What would that experience give you?',
          nl: 'Wat zou die ervaring je geven?',
        },
        nudge: {
          en: 'Adventure, rest, connection, or something else.',
          nl: 'Avontuur, rust, verbinding of iets anders.',
        },
        quickEligible: false,
        sceneState: 'window-notebook',
      },
      {
        id: 'C02-03',
        chapter: { en: 'Our other wishes', nl: 'Onze andere wensen' },
        text: {
          en: 'What is something I would love to do that you want to understand better?',
          nl: 'Wat zou ik graag doen dat jij beter wilt begrijpen?',
        },
        nudge: {
          en: 'Ask about the appeal before deciding whether you would join.',
          nl: 'Vraag wat het aantrekkelijk maakt voordat je beslist of je mee wilt.',
        },
        quickEligible: false,
        sceneState: 'window-unlettered-postcard',
      },
      {
        id: 'C02-04',
        chapter: { en: 'The hesitation', nl: 'De aarzeling' },
        text: {
          en: 'What makes us keep putting these ideas off?',
          nl: 'Waardoor blijven we deze ideeën uitstellen?',
        },
        nudge: {
          en: 'What is a real obstacle, and what might be an assumption?',
          nl: 'Wat is een echte drempel en wat is misschien een aanname?',
        },
        quickEligible: false,
        sceneState: 'window-small-folded-map',
      },
      {
        id: 'C02-05',
        chapter: { en: 'One little step', nl: 'Een kleine stap' },
        text: {
          en: 'What is the smallest step that would feel good?',
          nl: 'Wat is de kleinste stap die fijn zou voelen?',
        },
        nudge: {
          en: 'We can explore it without making a promise.',
          nl: 'We kunnen het verkennen zonder iets te beloven.',
        },
        quickEligible: false,
        sceneState: 'window-gathered-sill',
      },
    ],
    closing: {
      en: 'Would you like to keep the wish, or one small possible step?',
      nl: 'Wil je de wens bewaren, of een kleine mogelijke stap?',
    },
  },
  {
    id: 'C03',
    version: '1.0',
    title: { en: 'A little more of this', nl: 'Een beetje meer hiervan' },
    invitation: {
      en: 'Imagine more of what already feels good.',
      nl: 'Droom van meer van wat nu al fijn voelt.',
    },
    theme: 'whats-next',
    about: {
      en: 'A good moment, its ingredients, your own version, making room and trying it once.',
      nl: 'Een fijn moment, de ingrediënten, jouw versie, ruimte maken en het een keer proberen.',
    },
    intensity: 'light',
    minutes: 8,
    access: 'collection',
    artFamily: 'garden',
    tags: {
      en: ['more', 'good moments', 'enjoy', 'everyday'],
      nl: ['meer', 'fijne momenten', 'genieten', 'alledaags'],
    },
    prompts: [
      {
        id: 'C03-01',
        chapter: { en: 'A good moment', nl: 'Een fijn moment' },
        text: {
          en: 'Which recent moment would you happily have more of?',
          nl: 'Van welk recent moment zou je graag meer willen?',
        },
        nudge: {
          en: 'It can have been brief or completely ordinary.',
          nl: 'Het mag kort of heel gewoon geweest zijn.',
        },
        quickEligible: false,
        sceneState: 'garden-table',
      },
      {
        id: 'C03-02',
        chapter: { en: 'The ingredients', nl: 'De ingrediënten' },
        text: {
          en: 'What made that moment work for you?',
          nl: 'Wat maakte dat moment fijn voor jou?',
        },
        nudge: {
          en: 'The place, the pace, the company, or something else.',
          nl: 'De plek, het tempo, het gezelschap of iets anders.',
        },
        quickEligible: false,
        sceneState: 'garden-two-cups',
      },
      {
        id: 'C03-03',
        chapter: { en: 'Your version', nl: 'Jouw versie' },
        text: {
          en: 'What would your version of more of that look like?',
          nl: 'Hoe zou jouw versie van meer daarvan eruitzien?',
        },
        nudge: {
          en: 'We may like different parts of the same moment.',
          nl: 'Misschien vinden we andere stukjes van hetzelfde moment fijn.',
        },
        quickEligible: false,
        sceneState: 'garden-small-sprig',
      },
      {
        id: 'C03-04',
        chapter: { en: 'Make room', nl: 'Maak ruimte' },
        text: {
          en: 'What would need a little less room for that to happen?',
          nl: 'Wat zou wat minder ruimte moeten krijgen om dat mogelijk te maken?',
        },
        nudge: {
          en: 'Keep it realistic and kind.',
          nl: 'Hou het haalbaar en mild.',
        },
        quickEligible: false,
        sceneState: 'garden-folded-napkin',
      },
      {
        id: 'C03-05',
        chapter: { en: 'Try it once', nl: 'Probeer het een keer' },
        text: {
          en: 'What is one small way we could try it again?',
          nl: 'Wat is een kleine manier om het nog eens te proberen?',
        },
        nudge: {
          en: 'No schedule or ongoing commitment is required.',
          nl: 'Een planning of vaste afspraak is niet nodig.',
        },
        quickEligible: false,
        sceneState: 'garden-settled-crop',
      },
    ],
    closing: {
      en: 'What would you like to remember about what feels good for us?',
      nl: 'Wat wil je onthouden over wat voor ons fijn voelt?',
    },
  },
  {
    id: 'C04',
    version: '1.0',
    title: { en: 'Something new, together', nl: 'Samen iets nieuws' },
    invitation: {
      en: 'A little curiosity can be enough.',
      nl: 'Een beetje nieuwsgierigheid is genoeg.',
    },
    theme: 'whats-next',
    about: {
      en: 'A spark, why it draws you, being beginners, finding your overlap and the easiest version.',
      nl: 'Een vonk, waarom het je aantrekt, samen beginner zijn, zoeken wat past en de makkelijkste versie.',
    },
    intensity: 'light',
    minutes: 10,
    access: 'collection',
    artFamily: 'travel',
    tags: {
      en: ['something new', 'try', 'curiosity', 'adventure'],
      nl: ['iets nieuws', 'proberen', 'nieuwsgierigheid', 'avontuur'],
    },
    prompts: [
      {
        id: 'C04-01',
        chapter: { en: 'A spark', nl: 'Een vonk' },
        text: {
          en: 'What is something new you would be curious to try together?',
          nl: 'Wat is iets nieuws dat je graag samen zou proberen?',
        },
        nudge: {
          en: 'It can be a skill, a place, a taste, or a small experience.',
          nl: 'Een vaardigheid, een plek, een smaak of een kleine ervaring.',
        },
        quickEligible: false,
        sceneState: 'travel-map-closed-notebook',
      },
      {
        id: 'C04-02',
        chapter: { en: 'Why that', nl: 'Waarom dat' },
        text: {
          en: 'What draws you to it?',
          nl: 'Wat trekt je daarin aan?',
        },
        nudge: {
          en: 'What part would you most look forward to?',
          nl: 'Naar welk stukje zou je het meest uitkijken?',
        },
        quickEligible: false,
        sceneState: 'travel-pencil',
      },
      {
        id: 'C04-03',
        chapter: { en: 'Our beginner selves', nl: 'Wij als beginners' },
        text: {
          en: 'What are we like when we are both beginners?',
          nl: 'Hoe zijn we als we allebei ergens beginner in zijn?',
        },
        nudge: {
          en: 'What helps us enjoy it without needing to be good?',
          nl: 'Wat helpt ons ervan te genieten zonder dat we goed moeten zijn?',
        },
        quickEligible: false,
        sceneState: 'travel-unlettered-folded-card',
      },
      {
        id: 'C04-04',
        chapter: { en: 'Find our overlap', nl: 'Zoek wat past' },
        text: {
          en: 'What is an idea that has something for both of us?',
          nl: 'Welk idee heeft iets voor ons allebei?',
        },
        nudge: {
          en: 'We can combine two small preferences.',
          nl: 'We kunnen twee kleine voorkeuren combineren.',
        },
        quickEligible: false,
        sceneState: 'travel-small-keepsake',
      },
      {
        id: 'C04-05',
        chapter: { en: 'The easiest version', nl: 'De makkelijkste versie' },
        text: {
          en: 'What would the easiest first version look like?',
          nl: 'Hoe ziet de makkelijkste eerste versie eruit?',
        },
        nudge: {
          en: 'Something we can try once and then decide.',
          nl: 'Iets wat we een keer kunnen proberen en daarna beoordelen.',
        },
        quickEligible: false,
        sceneState: 'travel-quiet-complete-arrangement',
      },
    ],
    closing: {
      en: 'Would you like to keep one idea to try?',
      nl: 'Wil je een idee bewaren om te proberen?',
    },
  },
  {
    id: 'C05',
    version: '1.0',
    title: { en: 'The home feeling we want', nl: 'Het thuisgevoel dat we willen' },
    invitation: {
      en: 'Think about how a place feels, not what it costs.',
      nl: 'Denk aan hoe een plek voelt, niet aan wat ze kost.',
    },
    theme: 'whats-next',
    about: {
      en: 'A feeling, what is already here, your wishes, your differences and a small change.',
      nl: 'Een gevoel, wat er al is, jullie wensen, jullie verschillen en een kleine verandering.',
    },
    intensity: 'personal',
    minutes: 10,
    access: 'collection',
    artFamily: 'window',
    tags: {
      en: ['home', 'comfort', 'cosy', 'living together'],
      nl: ['thuis', 'comfort', 'gezellig', 'samenwonen'],
    },
    prompts: [
      {
        id: 'C05-01',
        chapter: { en: 'A feeling', nl: 'Een gevoel' },
        text: {
          en: 'What does feeling at home mean to you?',
          nl: 'Wat betekent je thuis voelen voor jou?',
        },
        nudge: {
          en: 'It can be a feeling, a person, or a little routine.',
          nl: 'Het mag een gevoel, een persoon of een klein ritueel zijn.',
        },
        quickEligible: false,
        sceneState: 'window-warm-interior-light',
      },
      {
        id: 'C05-02',
        chapter: { en: 'What is already here', nl: 'Wat er al is' },
        text: {
          en: 'Where do you already find some of that in our life?',
          nl: 'Waar vind je daar nu al iets van in ons leven?',
        },
        nudge: {
          en: 'We do not need to live in the same place to answer this.',
          nl: 'We hoeven niet op dezelfde plek te wonen om dit te beantwoorden.',
        },
        quickEligible: false,
        sceneState: 'window-cushion',
      },
      {
        id: 'C05-03',
        chapter: { en: 'Your wishes', nl: 'Jouw wensen' },
        text: {
          en: 'What would you like a little more of in the spaces we share?',
          nl: 'Waarvan wil je iets meer in de plekken die we delen?',
        },
        nudge: {
          en: 'Quiet, welcome, playfulness, room for ourselves, or something else.',
          nl: 'Rust, gastvrijheid, speelsheid, ruimte voor onszelf of iets anders.',
        },
        quickEligible: false,
        sceneState: 'window-cup',
      },
      {
        id: 'C05-04',
        chapter: { en: 'Our differences', nl: 'Onze verschillen' },
        text: {
          en: 'Where do our ideas of comfort differ?',
          nl: 'Waarin verschillen onze ideeën over wat comfortabel voelt?',
        },
        nudge: {
          en: 'What would help us make room for both?',
          nl: 'Wat helpt ons om voor beide ruimte te maken?',
        },
        quickEligible: false,
        sceneState: 'window-small-plant',
      },
      {
        id: 'C05-05',
        chapter: { en: 'A small change', nl: 'Een kleine verandering' },
        text: {
          en: 'What small change could make a shared moment feel more like home?',
          nl: 'Welke kleine verandering kan een moment samen meer als thuis laten voelen?',
        },
        nudge: {
          en: 'It need not involve buying anything.',
          nl: 'We hoeven er niets voor te kopen.',
        },
        quickEligible: false,
        sceneState: 'window-welcoming-settled-crop',
      },
    ],
    closing: {
      en: 'What would you like to remember about our kind of home?',
      nl: 'Wat wil je onthouden over ons soort thuis?',
    },
  },
];

/** The authored revision changes words and pictures, never identities, access or Quick eligibility. */
const revisedTopics: readonly Topic[] = originalTopics.map(topic => {
  const revision = storyRevisions[topic.id];
  if (!revision) return topic;
  return {
    ...topic, version: '1.1', about: revision.about, closing: revision.closing,
    prompts: topic.prompts.map((prompt, index) => ({
      ...prompt, ...revision.prompts[index], sceneState: `${topic.artFamily}-${topic.id}-${index + 1}-v2`,
    })),
  };
});

/** Everything a couple can see, all available from the first launch. Launch order first, so new installs still feature A01. */
export const topics: readonly Topic[] = [...revisedTopics, ...packTopics];

export const themes: readonly Theme[] = [
  {
    id: 'our-story',
    label: { en: 'Our story', nl: 'Ons verhaal' },
    artFamily: 'cafe',
  },
  {
    id: 'us-today',
    label: { en: 'Us today', nl: 'Wij vandaag' },
    artFamily: 'kitchen',
  },
  {
    id: 'whats-next',
    label: { en: "What's next", nl: 'Wat komt er nog' },
    artFamily: 'window',
  },
];

/** Resolve the saved content version; an unknown version is never silently substituted. */
export function getTopic(id: string, version?: string): Topic | undefined {
  const catalogue = version === '1.0' ? [...originalTopics, ...packTopics] : topics;
  return catalogue.find(topic => topic.id === id && (version === undefined || topic.version === version));
}

function normalizeSearch(value: string, language: Language): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase(language)
    .trim();
}

export type DurationFilter = 'any' | 'short' | 'long';
export type IntensityFilter = 'any' | 'light' | 'personal' | 'direct';

/** Search stays entirely in memory; terms are never persisted or transmitted (spec 13). */
export function filterTopics(
  themeId: ThemeId | 'all',
  query: string,
  language: Language,
  duration: DurationFilter = 'any',
  intensity: IntensityFilter = 'any',
  catalogue: readonly Topic[] = topics,
): readonly Topic[] {
  const terms = normalizeSearch(query, language).split(/\s+/).filter(Boolean);
  return catalogue.filter((topic) => {
    if (themeId !== 'all' && topic.theme !== themeId) return false;
    if (duration === 'short' && topic.minutes > 8) return false;
    if (duration === 'long' && topic.minutes < 10) return false;
    if (intensity !== 'any' && topic.intensity !== intensity) return false;
    const searchable = normalizeSearch(
      [topic.title[language], topic.invitation[language], topic.about[language], ...topic.tags[language]].join(' '),
      language,
    );
    return terms.every((term) => searchable.includes(term));
  });
}

/** Free topics are always open; collection topics need a store-verified entitlement (spec 35/38). */
export function isAccessible(topic: Topic, owned: boolean): boolean {
  return topic.access === 'free' || owned;
}

export const freeTopicIds = ['A01', 'B01', 'C01'] as const;
