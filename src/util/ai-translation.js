import { openai, getAiModel } from './ai-core.js';
import { AI_REASONING_EFFORT } from '../constants/ui-config.js';
import { withPerformance } from './performance.js';
import { createLogger } from './logger.js';

const logger = createLogger('ai.translation');

async function translatePlaceName(place, preferences) {
	const prefs = preferences;
	const hasMultipleSourceLanguages = prefs.sourceLanguages && prefs.sourceLanguages.length > 1;
	const isDifferentLanguage = place.lang && place.lang !== prefs.lang;

	// Only translate if source from multiple languages are considered or presentation language not equals source language
	if (!hasMultipleSourceLanguages && !isDifferentLanguage) {
		return { title: place.title, translation: place.title };
	}

	const instructions = `You are a chat assistant helping a user to translate place names to ${prefs.lang}.

You must skip places that are difficult to translate or are already in the targeted language (${prefs.lang}). 
Generally, skip place names in English.

For a place "A" output a JSON object like this:

{
    title: "A",
    translation: "TRANSLATION_A"
}

IMPORTANT: In case of doubt, skip the place. Fewer translations are better. Then, return the original name.

{
    title: "A",
    translation: "A"
}
`;
	const model = getAiModel('simple', preferences);
	const response = await withPerformance(
		'ai.translation.place',
		() =>
			openai.responses.create({
				model,
				reasoning: {
					effort: AI_REASONING_EFFORT
				},
				input: [
					{ role: 'system', content: instructions },
					{ role: 'user', content: place.title }
				],
				text: {
					format: {
						type: 'json_schema',
						name: 'translation',
						schema: {
							type: 'object',
							properties: {
								title: { type: 'string' },
								translation: { type: 'string' }
							},
							required: ['title', 'translation'],
							additionalProperties: false
						},
						strict: true
					}
				}
			}),
		{ title: place.title, model }
	);
	const translation = JSON.parse(response.output_text);
	return translation;
}

function normalizeTitleForIdentity(title) {
	let decodedTitle = String(title || '');
	try {
		decodedTitle = decodeURIComponent(decodedTitle);
	} catch {
		// Keep the original title if it contains an incomplete escape sequence.
	}
	return decodedTitle.replace(/_/g, ' ').trim().toLowerCase();
}

function normalizeWikipediaReference(reference) {
	if (!reference || typeof reference !== 'string' || reference.includes('#')) {
		return null;
	}

	const separatorIndex = reference.indexOf(':');
	if (separatorIndex === -1) {
		return null;
	}

	const lang = reference.slice(0, separatorIndex).trim().toLowerCase();
	const title = normalizeTitleForIdentity(reference.slice(separatorIndex + 1));
	if (!lang || !title) {
		return null;
	}

	return `${lang}:${title}`;
}

function getIdentityKeys(place) {
	const keys = new Set();
	const wikidata = String(place.wikidata || '')
		.trim()
		.toUpperCase();

	if (wikidata) {
		keys.add(`wikidata:${wikidata}`);
	}

	const wikipediaReference = normalizeWikipediaReference(place.wikipedia);
	if (wikipediaReference) {
		keys.add(`wikipedia-title:${wikipediaReference}`);
	}

	if (place.pageid && place.lang) {
		keys.add(`wikipedia-page:${place.lang}:${place.pageid}`);
		keys.add(`wikipedia-title:${place.lang}:${normalizeTitleForIdentity(place.title)}`);
	}

	return keys;
}

function placesShareIdentity(place1, place2) {
	const keys1 = getIdentityKeys(place1);
	const keys2 = getIdentityKeys(place2);

	if (keys1.size === 0 || keys2.size === 0) {
		return false;
	}

	return [...keys1].some((key) => keys2.has(key));
}

function hasValue(value) {
	return value !== undefined && value !== null && value !== '';
}

function placeHasPreferredLanguage(place, preferences) {
	return place.lang && place.lang === preferences.lang;
}

