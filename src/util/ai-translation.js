import { openai, getAiModel } from './ai-core.js';
import { AI_REASONING_EFFORT } from '../constants/ui-config.js';

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
	const response = await openai.responses.create({
		model: getAiModel('simple', preferences),
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
	});
	const translation = JSON.parse(response.output_text);
	return translation;
}

export async function groupDuplicatePlaces(places, coordinates, preferences) {
	const translations = await Promise.all(
		places.map((place) => translatePlaceName(place, preferences))
	);
	console.log('Translations:', translations);

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
			console.log(
				`Levenshtein: ${distance} (allowed: ${allowedDistance}) ${isMatch ? 'MATCH' : 'NO MATCH'}`,
				`"${name1}" vs "${name2}"`,
				isSubstringLike ? '(substring-like)' : '(non-substring)'
			);
		}
		
		return isMatch;
	};

	const newPlaces = [];
	for (const place of places) {
		const translation = translations.find((translation) =>
			placesNameIsSimilar(place.title, translation.title)
		);
		if (translation && translation.translation !== place.title) {
			place.title = `${translation.translation} (${place.title})`;
		}
		const previousPlace = newPlaces.find((p) => placesNameIsSimilar(p.title, place.title));
		if (previousPlace) {
			if (previousPlace.lang === preferences.lang) {
				// replace previous place with the new one
				newPlaces[newPlaces.indexOf(previousPlace)] = place;
			}
			continue;
		}
		newPlaces.push(place);
	}
	console.log('Places after grouping:', newPlaces);
	return newPlaces;
}
