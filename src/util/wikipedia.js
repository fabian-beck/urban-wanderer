import { extractInsightsFromArticle } from './ai.js';

export async function loadWikipediaPlaces(coordinates, preferences, nArticles) {
	if (!coordinates) {
		return;
	}
	const places = [];
	preferences.sourceLanguages?.forEach(async (lang) => {
		places.push(...(await wikipediaGeoSearchForPlaces(coordinates, lang, preferences.radius, nArticles)));
	});
	const searchAndAddPlace = async (title) => {
		if (title && !places.find((place) => place?.title === title)) {
			let place = await wikipediaNameSearchForPlace(title, coordinates, preferences.lang);
			if (!place) {
				return;
			}
			places.push(place);
		}
	};
	if (coordinates.town) {
		searchAndAddPlace(coordinates.town);
		if (coordinates.village) {
			searchAndAddPlace(`${coordinates.village} (${coordinates.town})`);
		}
		if (coordinates.suburb) {
			searchAndAddPlace(`${coordinates.suburb} (${coordinates.town})`);
		}
		if (coordinates.road) {
			searchAndAddPlace(`${coordinates.road} (${coordinates.town})`);
		}
	} else {
		searchAndAddPlace(coordinates.village);
	}
	console.log('Wikipedia places:', places);
	return places;
}

export async function loadWikipediaArticleTexts(places, lang, extractInsights = true) {
	await Promise.all(
		places.map(async (place) => {
			if (!place.pageid) {
				return;
			}
			const response = await fetch(
				`https://${place.lang || lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=revisions|pageprops&rvprop=content&rvslots=main&ppprop=wikibase_item`
			);
			const data = await response.json();
			const pageData = data.query.pages[place.pageid];
			place.article = pageData.revisions[0].slots.main['*'];

			// Extract WikiData ID if available
			if (pageData.pageprops?.wikibase_item) {
				place.wikidata = pageData.pageprops.wikibase_item;
				console.log(`📋 Found WikiData ID from Wikipedia: ${place.title} → ${place.wikidata}`);
			}
			// delete all wiki tables
			place.article = place.article.replace(/\{\|[\s\S]*?\|\}/g, '');
			place.article = place.article.replace(/\{\{[\s\S]*?\}\}/g, '');
			// delete all URLs
			place.article = place.article.replace(/\[http[^\]]*\]/g, '');
			// article still too long?
			if (place.article.length > 20000) {
				place.article = place.article.substring(0, 20000) + '...';
			}
			// extracts insights (only if requested)
			if (extractInsights) {
				place.insights = await extractInsightsFromArticle(place.article);
			}
		})
	);
}

export async function loadWikipediaExtracts(places, lang) {
	await Promise.all(
		places.map(async (place) => {
			if (!place.pageid && !place.wikipedia) {
				return;
			}
			let response;
			try {
				if (place.pageid) {
					response = await fetch(
						`https://${place.lang || lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=extracts&exintro=1&explaintext=1`
					);
				} else if (place.wikipedia) {
					// return if wikipedia link contains "#" (subheading) as the returned extract would not relate to the place
					if (place.wikipedia.includes('#')) {
						console.warn(
							`Not loading description as Wikipedia reference contains "#": ${place.wikipedia}`
						);
						return;
					}
					const placeLang = place.wikipedia.split(':')[0];
					const placeTitle = place.wikipedia.split(':')[1];
					response = await fetch(
						`https://${placeLang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&titles=${placeTitle}`
					);
				}
				if (!response.ok) {
					console.error(
						`Failed to fetch extract for place: ${place.title}. HTTP status: ${response.status}`
					);
					return;
				}
				const data = await response.json();
				const pageid = Object.keys(data.query.pages)[0];
				if (data.query.pages[pageid].missing) {
					console.warn(`Extract not found for place: ${place.title}`);
					return;
				}
				place.description = data.query.pages[pageid].extract;
			} catch (error) {
				console.error(`Error fetching extract for place: ${place.title}`, error);
			}
		})
	);
}

