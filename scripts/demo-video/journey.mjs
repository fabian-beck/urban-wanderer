import { PLACE_MENTION_HREF_PREFIX } from '../../src/constants/core.js';
import {
	CITY_PLACE,
	FAST_FORWARD,
	LANDMARK_PLACE,
	PACING,
	STORY_CUTOUT_ASPECT,
	TIMEOUTS,
	WALK_STOPS
} from './config.mjs';
import { savedSeconds } from './edit-video.mjs';
import { SLIDES } from './narration.mjs';

const MODAL = '[role="dialog"][aria-modal="true"]';
const POPUP = '[role="dialog"]:not([aria-modal])';

// Runs the walk of the paper's application example (train station, Obere Brücke, ERBA island) and
// shows a little more: place previews, "Tell me more", the read-aloud story, and the walk view with
// its recap. Section slides structure the video. Narration drives the pacing: `say(key)` starts a
// cue (`narration[key].duration` seconds) together with the interaction it describes, and the next
// cue waits until it has ended in edited-video time, which accounts for sped-up waits. A wait that
// starts during a cue is sped up to end with that cue. The journey also captures the stills used as
// the paper's screenshots (`onStill`, named after the paper images and figure labels).
export async function runJourney(
	page,
	baseUrl,
	{
		narration,
		fastForward = false,
		onVideoStart = () => {},
		onStep = () => {},
		onCue = () => {},
		onWait = () => {},
		onStill = async () => {},
		onAppAudio = () => {}
	}
) {
	const pause = (ms) => page.waitForTimeout(ms);
	const scroll = (target, distance, duration) => smoothScroll(page, target, distance, duration);
	const modal = () => page.locator(MODAL).last();
	const modalBody = () => modal().getByRole('document');
	const heading = (name) => page.getByRole('heading', { name, exact: true });
	const storyParts = () => modal().getByTestId('story-part');
	const readAloudButtons = () => modal().getByRole('button', { name: 'Read aloud' });

	// Edited-video clock: raw seconds since the start minus what the sped-up waits lose
	const startedAt = Date.now();
	let savedSoFar = 0;
	const editedNow = () => (Date.now() - startedAt) / 1000 - savedSoFar;
	let cue = null;

	const narrationDone = async () => {
		if (!cue) {
			return;
		}
		const remaining = cue.end - editedNow();
		cue = null;
		if (remaining > 0) {
			await pause(remaining * 1000);
		}
	};

	const say = async (key) => {
		await narrationDone();
		await pause(PACING.cueGap);
		const clip = narration[key];
		if (!clip) {
			throw new Error(`No narration for cue "${key}"`);
		}
		cue = { key, end: editedNow() + clip.duration };
		onCue({ key, startedAt: Date.now() });
	};

	// Seconds of the current cue still to be spoken
	const narrationLeft = () => (cue ? Math.max(0, cue.end - editedNow()) : 0);

	const step = async (name, fn) => {
		const stepStartedAt = Date.now();
		console.log(`  ▸ ${name}`);
		try {
			await fn();
		} finally {
			onStep({ name, startedAt: stepStartedAt, endedAt: Date.now() });
		}
	};

	// Waits for content that depends on network or AI calls; the edited video speeds them up, to the
	// end of the running cue if there is one
	const waitFor = async (fn) => {
		const wait = { startedAt: Date.now(), targetSeconds: cue ? narrationLeft() : undefined };
		if (fastForward) {
			await page.evaluate((ms) => window.__demo.waitStarted(ms), FAST_FORWARD.afterMs);
		}
		try {
			await fn();
		} finally {
			if (fastForward) {
				await page.evaluate(() => window.__demo.waitEnded());
			}
			wait.endedAt = Date.now();
			if (fastForward) {
				savedSoFar += savedSeconds(
					{
						start: wait.startedAt / 1000,
						end: wait.endedAt / 1000,
						targetSeconds: wait.targetSeconds
					},
					FAST_FORWARD
				);
			}
			onWait(wait);
		}
	};

	const slide = async (name, cueKey, { keep = false } = {}) => {
		await narrationDone();
		await page.evaluate((spec) => window.__demo.showSlide(spec), SLIDES[name]);
		await pause(PACING.slideFade);
		if (cueKey) {
			await say(cueKey);
			await narrationDone();
		}
		await pause(PACING.slideHold);
		if (!keep) {
			await page.evaluate(() => window.__demo.hideSlide());
			await pause(PACING.slideFade);
		}
	};

	// Captures the screen, or the region from the top of `element` to the bottom of `to` (default:
	// `element`), at most `maxAspect` times as high as wide and cut to the viewport. Waits until no
	// slide, badge, or tap ripple is visible and moves the pointer away to avoid hover styles.
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

	// Scrolls the window (no container) or a modal body so the element ends up `offset` px below its
	// top
	const scrollTo = async (locator, { container = null, offset = 80, duration } = {}) => {
		const top = await locator.evaluate((element) => element.getBoundingClientRect().top);
		const containerTop = container
			? await container.evaluate((element) => element.getBoundingClientRect().top)
			: 0;
		await scroll(container, top - containerTop - offset, duration);
	};

	const scrollToTop = async () => scroll(null, -(await page.evaluate(() => window.scrollY)));

	// Scrolls slowly through the rest of the running cue
	const scrollAlong = (target, distance) =>
		scroll(target, distance, Math.max(0, narrationLeft() - 0.5) * 1000);

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

	// Plays the first story part with the app's text-to-speech for a few seconds; the recorded
	// speech is mixed into the video for the time it played
	const playStoryAudio = async () => {
		await readAloudButtons().first().click();
		const audioAlert = modal().getByRole('alert').filter({ hasText: 'Audio playing' });
		await waitFor(() => audioAlert.waitFor({ timeout: TIMEOUTS.ai }));
		const playStartedAt = Date.now();
		await pause(PACING.appAudio);
		await audioAlert.getByRole('button', { name: 'Close' }).click();
		onAppAudio({ startedAt: playStartedAt, endedAt: Date.now() });
		await pause(PACING.short);
	};

	await page.goto(baseUrl, { timeout: TIMEOUTS.navigation });
	await page.getByRole('button', { name: 'Start walk' }).waitFor();
	await page.evaluate((spec) => window.__demo.showSlide(spec), SLIDES.title);
	await pause(PACING.slideFade);
	onVideoStart();

	await step('title', async () => {
		await say('intro');
		await narrationDone();
		await pause(PACING.slideHold);
		await page.evaluate(() => window.__demo.hideSlide());
		await pause(PACING.slideFade);
	});

	await step('preferences', async () => {
		await slide('preferences');
		await say('front');
		await narrationDone();
		await say('preferencesInterests');
		await page.getByRole('button', { name: 'Preferences', exact: true }).click();
		await modal().waitFor();
		await say('preferencesGuide');
		await scrollTo(modal().getByText('Familiarity with the area', { exact: true }), {
			container: modalBody(),
			offset: 160
		});
		await say('preferencesMore');
		await scrollTo(modal().getByRole('heading', { name: 'Language', exact: true }), {
			container: modalBody(),
			offset: 120
		});
		await scrollAlong(modalBody(), 500);
		await narrationDone();
		await closeModal();
	});

	await step('station', async () => {
		await slide('station', 'stationIntro');
		await say('motto');
		await page.locator('#walk-motto').click();
		await page.context().setGeolocation({
			latitude: WALK_STOPS.station.latitude,
			longitude: WALK_STOPS.station.longitude
		});
		await say('walkStart');
		await page.getByRole('button', { name: 'Start walk' }).click();
		await say('loading');
		await waitForStop();
		await say('stationMap');
		await say('stationComment');
		await scrollTo(heading('Comment'));
		await say('stationPlaces');
		await scrollTo(heading('Here'));
	});

	await step('city details', async () => {
		await say('cityOpen');
		await openPlace(CITY_PLACE);
		await say('cityFacts');
		await showFacts('city', 'bamberg-visit-1a');
		await narrationDone();
		await pause(PACING.medium);
		await closeModal();
	});

	await step('station story', async () => {
		await say('stationStory');
		await openStory();
		await still('bamberg-visit-1b', {
			element: storyParts().first(),
			maxAspect: STORY_CUTOUT_ASPECT.station
		});
		await narrationDone();
		await pause(PACING.read);
		await scroll(modalBody(), 400);
		await pause(PACING.medium);
		await closeModal();
	});

	await step('station map', async () => {
		await say('stationMapAgain');
		await scrollToTop();
		await still('bamberg-visit-1c', { element: page.getByTestId('map') });
	});

	await step('old town', async () => {
		await slide('oldTown');
		await say('oldTownWalk');
		await walkTo(WALK_STOPS.bridge);
		await say('oldTownOverview');
		await still('app-map');
	});

	await step('places', async () => {
		await say('oldTownPlaces');
		await scrollTo(heading('Here'), { offset: 88 });
		await still('app-places');
	});

	await step('place details', async () => {
		await say('detailsOpen');
		await openPlace(LANDMARK_PLACE);
		await say('detailsSummary');
		await still('app-place-details');
		await pause(PACING.medium);
		const showMore = modal().getByRole('button', { name: 'Show more' });
		if (await showMore.count()) {
			await showMore.click();
		}
		await say('detailsRating');
		await scrollTo(modal().getByTestId('place-rating'), { container: modalBody(), offset: 140 });
		await say('detailsFacts');
		await showFacts('landmark');
		await narrationDone();
		await pause(PACING.medium);
		await closeModal();
	});

	await step('history', async () => {
		await say('historyOpen');
		await page.getByRole('button', { name: 'History', exact: true }).click();
		await modal().waitFor();
		await waitFor(() => modal().locator('.timeline li').first().waitFor({ timeout: TIMEOUTS.ai }));
		await still('app-history');
		await say('historyScroll');
		await scrollAlong(modalBody(), 1200);
		await narrationDone();
		await closeModal();
	});

	await step('story', async () => {
		await say('storyOpen');
		await openStory();
		await still('app-story');
		await narrationDone();
		await playStoryAudio();
		await say('storyMentions');
		const mention = modal().locator(`a[href^="${PLACE_MENTION_HREF_PREFIX}"]`).first();
		if (await mention.count()) {
			await scrollTo(mention, { container: modalBody(), offset: 160 });
			await mention.click();
			const popup = page.locator(POPUP);
			await popup.waitFor();
			await narrationDone();
			await pause(PACING.medium);
			await popup.getByRole('button', { name: 'Close' }).click();
		}
		await say('storyMore');
		const partsRead = await storyParts().count();
		await scrollTo(readAloudButtons().last(), { container: modalBody(), offset: 400 });
		await waitFor(async () => {
			await modal().getByRole('button', { name: 'Tell me more' }).click({ timeout: TIMEOUTS.ai });
			await storyParts().nth(partsRead).waitFor({ timeout: TIMEOUTS.ai });
		});
		await scrollTo(storyParts().nth(partsRead), { container: modalBody() });
		await narrationDone();
		await pause(PACING.read);
		await closeModal();
	});

	await step('nearby', async () => {
		await say('oldTownNearby');
		await scrollTo(heading('Nearby'));
		await scrollAlong(null, 400);
	});

	await step('erba', async () => {
		await slide('erba');
		await say('erbaWalk');
		await walkTo(WALK_STOPS.erba);
		await say('erbaOverview');
		await still('bamberg-visit-3a', {
			element: page.getByTestId('map'),
			to: page.getByTestId('location-comment')
		});
	});

	await step('erba story', async () => {
		await say('erbaStory');
		await openStory();
		await still('bamberg-visit-3b', {
			element: storyParts().first(),
			maxAspect: STORY_CUTOUT_ASPECT.erba
		});
		await scrollAlong(modalBody(), 400);
		await narrationDone();
		await pause(PACING.read);
		await closeModal();
	});

	await step('walk', async () => {
		await slide('walk');
		await say('walkView');
		await page.getByRole('button', { name: 'Open main menu' }).click();
		await pause(PACING.short);
		await page.getByRole('link', { name: 'Walk', exact: true }).click();
		await modal().waitFor();
		await pause(PACING.medium);
		await scrollAlong(modalBody(), 900);
		await narrationDone();
		await scroll(modalBody(), -900);
		await say('walkRecap');
		await modal().getByRole('button', { name: 'Summarize' }).click();
		await waitFor(() => modal().locator('h3').first().waitFor({ timeout: TIMEOUTS.ai }));
		await narrationDone();
		await pause(PACING.read);
		await scroll(modalBody(), 500);
		await pause(PACING.read);
		await closeModal();
	});

	await step('end', async () => {
		await slide('end', 'outro', { keep: true });
	});
}

// Scrolls the window (target null) or a scroll container by exactly `distance` px with an eased
// animation, so the motion reads naturally on video and stills land at the intended position. The
// duration defaults to the scroll speed.
async function smoothScroll(page, target, distance, duration) {
	const ms =
		duration ?? Math.max(PACING.scrollMinMs, (Math.abs(distance) / PACING.scrollSpeed) * 1000);
	const element = target ? await target.elementHandle() : null;
	await page.evaluate(
		([element, distance, duration]) => {
			const scroller = element || document.scrollingElement;
			const start = scroller.scrollTop;
			const end = Math.max(
				0,
				Math.min(start + distance, scroller.scrollHeight - scroller.clientHeight)
			);
			if (duration <= 0 || end === start) {
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
		[element, distance, ms]
	);
}
