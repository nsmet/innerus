import type { Localized } from './types';

const pair = (en: string, nl: string): Localized => ({ en, nl });
type StoryPrompt = { chapter: Localized; text: Localized; nudge: Localized };
const beat = (chapter: string, hoofdstuk: string, question: string, vraag: string, nudge: string, zetje: string): StoryPrompt => ({
  chapter: pair(chapter, hoofdstuk), text: pair(question, vraag), nudge: pair(nudge, zetje),
});
type StoryRevision = { about: Localized; prompts: readonly StoryPrompt[]; closing: Localized };

/**
 * Owner-directed editorial revision, 23 October 2026. One continuous subject per story.
 * Voice pass (23 October 2026): questions are concrete, sensory and personal — asked the way a
 * close friend would ask, never from a distance. A mix of light and connection-deepening beats.
 * Each beat keeps its original scene so the mapped painting still fits.
 * Every question remains usable after Skip; no bridge assumes an answer or agreement.
 * Existing prompt IDs, access and Quick eligibility are inherited from the original catalogue.
 */
export const storyRevisions: Readonly<Record<string, StoryRevision>> = {
  A01: {
    about: pair('Back to the day it all started: the nerves, the outfit, the first look and the way home.', 'Terug naar de dag waarop het begon: de zenuwen, de outfit, de eerste blik en de weg naar huis.'),
    prompts: [
      beat('The nerves', 'De zenuwen', 'Be honest: how nervous were you before our first date?', 'Eerlijk zijn: hoe zenuwachtig was je voor onze eerste date?', 'Did you tell anyone? Check your phone ten times? Almost cancel?', 'Had je het aan iemand verteld? Tien keer je gsm gecheckt? Bijna afgezegd?'),
      beat('What to wear', 'Wat trek ik aan', 'What did you end up choosing to wear that day, and how many times did you change?', 'Wat had je uiteindelijk aangetrokken die dag, en hoe vaak had je je omgekleed?', 'Bonus points if you still remember what I was wearing.', 'Extra punten als je nog weet wat ik aanhad.'),
      beat('The first look', 'De eerste blik', 'What did you think when you first saw me that day? What did you notice first?', 'Wat dacht je toen je me die dag voor het eerst zag? Wat viel je als eerste op?', 'Your very first thought, not the polished version.', 'Je allereerste gedachte, niet de mooie versie.'),
      beat('That one moment', 'Dat ene moment', 'What little moment from that date made you laugh, or made you blush?', 'Welk klein moment van die date deed je lachen, of blozen?', 'Something I said, an awkward silence, something that went a bit wrong…', 'Iets wat ik zei, een ongemakkelijke stilte, iets wat een beetje misliep…'),
      beat('The way home', 'De weg naar huis', 'When we had to say goodbye, what was going through your head on the way home?', 'Toen we afscheid moesten nemen, wat ging er door je hoofd op weg naar huis?', 'Did you already know you wanted to see me again?', 'Wist je toen al dat je me terug wilde zien?'),
    ],
    closing: pair('What’s one detail of that day you never want to forget?', 'Welk detail van die dag wil je nooit vergeten?'),
  },
  A02: {
    about: pair('Pick a place we’ve been together, go back there for an afternoon and see what you’d bring home.', 'Kies een plek waar we samen zijn geweest, ga er een middag terug naartoe en kijk wat je mee naar huis neemt.'),
    prompts: [
      beat('Where to?', 'Waarheen?', 'If we could teleport somewhere we’ve been together for one afternoon, where are we going?', 'Als we voor één middag ergens naartoe konden teleporteren waar we samen zijn geweest, waar gaan we dan heen?', 'It doesn’t have to be far. That one bench or café counts too.', 'Het hoeft niet ver te zijn. Dat ene bankje of café telt ook.'),
      beat('We’re there', 'We zijn er', 'Picture us arriving there again. What’s the weather like, and what’s the first thing you see?', 'Stel je voor dat we er opnieuw aankomen. Wat voor weer is het, en wat zie je als eerste?', 'Sun on your face, rain on the window, that view you remember?', 'Zon op je gezicht, regen tegen het raam, dat uitzicht dat je nog weet?'),
      beat('Our afternoon', 'Onze middag', 'What are we doing there? Walk me through that afternoon.', 'Wat doen we daar? Neem me mee door die middag.', 'Where are we sitting, what are we eating, who’s doing the talking?', 'Waar zitten we, wat eten we, wie is er aan het woord?'),
      beat('What it gave you', 'Wat het je gaf', 'How did you feel there that you don’t often feel at home?', 'Hoe voelde jij je daar, op een manier die je thuis niet vaak voelt?', 'Lighter? Freer? Closer to me?', 'Lichter? Vrijer? Dichter bij mij?'),
      beat('Bringing it home', 'Mee naar huis', 'What could we bring home from there: a habit, a mood, a recipe?', 'Wat zouden we daarvan mee naar huis kunnen nemen: een gewoonte, een sfeer, een recept?', 'Something small we could actually do this week.', 'Iets kleins dat we deze week echt kunnen doen.'),
    ],
    closing: pair('If you sent me a postcard from there, what would it say?', 'Als je me vanaf daar een kaartje stuurde, wat zou erop staan?'),
  },
  A03: {
    about: pair('Back to our first place together: the boxes, the first purchases, the weeknights and what we still miss.', 'Terug naar ons eerste huis samen: de dozen, de eerste aankopen, de doordeweekse avonden en wat we nog missen.'),
    prompts: [
      beat('The first night', 'De eerste nacht', 'Remember our first night in our first place? What do you see when you picture it?', 'Weet je nog, onze eerste nacht in ons eerste huis? Wat zie je als je eraan terugdenkt?', 'Boxes everywhere? A mattress on the floor? Takeaway on our laps?', 'Overal dozen? Een matras op de grond? Afhaaleten op schoot?'),
      beat('Making it ours', 'Het van ons maken', 'What was the first thing we hung up or bought that made it feel like ours?', 'Wat was het eerste dat we ophingen of kochten waardoor het echt van ons voelde?', 'A lamp, a plant that didn’t make it, a slightly questionable rug…', 'Een lamp, een plant die het niet haalde, een twijfelachtig tapijt…'),
      beat('A normal evening', 'Een gewone avond', 'What did a normal weeknight look like for us there?', 'Hoe zag een gewone doordeweekse avond er daar voor ons uit?', 'Who cooked? Where did we sit? What were we watching?', 'Wie kookte er? Waar zaten we? Waar keken we naar?'),
      beat('Your spot', 'Jouw plekje', 'Where was your favourite spot in that place, and why there?', 'Wat was jouw favoriete plekje daar, en waarom net daar?', 'I’m curious whether I’d have guessed it.', 'Ik ben benieuwd of ik het had geraden.'),
      beat('What we miss', 'Wat we missen', 'What do you secretly miss about that first home?', 'Wat mis je stiekem aan dat eerste huis?', 'A sound, a view, a habit, or who we were back then.', 'Een geluid, een uitzicht, een gewoonte, of wie we toen waren.'),
    ],
    closing: pair('What would you tell our future selves about that first home?', 'Wat zou je ons latere zelf vertellen over dat eerste huis?'),
  },
  A04: {
    about: pair('Relive a trip we still talk about: how it started, what went wrong, and the bits only you remember.', 'Beleef een reis waar we nog over praten: hoe hij begon, wat misliep en de stukjes die alleen jij nog weet.'),
    prompts: [
      beat('We’re off', 'We vertrekken', 'Which trip of ours would you jump back into tomorrow? How did it start?', 'In welke reis van ons zou je morgen zo terugspringen? Hoe begon die?', 'An early alarm? A packed car? Already bickering about the route?', 'Een vroege wekker? Een volgepropte auto? Al kibbelen over de route?'),
      beat('Plot twist', 'Plotwending', 'What went wrong, or at least not as planned, on that trip?', 'Wat liep er mis, of toch niet zoals gepland, op die reis?', 'A missed train, a downpour, a wrong turn that ended up being the best part?', 'Een gemiste trein, een stortbui, een verkeerde afslag die uiteindelijk het leukste was?'),
      beat('Freeze frame', 'Even stilzetten', 'If you could freeze one moment of that trip, which one would it be?', 'Als je één moment van die reis kon stilzetten, welk zou het zijn?', 'Where were we, what was the weather like, what were we eating?', 'Waar waren we, wat voor weer was het, wat aten we?'),
      beat('Your secret highlight', 'Jouw geheime hoogtepunt', 'What’s a moment from that trip that meant more to you than I probably know?', 'Welk moment van die reis betekende meer voor jou dan ik waarschijnlijk weet?', 'The bit you never quite told me about.', 'Het stukje dat je me nooit echt verteld hebt.'),
      beat('Back home', 'Weer thuis', 'Once we were home again, what did you miss most about being away with me?', 'Toen we weer thuis waren, wat miste je het meest aan samen weg zijn?', 'Not just the place. Us, there.', 'Niet alleen de plek. Wij, daar.'),
    ],
    closing: pair('Which photo from that trip would you frame?', 'Welke foto van die reis zou je inkaderen?'),
  },
  A05: {
    about: pair('Our silly little habits: where they came from, when they became ours, and which ones to keep.', 'Onze kleine gewoontes: waar ze vandaan komen, wanneer ze van ons werden en welke we willen houden.'),
    prompts: [
      beat('Our thing', 'Ons ding', 'What’s a little thing we always do that nobody else would get?', 'Wat is een klein ding dat we altijd doen en dat niemand anders zou snappen?', 'A word, a goodnight ritual, the way we do Sunday breakfast…', 'Een woord, een slaapwel-ritueel, hoe we op zondag ontbijten…'),
      beat('The very first time', 'De allereerste keer', 'Do you remember the first time we did it? How did it start?', 'Weet je nog de eerste keer dat we het deden? Hoe is het begonnen?', 'Not sure? Make your best guess, and I’ll tell you mine.', 'Niet zeker? Doe een gok, dan vertel ik de mijne.'),
      beat('Officially ours', 'Officieel van ons', 'When did you realise it had become “our thing”?', 'Wanneer had je door dat het “ons ding” was geworden?', 'Was there a day you noticed you’d miss it?', 'Was er een dag dat je merkte dat je het zou missen?'),
      beat('Without it', 'Zonder', 'What would you miss most if we stopped doing it?', 'Wat zou je het meest missen als we ermee stopten?', 'The cosiness, the silliness, that one minute alone together?', 'De gezelligheid, het onnozele, die ene minuut samen?'),
      beat('Bring it back', 'Terugbrengen', 'Is there a little thing we used to do that you’d love to bring back?', 'Is er een klein ding dat we vroeger deden en dat je graag zou terugbrengen?', 'Or one we should start. Keep it small.', 'Of eentje die we zouden moeten beginnen. Hou het klein.'),
    ],
    closing: pair('Which of our little things makes you smile the most?', 'Van welk klein ding van ons word je het blijst?'),
  },
  B01: {
    about: pair('A completely normal day with us, from the alarm to the evening, and the tiny things that make it good.', 'Een heel gewone dag met ons, van de wekker tot de avond, en de kleine dingen die hem fijn maken.'),
    prompts: [
      beat('Just a Tuesday', 'Gewoon dinsdag', 'Walk me through a normal Tuesday for us. What’s the first thing you picture?', 'Neem me mee door een gewone dinsdag van ons. Wat zie je als eerste voor je?', 'The alarm, the coffee, who gets the bathroom first…', 'De wekker, de koffie, wie als eerste in de badkamer is…'),
      beat('Our five minutes', 'Onze vijf minuten', 'What are your favourite five minutes with me on a normal weekday?', 'Wat zijn jouw favoriete vijf minuten met mij op een gewone weekdag?', 'Morning coffee? The sofa in the evening? That message in the middle of the day?', 'Koffie ’s ochtends? ’s Avonds samen in de zetel? Dat berichtje midden op de dag?'),
      beat('The little things', 'De kleine dingen', 'What’s something small I do on a normal day that you really like?', 'Wat is iets kleins dat ik op een gewone dag doe en dat jij echt fijn vindt?', 'Probably something I don’t even know I do.', 'Waarschijnlijk iets waarvan ik niet eens weet dat ik het doe.'),
      beat('The hard bit', 'Het zware stukje', 'Which part of a normal day wears us out the most?', 'Welk deel van een gewone dag put ons het meest uit?', 'No need to fix it tonight. Just say it out loud.', 'We hoeven het vanavond niet op te lossen. Zeg het gewoon eens hardop.'),
      beat('Next Tuesday', 'Volgende dinsdag', 'What’s one tiny thing that would make next Tuesday a bit nicer?', 'Wat is één klein ding dat volgende dinsdag net wat fijner zou maken?', 'Tiny. Like “eat dinner at the table” tiny.', 'Klein. Zo klein als “aan tafel eten”.'),
    ],
    closing: pair('Which part of our ordinary days would you never want to lose?', 'Welk stukje van onze gewone dagen wil je nooit kwijt?'),
  },
  B02: {
    about: pair('What happens when you come home after a long day, and how I can make that evening a little easier.', 'Wat er gebeurt als je thuiskomt na een lange dag, en hoe ik die avond wat makkelijker kan maken.'),
    prompts: [
      beat('Home at last', 'Eindelijk thuis', 'When you get home after a long day, when do you actually feel “off duty”?', 'Als je thuiskomt na een lange dag, wanneer voel je je echt “vrij”?', 'Shoes off? Comfy clothes on? First sip of something?', 'Schoenen uit? Gemakkelijke kleren aan? De eerste slok van iets?'),
      beat('The first ten minutes', 'De eerste tien minuten', 'What do you do in those first ten minutes to come down from the day?', 'Wat doe jij in die eerste tien minuten om van de dag te bekomen?', 'Be honest, even if it’s just staring at your phone.', 'Eerlijk zijn, ook als het gewoon naar je gsm staren is.'),
      beat('Space or closeness', 'Ruimte of nabijheid', 'How can I tell when you need some quiet, and when you want me close?', 'Hoe kan ik zien wanneer je even rust nodig hebt, en wanneer je me dichtbij wilt?', 'Is there a sign? Could we invent one?', 'Is er een teken? Kunnen we er eentje verzinnen?'),
      beat('Your way, my way', 'Jouw manier, mijn manier', 'How do we unwind differently, and does it ever clash?', 'Hoe ontspannen wij anders, en botst dat soms?', 'TV versus silence, talking versus not talking…', 'Tv tegenover stilte, praten tegenover niet praten…'),
      beat('A softer evening', 'Een zachtere avond', 'After a rough day, what’s the one thing I could do that would help most?', 'Wat is na een zware dag het ene ding dat ik kan doen dat het meest helpt?', 'Make tea, give you a hug, leave you alone for twenty minutes?', 'Thee zetten, je een knuffel geven, je twintig minuten met rust laten?'),
    ],
    closing: pair('What do you want me to remember next time you come home tired?', 'Wat wil je dat ik onthoud de volgende keer dat je moe thuiskomt?'),
  },
  B03: {
    about: pair('The small moments when you felt seen by me, why they landed, and what you’d love a little more of.', 'De kleine momenten waarop je je door mij gezien voelde, waarom ze binnenkwamen en waar je graag wat meer van zou willen.'),
    prompts: [
      beat('That moment', 'Dat moment', 'When did I last make you feel really appreciated, even in a tiny way?', 'Wanneer gaf ik je voor het laatst echt het gevoel dat je gewaardeerd werd, al was het iets kleins?', 'If nothing comes to mind, that’s okay. Tell me what would have done it.', 'Schiet er niets te binnen? Geen probleem. Vertel me wat het had kunnen zijn.'),
      beat('Set the scene', 'Schets het moment', 'Take me back there. Where were we, and what was going on?', 'Neem me mee terug. Waar waren we, en wat was er aan de hand?', 'The time of day, what you were doing, what I said.', 'Het moment van de dag, wat jij aan het doen was, wat ik zei.'),
      beat('Why it landed', 'Waarom het binnenkwam', 'Why did that hit home for you?', 'Waarom kwam dat zo bij je binnen?', 'The words? The timing? That I noticed at all?', 'De woorden? De timing? Dat ik het überhaupt opmerkte?'),
      beat('Your way of showing it', 'Hoe jij het laat zien', 'How do you show me you appreciate me? Maybe in a way I’ve missed.', 'Hoe laat jij mij merken dat je me waardeert? Misschien op een manier die ik gemist heb.', 'The little things that might fly under my radar.', 'De kleine dingen die misschien onder mijn radar blijven.'),
      beat('A little more of this', 'Hier wat meer van', 'What’s one small thing you’d love to hear or get from me more often?', 'Wat is één klein ding dat je graag wat vaker van mij zou horen of krijgen?', 'Just say it straight. This isn’t a test.', 'Zeg het gewoon recht voor de raap. Het is geen test.'),
    ],
    closing: pair('What’s one thing you appreciate about me this week?', 'Wat is één ding dat jij deze week aan mij waardeert?'),
  },
  B04: {
    about: pair('The times we laughed until we cried, why they were so funny to us, and how to get more of that.', 'De keren dat we lachten tot we huilden, waarom dat zo grappig was voor ons en hoe we er meer van krijgen.'),
    prompts: [
      beat('That laugh', 'Die lach', 'What’s the hardest we’ve ever laughed together?', 'Wat is de keer dat we samen het hardst gelachen hebben?', 'The kind where you couldn’t breathe anymore.', 'Zo eentje waarbij je geen adem meer kreeg.'),
      beat('Right before', 'Vlak ervoor', 'Set the scene: what was happening right before it started?', 'Schets het moment: wat gebeurde er vlak voordat het begon?', 'Where were we, who was there, what were we doing?', 'Waar waren we, wie was er bij, wat waren we aan het doen?'),
      beat('Only we get it', 'Alleen wij snappen het', 'Why was it so funny to us, and probably not to anyone else?', 'Waarom was het zo grappig voor ons, en waarschijnlijk voor niemand anders?', 'An inside joke, a face someone pulled, a long backstory.', 'Een inside joke, een gek gezicht, een lange voorgeschiedenis.'),
      beat('Our goofy side', 'Onze gekke kant', 'When do you feel most goofy and free around me?', 'Wanneer voel jij je het meest gek en vrij bij mij?', 'And is there a time we seem to have lost that a bit?', 'En is er een periode waarin we dat wat kwijt lijken?'),
      beat('Again soon', 'Snel nog eens', 'What’s something silly we should do again soon?', 'Wat is iets onnozels dat we snel nog eens moeten doen?', 'Bad karaoke, a board game, that dance in the kitchen…', 'Slechte karaoke, een gezelschapsspel, dat dansje in de keuken…'),
    ],
    closing: pair('Which inside joke of ours would you save from a fire?', 'Welke inside joke van ons zou je redden uit een brand?'),
  },
  B05: {
    about: pair('The last time it really felt like just us, what gets in the way lately, and where we can sneak in more.', 'De laatste keer dat het echt alleen wij voelde, wat er de laatste tijd tussen komt en waar we meer kunnen inpikken.'),
    prompts: [
      beat('Just us', 'Alleen wij', 'When was the last time it felt like it was really just us?', 'Wanneer voelde het voor het laatst alsof het echt alleen wij twee waren?', 'Phones away, nowhere to be. Even ten minutes counts.', 'Gsm weg, nergens naartoe moeten. Zelfs tien minuten tellen.'),
      beat('Really there', 'Er echt zijn', 'What did I do in that moment that made you feel I was really with you?', 'Wat deed ik op dat moment waardoor je voelde dat ik er echt bij was?', 'The way I looked at you, listened, laughed at your story…', 'Hoe ik naar je keek, luisterde, om je verhaal lachte…'),
      beat('What gets in the way', 'Wat ertussen komt', 'What usually gets in the way of time like that lately?', 'Wat komt er de laatste tijd meestal tussen zo’n momenten?', 'Work, phones, being tired? No blame, just naming it.', 'Werk, gsm’s, moe zijn? Geen schuld, gewoon benoemen.'),
      beat('A free evening', 'Een vrije avond', 'If we had a free evening tomorrow, how would you want to spend it with me?', 'Als we morgen een vrije avond hadden, hoe zou je die met mij willen doorbrengen?', 'Cosy at home, out somewhere, or no plan at all?', 'Gezellig thuis, ergens op stap, of helemaal zonder plan?'),
      beat('Sneaking it in', 'Er tussen proppen', 'Where could we sneak in a little bit of “us” this week?', 'Waar kunnen we deze week een beetje “wij” tussen proppen?', 'Breakfast together, a walk after dinner. Keep it small.', 'Samen ontbijten, een wandeling na het eten. Hou het klein.'),
    ],
    closing: pair('What do you want to remember about our time together?', 'Wat wil je onthouden over onze tijd samen?'),
  },
  C01: {
    about: pair('Dream up a Saturday with nothing planned, from breakfast to the last drink, then steal one piece of it.', 'Droom een zaterdag zonder plannen, van het ontbijt tot het laatste drankje, en pik er één stukje uit.'),
    prompts: [
      beat('Slow morning', 'Trage ochtend', 'Imagine a Saturday with nothing planned. When do we wake up, and what’s for breakfast?', 'Stel je een zaterdag voor zonder plannen. Wanneer worden we wakker, en wat eten we als ontbijt?', 'Croissants in bed? A big fry-up? Just coffee and no talking yet?', 'Croissants in bed? Een uitgebreid ontbijt? Alleen koffie en nog niet praten?'),
      beat('Then what?', 'En dan?', 'Breakfast’s done. Where are we going, or are we staying in?', 'Het ontbijt is op. Waar gaan we heen, of blijven we binnen?', 'The market, the woods, a bike ride, the sofa.', 'De markt, het bos, een fietstocht, de zetel.'),
      beat('A little surprise', 'Een kleine verrassing', 'What little surprise would make it a day we’d remember?', 'Welke kleine verrassing zou er een dag van maken die we onthouden?', 'A spontaneous detour, a new café, something we never do.', 'Een spontane omweg, een nieuw café, iets wat we nooit doen.'),
      beat('The evening', 'De avond', 'How does the day end? Paint me the evening.', 'Hoe eindigt de dag? Schilder de avond eens voor me.', 'Where are we, what are we eating, who falls asleep first?', 'Waar zijn we, wat eten we, wie valt als eerste in slaap?'),
      beat('For real', 'Echt doen', 'Which bit of that Saturday could we actually do soon?', 'Welk stukje van die zaterdag kunnen we binnenkort echt doen?', 'Just one bit. The rest can stay a daydream.', 'Gewoon één stukje. De rest mag een dagdroom blijven.'),
    ],
    closing: pair('What’s your favourite part of our dream Saturday?', 'Wat is jouw favoriete stukje van onze droomzaterdag?'),
  },
  C02: {
    about: pair('That thing we keep saying “someday” about: what it looks like, why it matters, and a first tiny step.', 'Dat ding waarover we altijd “ooit” zeggen: hoe het eruitziet, waarom het telt en een eerste kleine stap.'),
    prompts: [
      beat('Someday', 'Ooit', 'What have you always wanted us to do together that we keep putting off?', 'Wat wilde je altijd al samen doen, maar blijven we uitstellen?', 'Big or small. The northern lights, or finally that cooking class.', 'Groot of klein. Het noorderlicht, of eindelijk die kookles.'),
      beat('Picture it', 'Zie het voor je', 'Picture us actually doing it. What’s one tiny detail you can see?', 'Stel je voor dat we het echt doen. Welk klein detail zie je?', 'What we’re wearing, the weather, the first thing one of us says.', 'Wat we aanhebben, het weer, het eerste wat een van ons zegt.'),
      beat('Why with me', 'Waarom met mij', 'Why does it matter to you to do this with me?', 'Waarom is het belangrijk voor je om dit met mij te doen?', 'Take your time on this one.', 'Neem hier gerust je tijd voor.'),
      beat('What’s stopping us', 'Wat ons tegenhoudt', 'What’s really been stopping us so far?', 'Wat heeft ons tot nu toe echt tegengehouden?', 'Money, time, nerves, or just life getting in the way?', 'Geld, tijd, zenuwen, of gewoon het leven dat ertussen komt?'),
      beat('One tiny step', 'Eén klein stapje', 'What’s the smallest first step we could take this month?', 'Wat is de kleinste eerste stap die we deze maand kunnen zetten?', 'Look up a date, put a little money aside, just talk about it again. No promises needed.', 'Een datum opzoeken, wat geld opzij zetten, er gewoon nog eens over praten. Beloven hoeft niet.'),
    ],
    closing: pair('What do you want to remember about this dream of ours?', 'Wat wil je onthouden over deze droom van ons?'),
  },
  C03: {
    about: pair('One recent moment that was just good: what made it work, and how to get a little more of it.', 'Eén recent moment dat gewoon goed was: waardoor het werkte en hoe we er wat meer van krijgen.'),
    prompts: [
      beat('Rewind', 'Terugspoelen', 'Which recent moment with me would you happily relive right now?', 'Welk recent moment met mij zou je nu meteen opnieuw willen beleven?', 'It can be really ordinary. Last Sunday counts.', 'Het mag heel gewoon zijn. Vorige zondag telt ook.'),
      beat('Zoom in', 'Inzoomen', 'What made it so good? Zoom in on the little things.', 'Waardoor was het zo fijn? Zoom eens in op de kleine dingen.', 'The light, the food, something we said, something we didn’t have to do.', 'Het licht, het eten, iets wat we zeiden, iets wat even niet moest.'),
      beat('Your guess', 'Jouw gok', 'Take a guess: which part of that moment did I enjoy most?', 'Doe eens een gok: van welk stukje van dat moment genoot ik het meest?', 'Then I’ll tell you if you’re right.', 'Dan zeg ik je of je gelijk hebt.'),
      beat('Making room', 'Ruimte maken', 'What could we do a little less of to get more moments like that?', 'Waar zouden we wat minder van kunnen doen om meer van zulke momenten te hebben?', 'One less thing, not a life overhaul.', 'Eén ding minder, geen heel nieuw leven.'),
      beat('Once more', 'Nog een keer', 'How could we have a little of that again this week?', 'Hoe kunnen we daar deze week nog eens een beetje van hebben?', 'Just once. No schedule needed.', 'Gewoon één keer. Geen planning nodig.'),
    ],
    closing: pair('Which little thing from that moment do you want to hold on to?', 'Welk klein ding van dat moment wil je vasthouden?'),
  },
  C04: {
    about: pair('Something you’d secretly love to try with me, being terrible at it together, and an easy first go.', 'Iets wat je stiekem graag met mij zou proberen, er samen slecht in zijn, en een makkelijke eerste poging.'),
    prompts: [
      beat('Secretly curious', 'Stiekem nieuwsgierig', 'What’s something you’d secretly love to try with me?', 'Wat zou je stiekem graag eens met mij proberen?', 'A dish, a sport, a weird class, a place we’ve never been.', 'Een gerecht, een sport, een rare cursus, een plek waar we nooit geweest zijn.'),
      beat('The first five minutes', 'De eerste vijf minuten', 'Imagine the first five minutes of doing it. What are you most excited about?', 'Stel je de eerste vijf minuten voor. Waar kijk je het meest naar uit?', 'Or what makes you a little nervous?', 'Of waar word je een beetje zenuwachtig van?'),
      beat('Total beginners', 'Totale beginners', 'We’re both complete beginners. Honestly, who’s going to be worse at it?', 'We zijn allebei complete beginners. Eerlijk: wie gaat er het slechtst in zijn?', 'And how do we make sure we end up laughing, not annoyed?', 'En hoe zorgen we ervoor dat we erom lachen in plaats van geïrriteerd raken?'),
      beat('Fun for both', 'Leuk voor ons allebei', 'How could we make it fun for both of us, not just one?', 'Hoe maken we het leuk voor ons allebei, niet alleen voor één van ons?', 'Change the pace, the place, or how much of it we do.', 'Pas het tempo aan, de plek, of hoeveel we ervan doen.'),
      beat('Just try it', 'Gewoon proberen', 'What’s the easiest way we could try it once?', 'Wat is de makkelijkste manier om het één keer te proberen?', 'One go. Then we see how it feels.', 'Eén poging. Daarna zien we wel hoe het voelt.'),
    ],
    closing: pair('Which new thing do you want to remember to try with me?', 'Welk nieuw ding wil je onthouden om met mij te proberen?'),
  },
  C05: {
    about: pair('When you feel most at home with me, what already makes it feel that way, and one small thing to add.', 'Wanneer je je het meest thuis voelt bij mij, wat dat gevoel nu al geeft en één klein ding om toe te voegen.'),
    prompts: [
      beat('At home with me', 'Thuis bij mij', 'When do you feel most at home with me? Describe that moment.', 'Wanneer voel jij je het meest thuis bij mij? Beschrijf dat moment eens.', 'It doesn’t have to be a house. In the car, on a walk, in bed on a Sunday…', 'Het hoeft geen huis te zijn. In de auto, op een wandeling, op zondag in bed…'),
      beat('Already here', 'Er al', 'What in our life right now already feels like home to you?', 'Wat in ons leven voelt nu al als thuis voor jou?', 'Coffee in the morning, a blanket, the way I say hi when you walk in.', 'Koffie ’s ochtends, een dekentje, hoe ik hallo zeg als je binnenkomt.'),
      beat('A little more', 'Een beetje meer', 'What would you love a little more of where we live?', 'Waar zou je graag wat meer van willen waar we wonen?', 'More calm, more friends over, more music, a corner just for you?', 'Meer rust, meer vrienden over de vloer, meer muziek, een hoekje voor jou alleen?'),
      beat('Your cosy, my cosy', 'Jouw gezellig, mijn gezellig', 'Where do our ideas of cosy differ?', 'Waar verschillen onze ideeën over gezellig?', 'Window open or closed, tidy or lived-in… both are allowed.', 'Raam open of dicht, opgeruimd of geleefd… allebei mag.'),
      beat('One small change', 'Eén kleine verandering', 'What’s one small thing we could change so home feels even more like us?', 'Wat is één klein ding dat we kunnen veranderen zodat thuis nog meer als ons voelt?', 'A habit or a gesture. No shopping required.', 'Een gewoonte of een gebaar. Shoppen hoeft niet.'),
    ],
    closing: pair('If home with me were one word, what would it be?', 'Als thuis bij mij één woord was, welk woord zou het zijn?'),
  },
};