function shouldPreferPlace(candidate, current, preferences) {
	const candidatePreferred = placeHasPreferredLanguage(candidate, preferences);
	const currentPreferred = placeHasPreferredLanguage(current, preferences);

	if (candidatePreferred !== currentPreferred) {
		return candidatePreferred;
	}

	const candidateHasArticle = Boolean(candidate.pageid || candidate.wikipedia);
	const currentHasArticle = Boolean(current.pageid || current.wikipedia);
	if (candidateHasArticle !== currentHasArticle) {
		return candidateHasArticle;
	}

	const candidateDistance = Number.isFinite(candidate.dist) ? candidate.dist : Infinity;
	const currentDistance = Number.isFinite(current.dist) ? current.dist : Infinity;
	return candidateDistance < currentDistance;
}

function collectAlternateTitles(...places) {
	const titles = [];
	for (const place of places) {
		[...(place.alternateTitles || []), place.title].forEach((title) => {
			if (title && !titles.includes(title)) {
				titles.push(title);
			}
		});
	}
	return titles;
}

function mergeDuplicatePlace(current, candidate, preferences) {
	const primary = shouldPreferPlace(candidate, current, preferences) ? candidate : current;
	const secondary = primary === candidate ? current : candidate;
	const merged = { ...secondary, ...primary };

	for (const [key, value] of Object.entries(secondary)) {
		if (!hasValue(merged[key]) && hasValue(value)) {
			merged[key] = value;
		}
	}

	const currentDistance = Number.isFinite(current.dist) ? current.dist : Infinity;
	const candidateDistance = Number.isFinite(candidate.dist) ? candidate.dist : Infinity;
	const nearestPlace = candidateDistance < currentDistance ? candidate : current;
	const nearestDistance = Math.min(currentDistance, candidateDistance);

	if (Number.isFinite(nearestDistance)) {
		merged.dist = nearestDistance;
	}
	if (hasValue(nearestPlace.lat)) {
		merged.lat = nearestPlace.lat;
	}
	if (hasValue(nearestPlace.lon)) {
		merged.lon = nearestPlace.lon;
	}

	merged.alternateTitles = collectAlternateTitles(current, candidate);
	return merged;
}

function groupPlacesByIdentity(places, preferences) {
	const groupedPlaces = [];

	for (const place of places) {
		const previousPlace = groupedPlaces.find((existingPlace) =>
			placesShareIdentity(existingPlace, place)
		);
		if (previousPlace) {
			const previousIndex = groupedPlaces.indexOf(previousPlace);
			groupedPlaces[previousIndex] = mergeDuplicatePlace(previousPlace, place, preferences);
			continue;
		}
		groupedPlaces.push({ ...place });
	}

	return groupedPlaces;
}

