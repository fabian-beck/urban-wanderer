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

	// More Religious Events
	{ start: 313, name: { en: '✝️ Edict of Milan', de: '✝️ Mailänder Toleranzedikt' }, labels: ['RELIGION', 'HISTORY'] },
	{ start: 325, name: { en: '⛪ Council of Nicaea', de: '⛪ Konzil von Nicäa' }, labels: ['RELIGION', 'HISTORY'] },
	{ start: 622, name: { en: '☪️ Islamic Hijra', de: '☪️ Islamische Hidschra' }, labels: ['RELIGION', 'HISTORY'] },
	{ start: 1054, name: { en: '⛪ Great Schism', de: '⛪ Großes Schisma' }, labels: ['RELIGION', 'HISTORY'] },
	{ start: 1187, name: { en: '🏰 Saladin captures Jerusalem', de: '🏰 Saladin erobert Jerusalem' }, labels: ['RELIGION', 'HISTORY'] },
	{ start: 1378, end: 1417, name: { en: '⛪ Western Schism', de: '⛪ Abendländisches Schisma' }, labels: ['RELIGION', 'HISTORY'] },
	{ start: 1534, name: { en: '👑 Act of Supremacy England', de: '👑 Suprematsakte England' }, labels: ['RELIGION', 'HISTORY'] },
	{ start: 1545, end: 1563, name: { en: '⛪ Council of Trent', de: '⛪ Konzil von Trient' }, labels: ['RELIGION', 'HISTORY'] },
	{ start: 1598, name: { en: '📜 Edict of Nantes', de: '📜 Edikt von Nantes' }, labels: ['RELIGION', 'HISTORY'] },
	{ start: 1648, name: { en: '📜 Peace of Westphalia', de: '📜 Westfälischer Friede' }, labels: ['RELIGION', 'HISTORY'] },
	{ start: 1962, end: 1965, name: { en: '⛪ Second Vatican Council', de: '⛪ Zweites Vatikanisches Konzil' }, labels: ['RELIGION', 'HISTORY'] },

	// More Architecture Events
	{ start: -2560, name: { en: '🔺 Great Pyramid built', de: '🔺 Große Pyramide erbaut' }, labels: ['ARCHITECTURE', 'HISTORY'] },
	{ start: -447, name: { en: '🏛️ Parthenon completed', de: '🏛️ Parthenon vollendet' }, labels: ['ARCHITECTURE', 'HISTORY'] },
	{ start: 80, name: { en: '🏛️ Colosseum completed', de: '🏛️ Kolosseum vollendet' }, labels: ['ARCHITECTURE', 'HISTORY'] },
	{ start: 532, name: { en: '⛪ Hagia Sophia begun', de: '⛪ Hagia Sophia begonnen' }, labels: ['ARCHITECTURE', 'RELIGION', 'HISTORY'] },
	{ start: 1163, name: { en: '⛪ Notre-Dame construction begins', de: '⛪ Notre-Dame Baubeginn' }, labels: ['ARCHITECTURE', 'RELIGION', 'HISTORY'] },
	{ start: 1248, name: { en: '⛪ Cologne Cathedral begun', de: '⛪ Kölner Dom begonnen' }, labels: ['ARCHITECTURE', 'RELIGION', 'HISTORY'] },
	{ start: 1506, name: { en: '⛪ St. Peter\'s Basilica begun', de: '⛪ Petersdom begonnen' }, labels: ['ARCHITECTURE', 'RELIGION', 'HISTORY'] },
	{ start: 1792, name: { en: '🏛️ White House cornerstone', de: '🏛️ Grundstein Weißes Haus' }, labels: ['ARCHITECTURE', 'HISTORY'] },
	{ start: 1883, name: { en: '🌉 Brooklyn Bridge opens', de: '🌉 Brooklyn Bridge eröffnet' }, labels: ['ARCHITECTURE', 'TRANSPORTATION', 'HISTORY'] },
	{ start: 1930, name: { en: '🏢 Chrysler Building completed', de: '🏢 Chrysler Building vollendet' }, labels: ['ARCHITECTURE', 'HISTORY'] },
	{ start: 1931, name: { en: '🏢 Empire State Building completed', de: '🏢 Empire State Building vollendet' }, labels: ['ARCHITECTURE', 'HISTORY'] },
	{ start: 1973, name: { en: '🏢 Sydney Opera House opens', de: '🏢 Opernhaus Sydney eröffnet' }, labels: ['ARCHITECTURE', 'CULTURE', 'HISTORY'] },

	// More Educational Events  
	{ start: 1088, name: { en: '🎓 University of Bologna founded', de: '🎓 Universität Bologna gegründet' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1150, name: { en: '🎓 University of Paris founded', de: '🎓 Universität Paris gegründet' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1209, name: { en: '🎓 Cambridge University founded', de: '🎓 Universität Cambridge gegründet' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1348, name: { en: '🎓 Charles University Prague founded', de: '🎓 Karls-Universität Prag gegründet' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1386, name: { en: '🎓 Heidelberg University founded', de: '🎓 Universität Heidelberg gegründet' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1543, name: { en: '🌍 Copernicus heliocentric theory', de: '🌍 Kopernikus heliozentrisches Weltbild' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1642, name: { en: '🍎 Newton born', de: '🍎 Newton geboren' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1751, name: { en: '📚 Encyclopédie published', de: '📚 Encyclopédie veröffentlicht' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1810, name: { en: '🎓 Humboldt University Berlin', de: '🎓 Humboldt-Universität Berlin' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1837, name: { en: '🎓 Mount Holyoke College', de: '🎓 Mount Holyoke College' }, labels: ['EDUCATION', 'HISTORY'] },
	{ start: 1945, name: { en: '🌍 UNESCO founded', de: '🌍 UNESCO gegründet' }, labels: ['EDUCATION', 'CULTURE', 'HISTORY'] },

	// More Sports Events
	{ start: 1857, name: { en: '⚽ Sheffield FC founded', de: '⚽ Sheffield FC gegründet' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1877, name: { en: '🎾 Wimbledon first championship', de: '🎾 Wimbledon erste Meisterschaft' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1892, name: { en: '🏀 first basketball game', de: '🏀 erstes Basketball-Spiel' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1903, name: { en: '🏁 Tour de France first race', de: '🏁 Tour de France erstes Rennen' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1924, name: { en: '🥇 first Winter Olympics', de: '🥇 erste Winterolympiade' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1958, name: { en: '⚽ Brazil wins World Cup', de: '⚽ Brasilien gewinnt WM' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1967, name: { en: '🏈 Super Bowl I', de: '🏈 erster Super Bowl' }, labels: ['SPORTS', 'HISTORY'] },
	{ start: 1972, name: { en: '♟️ Fischer vs Spassky', de: '♟️ Fischer gegen Spassky' }, labels: ['SPORTS', 'HISTORY'] },

	// More Nature & Geography Events
	{ start: 1871, name: { en: '🌲 first national park law', de: '🌲 erstes Nationalpark-Gesetz' }, labels: ['NATURE', 'HISTORY'] },
	{ start: 1916, name: { en: '🦅 National Park Service created', de: '🦅 Nationalpark-Service gegründet' }, labels: ['NATURE', 'HISTORY'] },
	{ start: 1962, name: { en: '🐦 Silent Spring published', de: '🐦 Stummer Frühling veröffentlicht' }, labels: ['NATURE', 'HISTORY'] },
	{ start: 1971, name: { en: '🌿 Greenpeace founded', de: '🌿 Greenpeace gegründet' }, labels: ['NATURE', 'HISTORY'] },
	{ start: 1973, name: { en: '🐾 Endangered Species Act', de: '🐾 Artenschutzgesetz' }, labels: ['NATURE', 'HISTORY'] },
	{ start: 1992, name: { en: '🌍 Rio Earth Summit', de: '🌍 Rio-Erdgipfel' }, labels: ['NATURE', 'GEOGRAPHY', 'HISTORY'] },
	{ start: 1997, name: { en: '🌡️ Kyoto Protocol', de: '🌡️ Kyoto-Protokoll' }, labels: ['NATURE', 'HISTORY'] },
	{ start: 2015, name: { en: '🌡️ Paris Climate Agreement', de: '🌡️ Pariser Klimaabkommen' }, labels: ['NATURE', 'HISTORY'] },

	// More Transportation Events
	{ start: 1807, name: { en: '⛵ first steamboat service', de: '⛵ erster Dampfschiff-Service' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1814, name: { en: '🚂 first steam locomotive', de: '🚂 erste Dampflokomotive' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1839, name: { en: '🚲 first bicycle', de: '🚲 erstes Fahrrad' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1863, name: { en: '🚇 London Underground opens', de: '🚇 Londoner U-Bahn eröffnet' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1886, name: { en: '🚗 Mercedes-Benz first car', de: '🚗 Mercedes-Benz erstes Auto' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1900, name: { en: '🚁 first helicopter flight', de: '🚁 erster Hubschrauberflug' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1935, name: { en: '🛣️ first Autobahn opens', de: '🛣️ erste Autobahn eröffnet' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1957, name: { en: '✈️ jet age begins', de: '✈️ Jet-Zeitalter beginnt' }, labels: ['TRANSPORTATION', 'HISTORY'] },
	{ start: 1981, name: { en: '🚄 TGV high-speed rail', de: '🚄 TGV Hochgeschwindigkeitsbahn' }, labels: ['TRANSPORTATION', 'HISTORY'] },

	// More Culture Events  
	{ start: 1605, name: { en: '🎭 King Lear first performed', de: '🎭 König Lear uraufgeführt' }, labels: ['CULTURE', 'HISTORY'] },
	{ start: 1725, name: { en: '🎵 Bach Brandenburg Concertos', de: '🎵 Bach Brandenburgische Konzerte' }, labels: ['CULTURE', 'HISTORY'] },
	{ start: 1784, name: { en: '🎵 Mozart Marriage of Figaro', de: '🎵 Mozart Figaros Hochzeit' }, labels: ['CULTURE', 'HISTORY'] },
	{ start: 1874, name: { en: '🎨 first Impressionist exhibition', de: '🎨 erste Impressionisten-Ausstellung' }, labels: ['CULTURE', 'HISTORY'] },
	{ start: 1913, name: { en: '🎵 Rite of Spring premiere', de: '🎵 Sacre du printemps Uraufführung' }, labels: ['CULTURE', 'HISTORY'] },
	{ start: 1929, name: { en: '🏛️ Museum of Modern Art opens', de: '🏛️ Museum of Modern Art eröffnet' }, labels: ['CULTURE', 'HISTORY'] },
	{ start: 1959, name: { en: '🎵 Guggenheim Museum opens', de: '🎵 Guggenheim Museum eröffnet' }, labels: ['CULTURE', 'ARCHITECTURE', 'HISTORY'] },
	{ start: 1977, name: { en: '🎪 Pompidou Centre opens', de: '🎪 Centre Pompidou eröffnet' }, labels: ['CULTURE', 'ARCHITECTURE', 'HISTORY'] },

	// More Activities/Entertainment Events
	{ start: 1901, name: { en: '🎪 first movie theater', de: '🎪 erstes Kino' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },
	{ start: 1920, name: { en: '📻 first radio broadcast', de: '📻 erste Radiosendung' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },
	{ start: 1948, name: { en: '📺 television boom begins', de: '📺 Fernsehen-Boom beginnt' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },
	{ start: 1958, name: { en: '🎮 first video game', de: '🎮 erstes Videospiel' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },
	{ start: 1971, name: { en: '🎮 first arcade game', de: '🎮 erstes Arcade-Spiel' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },
	{ start: 1975, name: { en: '🎬 Jaws creates blockbuster', de: '🎬 Der weiße Hai schafft Blockbuster' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },
	{ start: 1981, name: { en: '🎵 MTV Music Television', de: '🎵 MTV Music Television' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },
	{ start: 2005, name: { en: '📱 YouTube founded', de: '📱 YouTube gegründet' }, labels: ['ACTIVITIES', 'CULTURE', 'HISTORY'] },

	// Recent History
	{
		start: 2001,
		name: { en: '🏢 September 11 attacks', de: '🏢 Terroranschläge am 11. September' },
		labels: ['HISTORY', 'ARCHITECTURE']
	},
	{ start: 2008, name: { en: '📉 financial crisis', de: '📉 Finanzkrise' }, labels: ['HISTORY'] },
	{ start: 2020, name: { en: '🦠 COVID-19 pandemic', de: '🦠 COVID-19-Pandemie' }, labels: ['HISTORY'] }
];
