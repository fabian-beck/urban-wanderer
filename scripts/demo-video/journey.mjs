import { DETAILS_PLACE, PACING, SEARCH_QUERY, START_LOCATION, TIMEOUTS } from './config.mjs';

const SECTION_LISTS = {
	here: 'main div:has(> [data-testid="section-here"]) ~ ul',
	nearby: 'main div:has(> [data-testid="section-nearby"]) ~ ul'
};

// Runs the demo user journey. With `recording` false, pauses are skipped so the pass only
// warms the app caches; with `recording` true, the journey is paced for a viewer.
export async function runJourney(page, baseUrl, { recording, onStep = () => {} }) {
	const pause = (ms) => (recording ? page.waitForTimeout(ms) : Promise.resolve());
	const scroll = (target, distance) => smoothScroll(page, target, distance, recording);
	const step = async (name, fn) => {
		const started = Date.now();
		console.log(`  ▸ ${name}`);
		try {
			await fn();
		} finally {
			onStep({ name, startedAt: started, endedAt: Date.now() });
		}
	};
	const dialog = () => page.getByRole('dialog').last();
	const closeDialog = async () => {
		await dialog().getByRole('button', { name: 'Close modal' }).click();
		await dialog().waitFor({ state: 'hidden' });
	};
	const openMenuItem = async (testId) => {
		await page.getByTestId('nav-menu').click();
		await pause(PACING.short);
		await page.getByTestId(testId).click();
	};
	const waitForPlaces = async () => {
		await page.getByTestId('section-here').waitFor({ state: 'visible', timeout: TIMEOUTS.places });
		await page.getByTestId('location-comment').waitFor({ state: 'visible', timeout: TIMEOUTS.ai });
	};

	await step('open app at start location', async () => {
		const url = new URL(baseUrl);
		url.searchParams.set('lat', String(START_LOCATION.latitude));
		url.searchParams.set('lon', String(START_LOCATION.longitude));
		await page.goto(url.toString(), { timeout: TIMEOUTS.navigation });
		await page.getByTestId('jump-button').waitFor({ state: 'visible' });
		await pause(PACING.medium);
		await page.getByTestId('jump-button').click();
		await waitForPlaces();
		await pause(PACING.long);
	});

	await step('scroll through map, comment and place lists', async () => {
		await scroll(null, 900);
		await pause(PACING.medium);
		await page.getByTestId('section-nearby').scrollIntoViewIfNeeded();
		await scroll(null, 500);
		await pause(PACING.long);
	});

	await step('open place details', async () => {
		const item = page
			.locator(SECTION_LISTS[DETAILS_PLACE.section])
			.first()
			.getByTestId('place-item');
		const count = await item.count();
		if (count === 0) {
			throw new Error(`No place found in section "${DETAILS_PLACE.section}"`);
		}
		await item.nth(Math.min(DETAILS_PLACE.index, count - 1)).click();
		await dialog().waitFor({ state: 'visible' });
		await dialog().getByTestId('place-summary').waitFor({ state: 'visible', timeout: TIMEOUTS.ai });
		await dialog()
			.locator('.animate-spin')
			.first()
			.waitFor({ state: 'hidden', timeout: TIMEOUTS.ai });
		await pause(PACING.read);
		await scroll(dialog().getByRole('document'), 1200);
		await pause(PACING.long);
		await closeDialog();
		await pause(PACING.short);
	});

	await step('listen to the story', async () => {
		await page.getByTestId('story-button').click();
		await dialog().waitFor({ state: 'visible' });
		const storyParts = dialog().getByTestId('story-text');
		await storyParts.first().waitFor({ state: 'visible', timeout: TIMEOUTS.ai });
		await pause(PACING.read);
		await scroll(dialog().getByRole('document'), 600);
		await pause(PACING.medium);
		await dialog().getByTestId('story-more').click({ timeout: TIMEOUTS.ai });
		await storyParts.nth(1).waitFor({ state: 'visible', timeout: TIMEOUTS.ai });
		await pause(PACING.short);
		await scroll(dialog().getByRole('document'), 800);
		await pause(PACING.read);
		await closeDialog();
		await pause(PACING.short);
	});

	await step('show preferences', async () => {
		await openMenuItem('nav-preferences');
		await dialog().waitFor({ state: 'visible' });
		await pause(PACING.medium);
		await scroll(dialog().getByRole('document'), 700);
		await pause(PACING.medium);
		await closeDialog();
		await pause(PACING.short);
	});

	await step('search for another place', async () => {
		await openMenuItem('nav-search');
		await dialog().waitFor({ state: 'visible' });
		const input = page.locator('#search-input');
		await input.click();
		if (recording) {
			await input.pressSequentially(SEARCH_QUERY, { delay: PACING.typingDelay });
		} else {
			await input.fill(SEARCH_QUERY);
		}
		await pause(PACING.short);
		await page.getByTestId('search-submit').click();
		await page
			.getByTestId('section-here')
			.waitFor({ state: 'hidden', timeout: TIMEOUTS.navigation });
		await waitForPlaces();
		await pause(PACING.long);
		await scroll(null, 700);
		await pause(PACING.read);
	});
}

// Scrolls the window (target null) or a scroll container in small steps so the motion reads
// naturally on video. The warm-up pass jumps in one go.
async function smoothScroll(page, target, distance, recording) {
	const scrollBy = async (amount) => {
		if (target) {
			await target.evaluate((el, top) => el.scrollBy({ top, behavior: 'smooth' }), amount);
		} else {
			await page.evaluate((top) => window.scrollBy({ top, behavior: 'smooth' }), amount);
		}
	};
	if (!recording) {
		await scrollBy(distance);
		return;
	}
	const steps = Math.max(1, Math.round(distance / PACING.scrollStep));
	for (let i = 0; i < steps; i++) {
		await scrollBy(PACING.scrollStep);
		await page.waitForTimeout(PACING.scrollStepDelay);
	}
}