export async function loadWikipediaImageUrls(places, attribute, size, lang) {
	await Promise.all(
		places.map(async (place) => {
			let response;
			if (place.wikipedia) {
				if (place.wikipedia.includes('#')) {
					console.warn(
						`Not loading image (${attribute}) as Wikipedia reference contains "#": ${place.wikipedia}`
					);
					return;
				}
				const placeLang = place.wikipedia.split(':')[0];
				const placeTitle = place.wikipedia.split(':')[1];
				response = await fetch(
					`https://${placeLang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${placeTitle}&origin=*&pithumbsize=${size}`
				);
			} else if (place.pageid) {
				response = await fetch(
					`https://${place.lang || lang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=pageimages&pithumbsize=${size}`
				);
			}
			if (!response) {
				return;
			}
			const data = await response.json();
			const pageid = Object.keys(data.query.pages)[0];
			if (data.query.pages[pageid].thumbnail) {
				place[attribute] = data.query.pages[pageid].thumbnail?.source;
			} else {
				// load first image from wiki page
				const response2 = await fetch(
					`https://${place.lang || lang}.wikipedia.org/w/api.php?action=query&format=json&prop=images&pageids=${place.pageid}&origin=*`
				);
				const data2 = await response2.json();
				const images = data2.query.pages[place.pageid].images;
				if (images) {
					const firstImage = images[0].title;
					const response3 = await fetch(
						`https://${place.lang || lang}.wikipedia.org/w/api.php?action=query&format=json&titles=${firstImage}&origin=*&prop=imageinfo&iiprop=url&iiurlwidth=${size}`
					);
					const data3 = await response3.json();
					const imageinfo = Object.values(data3.query.pages)[0].imageinfo;
					if (imageinfo) {
						place[attribute] = imageinfo[0].url;
					}
				}
			}
		})
	);
}

export async function getRandomWikipediaPlaceCoordinates(lang) {
	while (true) {
		const response = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`);
		const data = await response.json();
		if (data.coordinates) {
			return { latitude: data.coordinates.lat, longitude: data.coordinates.lon };
		}
	}
}

export async function searchWikipediaPlaceCoordinates(placeName, lang) {
	
	// Search for the place on Wikipedia
	const searchResponse = await fetch(
		`https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(placeName)}&limit=5&format=json&origin=*`
	);
	const searchData = await searchResponse.json();
	
	if (!searchData[1] || searchData[1].length === 0) {
		throw new Error(`No Wikipedia articles found for "${placeName}"`);
	}
	
	// Try each search result until we find one with coordinates
	for (const title of searchData[1]) {
		try {
			// Get page info including coordinates
			const pageResponse = await fetch(
				`https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=coordinates|extracts&exintro=1&explaintext=1&exlimit=1&format=json&origin=*`
			);
			const pageData = await pageResponse.json();
			
			const pages = pageData.query.pages;
			const pageId = Object.keys(pages)[0];
			const page = pages[pageId];
			
			// Check if this page has coordinates
			if (page.coordinates && page.coordinates.length > 0) {
				const coords = page.coordinates[0];
				console.log(`Found coordinates for "${title}":`, coords);
				return { 
					latitude: coords.lat, 
					longitude: coords.lon,
					title: title,
					description: page.extract
				};
			}
		} catch (error) {
			console.warn(`Error checking coordinates for "${title}":`, error);
			continue;
		}
	}
	
	throw new Error(`No geographic coordinates found for "${placeName}"`);
}

async function wikipediaGeoSearchForPlaces(coordinates, lang, radius, nArticles) {
	const response = await fetch(
		`https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${coordinates.latitude}|${coordinates.longitude}&gsradius=${radius}&gslimit=${nArticles}&format=json&origin=*`
	);
	const data = await response.json();
	data.query.geosearch.forEach((place) => {
		// remove brackets from titles
		place.title = place.title.replace(/\s*\(.*?\)\s*/g, '');
		// remove text after comma
		place.title = place.title.split(',')[0];
		place.lang = lang;
	});
	console.log('Wikipedia geosearch response:', data);
	return data.query.geosearch;
}

async function wikipediaNameSearchForPlace(name, coordinates, lang) {
	const response2 = await fetch(
		`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${name}&srlimit=1&format=json&origin=*`
	);
	const data2 = await response2.json();
	// for each search result, check if it has geocoordinates and is close to $coordinates
	for (const searchResult of data2.query.search) {
		// get geocoordinates through pageid
		const response3 = await fetch(
			`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates&pageids=${searchResult.pageid}&origin=*`
		);
		const data3 = await response3.json();
		const pageid = Object.keys(data3.query.pages)[0];
		const page = data3.query.pages[pageid];

		// Skip if page has no coordinates
		if (!page.coordinates || page.coordinates.length === 0) {
			continue;
		}

		const coords = page.coordinates[0];
		// calculate distance
		const distance =
			Math.sqrt(
				Math.pow(coords.lat - coordinates.latitude, 2) +
					Math.pow(coords.lon - coordinates.longitude, 2)
			) * 111139; // convert degrees to meters
		// if close enough, return place
		if (distance < 10000) {
			searchResult.title = searchResult.title.replace(/\s*\(.*?\)\s*/g, '');
			searchResult.title = searchResult.title.split(',')[0];
			if (
				name.toLowerCase().includes(searchResult.title.toLowerCase()) ||
				searchResult.title.toLowerCase().includes(name.toLowerCase())
			) {
				console.log('Wikipedia name search response:', [name, searchResult]);
				return searchResult;
			}
		}
	}
	console.warn(`Could not find Wikipedia article for ${name}.`);
	return;
}