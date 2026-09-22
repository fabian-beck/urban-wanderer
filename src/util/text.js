import {
	PLACE_MENTION_HREF_PREFIX,
	PLACE_MENTION_LEADING_ARTICLES,
	PLACE_MENTION_MAX_SUFFIX_LETTERS,
	PLACE_MENTION_MIN_LENGTH,
	PLACE_MENTION_INFLECTED_WORD_MIN_LENGTH
} from '../constants/core.js';

function stripParentheses(title) {
	return title.replace(/\s*\(.*?\)\s*/g, ' ').trim();
}

// Name variants of a place: title and alternate titles (original language and translation),
// each also without a leading article
function getPlaceNameVariants(place) {
	const variants = new Set();
	[place.title, ...(place.alternateTitles || [])].forEach((title) => {
		if (!title) {
			return;
		}
		const name = stripParentheses(title);
		if (name.length >= PLACE_MENTION_MIN_LENGTH) {
			variants.add(name);
		}
		const words = name.split(/\s+/);
		if (words.length > 1 && PLACE_MENTION_LEADING_ARTICLES.includes(words[0].toLowerCase())) {
			const withoutArticle = words.slice(1).join(' ');
			if (withoutArticle.length >= PLACE_MENTION_MIN_LENGTH) {
				variants.add(withoutArticle);
			}
		}
	});
	return [...variants];
}

const escapeRegExp = (text) => text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

// Regex for one word of a name: a short inflection suffix may be appended, and in longer
// words the last letter may also change (e.g. "Österreichisches" -> "Österreichische")
function buildWordPattern(word) {
	if (word.length >= PLACE_MENTION_INFLECTED_WORD_MIN_LENGTH) {
		return `${escapeRegExp(word.slice(0, -1))}\\p{L}{0,${PLACE_MENTION_MAX_SUFFIX_LETTERS + 1}}`;
	}
	return `${escapeRegExp(word)}\\p{L}{0,${PLACE_MENTION_MAX_SUFFIX_LETTERS}}`;
}

// Regex for one name variant: Unicode-aware word boundaries, whitespace and hyphens
// between words are interchangeable
function buildMentionRegExp(name) {
	const words = name.split(/[\s-]+/).filter(Boolean);
	const pattern = words.map(buildWordPattern).join('[\\s-]+');
	return new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'giu');
}

// Ranges of text that are already formatted (bold, links) and must not be marked
function getReservedRanges(text) {
	const ranges = [];
	for (const match of text.matchAll(/\*\*[^*]+?\*\*|\[[^\]]*\]\([^)]*\)/g)) {
		ranges.push({ start: match.index, end: match.index + match[0].length });
	}
	return ranges;
}

const overlaps = (ranges, start, end) =>
	ranges.some((range) => start < range.end && end > range.start);

// Find the first mention of each place in a text; longer names win over shorter ones
export function findPlaceMentions(text, places) {
	const reserved = getReservedRanges(text);
	const mentions = [];
	const candidates = places
		.flatMap((place) => getPlaceNameVariants(place).map((name) => ({ place, name })))
		.sort((a, b) => b.name.length - a.name.length);
	const mentionedPlaces = new Set();
	candidates.forEach(({ place, name }) => {
		if (mentionedPlaces.has(place)) {
			return;
		}
		for (const match of text.matchAll(buildMentionRegExp(name))) {
			const start = match.index;
			const end = start + match[0].length;
			if (!overlaps(reserved, start, end) && !overlaps(mentions, start, end)) {
				mentions.push({ place, start, end, text: match[0] });
				mentionedPlaces.add(place);
				break;
			}
		}
	});
	return mentions.sort((a, b) => a.start - b.start);
}

export function encodePlaceHref(place) {
	return (
		PLACE_MENTION_HREF_PREFIX +
		encodeURIComponent(place.title).replace(/\(/g, '%28').replace(/\)/g, '%29')
	);
}

export function decodePlaceHref(href) {
	if (!href?.startsWith(PLACE_MENTION_HREF_PREFIX)) {
		return null;
	}
	try {
		return decodeURIComponent(href.slice(PLACE_MENTION_HREF_PREFIX.length));
	} catch {
		return null;
	}
}

// Mark the first mention of each place in a markdown text as a place link
export function markPlacesInText(text, places) {
	const mentions = findPlaceMentions(text, places);
	let result = '';
	let cursor = 0;
	mentions.forEach((mention) => {
		const label = mention.text.replace(/[[\]]/g, '\\$&');
		result += text.slice(cursor, mention.start);
		result += `[${label}](${encodePlaceHref(mention.place)})`;
		cursor = mention.end;
	});
	return result + text.slice(cursor);
}
