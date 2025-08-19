import { LABELS, CLASSES, AI_REASONING_EFFORT } from '../constants.js';
import { openai, getAiModel } from './ai-core.js';

const analysisCache = {};

async function analyzeSinglePlace(place, preferences) {
	const instructions = `You are a chat assistant helping a user analyze places:
(1) To classify them
(2) To assign labels to them
(3) To rate them based on their impact and importance to the user's environment

Available CLASSES are:
${Object.keys(CLASSES)
		.map((classLabel) => `- ${classLabel}: ${CLASSES[classLabel].description}`)
		.join('\n')}
        
Available LABELS are:
${LABELS.map((label) => `- ${label.value}: ${label.description}`).join('\n')}

Available IMPORTANCE values are:
1: very low
2: low
3: medium
4: high
5: very high

Aspects that contribute to HIGER IMPORTANCE are:
* the place is a landmark or a famous building
* the place is unique in the area
* the place is of historical or cultural significance
* the place is related to a well - known person or event
* the place is characteristic for the area
* the place dominates the perceived environment (e.g., a skyscraper, a castle, a park)

Aspects that contribute to LOWER IMPORTANCE are:
* the place is a generic business or a shop
* the place is a detail of a larger place
* the place is a larger area (e.g., a city, a district, a region)
* the place is a larger geographic feature (e.g., a river, a lake, a mountain)
* the place is a generic entity (e.g., a concept, a non-physical object)
* the place is maybe just an office of a business or intitution
* the place has vanished or is not accessible anymore
* the place is built over or is not visible anymore

To best best characterize the place answer with 
* exactly one class,
* up to three labels, and
* one importance value.

For a place "A" and its description output a JSON object like this:

{
    "cls": "CLASS1",
    "labels": ["LABEL1", "LABEL2"],
    "importance": 5
}
    
FURTHER INSTRUCTIONS:
* Geographic places like rivers or lakes, that are not a specific location, should be labeled only as "GEOGRAPHY" and have a very low importance as they can be accessed from many locations.
`;
	const dataString = `* ${place.title}  (${place.type || ''}): ${place.snippet || place.description || ''}`;
	const response = await openai.responses.create({
		model: getAiModel('simple', preferences),
		reasoning: {
			effort: AI_REASONING_EFFORT
		},
		input: [
			{
				role: 'system',
				content: instructions
			},
			{
				role: 'user',
				content: dataString
			}
		],
		text: {
			format: {
				type: 'json_object'
			}
		}
	});
	let json;
	try {
		// Extract JSON from response, handling potential extra text
		const text = response.output_text.trim();
		const jsonStart = text.indexOf('{');
		const jsonEnd = text.lastIndexOf('}') + 1;
		const jsonText =
			jsonStart !== -1 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd) : text;
		json = JSON.parse(jsonText);
	} catch (parseError) {
		console.error('JSON parse error for place:', place.title);
		console.error('Response text:', response.output_text);
		console.error('Parse error:', parseError);
		// Fallback to empty analysis
		json = { cls: 'other', labels: [], importance: 0 };
	}
	// update cache
	analysisCache[place.title] = json;
}

// ToDo: Support cases where two places have the same title, e.g., http://localhost:5173/?lat=48.85882&lon=10.41824
export async function analyzePlaces(places, preferences) {
	console.log('Places before analysis:', places);
	// get places with cached labels (labelsCache)
	const placesWithoutCachedAnalysis = places.filter((place) => !analysisCache[place.title]);
	if (placesWithoutCachedAnalysis.length > 0) {
		// analyze each place separately, but concurrently
		await Promise.all(placesWithoutCachedAnalysis.map((place) => analyzeSinglePlace(place, preferences)));
	}
	const newPlaces = places.map((place) => ({
		...place,
		labels: analysisCache[place.title]?.labels,
		cls: analysisCache[place.title]?.cls,
		importance: analysisCache[place.title]?.importance
	}));
	// remove non-geographic classes
	const nonGeoClasses = Object.keys(CLASSES).filter((classLabel) => CLASSES[classLabel]?.nonGeo);
	return newPlaces.filter((place) => !nonGeoClasses.includes(place.cls));
}