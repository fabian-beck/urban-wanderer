// Narration and slides of the demo video. Each cue is spoken from the moment the journey reaches it
// (journey.mjs, `say(key)`), usually together with the interaction it describes; the next cue waits
// until the previous one has ended. Slide texts follow the sections of the paper's application
// example.

export const SLIDES = {
	title: {
		title: 'Urban Wanderer',
		subtitle: 'Personal, adaptive assistance for exploring cities on foot'
	},
	preferences: { kicker: 'Part 1', title: 'Personalization Settings' },
	station: {
		kicker: 'Part 2 · A visit of Bamberg, Germany',
		title: 'Arrival at the Train Station'
	},
	oldTown: {
		kicker: 'Part 3 · A visit of Bamberg, Germany',
		title: 'Visiting the Historic Old Town'
	},
	erba: {
		kicker: 'Part 4 · A visit of Bamberg, Germany',
		title: 'Strolling through Park and Suburban Area'
	},
	walk: { kicker: 'Part 5', title: 'Looking Back on the Walk' },
	end: { title: 'Urban Wanderer', subtitle: 'Thanks for watching' }
};

export const NARRATION = {
	intro:
		'Urban Wanderer is an app prototype that provides assistance and context when navigating cities and urban spaces on foot. It uses artificial intelligence to offer content in a contextualized and personalized way that invites users to discover more.',
	front:
		'At the start, the app invites the user to set personal preferences and reminds them of the ones currently set.',
	preferencesInterests:
		'In the preferences dialogue, most importantly, users can set their interests, for instance whether they are particularly interested in architecture, history, or nature.',
	preferencesGuide:
		'Below, the familiarity with the place can be specified, as well as the guide character.',
	preferencesMore: 'Language settings and more technical options are also available.',

	stationIntro: 'Let us imagine a first-time visit to Bamberg, Germany, arriving by train.',
	walkIntro:
		'The app organizes a visit as a walk: it remembers the stops, the places visited, and the stories read, so that nothing is told twice.',
	motto:
		'Optionally, a walk can get a motto that steers the guide, for instance to tell about the people behind the places. Here, we leave it empty.',
	walkStart: 'Starting the walk, the app determines the current location.',
	loading:
		"The available content for the location is loaded from Wikipedia, Wikidata, and OpenStreetMap and analyzed regarding the user's preferences on the fly.",
	stationMap:
		'The results are then summarized, starting with a map-based representation. It displays the current location of the user within typical walking distance, showing different aspects of the city geography.',
	stationComment: 'Complementing the map, a comment characterizes the place in a short statement.',
	stationPlaces:
		'Then, places are listed that can be considered as being directly at the location of the user, followed by the surrounding areas, such as the city itself.',
	cityOpen: 'Opening the entry of the city reveals a picture and a short summary.',
	cityFacts: 'Below, a few data facts characterize the city.',
	stationStory:
		'Interested in the area around the station, the user opens the story view, which puts this stop in context.',
	stationMapAgain:
		'Heading for the old town, the map points toward the southwest, where relevant places and activities, such as restaurants and shops, are shown.',

	oldTownWalk:
		'After a walk through a commercial district, the user arrives at the Obere Brücke, the heart of the old town, and updates the location.',
	oldTownOverview:
		'Each update adds a stop to the walk. Map and comment show that this place is not only about the Old Town Hall but also about the river Regnitz flowing around it.',
	oldTownPlaces:
		"The highly rated places at this spot match the user's interests, such as geography, architecture, and history.",
	detailsOpen: 'Clicking on a place reveals further details.',
	detailsSummary:
		'A picture is accompanied by a short textual description, which can be expanded on demand.',
	detailsRating:
		'Below, the rating is explained, with up to two stars derived from the personal preferences of the user, based on matching user interests with assigned categories of the place.',
	detailsFacts:
		'Below, data facts are shown for the place, some illustrated through background images.',
	historyOpen:
		'However, the location can also be characterized more holistically through a historic timeline that can be opened in another dialogue.',
	historyScroll:
		'The timeline can be scrolled, with vertical spacing visualizing the gaps between consecutive events. Individual places are highlighted and can be inspected also from this view.',
	storyOpen:
		'Moreover, a contextualization of the location is offered through a generated story, which can be either read or listened to.',
	storyMentions:
		'Places mentioned in the story are highlighted, and tapping one opens a short preview.',
	storyMore:
		'When reaching the end of the story, users can always decide to continue with additional content.',
	oldTownNearby:
		'When deciding where to go next, the user can browse through the list of nearby places, with distances and directions.',

	erbaWalk:
		'Walking along the river, the visitor reaches the ERBA island, an industrial site turned into a park and campus.',
	erbaOverview:
		'The map and comment already point at this character, showing water and green spaces.',
	erbaStory:
		'The story explains what the user sees around them, from old industrial buildings to the modern campus and the park landscape.',

	walkView:
		'Finally, the walk view lists the stops on a timeline, together with the places visited and the stories read.',
	walkRecap:
		'An AI-generated recap connects the highlights of the walk and points to places worth a return visit.'
};
