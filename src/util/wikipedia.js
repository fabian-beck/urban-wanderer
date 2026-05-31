import { MAX_ARTICLE_LENGTH } from '../constants/core.js';
import { withPerformance } from './performance.js';

const wikiJsonRequestCache = new Map();

async function fetchWikiJson(url, context, { cache = false } = {}) {
	if (cache && wikiJsonRequestCache.has(url)) {
		return wikiJsonRequestCache.get(url);
	}

	const request = (async () => {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				console.warn(`[wiki] ${context} failed with HTTP ${response.status}`);
				return null;
			}
			return await response.json();
		} catch (error) {
			console.warn(`[wiki] ${context} failed: ${error.message}`);
			return null;
		}
	})();

	if (cache) {
		wikiJsonRequestCache.set(url, request);
	}

	return request;
}

function chunkArray(items, size) {
	const chunks = [];
	for (let i = 0; i < items.length; i += size) {
		chunks.push(items.slice(i, i + size));
	}
	return chunks;
}

function normalizeWikiTitle(title) {
	return decodeURIComponent(String(title || ''))
		.replace(/_/g, ' ')
		.trim()
		.toLowerCase();
}

export async function loadWikipediaPlaces(coordinates, preferences, nArticles) {
	if (!coordinates) {
		return;
	}
	const places = [];
	// Use Promise.all to properly await all language searches
	const languageResults = await withPerformance(
		'wikipedia.geosearch.all',
		() =>
			Promise.all(
				preferences.sourceLanguages?.map((lang) =>
					wikipediaGeoSearchForPlaces(coordinates, lang, preferences.radius, nArticles)
				) || []
			),
		{
			languages: preferences.sourceLanguages,
			radius: preferences.radius,
			nArticles
		}
	);
	languageResults.forEach((result) => {
		if (result) {
			places.push(...result);
		}
	});
	const searchCandidates = [];
	if (coordinates.town) {
		searchCandidates.push(coordinates.town);
		if (coordinates.village) {
			searchCandidates.push(`${coordinates.village} (${coordinates.town})`);
		}
		if (coordinates.suburb) {
			searchCandidates.push(`${coordinates.suburb} (${coordinates.town})`);
		}
		if (coordinates.road) {
			searchCandidates.push(`${coordinates.road} (${coordinates.town})`);
		}
	} else if (coordinates.village) {
		searchCandidates.push(coordinates.village);
	}

	const searchPlaces = await withPerformance(
		'wikipedia.addressFallbackSearches',
		() =>
			Promise.all(
				searchCandidates.map(async (title) => {
					if (!title || places.find((place) => place?.title === title)) {
						return null;
					}
					const place = await withPerformance(
						'wikipedia.nameSearch',
						() => wikipediaNameSearchForPlace(title, coordinates, preferences.lang),
						{ title, lang: preferences.lang }
					);
					return { title, place };
				})
			),
		{
			town: coordinates.town,
			village: coordinates.village,
			suburb: coordinates.suburb,
			road: coordinates.road
		}
	);
	searchPlaces.forEach((result) => {
		if (result?.place && !places.find((place) => place?.title === result.title)) {
			places.push(result.place);
		}
	});
	console.log('Wikipedia places:', places);
	return places;
}

export async function loadWikipediaArticleTexts(places, lang) {
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
			// delete all references like: "[[File|Datei|Kategorie|...:...]]"
			place.article = place.article.replace(/\[\[[^\]]*:[^\]]*\]\]/g, '');
			// article still too long?
			if (place.article.length > MAX_ARTICLE_LENGTH) {
				place.article = place.article.substring(0, MAX_ARTICLE_LENGTH) + '...';
			}
		})
	);
}

