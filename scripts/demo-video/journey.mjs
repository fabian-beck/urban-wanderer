import { PLACE_MENTION_HREF_PREFIX } from '../../src/constants/core.js';
import {
	DETAILS_PLACE,
	FAST_FORWARD,
	PACING,
	SHOW_CAPTIONS,
	TIMEOUTS,
	WALK_MOTTO,
	WALK_STOPS
} from './config.mjs';

const MODAL = '[role="dialog"][aria-modal="true"]';
const POPUP = '[role="dialog"]:not([aria-modal])';
const SECTION_HEADINGS = { here: 'Here', nearby: 'Nearby' };

// Runs the demo user journey. The recording pass is paced for a viewer, shows captions, and marks
// the waits for AI content; the warm-up pass only fills the app caches, so it skips pauses and the
// steps whose AI content is never cached (stories, walk recap).
export async function runJourney(
	page,
	baseUrl,
	{ recording, fastForward = false, onStep = () => {}, onWait = () => {} }
) {
	const pause = (ms) => (recording ? page.waitForTimeout(ms) : Promise.resolve());
	const scroll = (target, distance) => smoothScroll(page, target, distance, recording);
	const modal = () => page.locator(MODAL).last();
	const modalBody = () => modal().getByRole('document');
	const heading = (name) => page.getByRole('heading', { name, exact: true });
	const storyParts = () => modal().getByRole('button', { name: 'Read aloud' });

	const step = async (name, caption, fn, { warmup = true } = {}) => {
		if (!recording && !warmup) {
			return;
		}
		const startedAt = Date.now();
		console.log(`  ▸ ${name}`);
		if (recording && SHOW_CAPTIONS) {
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
		const marked = recording && fastForward;
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

	// Scrolls the window (no container) or a modal body so the element ends up `offset` px below its top
	const scrollTo = async (locator, { container = null, offset = 80 } = {}) => {
		const top = await locator.evaluate((element) => element.getBoundingClientRect().top);
		const containerTop = container
			? await container.evaluate((element) => element.getBoundingClientRect().top)
			: 0;
		await scroll(container, top - containerTop - offset);
	};

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

	const findDetailsPlace = async () => {
		const sectionItems = (section) =>
			page
				.locator(`main div:has(> h2:text-is("${SECTION_HEADINGS[section]}")) + ul`)
				.first()
				.locator('li button');
		const sections = DETAILS_PLACE.section === 'here' ? ['here', 'nearby'] : ['nearby', 'here'];
		for (const section of sections) {
			const match = sectionItems(section).filter({ hasText: DETAILS_PLACE.title });
			if (await match.count()) {
				return match.first();
			}
		}
		for (const section of sections) {
			const items = sectionItems(section);
			if (await items.count()) {
				return items.first();
			}
		}
		throw new Error('No place to open in the Here and Nearby lists');
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
		},
		{ warmup: false }
	);

	await step('start walk', 'Start a walk, with a motto that steers your guide', async () => {
		await page.context().setGeolocation(WALK_STOPS[0]);
		const motto = page.locator('#walk-motto');
		await motto.click();
		if (recording) {
			await motto.pressSequentially(WALK_MOTTO, { delay: PACING.typingDelay });
		} else {
			await motto.fill(WALK_MOTTO);
		}
		await pause(PACING.short);
		await page.getByRole('button', { name: 'Start walk' }).click();
		await waitForStop();
		await pause(PACING.long);
	});

	await step(
		'first stop',
		'Your guide comments on the location and rates the places around you',
		async () => {
			await scrollTo(heading('Comment'));
			await pause(PACING.read);
			await scrollTo(heading('Here'));
			await pause(PACING.long);
			await scrollTo(heading('Nearby'));
			await pause(PACING.long);
		},
		{ warmup: false }
	);

	await step('place details', 'Tap a place for a summary and key facts', async () => {
		const item = await findDetailsPlace();
		await scrollTo(item, { offset: 200 });
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
		await pause(PACING.read);
		const showMore = modal().getByRole('button', { name: 'Show more' });
		if (await showMore.count()) {
			await showMore.click();
			await pause(PACING.read);
		}
		await scroll(modalBody(), 1200);
		await pause(PACING.long);
		await closeModal();
		await pause(PACING.short);
	});

	await step(
		'story',
		'Your guide tells a story; tap a highlighted place for a preview',
		async () => {
			await openStory();
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
			await scrollTo(storyParts().last(), { container: modalBody(), offset: 400 });
			await pause(PACING.medium);
			await waitFor(async () => {
				await modal().getByRole('button', { name: 'Tell me more' }).click({ timeout: TIMEOUTS.ai });
				await storyParts().nth(partsRead).waitFor({ timeout: TIMEOUTS.ai });
			});
			await scrollTo(storyParts().nth(partsRead - 1), { container: modalBody() });
			await pause(PACING.read);
			await scroll(modalBody(), 500);
			await pause(PACING.read);
			await closeModal();
			await pause(PACING.short);
		},
		{ warmup: false }
	);

	await step(
		'walk on',
		'Walk on: the map marks your earlier stops, the lists mark visited places',
		async () => {
			await scroll(null, -(await page.evaluate(() => window.scrollY)));
			await pause(PACING.short);
			await page.context().setGeolocation(WALK_STOPS[1]);
			await page.getByRole('button', { name: 'Update location' }).click();
			await heading('Here').waitFor({ state: 'hidden', timeout: TIMEOUTS.navigation });
			await waitForStop();
			await pause(PACING.long);
			await scrollTo(heading('Comment'));
			await pause(PACING.read);
			const visited = page.getByText('visited', { exact: true }).first();
			if (await visited.count()) {
				await scrollTo(visited, { offset: 300 });
				await pause(PACING.long);
			}
		}
	);

	await step(
		'second story',
		'The story builds on the walk without repeating itself',
		async () => {
			await openStory();
			await pause(PACING.read);
			await scroll(modalBody(), 600);
			await pause(PACING.read);
			await closeModal();
			await pause(PACING.short);
		},
		{ warmup: false }
	);

	await step(
		'walk view',
		'The walk view keeps your motto, stops, and stories',
		async () => {
			await page.getByRole('button', { name: 'Open main menu' }).click();
			await pause(PACING.short);
			await page.getByRole('link', { name: 'Walk', exact: true }).click();
			await modal().waitFor();
			await pause(PACING.long);
			await scroll(modalBody(), 700);
			await pause(PACING.long);
			await scroll(modalBody(), -700);
			await pause(PACING.short);
		},
		{ warmup: false }
	);

	await step(
		'walk recap',
		'A recap connects the highlights of your walk',
		async () => {
			await modal().getByRole('button', { name: 'Summarize' }).click();
			await waitFor(() => modal().locator('h3').first().waitFor({ timeout: TIMEOUTS.ai }));
			await pause(PACING.read);
			await scroll(modalBody(), 500);
			await pause(PACING.read);
			await scroll(modalBody(), 600);
			await pause(PACING.long);
			await closeModal();
			await pause(PACING.medium);
		},
		{ warmup: false }
	);
}

// Scrolls the window (target null) or a scroll container in small steps so the motion reads
// naturally on video. The warm-up pass jumps in one go.
async function smoothScroll(page, target, distance, recording) {
	const scrollBy = async (amount) => {
		if (target) {
			await target.evaluate(
				(element, top) => element.scrollBy({ top, behavior: 'smooth' }),
				amount
			);
		} else {
			await page.evaluate((top) => window.scrollBy({ top, behavior: 'smooth' }), amount);
		}
	};
	if (!recording) {
		await scrollBy(distance);
		return;
	}
	const steps = Math.round(Math.abs(distance) / PACING.scrollStep);
	const stepDistance = Math.sign(distance) * PACING.scrollStep;
	for (let i = 0; i < steps; i++) {
		await scrollBy(stepDistance);
		await page.waitForTimeout(PACING.scrollStepDelay);
	}
}
