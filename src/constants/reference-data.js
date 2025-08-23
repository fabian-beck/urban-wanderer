export const HISTORICAL_EVENTS = [
	// Ancient & Medieval
	{ start: -753, name: { en: '🏛️ founding of Rome', de: '🏛️ Gründung Roms' }, labels: ['HISTORY', 'ARCHITECTURE'] },
	{ start: -44, name: { en: '⚔️ assassination of Caesar', de: '⚔️ Ermordung Caesars' }, labels: ['HISTORY'] },
	{
		start: 476,
		name: { en: '🏛️ fall of Western Roman Empire', de: '🏛️ Untergang des Weströmischen Reichs' },
		labels: ['HISTORY', 'ARCHITECTURE']
	},
	{ start: 800, name: { en: '👑 Charlemagne coronation', de: '👑 Krönung Karls des Großen' }, labels: ['HISTORY', 'RELIGION'] },
	{ start: 1066, name: { en: '⚔️ Norman Conquest', de: '⚔️ Normannische Eroberung' }, labels: ['HISTORY'] },
	{ start: 1096, name: { en: '⛪ First Crusade', de: '⛪ Erster Kreuzzug' }, labels: ['HISTORY', 'RELIGION'] },
	{ start: 1347, end: 1351, name: { en: '☠️ the Black Death', de: '☠️ der Schwarze Tod' }, labels: ['HISTORY'] },
	{ start: 1453, name: { en: '🏰 fall of Constantinople', de: '🏰 Fall Konstantinopels' }, labels: ['HISTORY', 'ARCHITECTURE', 'RELIGION'] },

	// Renaissance & Early Modern
	{ start: 1492, name: { en: '🌍 Columbus reaches Americas', de: '🌍 Kolumbus erreicht Amerika' }, labels: ['HISTORY', 'GEOGRAPHY'] },
	{ start: 1517, name: { en: '⛪ Luther posts 95 Theses', de: '⛪ Luther schlägt 95 Thesen an' }, labels: ['HISTORY', 'RELIGION'] },
	{ start: 1666, name: { en: '🔥 Great Fire of London', de: '🔥 Großer Brand von London' }, labels: ['HISTORY', 'ARCHITECTURE'] },
	{ start: 1776, name: { en: '🇺🇸 US Independence', de: '🇺🇸 US-Unabhängigkeit' }, labels: ['HISTORY'] },
	{
		start: 1789,
		end: 1799,
		name: { en: '🇫🇷 French Revolution', de: '🇫🇷 Französische Revolution' },
		labels: ['HISTORY']
	},

	// Industrial Revolution & 19th Century
	{ start: 1815, name: { en: '⚔️ Battle of Waterloo', de: '⚔️ Schlacht bei Waterloo' }, labels: ['HISTORY'] },
	{ start: 1837, name: { en: '📡 Morse telegraph patented', de: '📡 Morse-Telegraf patentiert' }, labels: ['HISTORY', 'TRANSPORTATION'] },
	{
		start: 1859,
		name: { en: '🐒 Darwin Origin of Species', de: '🐒 Darwins „Über die Entstehung der Arten"' },
		labels: ['HISTORY', 'EDUCATION']
	},
	{ start: 1869, name: { en: '🇪🇬 Suez Canal opens', de: '🇪🇬 Suezkanal eröffnet' }, labels: ['HISTORY', 'TRANSPORTATION', 'GEOGRAPHY'] },
	{ start: 1876, name: { en: '☎️ Bell patents telephone', de: '☎️ Bell patentiert Telefon' }, labels: ['HISTORY'] },
	{ start: 1886, name: { en: '🗽 Statue of Liberty', de: '🗽 Freiheitsstatue' }, labels: ['HISTORY', 'ARCHITECTURE'] },

	// Early 20th Century
	{ start: 1903, name: { en: '✈️ first powered flight', de: '✈️ erster Motorflug' }, labels: ['HISTORY', 'TRANSPORTATION'] },
	{ start: 1914, end: 1918, name: { en: '⚔️ World War I', de: '⚔️ Erster Weltkrieg' }, labels: ['HISTORY'] },
	{ start: 1917, name: { en: '🚩 Russian Revolution', de: '🚩 Russische Revolution' }, labels: ['HISTORY'] },
	{ start: 1929, name: { en: '📉 Wall Street Crash', de: '📉 Börsencrash' }, labels: ['HISTORY'] },
	{ start: 1939, end: 1945, name: { en: '💥 World War II', de: '💥 Zweiter Weltkrieg' }, labels: ['HISTORY'] },

	// Mid-Late 20th Century
	{ start: 1957, name: { en: '🚀 Sputnik launch', de: '🚀 Sputnik-Start' }, labels: ['HISTORY', 'EDUCATION'] },
	{ start: 1961, name: { en: '🧱 Berlin Wall constructed', de: '🧱 Bau der Berliner Mauer' }, labels: ['HISTORY', 'ARCHITECTURE'] },
	{ start: 1963, name: { en: '🔫 JFK assassination', de: '🔫 Ermordung Kennedys' }, labels: ['HISTORY'] },
	{ start: 1969, name: { en: '🌙 moon landing', de: '🌙 Mondlandung' }, labels: ['HISTORY', 'EDUCATION'] },
	{ start: 1989, name: { en: '🧱 Berlin Wall falls', de: '🧱 Mauerfall' }, labels: ['HISTORY', 'ARCHITECTURE'] },
	{ start: 1991, name: { en: '🚩 Soviet Union collapse', de: '🚩 Zerfall der Sowjetunion' }, labels: ['HISTORY'] },

	// Cultural & Arts Events
	{ start: 1503, end: 1519, name: { en: '🎨 Mona Lisa painted', de: '🎨 Mona Lisa gemalt' }, labels: ['CULTURE', 'HISTORY'] },
	{ start: 1595, name: { en: '🎭 Romeo and Juliet first performed', de: '🎭 Romeo und Julia uraufgeführt' }, labels: ['CULTURE', 'HISTORY'] },
	{ start: 1770, name: { en: '🎵 Beethoven born', de: '🎵 Beethoven geboren' }, labels: ['CULTURE', 'HISTORY'] },
	{ start: 1889, name: { en: '🗼 Eiffel Tower completed', de: '🗼 Eiffelturm fertiggestellt' }, labels: ['ARCHITECTURE', 'CULTURE', 'HISTORY'] },
	{ start: 1937, name: { en: '🎨 Guernica painted', de: '🎨 Guernica gemalt' }, labels: ['CULTURE', 'HISTORY'] },

	// Sports History
	{ start: -776, name: { en: '🏃 first Olympic Games', de: '🏃 erste Olympische Spiele' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1863, name: { en: '⚽ Football Association founded', de: '⚽ Fußballverband gegründet' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1891, name: { en: '🏀 basketball invented', de: '🏀 Basketball erfunden' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1896, name: { en: '🏃 modern Olympics begin', de: '🏃 moderne Olympische Spiele beginnen' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1930, name: { en: '⚽ first FIFA World Cup', de: '⚽ erste FIFA-Weltmeisterschaft' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1954, name: { en: '🏔️ Mount Everest first climbed', de: '🏔️ Mount Everest erstmals bestiegen' }, labels: ['SPORTS', 'NATURE', 'HISTORY'] },

	// Educational Milestones
	{ start: 1440, name: { en: '📚 Gutenberg Bible printed', de: '📚 Gutenberg-Bibel gedruckt' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 859, name: { en: '📖 University of al-Qarawiyyin founded', de: '📖 Universität al-Qarawiyyin gegründet' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1687, name: { en: '🍎 Newton Principia published', de: '🍎 Newtons Principia veröffentlicht' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1991, name: { en: '🌐 World Wide Web goes public', de: '🌐 World Wide Web wird öffentlich' }, labels: ['EDUCATION', 'HISTORY'] },

	// Nature & Geography
	{ start: 1972, name: { en: '🌍 UN Conference on Human Environment', de: '🌍 UN-Umweltkonferenz Stockholm' }, labels: ['NATURE', 'GEOGRAPHY', 'HISTORY'] },
	{ start: 1970, name: { en: '🌍 first Earth Day', de: '🌍 erster Earth Day' }, labels: ['NATURE', 'HISTORY'] },
	{ start: 1987, name: { en: '🌿 Montreal Protocol signed', de: '🌿 Montrealer Protokoll unterzeichnet' }, labels: ['NATURE', 'HISTORY'] },

	// Transportation Milestones
	{ start: 1825, name: { en: '🚂 Stockton-Darlington Railway opens', de: '🚂 Stockton-Darlington-Eisenbahn eröffnet' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1964, name: { en: '🚄 Shinkansen begins service', de: '🚄 Shinkansen Betrieb beginnt' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1885, name: { en: '🚗 Benz Patent-Motorwagen', de: '🚗 Benz Patent-Motorwagen' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1969, name: { en: '✈️ Concorde first flight', de: '✈️ Concorde Erstflug' }, labels: ['TRANSPORTATION', 'HISTORY'] },

	// Activities & Entertainment
	{ start: 1895, name: { en: '🎬 Lumière brothers first screening', de: '🎬 Brüder Lumière erste Vorführung' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },
	{ start: 1936, name: { en: '📺 BBC Television Service starts', de: '📺 BBC Fernsehen startet' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },
	{ start: 1969, name: { en: '🎵 Woodstock Festival', de: '🎵 Woodstock Festival' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },
	{ start: 1985, name: { en: '🎮 Nintendo Famicom launches in US', de: '🎮 Nintendo Famicom in USA' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },

	// Global Modern Events
	{ start: 1947, name: { en: '🇮🇳 India independence', de: '🇮🇳 Indiens Unabhängigkeit' }, labels: ['HISTORY'] },
	{ start: 1948, name: { en: '🕊️ Universal Declaration of Human Rights', de: '🕊️ Allgemeine Erklärung der Menschenrechte' }, labels: ['HISTORY'] },
	{ start: 1960, name: { en: '🌍 17 African nations independence', de: '🌍 17 afrikanische Staaten unabhängig' }, labels: ['HISTORY', 'GEOGRAPHY'] },
	{ start: 1975, name: { en: '🇻🇳 Fall of Saigon', de: '🇻🇳 Fall von Saigon' }, labels: ['HISTORY'] },
	{ start: 1986, name: { en: '☢️ Chernobyl disaster', de: '☢️ Tschernobyl-Katastrophe' }, labels: ['HISTORY', 'NATURE'] },
	{ start: 1994, name: { en: '🇿🇦 End of Apartheid', de: '🇿🇦 Ende der Apartheid' }, labels: ['HISTORY'] },

	// Asian Cultural Events
	{ start: 1603, name: { en: '🏯 Edo period begins', de: '🏯 Edo-Zeit beginnt' }, labels: ['HISTORY', 'CULTURE', 'ARCHITECTURE'] },
	{ start: 1644, name: { en: '🐉 Qing Dynasty established', de: '🐉 Qing-Dynastie gegründet' }, labels: ['HISTORY', 'CULTURE'] },
	{ start: 1978, name: { en: '🇨🇳 Third Plenum reform decision', de: '🇨🇳 Drittes Plenum Reformbeschluss' }, labels: ['HISTORY'] },

	// Recent History
	{
		start: 2001,
		name: { en: '🏢 September 11 attacks', de: '🏢 Terroranschläge am 11. September' },
		labels: ['HISTORY', 'ARCHITECTURE']
	},
	{ start: 2008, name: { en: '📉 financial crisis', de: '📉 Finanzkrise' }, labels: ['HISTORY'] },
	{ start: 2020, name: { en: '🦠 COVID-19 pandemic', de: '🦠 COVID-19-Pandemie' }, labels: ['HISTORY'] }
];