export async function loadWikipediaExtracts(places, lang) {
	const pageidGroups = new Map();
	const titleGroups = new Map();

	for (const place of places) {
		if (place.pageid) {
			const placeLang = place.lang || lang;
			if (!pageidGroups.has(placeLang)) {
				pageidGroups.set(placeLang, []);
			}
			pageidGroups.get(placeLang).push({ place, pageid: String(place.pageid) });
			continue;
		}

		if (!place.wikipedia) {
			continue;
		}
		if (place.wikipedia.includes('#')) {
			console.warn(
				`Not loading description as Wikipedia reference contains "#": ${place.wikipedia}`
			);
			continue;
		}

		const separatorIndex = place.wikipedia.indexOf(':');
		if (separatorIndex === -1) {
			continue;
		}

		const placeLang = place.wikipedia.slice(0, separatorIndex);
		const placeTitle = place.wikipedia.slice(separatorIndex + 1);
		if (!titleGroups.has(placeLang)) {
			titleGroups.set(placeLang, []);
		}
		titleGroups.get(placeLang).push({ place, title: placeTitle });
	}

	const pageidRequests = Array.from(pageidGroups.entries()).flatMap(([placeLang, entries]) =>
		chunkArray(entries, 50).map(async (chunk) => {
			const pageids = chunk.map((entry) => entry.pageid).join('|');
			const data = await fetchWikiJson(
				`https://${placeLang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${pageids}&origin=*&prop=extracts&exintro=1&explaintext=1`,
				`extract pageids ${placeLang}`
			);
			if (!data?.query?.pages) {
				return;
			}
			for (const entry of chunk) {
				const page = data.query.pages[entry.pageid];
				if (!page || page.missing) {
					console.warn(`Extract not found for place: ${entry.place.title}`);
					continue;
				}
				entry.place.description = page.extract;
			}
		})
	);

	const titleRequests = Array.from(titleGroups.entries()).flatMap(([placeLang, entries]) =>
		chunkArray(entries, 50).map(async (chunk) => {
			const titles = chunk.map((entry) => encodeURIComponent(entry.title)).join('|');
			const data = await fetchWikiJson(
				`https://${placeLang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&titles=${titles}`,
				`extract titles ${placeLang}`
			);
			if (!data?.query?.pages) {
				return;
			}

			const normalizedTitles = new Map(
				(data.query.normalized || []).map((entry) => [
					normalizeWikiTitle(entry.from),
					normalizeWikiTitle(entry.to)
				])
			);
			const pagesByTitle = new Map(
				Object.values(data.query.pages).map((page) => [normalizeWikiTitle(page.title), page])
			);

			for (const entry of chunk) {
				const normalizedTitle =
					normalizedTitles.get(normalizeWikiTitle(entry.title)) || normalizeWikiTitle(entry.title);
				const page = pagesByTitle.get(normalizedTitle);
				if (!page || page.missing) {
					console.warn(`Extract not found for place: ${entry.place.title}`);
					continue;
				}
				entry.place.description = page.extract;
			}
		})
	);

	await Promise.all([...pageidRequests, ...titleRequests]);
}

