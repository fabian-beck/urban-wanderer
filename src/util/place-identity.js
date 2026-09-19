// Stable identity of a place across location updates (Wikidata ID, Wikipedia page ID, or title)
export function getPlaceIdentity(place) {
	return String(place?.wikidata || place?.pageid || place?.title || '');
}
