import { MAX_ARTICLE_LENGTH } from '../constants/core.js';

export async function loadWikipediaPlaces(coordinates, preferences, nArticles) {
	if (!coordinates) {
		return;
	}
	const places = [];
	preferences.sourceLanguages?.forEach(async (lang) => {
		places.push(
			...(await wikipediaGeoSearchForPlaces(coordinates, lang, preferences.radius, nArticles))
		);
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
					const response = await fetch(
						`https://${lang}.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(img.title)}&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${size}`
					);
					const data = await response.json();
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
					console.error(`Error fetching metadata for ${img.title}:`, error);
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

	return bestImage.url;
}

export async function loadWikipediaImageUrls(places, attribute, size, lang) {
	await Promise.all(
		places.map(async (place) => {
			let response;
			if (place.wikipedia) {
				const placeLang = place.wikipedia.split(':')[0];
				let placeTitle = place.wikipedia.split(':')[1];

				if (placeTitle.includes('#')) {
					placeTitle = placeTitle.split('#')[0];
					console.log(
						`Stripped anchor from Wikipedia reference for image loading: ${place.wikipedia} → ${placeLang}:${placeTitle}`
					);
				}

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

				// Also fetch metadata for the primary image
				const pageimageTitle = data.query.pages[pageid].pageimage;
				if (pageimageTitle) {
					try {
						const metadataResponse = await fetch(
							`https://${place.lang || lang}.wikipedia.org/w/api.php?action=query&format=json&titles=File:${encodeURIComponent(pageimageTitle)}&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${size}`
						);
						const metadataData = await metadataResponse.json();
						const metadataPage = Object.values(metadataData.query.pages)[0];
						if (metadataPage.imageinfo && metadataPage.imageinfo.length > 0) {
							const imageinfo = metadataPage.imageinfo[0];
							const extmetadata = imageinfo.extmetadata || {};
							place.imageSource = imageinfo.descriptionurl;
							place.imageLicense = extmetadata.LicenseShortName?.value || extmetadata.License?.value;
							place.imageLicenseUrl = extmetadata.LicenseUrl?.value;
							place.imageArtist = extmetadata.Artist?.value || extmetadata.Credit?.value;
						}
					} catch (error) {
						console.error(`Error fetching metadata for ${pageimageTitle}:`, error);
					}
				}
			} else {
				// load images from wiki page and select best match based on captions
				const response2 = await fetch(
					`https://${place.lang || lang}.wikipedia.org/w/api.php?action=query&format=json&prop=images&pageids=${place.pageid}&origin=*&imlimit=10`
				);
				const data2 = await response2.json();
				const images = data2.query.pages[place.pageid]?.images;
				if (images) {
					const bestImage = await selectBestImageForPlace(
						images,
						place,
						size,
						place.lang || lang
					);
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