async function selectBestImageForPlace(images, place, size, lang) {
	const placeTitle = place.title.toLowerCase();
	const excludedPrefixes = ['File:Pictogram', 'File:Icon', 'File:Logo', 'File:Disambig'];
	const excludedExtensions = ['.svg', '.djvu', '.pdf', '.ogv', '.webm'];

	const imageScores = await Promise.all(
		images
			.filter((img) => {
				const title = img.title;
				if (excludedPrefixes.some((prefix) => title.startsWith(prefix))) {
					return false;
				}
				if (excludedExtensions.some((ext) => title.toLowerCase().endsWith(ext))) {
					return false;
				}
				return true;
			})
			.slice(0, 5)
			.map(async (img) => {
				try {
					const data = await fetchWikiJson(
						`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(img.title)}&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${size}`,
						`image metadata ${img.title}`,
						{ cache: true }
					);
					if (!data?.query?.pages) {
						return null;
					}
					const page = Object.values(data.query.pages)[0];

					if (!page.imageinfo || page.imageinfo.length === 0) {
						return null;
					}

					const imageinfo = page.imageinfo[0];
					const extmetadata = imageinfo.extmetadata || {};

					let score = 0;
					const filename = img.title.replace('File:', '').replace(/\.(jpg|jpeg|png|gif)$/i, '');

					if (filename.toLowerCase().includes(placeTitle)) {
						score += 10;
					}

					const objectName = extmetadata.ObjectName?.value || '';
					const imageDesc = extmetadata.ImageDescription?.value || '';
					const categories = extmetadata.Categories?.value || '';

					const combinedText = `${objectName} ${imageDesc} ${categories}`.toLowerCase();

					if (combinedText.includes(placeTitle)) {
						score += 8;
					}

					const placeWords = placeTitle.split(' ').filter((w) => w.length > 3);
					const matchingWords = placeWords.filter((word) => combinedText.includes(word));
					score += matchingWords.length * 2;

					if (objectName.toLowerCase().includes('interior')) {
						score -= 3;
					}
					if (objectName.toLowerCase().includes('detail')) {
						score -= 2;
					}
					if (combinedText.includes('map') || combinedText.includes('diagram')) {
						score -= 5;
					}

					console.log(
						`Image scoring for ${place.title}: "${filename}" (ObjectName: "${objectName}") → score: ${score}`
					);

					const metadata = {
						source: imageinfo.descriptionurl,
						license: extmetadata.LicenseShortName?.value || extmetadata.License?.value,
						licenseUrl: extmetadata.LicenseUrl?.value,
						artist: extmetadata.Artist?.value || extmetadata.Credit?.value
					};

					return {
						url: imageinfo.thumburl || imageinfo.url,
						score: score,
						filename: filename,
						objectName: objectName,
						metadata: metadata
					};
				} catch (error) {
					console.warn(`[wiki] image metadata ${img.title} failed: ${error.message}`);
					return null;
				}
			})
	);

	const validImages = imageScores.filter((img) => img !== null && img.score > 0);

	if (validImages.length === 0) {
		console.log(`No suitable image found for ${place.title}`);
		return null;
	}

	validImages.sort((a, b) => b.score - a.score);
	const bestImage = validImages[0];

	console.log(
		`Selected best image for ${place.title}: "${bestImage.filename}" with score ${bestImage.score}`
	);

	return bestImage;
}

