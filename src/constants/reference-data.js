export const FAMOUS_BUILDINGS = [
	// Small / Historic (<100m)
	{ name: 'Parthenon', shortName: 'Parthenon (GR)', height: 14, image: 'parthenon.png' },
	{
		name: 'Brandenburg Gate',
		shortName: 'Brandenburg (DE)',
		height: 26,
		image: 'brandenburg_gate.png'
	},
	{
		name: 'Arc de Triomphe',
		shortName: 'Arc Triomphe (FR)',
		height: 50,
		image: 'arc_de_triomphe.png'
	},
	{
		name: 'Leaning Tower of Pisa',
		shortName: 'Pisa Tower (IT)',
		height: 56,
		image: 'leaning_tower_of_pisa.png'
	},
	{
		name: 'Notre-Dame de Paris',
		shortName: 'Notre-Dame (FR)',
		height: 69,
		image: 'notre_dame_de_paris.png'
	},
	{
		name: 'Statue of Liberty',
		shortName: 'Statue Liberty (US)',
		height: 93,
		image: 'statue_of_liberty.png'
	}, // statue 46m, with pedestal 93m
	{ name: 'Big Ben', shortName: 'Big Ben (UK)', height: 96, image: 'big_ben.png' },

	// Medium (100–200m)
	{
		name: 'Florence Cathedral',
		shortName: 'Florence Cath. (IT)',
		height: 114,
		image: 'florence_cathedral.png'
	},
	{
		name: 'Cologne Cathedral',
		shortName: 'Cologne Cath. (DE)',
		height: 157,
		image: 'cologne_cathedral.png'
	},
	{
		name: 'Washington Monument',
		shortName: 'Washington Mem. (US)',
		height: 169,
		image: 'washington_monument.png'
	},
	{ name: 'Space Needle', shortName: 'Space Needle (US)', height: 184, image: 'space_needle.png' },

	// Tall (200–300m)
	{
		name: 'Marina Bay Sands',
		shortName: 'Marina Bay (SG)',
		height: 200,
		image: 'marina_bay_sands.png'
	},
	{
		name: 'Messeturm Frankfurt',
		shortName: 'Messeturm (DE)',
		height: 257,
		image: 'messeturm_frankfurt.png'
	},

	// Super-Tall (300m+)
	{ name: 'Eiffel Tower', shortName: 'Eiffel Tower (FR)', height: 330, image: 'eiffel_tower.png' },
	{
		name: 'Empire State Building',
		shortName: 'Empire State (US)',
		height: 443,
		image: 'empire_state_building.png'
	}, // 381m roof, 443m tip
	{ name: 'Taipei 101', shortName: 'Taipei 101 (TW)', height: 508, image: 'taipei_101.png' }, // 508m roof, 508m tip
	{ name: 'Burj Khalifa', shortName: 'Burj Khalifa (AE)', height: 828, image: 'burj_khalifa.png' }
];

export const HISTORICAL_EVENTS = [
	// Ancient & Medieval
	{ start: -753, name: { en: '🏛️ founding of Rome', de: '🏛️ Gründung Roms' } },
	{ start: -44, name: { en: '⚔️ assassination of Caesar', de: '⚔️ Ermordung Caesars' } },
	{
		start: 476,
		name: { en: '🏛️ fall of Western Roman Empire', de: '🏛️ Untergang des Weströmischen Reichs' }
	},
	{ start: 800, name: { en: '👑 Charlemagne coronation', de: '👑 Krönung Karls des Großen' } },
	{ start: 1066, name: { en: '⚔️ Norman Conquest', de: '⚔️ Normannische Eroberung' } },
	{ start: 1096, name: { en: '⛪ First Crusade', de: '⛪ Erster Kreuzzug' } },
	{ start: 1347, end: 1351, name: { en: '☠️ the Black Death', de: '☠️ der Schwarze Tod' } },
	{ start: 1453, name: { en: '🏰 fall of Constantinople', de: '🏰 Fall Konstantinopels' } },

	// Renaissance & Early Modern
	{ start: 1492, name: { en: '🌍 Columbus reaches Americas', de: '🌍 Kolumbus erreicht Amerika' } },
	{ start: 1517, name: { en: '⛪ Protestant Reformation', de: '⛪ Reformation' } },
	{ start: 1666, name: { en: '🔥 Great Fire of London', de: '🔥 Großer Brand von London' } },
	{ start: 1776, name: { en: '🇺🇸 US Independence', de: '🇺🇸 US-Unabhängigkeit' } },
	{
		start: 1789,
		end: 1799,
		name: { en: '🇫🇷 French Revolution', de: '🇫🇷 Französische Revolution' }
	},

	// Industrial Revolution & 19th Century
	{ start: 1815, name: { en: '⚔️ Battle of Waterloo', de: '⚔️ Schlacht bei Waterloo' } },
	{ start: 1837, name: { en: '📡 telegraph invention', de: '📡 Erfindung des Telegrafen' } },
	{
		start: 1859,
		name: { en: '🐒 Darwin Origin of Species', de: '🐒 Darwins „Über die Entstehung der Arten"' }
	},
	{ start: 1861, end: 1865, name: { en: '🇺🇸 Civil War', de: '🇺🇸 Amerikanischer Bürgerkrieg' } },
	{ start: 1876, name: { en: '☎️ telephone invention', de: '☎️ Erfindung des Telefons' } },
	{ start: 1886, name: { en: '🗽 Statue of Liberty', de: '🗽 Freiheitsstatue' } },

	// Early 20th Century
	{ start: 1903, name: { en: '✈️ first powered flight', de: '✈️ erster Motorflug' } },
	{ start: 1914, end: 1918, name: { en: '⚔️ World War I', de: '⚔️ Erster Weltkrieg' } },
	{ start: 1917, name: { en: '🚩 Russian Revolution', de: '🚩 Russische Revolution' } },
	{ start: 1929, name: { en: '📉 Wall Street Crash', de: '📉 Börsencrash' } },
	{ start: 1939, end: 1945, name: { en: '💥 World War II', de: '💥 Zweiter Weltkrieg' } },

	// Mid-Late 20th Century
	{ start: 1957, name: { en: '🚀 Sputnik launch', de: '🚀 Sputnik-Start' } },
	{ start: 1961, name: { en: '🧱 Berlin Wall constructed', de: '🧱 Bau der Berliner Mauer' } },
	{ start: 1963, name: { en: '🔫 JFK assassination', de: '🔫 Ermordung Kennedys' } },
	{ start: 1969, name: { en: '🌙 moon landing', de: '🌙 Mondlandung' } },
	{ start: 1989, name: { en: '🧱 Berlin Wall falls', de: '🧱 Mauerfall' } },
	{ start: 1991, name: { en: '🚩 Soviet Union collapse', de: '🚩 Zerfall der Sowjetunion' } },

	// Recent History
	{
		start: 2001,
		name: { en: '🏢 September 11 attacks', de: '🏢 Terroranschläge am 11. September' }
	},
	{ start: 2008, name: { en: '📉 financial crisis', de: '📉 Finanzkrise' } },
	{ start: 2020, name: { en: '🦠 COVID-19 pandemic', de: '🦠 COVID-19-Pandemie' } }
];
