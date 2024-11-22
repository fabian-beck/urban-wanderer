import { places } from '../stores.js';
import { get } from 'svelte/store';

// mark in a text all places 
export function markPlacesInText(text) {
    // cut bold text (**text**) at the beginning of the text and save it
    let headline = '';
    if (text.startsWith('**')) {
        headline = text.slice(0, text.indexOf('**', 2) + 2);
        text = text.slice(text.indexOf('**', 2) + 2);
    }
    const $places = get(places);
    let result = text;
    // Sort places by length of title in descending order
    const sortedPlaces = [...$places].sort((a, b) => b.title.length - a.title.length);
    // Iterate over all places and mark them in the text
    sortedPlaces.forEach(place => {
        let placeName = place.title.replace(/\s*\(.*?\)\s*/g, '');
        let regEx = new RegExp(`\\b${placeName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\w*\\b`, 'i'); // match only the first occurrence and ignore slightly different word endings
        result = result.replace(regEx, (match) => {
            const textBefore = result.slice(0, result.indexOf(match));
            console.log(textBefore);
            // Check if the match is not already marked by counting the number of square brackets before the match
            if (textBefore.split('[').length === textBefore.split(']').length) {
                return `[${match}]`;
            }
            return match;
        });
    });
    // in result replace all "[text]" with "**text**"
    result = result.replace(/\[(.*?)\]/g, '**$1**');
    return headline + result;
}