export async function groupDuplicatePlaces(places, coordinates, preferences) {
	const identityGroupedPlaces = groupPlacesByIdentity(places, preferences);
	logger.info('Identity grouping complete', {
		before: places.length,
		after: identityGroupedPlaces.length
	});

	const translationsNeeded = identityGroupedPlaces.filter((place) => {
		const hasMultipleSourceLanguages =
			preferences.sourceLanguages && preferences.sourceLanguages.length > 1;
		const isDifferentLanguage = place.lang && place.lang !== preferences.lang;
		return hasMultipleSourceLanguages || isDifferentLanguage;
	}).length;
	logger.info('Translation queue', {
		total: identityGroupedPlaces.length,
		needed: translationsNeeded,
		skipped: identityGroupedPlaces.length - translationsNeeded
	});
	const translations = await Promise.all(
		identityGroupedPlaces.map((place) => translatePlaceName(place, preferences))
	);
	logger.debug('Translations completed', { translations });

	const levenshtein = (a, b) => {
		const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1));

		for (let i = 0; i <= a.length; i++) dp[i][0] = i;
		for (let j = 0; j <= b.length; j++) dp[0][j] = j;

		for (let i = 1; i <= a.length; i++) {
			for (let j = 1; j <= b.length; j++) {
				const cost = a[i - 1] === b[j - 1] ? 0 : 1;
				dp[i][j] = Math.min(
					dp[i - 1][j] + 1, // deletion
					dp[i][j - 1] + 1, // insertion
					dp[i - 1][j - 1] + cost // substitution
				);
			}
		}

		return dp[a.length][b.length];
	};

	const placesNameIsSimilar = (name1, name2) => {
		// if names contain numbers, compare them based on the numbers
		const numbers1 = name1.match(/\d+/g) || [];
		const numbers2 = name2.match(/\d+/g) || [];
		if (numbers1.length > 0 || numbers2.length > 0) {
			const number1 = numbers1.join('');
			const number2 = numbers2.join('');
			if (number1 != number2) {
				return false;
			}
		}
		// lower case names
		name1 = name1.toLowerCase();
		name2 = name2.toLowerCase();
		// remove content in brackets
		name1 = name1.replace(/ *\([^)]*\) */g, '');
		name2 = name2.replace(/ *\([^)]*\) */g, '');
		// remove special characters
		name1 = name1.replace(/[^a-z0-9]/g, '');
		name2 = name2.replace(/[^a-z0-9]/g, '');
		// remove town name from place name (if place name significantly longer than town name)
		const townName = coordinates?.town?.toLowerCase();
		if (townName && name1.length > townName.length + 5) {
			name1 = name1.replace(townName, '');
		}
		if (townName && name2.length > townName.length + 5) {
			name2 = name2.replace(townName, '');
		}
		const maxLength = Math.max(name1.length, name2.length);
		const minLength = Math.min(name1.length, name2.length);

		// Check if one is a substring of the other (or very close to it)
		const isSubstringLike = name1.includes(name2) || name2.includes(name1);

		let allowedDistance;
		if (isSubstringLike) {
			// More generous for substring cases: allow up to the length difference plus some tolerance
			const lengthDiff = maxLength - minLength;
			allowedDistance = Math.max(3, lengthDiff + Math.floor(minLength * 0.1));
		} else {
			// Strict matching for non-substring cases to prevent "neuerebracherhof"/"alterebracherhof" matches
			allowedDistance = Math.max(2, Math.floor(minLength * 0.15));
		}
		const distance = levenshtein(name1, name2);
		const isMatch = name1 === name2 || distance < allowedDistance;

		// Debug output for matches and near-misses
		if (distance > 0 && (isMatch || distance <= allowedDistance + 2)) {
			logger.debug('Name similarity checked', {
				distance,
				allowedDistance,
				isMatch,
				name1,
				name2,
				matchKind: isSubstringLike ? 'substring-like' : 'non-substring'
			});
		}

		return isMatch;
	};

	const newPlaces = [];
	for (const place of identityGroupedPlaces) {
		const translation = translations.find((translation) =>
			placesNameIsSimilar(place.title, translation.title)
		);
		let candidatePlace = place;
		if (translation && translation.translation !== place.title) {
			candidatePlace = {
				...place,
				title: `${translation.translation} (${place.title})`,
				alternateTitles: collectAlternateTitles(place, {
					...place,
					title: translation.translation
				})
			};
		}
		const previousPlace = newPlaces.find(
			(p) =>
				placesShareIdentity(p, candidatePlace) || placesNameIsSimilar(p.title, candidatePlace.title)
		);
		if (previousPlace) {
			const previousIndex = newPlaces.indexOf(previousPlace);
			newPlaces[previousIndex] = mergeDuplicatePlace(previousPlace, candidatePlace, preferences);
			continue;
		}
		newPlaces.push(candidatePlace);
	}
	logger.info('Grouping complete', {
		before: places.length,
		after: newPlaces.length,
		identityGrouped: identityGroupedPlaces.length,
		translated: translations.filter((translation) => translation.translation !== translation.title)
			.length
	});
	logger.debug('Places after grouping', { places: newPlaces });
	return newPlaces;
}