export async function loadWikipediaImageUrls(places, attribute, size, lang) {
	await Promise.all(
		places.map(async (place) => {
			try {
				let response;
				let imageLang = place.lang || lang;
				if (place.wikipedia) {
					const separatorIndex = place.wikipedia.indexOf(':');
					if (separatorIndex === -1) {
						return;
					}
					const placeLang = place.wikipedia.slice(0, separatorIndex);
					let placeTitle = place.wikipedia.slice(separatorIndex + 1);
					imageLang = placeLang;

					if (placeTitle.includes('#')) {
						placeTitle = placeTitle.split('#')[0];
						console.log(
							`Stripped anchor from Wikipedia reference for image loading: ${place.wikipedia} → ${placeLang}:${placeTitle}`
						);
					}

					response = await fetch(
						`https://${placeLang}.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&titles=${encodeURIComponent(placeTitle)}&origin=*&pithumbsize=${size}`
					);
				} else if (place.pageid) {
					response = await fetch(
						`https://${imageLang}.wikipedia.org/w/api.php?action=query&format=json&pageids=${place.pageid}&origin=*&prop=pageimages&pithumbsize=${size}`
					);
				}
				if (!response) {
					return;
				}
				if (!response.ok) {
					console.warn(
						`[wiki] ${attribute} pageimage for ${place.title} failed with HTTP ${response.status}`
					);
					return;
				}
				let data;
				try {
					data = await response.json();
				} catch (error) {
					console.warn(`[wiki] ${attribute} pageimage for ${place.title} failed: ${error.message}`);
					return;
				}
				const page = Object.values(data.query?.pages || {})[0];
				if (!page || page.missing) {
					return;
				}
				const pageid = page.pageid || place.pageid;
				if (page.thumbnail) {
					place[attribute] = page.thumbnail?.source;

					// Also fetch metadata for the primary image
					const pageimageTitle = page.pageimage;
					if (pageimageTitle) {
						try {
							const metadataData = await fetchWikiJson(
								`https://${imageLang}.wikipedia.org/w/api.php?action=query&format=json&titles=File:${encodeURIComponent(pageimageTitle)}&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${size}`,
								`pageimage metadata ${pageimageTitle}`,
								{ cache: true }
							);
							if (!metadataData?.query?.pages) {
								return;
							}
							const metadataPage = Object.values(metadataData.query.pages)[0];
							if (metadataPage.imageinfo && metadataPage.imageinfo.length > 0) {
								const imageinfo = metadataPage.imageinfo[0];
								const extmetadata = imageinfo.extmetadata || {};
								place.imageSource = imageinfo.descriptionurl;
								place.imageLicense =
									extmetadata.LicenseShortName?.value || extmetadata.License?.value;
								place.imageLicenseUrl = extmetadata.LicenseUrl?.value;
								place.imageArtist = extmetadata.Artist?.value || extmetadata.Credit?.value;
							}
						} catch (error) {
							console.warn(`[wiki] pageimage metadata ${pageimageTitle} failed: ${error.message}`);
						}
					}
				} else {
					// load images from wiki page and select best match based on captions
					if (!pageid) {
						return;
					}
					const response2 = await fetch(
						`https://${imageLang}.wikipedia.org/w/api.php?action=query&format=json&prop=images&pageids=${pageid}&origin=*&imlimit=10`
					);
					if (!response2.ok) {
						console.warn(
							`[wiki] fallback images for ${place.title} failed with HTTP ${response2.status}`
						);
						return;
					}
					let data2;
					try {
						data2 = await response2.json();
					} catch (error) {
						console.warn(`[wiki] fallback images for ${place.title} failed: ${error.message}`);
						return;
					}
					const images =
						data2.query?.pages?.[pageid]?.images ||
						Object.values(data2.query?.pages || {})[0]?.images;
					if (images) {
						const bestImage = await selectBestImageForPlace(images, place, size, imageLang);
						if (bestImage) {
							place[attribute] = bestImage.url;
							if (bestImage.metadata) {
								place.imageSource = bestImage.metadata.source;
								place.imageLicense = bestImage.metadata.license;
								place.imageLicenseUrl = bestImage.metadata.licenseUrl;
								place.imageArtist = bestImage.metadata.artist;
							}
						}
					}
				}
			} catch (error) {
				console.warn(`[wiki] loading ${attribute} for ${place.title} failed: ${error.message}`);
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
	const data = await withPerformance(
		'wikipedia.geosearch.request',
		async () => {
			const response = await fetch(
				`https://${lang}.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${coordinates.latitude}|${coordinates.longitude}&gsradius=${radius}&gslimit=${nArticles}&format=json&origin=*`
			);
			return response.json();
		},
		{ lang, radius, nArticles }
	);
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
	const data2 = await withPerformance(
		'wikipedia.nameSearch.request',
		async () => {
			const response = await fetch(
				`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${name}&srlimit=1&format=json&origin=*`
			);
			return response.json();
		},
		{ name, lang }
	);
	// for each search result, check if it has geocoordinates and is close to $coordinates
	for (const searchResult of data2.query.search) {
		// get geocoordinates through pageid
		const data3 = await withPerformance(
			'wikipedia.nameSearch.coordinates',
			async () => {
				const response = await fetch(
					`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=coordinates&pageids=${searchResult.pageid}&origin=*`
				);
				return response.json();
			},
			{ title: searchResult.title, pageid: searchResult.pageid, lang }
		);
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
