import { PLACE_MENTION_HREF_PREFIX } from '../../src/constants/core.js';
import {
	CITY_PLACE,
	FAST_FORWARD,
	LANDMARK_PLACE,
	PACING,
	SHOW_CAPTIONS,
	STORY_CUTOUT_ASPECT,
	TIMEOUTS,
	WALK_STOPS
} from './config.mjs';

const MODAL = '[role="dialog"][aria-modal="true"]';
const POPUP = '[role="dialog"]:not([aria-modal])';

// Runs the walk of the paper's application example (train station, Obere Brücke, ERBA island) and
// shows a little more: place previews, "Tell me more", and the walk view with its recap. It is paced
// for a viewer, shows captions, marks the waits for AI content, and captures the stills used as the
// paper's screenshots (`onStill`, named after the paper images and figure labels).
export async function runJourney(
	page,
	baseUrl,
	{ fastForward = false, onStep = () => {}, onWait = () => {}, onStill = async () => {} }
) {
	const pause = (ms) => page.waitForTimeout(ms);
	const scroll = (target, distance) => smoothScroll(page, target, distance);
	const modal = () => page.locator(MODAL).last();
	const modalBody = () => modal().getByRole('document');
	const heading = (name) => page.getByRole('heading', { name, exact: true });
	const storyParts = () => modal().getByTestId('story-part');
	const readAloudButtons = () => modal().getByRole('button', { name: 'Read aloud' });

	const step = async (name, caption, fn) => {
		const startedAt = Date.now();
		console.log(`  ▸ ${name}`);
		if (SHOW_CAPTIONS) {
			await page.evaluate(
				([text, ms]) => window.__demo.caption(text, ms),
				[caption, PACING.caption]
			);
		}
		try {
			await fn();
		} finally {
			onStep({ name, caption, startedAt, endedAt: Date.now() });
		}
	};

	// Waits for content that depends on network or AI calls; the edited video speeds them up
	const waitFor = async (fn) => {
		const startedAt = Date.now();
		const marked = fastForward;
		if (marked) {
			await page.evaluate((ms) => window.__demo.waitStarted(ms), FAST_FORWARD.afterMs);
		}
		try {
			await fn();
		} finally {
			if (marked) {
				await page.evaluate(() => window.__demo.waitEnded());
			}
			onWait({ startedAt, endedAt: Date.now() });
		}
	};

	// Captures the screen, or the region from the top of `element` to the bottom of `to` (default:
	// `element`), at most `maxAspect` times as high as wide and cut to the viewport. Waits until no
	// caption, badge, or tap ripple is visible and moves the pointer away to avoid hover styles.
	const still = async (name, { element, to, maxAspect } = {}) => {
		await page.mouse.move(1, 1);
		await page.waitForFunction(() => window.__demo.idle());
		let clip;
		if (element) {
			const box = await element.boundingBox();
			const bottomBox = to ? await to.boundingBox() : box;
			let bottom = bottomBox.y + bottomBox.height;
			if (maxAspect) {
				bottom = Math.min(bottom, box.y + box.width * maxAspect);
			}
			const top = Math.max(0, box.y);
			const height = Math.min(bottom, page.viewportSize().height) - top;
			if (height <= 0) {
				console.log(`    still ${name} skipped: outside the viewport`);
				return;
			}
			clip = { x: box.x, y: top, width: box.width, height };
		}
		await onStill({ name, clip });
	};

	// Scrolls the window (no container) or a modal body so the element ends up `offset` px below its top
	const scrollTo = async (locator, { container = null, offset = 80 } = {}) => {
		const top = await locator.evaluate((element) => element.getBoundingClientRect().top);
		const containerTop = container
			? await container.evaluate((element) => element.getBoundingClientRect().top)
			: 0;
		await scroll(container, top - containerTop - offset);
	};

	const scrollToTop = async () => scroll(null, -(await page.evaluate(() => window.scrollY)));

	const closeModal = async () => {
		await modal().getByRole('button', { name: 'Close modal' }).click();
		await page.locator(MODAL).first().waitFor({ state: 'hidden' });
	};

	const waitForStop = () =>
		waitFor(async () => {
			await heading('Here').waitFor({ timeout: TIMEOUTS.places });
			await page.getByTestId('location-comment').waitFor({ timeout: TIMEOUTS.ai });
			await page
				.getByLabel('Loading map layers')
				.waitFor({ state: 'hidden', timeout: TIMEOUTS.places });
		});

	const walkTo = async ({ latitude, longitude }) => {
		await scrollToTop();
		await pause(PACING.short);
		await page.context().setGeolocation({ latitude, longitude });
		await page.getByRole('button', { name: 'Update location' }).click();
		await heading('Here').waitFor({ state: 'hidden', timeout: TIMEOUTS.navigation });
		await waitForStop();
	};

	const openPlace = async ({ title, exact }) => {
		const item = page
			.locator('main li button')
			.filter({ has: page.getByText(title, { exact }) })
			.first();
		if (!(await item.count())) {
			throw new Error(`Place "${title}" not found in the place lists`);
		}
		await scrollTo(item, { offset: 240 });
		await pause(PACING.short);
		await item.click();
		await modal().waitFor();
		await waitFor(async () => {
			await modal().getByTestId('place-summary').waitFor({ timeout: TIMEOUTS.ai });
			await modal()
				.locator('.animate-spin')
				.first()
				.waitFor({ state: 'hidden', timeout: TIMEOUTS.ai });
		});
	};

	// Scrolls the fact cards of the open place details into view and captures them as a whole
	// (`gridStill`) and each card on its own
	const showFacts = async (placeName, gridStill = `facts-${placeName}`) => {
		const facts = modal().getByTestId('place-facts');
		if (!(await facts.count())) {
			return;
		}
		await scrollTo(facts, { container: modalBody(), offset: 120 });
		await pause(PACING.medium);
		await still(gridStill, { element: facts });
		for (const card of await facts.locator('[data-fact-key]').all()) {
			const key = await card.getAttribute('data-fact-key');
			await still(`fact-${placeName}-${key}`, { element: card.locator(':scope > *').first() });
		}
	};

	const openStory = async () => {
		await page.getByRole('button', { name: 'Story', exact: true }).click();
		await modal().waitFor();
		await waitFor(() => storyParts().first().waitFor({ timeout: TIMEOUTS.ai }));
	};

	await page.goto(baseUrl, { timeout: TIMEOUTS.navigation });
	await page.getByRole('button', { name: 'Start walk' }).waitFor();

	await step(
		'preferences',
		'Personalize your guide: interests, familiarity, and character',
		async () => {
			await pause(PACING.medium);
			await page.getByRole('button', { name: 'Preferences', exact: true }).click();
			await modal().waitFor();
			await pause(PACING.long);
			await scroll(modalBody(), 900);
			await pause(PACING.medium);
			await closeModal();
			await pause(PACING.short);
		}
	);

	await step('station', 'Arriving at the train station, start a walk', async () => {
		await page.context().setGeolocation({
			latitude: WALK_STOPS.station.latitude,
			longitude: WALK_STOPS.station.longitude
		});
		await pause(PACING.medium);
		await page.getByRole('button', { name: 'Start walk' }).click();
		await waitForStop();
		await pause(PACING.long);
		await scrollTo(heading('Comment'));
		await pause(PACING.read);
	});

	await step('city details', 'The city entry gives a brief summary and data facts', async () => {
		await openPlace(CITY_PLACE);
		await pause(PACING.read);
		await showFacts('city', 'bamberg-visit-1a');
		await pause(PACING.long);
		await closeModal();
		await pause(PACING.short);
	});

	await step('station story', 'The story puts the station area in context', async () => {
		await openStory();
		await pause(PACING.medium);
		await still('bamberg-visit-1b', {
			element: storyParts().first(),
			maxAspect: STORY_CUTOUT_ASPECT.station
		});
		await pause(PACING.read);
		await scroll(modalBody(), 500);
		await pause(PACING.read);
		await closeModal();
		await pause(PACING.short);
	});

	await step(
		'station map',
		'The map points to places and activities toward the old town',
		async () => {
			await scrollToTop();
			await pause(PACING.medium);
			await still('bamberg-visit-1c', { element: page.getByTestId('map') });
			await pause(PACING.long);
		}
	);

	await step('bridge', 'Walking on to the old town: Obere Brücke', async () => {
		await walkTo(WALK_STOPS.bridge);
		await pause(PACING.medium);
		await still('app-map');
		await pause(PACING.read);
	});

	await step('places', 'Places here and nearby, rated by your interests', async () => {
		await scrollTo(heading('Here'), { offset: 88 });
		await pause(PACING.medium);
		await still('app-places');
		await pause(PACING.long);
		await scrollTo(heading('Nearby'));
		await pause(PACING.long);
	});

	await step('place details', 'Place details: summary, rating, and facts', async () => {
		await openPlace(LANDMARK_PLACE);
		await pause(PACING.medium);
		await still('app-place-details');
		await pause(PACING.read);
		const showMore = modal().getByRole('button', { name: 'Show more' });
		if (await showMore.count()) {
			await showMore.click();
			await pause(PACING.read);
		}
		await showFacts('landmark');
		await pause(PACING.long);
		await closeModal();
		await pause(PACING.short);
	});

	await step('history', 'The history timeline of the location', async () => {
		await page.getByRole('button', { name: 'History', exact: true }).click();
		await modal().waitFor();
		await waitFor(() => modal().locator('.timeline li').first().waitFor({ timeout: TIMEOUTS.ai }));
		await pause(PACING.medium);
		await still('app-history');
		await pause(PACING.read);
		await scroll(modalBody(), 900);
		await pause(PACING.long);
		await closeModal();
		await pause(PACING.short);
	});

	await step(
		'story',
		'The story combines what you have seen; tap a highlighted place for a preview',
		async () => {
			await openStory();
			await pause(PACING.medium);
			await still('app-story');
			await pause(PACING.read);
			const mention = modal().locator(`a[href^="${PLACE_MENTION_HREF_PREFIX}"]`).first();
			if (await mention.count()) {
				await scrollTo(mention, { container: modalBody(), offset: 160 });
				await pause(PACING.short);
				await mention.click();
				const popup = page.locator(POPUP);
				await popup.waitFor();
				await pause(PACING.long);
				await popup.getByRole('button', { name: 'Close' }).click();
				await pause(PACING.short);
			}
			const partsRead = await storyParts().count();
			await scrollTo(readAloudButtons().last(), { container: modalBody(), offset: 400 });
			await pause(PACING.medium);
			await waitFor(async () => {
				await modal().getByRole('button', { name: 'Tell me more' }).click({ timeout: TIMEOUTS.ai });
				await storyParts().nth(partsRead).waitFor({ timeout: TIMEOUTS.ai });
			});
			await scrollTo(storyParts().nth(partsRead), { container: modalBody() });
			await pause(PACING.read);
			await scroll(modalBody(), 500);
			await pause(PACING.read);
			await closeModal();
			await pause(PACING.short);
		}
	);

	await step('erba', 'Along the river to the ERBA island: park and campus', async () => {
		await walkTo(WALK_STOPS.erba);
		await pause(PACING.medium);
		await still('bamberg-visit-3a', {
			element: page.getByTestId('map'),
			to: page.getByTestId('location-comment')
		});
		await pause(PACING.read);
		await scrollTo(heading('Here'));
		await pause(PACING.long);
	});

	await step('erba story', 'The story explains what you see around you', async () => {
		await openStory();
		await pause(PACING.medium);
		await still('bamberg-visit-3b', {
			element: storyParts().first(),
			maxAspect: STORY_CUTOUT_ASPECT.erba
		});
		await pause(PACING.read);
		await scroll(modalBody(), 600);
		await pause(PACING.read);
		await closeModal();
		await pause(PACING.short);
	});

	await step(
		'walk view',
		'The walk view keeps your stops, visited places, and stories',
		async () => {
			await page.getByRole('button', { name: 'Open main menu' }).click();
			await pause(PACING.short);
			await page.getByRole('link', { name: 'Walk', exact: true }).click();
			await modal().waitFor();
			await pause(PACING.long);
			await scroll(modalBody(), 900);
			await pause(PACING.long);
			await scroll(modalBody(), -900);
			await pause(PACING.short);
		}
	);

	await step('walk recap', 'A recap connects the highlights of your walk', async () => {
		await modal().getByRole('button', { name: 'Summarize' }).click();
		await waitFor(() => modal().locator('h3').first().waitFor({ timeout: TIMEOUTS.ai }));
		await pause(PACING.read);
		await scroll(modalBody(), 500);
		await pause(PACING.read);
		await scroll(modalBody(), 600);
		await pause(PACING.long);
		await closeModal();
		await pause(PACING.medium);
	});
}

// Scrolls the window (target null) or a scroll container by exactly `distance` px with an eased
// animation, so the motion reads naturally on video and stills land at the intended position.
async function smoothScroll(page, target, distance) {
	const duration = Math.max(PACING.scrollMinMs, (Math.abs(distance) / PACING.scrollSpeed) * 1000);
	const element = target ? await target.elementHandle() : null;
	await page.evaluate(
		([element, distance, duration]) => {
			const scroller = element || document.scrollingElement;
			const start = scroller.scrollTop;
			const end = Math.max(
				0,
				Math.min(start + distance, scroller.scrollHeight - scroller.clientHeight)
			);
			if (duration === 0 || end === start) {
				scroller.scrollTop = end;
				return;
			}
			const begin = performance.now();
			return new Promise((resolve) => {
				const frame = (now) => {
					const progress = Math.min(1, (now - begin) / duration);
					const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
					scroller.scrollTop = start + (end - start) * eased;
					if (progress < 1) {
						requestAnimationFrame(frame);
					} else {
						resolve();
					}
				};
				requestAnimationFrame(frame);
			});
		},
		[element, distance, duration]
	);
}
