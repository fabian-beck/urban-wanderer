<script>
	import { marked } from 'marked';
	import { CLASSES } from '../constants/place-classes.js';
	import { PLACE_MENTION_HREF_PREFIX } from '../constants/core.js';
	import { decodePlaceHref, encodePlaceHref, markPlacesInText } from '../util/text.js';
	import { placesHere, placesNearby, placesSurrounding } from '../stores.js';

	// Markdown text in which mentions of the currently relevant places become links;
	// a click calls onSelect with the place and the link element
	export let text;
	export let onSelect;
	export let paragraphClass = '';

	const linkClass = 'cursor-pointer font-bold text-primary-800 hover:text-primary-900';

	const decoratePlaceLinks = (html, places) =>
		html.replace(/<a href="([^"]+)">/g, (match, href) => {
			const place = places.find((candidate) => encodePlaceHref(candidate) === href);
			if (!place) {
				return match;
			}
			const emoji = CLASSES[place.cls]?.emoji;
			return `<a href="${href}" class="${linkClass}">${emoji ? `${emoji} ` : ''}`;
		});

	// Places the text can refer to: the ones shown to the user and given to the AI
	$: places = [...new Set([...$placesHere, ...$placesSurrounding, ...$placesNearby])];
	const render = (text, places, paragraphClass) => {
		const html = decoratePlaceLinks(marked(markPlacesInText(text, places)), places);
		return paragraphClass ? html.replaceAll('<p>', `<p class="${paragraphClass}">`) : html;
	};
	$: html = render(text, places, paragraphClass);

	const placeLinks = (node) => {
		const onClick = (event) => {
			const link = event.target.closest(`a[href^="${PLACE_MENTION_HREF_PREFIX}"]`);
			if (!link) {
				return;
			}
			event.preventDefault();
			const title = decodePlaceHref(link.getAttribute('href'));
			const place = places.find((candidate) => candidate.title === title);
			if (place) {
				onSelect?.(place, link);
			}
		};
		node.addEventListener('click', onClick);
		return {
			destroy: () => node.removeEventListener('click', onClick)
		};
	};
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
<div use:placeLinks>{@html html}</div>
