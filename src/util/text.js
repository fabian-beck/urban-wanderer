import {
	PLACE_MENTION_BOLD_SUFFIX_MIN_WORDS,
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

// Plain text of inline markdown: links keep their label, emphasis and code markers are removed
export function stripInlineMarkdown(text) {
	return String(text || '')
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/(\*\*|__)(.+?)\1/g, '$2')
		.replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1(?![\p{L}\p{N}])/gu, '$2')
		.replace(/`([^`]*)`/g, '$1')
		.replace(/\*\*|__/g, '');
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

// Formatted ranges of a text: links and bold headlines (a bold span on a line of its own)
// must not be marked; a mention may replace an inline bold span or lie within it
function getFormattedRanges(text) {
	const reserved = [];
	const bold = [];
	for (const match of text.matchAll(/\[[^\]]*\]\([^)]*\)/g)) {
		reserved.push({ start: match.index, end: match.index + match[0].length });
	}
	for (const match of text.matchAll(/\*\*([^*]+?)\*\*/g)) {
		const start = match.index;
		const end = start + match[0].length;
		const lineStart = text.lastIndexOf('\n', start - 1) + 1;
		const lineEnd = text.indexOf('\n', end) === -1 ? text.length : text.indexOf('\n', end);
		const isHeadline =
			!text.slice(lineStart, start).trim() && !/[\p{L}\p{N}]/u.test(text.slice(end, lineEnd));
		if (isHeadline) {
			reserved.push({ start, end });
		} else if (!overlaps(reserved, start, end)) {
			bold.push({ start, end, innerStart: start + 2, innerEnd: end - 2, inner: match[1] });
		}
	}
	return { reserved, bold };
}

const overlaps = (ranges, start, end) =>
	ranges.some((range) => start < range.end && end > range.start);

// A match within an inline bold span stays inside it, a match of the whole span replaces it
function fitToBold(boldRanges, start, end) {
	const span = boldRanges.find((range) => start < range.end && end > range.start);
	if (!span) {
		return { start, end };
	}
	if (start < span.innerStart || end > span.innerEnd) {
		return null;
	}
	return start === span.innerStart && end === span.innerEnd ? span : { start, end };
}

// Inline bold spans that name exactly one place by the trailing words of one of its names
function findBoldSuffixMentions(boldRanges, variantsByPlace) {
	return boldRanges.flatMap((span) => {
		const matching = [...variantsByPlace].filter(([, names]) =>
			names.some((name) => {
				const words = name.split(/[\s-]+/).filter(Boolean);
				for (let count = PLACE_MENTION_BOLD_SUFFIX_MIN_WORDS; count < words.length; count++) {
					const suffix = words.slice(-count).join(' ');
					const pattern = buildMentionRegExp(suffix);
					if (suffix.length >= PLACE_MENTION_MIN_LENGTH && fullMatch(pattern, span.inner.trim())) {
						return true;
					}
				}
				return false;
			})
		);
		return matching.length === 1
			? [{ place: matching[0][0], start: span.start, end: span.end, text: span.inner.trim() }]
			: [];
	});
}

const fullMatch = (pattern, text) =>
	[...text.matchAll(pattern)].some((match) => match.index === 0 && match[0].length === text.length);

// Find the first mention of each place in a text; longer names win over shorter ones
export function findPlaceMentions(text, places) {
	const { reserved, bold } = getFormattedRanges(text);
	const mentions = [];
	const variantsByPlace = new Map(places.map((place) => [place, getPlaceNameVariants(place)]));
	const candidates = [...variantsByPlace]
		.flatMap(([place, names]) => names.map((name) => ({ place, name })))
		.sort((a, b) => b.name.length - a.name.length);
	const mentionedPlaces = new Set();
	candidates.forEach(({ place, name }) => {
		if (mentionedPlaces.has(place)) {
			return;
		}
		for (const match of text.matchAll(buildMentionRegExp(name))) {
			const range = fitToBold(bold, match.index, match.index + match[0].length);
			if (
				range &&
				!overlaps(reserved, range.start, range.end) &&
				!overlaps(mentions, range.start, range.end)
			) {
				mentions.push({ place, start: range.start, end: range.end, text: match[0] });
				mentionedPlaces.add(place);
				break;
			}
		}
	});
	findBoldSuffixMentions(bold, variantsByPlace).forEach((mention) => {
		const index = mentions.findIndex((other) => other.place === mention.place);
		if (index !== -1 && mentions[index].start < mention.start) {
			return;
		}
		const others = mentions.filter((_, otherIndex) => otherIndex !== index);
		if (!overlaps(others, mention.start, mention.end)) {
			mentions.splice(0, mentions.length, ...others, mention);
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
