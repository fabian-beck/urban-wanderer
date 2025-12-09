import { get } from 'svelte/store';
import { preferences, coordinates } from '../stores.js';

/**
 * Fetch WikiData entity information and return formatted context string
 * @param {string} wikidataId - The WikiData entity ID (e.g., "Q123")
 * @returns {Promise<string|null>} Formatted context string or null if not found
 */
export async function fetchWikidataInfo(wikidataId) {
	if (!wikidataId) return null;

	try {
		// Step 1: Download from WikiData
		const response = await fetch(
			`https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`
		);
		if (!response.ok) return null;

		const data = await response.json();
		const entity = data.entities[wikidataId];
		if (!entity) return null;

		// Step 2: Define relevant properties with their human-readable labels
		const propLabels = {
			// --- Basic identification & context ---
			P31: 'instance of', // Type of place (church, bridge, park, etc.)
			P140: 'religion', // Religious affiliation (for temples, churches, etc.)
			P2596: 'culture', // Cultural context or tradition

			// --- Naming & dedication ---
			P138: 'named after', // Person or thing the place is named after
			P547: 'commemorates', // What/who the site commemorates
			P500: 'has patron saint', // Patron saint (if applicable)

			// --- Architecture & construction ---
			P84: 'architect', // Designer of the place
			P88: 'commissioned by', // Who ordered its construction
			P92: 'main building contractor', // Construction company or builder
			P149: 'architectural style', // Style (e.g., Gothic, Modernist)
			P186: 'made from material', // Main materials used
			P2079: 'fabrication method', // How it was built
			P2042: 'construction start', // When construction began
			P2041: 'construction end', // When construction finished
			P571: 'inception', // When the place came into existence
			P1619: 'date of official opening', // Official opening date
			P582: 'dissolved, abolished or demolished date', // If the site no longer exists

			// --- Events & history ---
			P793: 'significant event', // Historic events that took place here
			P3218: 'events held here', // Regular or notable events

			// --- Water flow & connections ---
			P974: 'tributary', // Rivers/streams flowing into this waterway
			P200: 'inflows', // What flows into this waterway
			P201: 'outflows', // What flows out of this waterway
			P155: 'follows', // What this waterway follows/continues from
			P156: 'followed by', // What follows/continues this waterway
			P403: 'mouth of watercourse', // Where this waterway ends/flows into

			// --- Physical characteristics ---
			P2048: 'height', // Total height
			P2049: 'width', // Total width
			P2050: 'depth', // Depth
			P2045: 'floor count', // Number of floors
			P2043: 'length', // Length/distance
			P2046: 'area', // Total area
			P2047: 'volume', // Total volume
			P2038: 'total length', // Full length (e.g., for bridges)
			P2039: 'main span length', // Longest span
			P2040: 'span length', // General span length
			P2036: 'height above water', // For bridges or waterfront sites
			P2035: 'clearance', // Clearance under the structure
			P1103: 'number of platforms', // Platforms (for stations)
			P621: 'crosses', // What this place crosses (e.g., river, road)

			// --- Recognition & heritage ---
			P1435: 'heritage designation', // UNESCO or national heritage status
			P3326: 'world heritage criteria', // UNESCO listing criteria

			// --- Functional & usage context ---
			P137: 'operator', // Organization managing the site
			P1535: 'used by', // Groups or communities using it
			P3221: 'service offered', // Services available to visitors
			P3025: 'open days' // Days when the site is open
		};

		// Step 2.5: Collect all entity IDs that need to be resolved
		const entityIds = new Set();
		const propData = {};

		if (entity.claims) {
			for (const propId of Object.keys(propLabels)) {
				if (entity.claims[propId]) {
					const statements = entity.claims[propId];
					const values = [];

					for (const statement of statements) {
						if (statement.mainsnak?.datavalue?.value) {
							const value = statement.mainsnak.datavalue.value;
							let processedValue = null;

							if (typeof value === 'string') {
								processedValue = value;
							} else if (value.time) {
								processedValue = value.time.replace(/^\+/, '').split('T')[0];
							} else if (value.amount) {
								let amount = value.amount.replace(/^\+/, '');
								// Add unit if available
								if (value.unit && value.unit !== '1') {
									// Extract unit ID and add to entity lookup
									const unitId = value.unit.split('/').pop();
									if (unitId.startsWith('Q')) {
										entityIds.add(unitId);
										processedValue = amount + ' ' + unitId;
									} else {
										processedValue = amount;
									}
								} else {
									processedValue = amount;
								}
							} else if (value.id) {
								processedValue = value.id;
								entityIds.add(value.id);

								// For significant events (P793), add temporal context from qualifiers
								if (propId === 'P793' && statement.qualifiers) {
									const startTime = statement.qualifiers.P580?.[0]?.datavalue?.value?.time;
									const endTime = statement.qualifiers.P582?.[0]?.datavalue?.value?.time;

									if (startTime || endTime) {
										const start = startTime ? startTime.replace(/^\+/, '').split('-')[0] : '';
										const end = endTime ? endTime.replace(/^\+/, '').split('-')[0] : '';
										const timeRange =
											start && end
												? ` (${start}-${end})`
												: start
													? ` (${start})`
													: end
														? ` (until ${end})`
														: '';
										processedValue = value.id + timeRange;
									}
								}
							}

							if (processedValue !== null) {
								values.push(processedValue);
							}
						}
					}

					if (values.length > 0) {
						// Remove duplicates and empty values
						const uniqueValues = [...new Set(values.filter((v) => v && v.trim()))];
						propData[propId] = uniqueValues;
					}
				}
			}
		}

		// Step 2.7: Fetch labels for all entity IDs at once
		const entityLabels = {};
		if (entityIds.size > 0) {
			try {
				const lang = get(preferences).lang || 'en';
				const ids = Array.from(entityIds);
				const chunks = [];

				// Split into chunks of 50 (WikiData API limit)
				for (let i = 0; i < ids.length; i += 50) {
					chunks.push(ids.slice(i, i + 50));
				}

				for (const chunk of chunks) {
					const apiUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join('|')}&props=labels&languages=en|${lang}&format=json&origin=*`;
					const response = await fetch(apiUrl);

					if (response.ok) {
						const labelData = await response.json();

						for (const [entityId, entityInfo] of Object.entries(labelData.entities || {})) {
							if (entityInfo.labels) {
								// Prefer English labels for better AI understanding
								const label =
									entityInfo.labels['en']?.value || entityInfo.labels[lang]?.value || entityId;
								entityLabels[entityId] = label;
							}
						}
					}
				}
			} catch (error) {
				console.warn('Could not fetch entity labels:', error);
			}
		}

		// Step 3: Create simple context string with human-readable properties
		let contextString = '';

		for (const [propId, values] of Object.entries(propData)) {
			const propName = propLabels[propId] || propId;

			// Translate entity IDs to human labels
			const readableValues = values.map((value) => {
				if (typeof value === 'string') {
					// Handle values with units like "170.71 Q11573"
					const unitMatch = value.match(/^(.+)\s+(Q\d+)$/);
					if (unitMatch) {
						const [, amount, unitId] = unitMatch;
						const unitLabel = entityLabels[unitId] || unitId;
						return `${amount} ${unitLabel}`;
					}
					// Handle simple Q-IDs
					else if (value.startsWith('Q')) {
						return entityLabels[value] || value;
					}
				}
				return value;
			});

			contextString += `${propName}: ${readableValues.join(', ')}\n`;
		}

		console.log('📊 WikiData context:', contextString);
		return contextString;
	} catch (error) {
		console.error('Error fetching WikiData:', error);
		return null;
	}
}

/**
 * Search for WikiData ID for a place by name
 * @param {Object} place - Place object with title and other properties
 * @returns {Promise<string|null>} WikiData ID or null if not found
 */
export async function searchWikidataId(place) {
	if (!place.title) return null;

	try {
		const searchQuery = `${place.title} ${get(coordinates).town || ''}`.trim();
		const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(searchQuery)}&language=en&format=json&origin=*&type=item&limit=3`;
		const response = await fetch(searchUrl);

		if (response.ok) {
			const data = await response.json();
			// Look for matches that might be the same place
			for (const result of data.search || []) {
				const description = result.description?.toLowerCase() || '';
				// Check if description suggests it's a relevant place type
				if (
					description.includes('railway station') ||
					description.includes('train station') ||
					description.includes('church') ||
					description.includes('building') ||
					description.includes('monument') ||
					description.includes('museum') ||
					description.includes('city') ||
					description.includes('town') ||
					description.includes('village')
				) {
					console.log(
						`🔍 Found WikiData ID via search: ${place.title} → ${result.id} (${result.description})`
					);
					return result.id;
				}
			}
		}
	} catch (error) {
		console.warn('WikiData search failed:', place.title, error);
	}

	return null;
}

/**
 * Get WikiData information for a place, searching for ID if not available
 * @param {Object} place - Place object that may have wikidata property
 * @returns {Promise<string>} WikiData context string (empty if no data found)
 */
export async function getWikidataContext(place) {
	let wikidataInfo = null;
	let wikidataId = place.wikidata;

	// If no WikiData ID, try to find one via search
	if (!wikidataId && place.title) {
		wikidataId = await searchWikidataId(place);
	}

	if (wikidataId) {
		wikidataInfo = await fetchWikidataInfo(wikidataId);
	}

	if (wikidataInfo) {
		return `

STRUCTURED DATA FROM WIKIDATA:
${wikidataInfo}`;
	}

	return '';
}

/**
 * Load images from Wikidata for places that don't have images yet
 * @param {Array} places - Array of place objects
 * @param {string} attribute - Attribute name to store image URL ('image' or 'imageThumb')
 * @param {number} size - Desired image width in pixels
 */
export async function loadWikidataImages(places, attribute, size) {
	await Promise.all(
		places.map(async (place) => {
			if (place[attribute]) {
				return;
			}

			if (!place.wikidata) {
				return;
			}

			try {
				const wikidataId = place.wikidata;
				console.log(`Fetching Wikidata image for ${place.title} (${wikidataId})`);

				const response = await fetch(
					`https://www.wikidata.org/wiki/Special:EntityData/${wikidataId}.json`
				);

				if (!response.ok) {
					console.error(
						`Failed to fetch Wikidata for ${wikidataId}. HTTP status: ${response.status}`
					);
					return;
				}

				const data = await response.json();
				const entity = data.entities[wikidataId];

				if (!entity || !entity.claims || !entity.claims.P18) {
					return;
				}

				const imageClaim = entity.claims.P18[0];
				const imageFilename = imageClaim.mainsnak.datavalue.value;

				const imageData = await getCommonsImageUrl(imageFilename, size);

				if (imageData) {
					place[attribute] = imageData.url;
					if (imageData.metadata) {
						place.imageSource = imageData.metadata.source;
						place.imageLicense = imageData.metadata.license;
						place.imageLicenseUrl = imageData.metadata.licenseUrl;
						place.imageArtist = imageData.metadata.artist;
					}
					console.log(`✓ Loaded Wikidata image for ${place.title}: ${imageFilename}`);
				}
			} catch (error) {
				console.error(`Error fetching Wikidata image for ${place.title}:`, error);
			}
		})
	);
}

/**
 * Get Commons image URL and metadata for a given filename
 * @param {string} filename - Image filename from Wikidata
 * @param {number} size - Desired image width in pixels
 * @returns {Promise<Object|null>} Object with url and metadata, or null if not found
 */
async function getCommonsImageUrl(filename, size) {
	try {
		const response = await fetch(
			`https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=File:${encodeURIComponent(filename)}&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=${size}`
		);

		const data = await response.json();
		const pages = data.query.pages;
		const page = Object.values(pages)[0];

		if (page.imageinfo && page.imageinfo.length > 0) {
			const imageinfo = page.imageinfo[0];
			const extmetadata = imageinfo.extmetadata || {};

			return {
				url: imageinfo.thumburl || imageinfo.url,
				metadata: {
					source: imageinfo.descriptionurl,
					license: extmetadata.LicenseShortName?.value || extmetadata.License?.value,
					licenseUrl: extmetadata.LicenseUrl?.value,
					artist: extmetadata.Artist?.value || extmetadata.Credit?.value
				}
			};
		}

		return null;
	} catch (error) {
		console.error(`Error fetching Commons image URL for ${filename}:`, error);
		return null;
	}
}
