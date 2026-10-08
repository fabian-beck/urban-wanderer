import {
	DEFAULT_GERMAN_ADDRESS,
	FAMILIARITY,
	GERMAN_ADDRESS_INSTRUCTIONS,
	GUIDE_CHARACTERS,
	STORY_LENGTH
} from '../constants/ui-config.js';

// A character that is not (or no longer) offered keeps working with its bare value
export function getGuideCharacter(preferences) {
	return (
		GUIDE_CHARACTERS.find((character) => character.value === preferences.guideCharacter) || {
			value: preferences.guideCharacter
		}
	);
}

export function getFamiliarity(preferences) {
	return FAMILIARITY.find((option) => option.value === preferences.familiarity) || null;
}

export function getStoryLength(preferences) {
	return { ...STORY_LENGTH, ...getGuideCharacter(preferences).storyLength };
}

// Form of address in the presentation language; empty where the language has no T–V distinction
export function buildAddressInstruction(preferences) {
	if (preferences.lang !== 'de') {
		return '';
	}
	const address = getGuideCharacter(preferences).germanAddress || DEFAULT_GERMAN_ADDRESS;
	return GERMAN_ADDRESS_INSTRUCTIONS[address];
}
