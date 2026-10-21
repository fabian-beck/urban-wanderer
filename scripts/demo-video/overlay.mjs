// In-page overlay for the recording pass: tap ripples, step captions, and the fast-forward badge.
// Playwright serializes this function into the page (context.addInitScript), so it must not
// reference anything outside its body. The journey drives it through window.__demo.
export function installOverlay() {
	const css = `
		.demo-tap {
			position: fixed; width: 44px; height: 44px; margin: -22px 0 0 -22px;
			border-radius: 50%; border: 3px solid rgba(37, 99, 235, 0.9);
			background: rgba(37, 99, 235, 0.25); pointer-events: none; z-index: 2147483647;
			animation: demo-tap 450ms ease-out forwards;
		}
		@keyframes demo-tap {
			from { transform: scale(0.4); opacity: 1; }
			to { transform: scale(1.4); opacity: 0; }
		}
		.demo-overlay {
			position: fixed; top: 8px; left: 16px; right: 16px; z-index: 2147483646;
			display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none;
		}
		.demo-caption, .demo-badge {
			font: 600 15px/1.35 system-ui, sans-serif; color: #fff; text-align: center;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
		}
		.demo-caption {
			background: rgba(17, 24, 39, 0.85); border-radius: 12px; padding: 8px 14px;
			transition: opacity 300ms ease;
		}
		.demo-badge {
			background: rgba(180, 83, 9, 0.92); border-radius: 999px; padding: 4px 12px; font-size: 13px;
		}
		.demo-hidden { opacity: 0; }`;

	let overlay;
	let caption;
	let badge;
	let captionTimer;
	let badgeTimer;
	// Until then the caption is visible or still fading out (CSS transition)
	let captionVisibleUntil = 0;

	const ensureOverlay = () => {
		if (overlay?.isConnected) {
			return;
		}
		const style = document.createElement('style');
		style.textContent = css;
		document.head.appendChild(style);
		overlay = document.createElement('div');
		overlay.className = 'demo-overlay';
		caption = document.createElement('div');
		caption.className = 'demo-caption demo-hidden';
		badge = document.createElement('div');
		badge.className = 'demo-badge demo-hidden';
		badge.textContent = '⏩ Fast-forward';
		overlay.append(caption, badge);
		document.body.appendChild(overlay);
	};

	window.__demo = {
		caption(text, durationMs) {
			ensureOverlay();
			clearTimeout(captionTimer);
			caption.textContent = text;
			caption.classList.remove('demo-hidden');
			captionTimer = setTimeout(() => caption.classList.add('demo-hidden'), durationMs);
			captionVisibleUntil = Date.now() + durationMs + 400;
		},
		waitStarted(badgeDelayMs) {
			ensureOverlay();
			clearTimeout(badgeTimer);
			badgeTimer = setTimeout(() => badge.classList.remove('demo-hidden'), badgeDelayMs);
		},
		waitEnded() {
			clearTimeout(badgeTimer);
			badge?.classList.add('demo-hidden');
		},
		// True when no caption, badge, or tap ripple is on screen, so a still shows only the app
		idle() {
			return (
				Date.now() > captionVisibleUntil &&
				(!badge || badge.classList.contains('demo-hidden')) &&
				!document.querySelector('.demo-tap')
			);
		}
	};

	document.addEventListener(
		'pointerdown',
		(event) => {
			const ripple = document.createElement('div');
			ripple.className = 'demo-tap';
			ripple.style.left = `${event.clientX}px`;
			ripple.style.top = `${event.clientY}px`;
			ensureOverlay();
			document.body.appendChild(ripple);
			setTimeout(() => ripple.remove(), 500);
		},
		true
	);
}
