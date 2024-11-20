import { places } from '../stores.js';
import { get } from 'svelte/store';

// mark in a text all places 
export function markPlacesInText(text) {
    const $places = get(places);
    let result = text;
    // Sort places by length of title in descending order
    const sortedPlaces = [...$places].sort((a, b) => b.title.length - a.title.length);
    sortedPlaces.forEach(place => {
        let placeName = place.title.replace(/\s*\(.*?\)\s*/g, '');
        let regEx = new RegExp(`\\b${placeName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\w*\\b`, 'i'); // match only the first occurrence and ignore slightly different word endings
        result = result.replace(regEx, (match) => {
            // Check if the match is already marked
            if (result.slice(result.indexOf(match) - 2, result.indexOf(match)) !== '**' && result.slice(result.indexOf(match) + match.length, result.indexOf(match) + match.length + 2) !== '**') {
                return `**${match}**`;
            }
            return match;
        });
    });
    // remove double markings, i.e., **A **B** C** -> **A B C**, but preserve single markings **A** -> **A**
    result = result.replace(/\*\*(.*?)\*\*/g, '**$1**');
    return result;
}
